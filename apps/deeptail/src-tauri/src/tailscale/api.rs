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

/// Where Tailscale's own control plane lives.
pub const API_BASE: &str = "https://api.tailscale.com";
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
    /// as already expired rather than as eternal, so the next call mints again
    /// instead of presenting a bearer of unknown age forever.
    #[serde(default)]
    expires_in: Option<u64>,
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
    /// The control plane to call.
    ///
    /// A field rather than a constant because Tailscale's is not the only one:
    /// a self-hosted control plane speaks the same API at its own origin, and
    /// the value is what the caller was configured with rather than what this
    /// module assumes.
    base: String,
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

/// Send one request and read its status the way every caller needs: a 401 or
/// 403 is a refused credential, any other non-success carries the response
/// body as context, and a success is returned for the caller to decode.
///
/// # Errors
/// Returns [`TailscaleError`] when the transport fails, the credential is
/// refused, or the control plane answers with a non-success status.
async fn send_admitted(
    request: reqwest::RequestBuilder,
) -> Result<reqwest::Response, TailscaleError> {
    let response = request
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
    Ok(response)
}

impl TailscaleClient {
    /// Build a client for Tailscale's own control plane.
    #[must_use]
    pub fn new(http: reqwest::Client, credential: Credential) -> Self {
        Self::at(http, API_BASE, credential)
    }

    /// Build a client for one control plane.
    #[must_use]
    pub fn at(http: reqwest::Client, base: &str, credential: Credential) -> Self {
        Self {
            http,
            base: base.trim_end_matches('/').to_owned(),
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
        let request = self
            .http
            .post(format!("{}/api/v2/oauth/token", self.base))
            .form(&[
                ("grant_type", "client_credentials"),
                ("client_id", client_id.as_str()),
                ("client_secret", client_secret.as_str()),
            ]);
        let response = send_admitted(request).await?;
        let grant: AccessGrant = response
            .json()
            .await
            .map_err(|error| TailscaleError::Malformed(error.to_string()))?;
        let value = grant.access_token;
        *cached = Some(CachedToken {
            value: value.clone(),
            expires_at: Instant::now() + Duration::from_secs(grant.expires_in.unwrap_or(0)),
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
            .get(format!("{}/api/v2/tailnet/{tailnet}/devices", self.base))
            .query(&[("fields", "all")]);
        let response = send_admitted(self.authenticate(request).await?).await?;
        let list: DeviceList = response
            .json()
            .await
            .map_err(|error| TailscaleError::Malformed(error.to_string()))?;
        Ok(list.devices)
    }
}

#[cfg(test)]
mod tests;
