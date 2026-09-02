//! The Tailscale control-plane API, as much of it as picking a host needs.
//!
//! Both credential kinds Tailscale issues are supported because they are not
//! interchangeable: an API key is a single secret that expires on a fixed date,
//! while an OAuth client is an id and secret pair that mints short-lived access
//! tokens and is the one Tailscale documents for long-running integrations. The
//! wire details are theirs — an API key authenticates as the username of an
//! HTTP Basic pair with an empty password, an access token as a bearer.

use std::time::{Duration, Instant};

use serde::{Deserialize, Serialize};
use tokio::sync::Mutex;

/// Where the control-plane API lives.
const API_BASE: &str = "https://api.tailscale.com";
/// The tailnet name that means "the one this credential belongs to".
pub const DEFAULT_TAILNET: &str = "-";
/// Renew an access token this long before it expires, so a call that starts
/// just under the wire does not finish just over it.
const RENEW_MARGIN: Duration = Duration::from_secs(60);

/// Why a Tailscale call failed.
#[derive(Debug, thiserror::Error)]
pub enum TailscaleError {
    #[error("could not reach the Tailscale API: {0}")]
    Transport(String),
    #[error(
        "Tailscale rejected the credential (HTTP {0}); an API key expires on a fixed date and an \
         OAuth client needs the devices:core scope to list a tailnet"
    )]
    Unauthorized(u16),
    #[error("Tailscale answered HTTP {0}: {1}")]
    Status(u16, String),
    #[error("Tailscale answered with unexpected JSON: {0}")]
    Malformed(String),
    #[error("tailnet name {0:?} is not usable in a URL path")]
    Tailnet(String),
}

/// One device as the tailnet lists it.
///
/// The field names are Tailscale's; `fields=all` is requested so the optional
/// ones are present rather than silently absent. Only what choosing a host
/// needs is modelled: the rest of the device object is large, changes on their
/// schedule, and nothing here would read it.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct TailnetDevice {
    /// Stable device id, and the path element for per-device calls.
    pub id: String,
    /// The node identity, which is what the admin console shows.
    #[serde(default)]
    pub node_id: String,
    /// Fully qualified MagicDNS name.
    pub name: String,
    /// The machine's own hostname, which is the label a person recognises.
    #[serde(default)]
    pub hostname: String,
    /// Every address Tailscale assigned, IPv4 first as Tailscale returns them.
    #[serde(default)]
    pub addresses: Vec<String>,
    /// Operating system as Tailscale reports it, for the picker's subtitle.
    #[serde(default)]
    pub os: String,
    /// RFC 3339 instant the control plane last heard from the device.
    #[serde(default)]
    pub last_seen: String,
    /// Tags applied to the device, used to narrow a large tailnet.
    #[serde(default)]
    pub tags: Vec<String>,
    /// False while the tailnet requires an admin to approve the device, in
    /// which case it is listed but not yet reachable.
    #[serde(default)]
    pub authorized: bool,
    /// True for a device shared in from another tailnet.
    #[serde(default)]
    pub is_external: bool,
}

impl TailnetDevice {
    /// The name to dial, preferring MagicDNS and falling back to the first
    /// address when a tailnet has MagicDNS switched off.
    ///
    /// An IPv6 literal is bracketed here rather than at the call site, because
    /// the value is about to be spliced into a URL authority.
    #[must_use]
    pub fn dial_host(&self) -> Option<String> {
        if !self.name.is_empty() {
            return Some(self.name.trim_end_matches('.').to_ascii_lowercase());
        }
        let first = self.addresses.first()?;
        if first.contains(':') {
            return Some(format!("[{first}]"));
        }
        Some(first.clone())
    }
}

/// What Tailscale returns for a device listing.
#[derive(Debug, Deserialize)]
struct DeviceList {
    devices: Vec<TailnetDevice>,
}

/// What the OAuth token endpoint returns for a client-credentials grant.
#[derive(Debug, Deserialize)]
struct AccessGrant {
    access_token: String,
    /// Lifetime in seconds. Tailscale sends it; a grant without one is treated
    /// as already expired rather than as eternal.
    #[serde(default)]
    expires_in: u64,
}

/// An access token and the instant it stops being usable.
struct CachedToken {
    value: String,
    expires_at: Instant,
}

/// How a caller proves who it is.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(tag = "kind", rename_all = "camelCase")]
pub enum Credential {
    /// A `tskey-api-…` secret, presented as HTTP Basic.
    ApiKey { key: String },
    /// An OAuth client, exchanged for short-lived access tokens.
    OauthClient {
        client_id: String,
        client_secret: String,
    },
}

/// A client for one tailnet.
pub struct TailscaleClient {
    http: reqwest::Client,
    credential: Credential,
    /// The access token in flight, for OAuth credentials only. Behind a mutex
    /// so two concurrent listings mint one token rather than two.
    token: Mutex<Option<CachedToken>>,
}

/// Whether a tailnet name is safe to splice into a URL path.
///
/// Tailnet names are DNS names, an email address for a personal tailnet, or the
/// literal `-`. Rejecting anything else keeps a caller-supplied string from
/// reaching into another API path.
fn usable_tailnet(name: &str) -> bool {
    !name.is_empty()
        && name.len() <= 253
        && name
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || matches!(c, '-' | '.' | '_' | '@' | '+'))
}

impl TailscaleClient {
    /// Build a client that authenticates with `credential`.
    #[must_use]
    pub fn new(http: reqwest::Client, credential: Credential) -> Self {
        Self {
            http,
            credential,
            token: Mutex::new(None),
        }
    }

    /// Attach the credential to one outgoing request.
    ///
    /// # Errors
    /// Returns [`TailscaleError`] when an OAuth token exchange fails.
    async fn authenticate(
        &self,
        request: reqwest::RequestBuilder,
    ) -> Result<reqwest::RequestBuilder, TailscaleError> {
        match &self.credential {
            Credential::ApiKey { key } => Ok(request.basic_auth(key, None::<&str>)),
            Credential::OauthClient { .. } => Ok(request.bearer_auth(self.access_token().await?)),
        }
    }

    /// A live access token, minting one when none is cached or the cached one
    /// is inside its renewal margin.
    ///
    /// # Errors
    /// Returns [`TailscaleError`] when the token endpoint refuses the client or
    /// answers with something other than a grant.
    async fn access_token(&self) -> Result<String, TailscaleError> {
        let Credential::OauthClient {
            client_id,
            client_secret,
        } = &self.credential
        else {
            return Err(TailscaleError::Malformed(
                "access token requested for an API key".to_owned(),
            ));
        };
        let mut cached = self.token.lock().await;
        if let Some(token) = cached.as_ref()
            && Instant::now() + RENEW_MARGIN < token.expires_at
        {
            return Ok(token.value.clone());
        }
        let response = self
            .http
            .post(format!("{API_BASE}/api/v2/oauth/token"))
            .form(&[
                ("grant_type", "client_credentials"),
                ("client_id", client_id.as_str()),
                ("client_secret", client_secret.as_str()),
            ])
            .send()
            .await
            .map_err(|error| TailscaleError::Transport(error.to_string()))?;
        let status = response.status().as_u16();
        if status == 401 || status == 403 {
            return Err(TailscaleError::Unauthorized(status));
        }
        if !response.status().is_success() {
            return Err(TailscaleError::Status(
                status,
                response.text().await.unwrap_or_default(),
            ));
        }
        let grant: AccessGrant = response
            .json()
            .await
            .map_err(|error| TailscaleError::Malformed(error.to_string()))?;
        let value = grant.access_token;
        *cached = Some(CachedToken {
            value: value.clone(),
            expires_at: Instant::now() + Duration::from_secs(grant.expires_in),
        });
        Ok(value)
    }

    /// Every device in one tailnet.
    ///
    /// `fields=all` is requested because the default projection omits fields the
    /// picker shows, and a picker that lists a device it cannot describe is
    /// worse than one extra kilobyte on the wire.
    ///
    /// # Errors
    /// Returns [`TailscaleError`] when the tailnet name is unusable, the API is
    /// unreachable, the credential is refused, or the answer is not a device
    /// list.
    pub async fn devices(&self, tailnet: &str) -> Result<Vec<TailnetDevice>, TailscaleError> {
        if !usable_tailnet(tailnet) {
            return Err(TailscaleError::Tailnet(tailnet.to_owned()));
        }
        let request = self
            .http
            .get(format!("{API_BASE}/api/v2/tailnet/{tailnet}/devices"))
            .query(&[("fields", "all")]);
        let response = self
            .authenticate(request)
            .await?
            .send()
            .await
            .map_err(|error| TailscaleError::Transport(error.to_string()))?;
        let status = response.status().as_u16();
        if status == 401 || status == 403 {
            return Err(TailscaleError::Unauthorized(status));
        }
        if !response.status().is_success() {
            return Err(TailscaleError::Status(
                status,
                response.text().await.unwrap_or_default(),
            ));
        }
        let list: DeviceList = response
            .json()
            .await
            .map_err(|error| TailscaleError::Malformed(error.to_string()))?;
        Ok(list.devices)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn reads_the_device_fields_the_api_documents() {
        let device: TailnetDevice = serde_json::from_str(
            r#"{
              "addresses": ["100.101.102.103", "fd7a:115c:a1e0::1"],
              "id": "92960230385",
              "nodeId": "nMCsaV52j811CNTRL",
              "name": "workstation.tail1234.ts.net",
              "hostname": "workstation",
              "os": "linux",
              "lastSeen": "2026-09-02T05:00:00Z",
              "tags": ["tag:harness"],
              "authorized": true,
              "isExternal": false,
              "clientVersion": "1.90.0",
              "machineKey": "mkey:abc"
            }"#,
        )
        .expect("the documented device object parses");
        assert_eq!(device.id, "92960230385");
        assert_eq!(device.node_id, "nMCsaV52j811CNTRL");
        assert_eq!(device.hostname, "workstation");
        assert_eq!(device.addresses.len(), 2);
        assert_eq!(device.tags, vec!["tag:harness".to_owned()]);
        assert!(device.authorized);
        assert!(!device.is_external);
    }

    #[test]
    fn tolerates_a_device_object_missing_its_optional_fields() {
        // External devices come back with several fields absent, and a listing
        // that refuses the whole page because one device is shared in would
        // hide every device beside it.
        let device: TailnetDevice =
            serde_json::from_str(r#"{"id":"1","name":"shared.tail1234.ts.net"}"#)
                .expect("a sparse device parses");
        assert_eq!(device.hostname, "");
        assert!(device.addresses.is_empty());
        assert!(!device.authorized);
    }

    #[test]
    fn dials_magic_dns_when_the_tailnet_has_it() {
        let device: TailnetDevice = serde_json::from_str(
            r#"{"id":"1","name":"Workstation.Tail1234.ts.net.","addresses":["100.64.0.1"]}"#,
        )
        .expect("parses");
        assert_eq!(
            device.dial_host().as_deref(),
            Some("workstation.tail1234.ts.net")
        );
    }

    #[test]
    fn falls_back_to_an_address_and_brackets_ipv6() {
        let v4: TailnetDevice =
            serde_json::from_str(r#"{"id":"1","name":"","addresses":["100.64.0.1"]}"#)
                .expect("parses");
        assert_eq!(v4.dial_host().as_deref(), Some("100.64.0.1"));
        let v6: TailnetDevice =
            serde_json::from_str(r#"{"id":"1","name":"","addresses":["fd7a:115c:a1e0::1"]}"#)
                .expect("parses");
        assert_eq!(v6.dial_host().as_deref(), Some("[fd7a:115c:a1e0::1]"));
        let none: TailnetDevice = serde_json::from_str(r#"{"id":"1","name":""}"#).expect("parses");
        assert_eq!(none.dial_host(), None);
    }

    #[test]
    fn refuses_a_tailnet_name_that_would_escape_its_path_segment() {
        assert!(usable_tailnet("-"));
        assert!(usable_tailnet("example.com"));
        assert!(usable_tailnet("person@example.com"));
        assert!(!usable_tailnet(""));
        assert!(!usable_tailnet("../keys"));
        assert!(!usable_tailnet("example.com/devices"));
        assert!(!usable_tailnet("example.com?fields=all"));
        assert!(!usable_tailnet(&"a".repeat(254)));
    }
}
