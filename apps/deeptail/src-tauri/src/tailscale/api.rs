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
        let response = self
            .http
            .post(format!("{}/api/v2/oauth/token", self.base))
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
            .get(format!("{}/api/v2/tailnet/{tailnet}/devices", self.base))
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
    use std::sync::{Arc, Mutex as StdMutex};

    use tokio::io::{AsyncReadExt, AsyncWriteExt};
    use tokio::net::TcpListener;

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

    /// A loopback control plane that answers scripted bodies and records what
    /// it was asked for.
    ///
    /// The requests are the evidence. Whether a token is reused or minted again
    /// is not visible in what `devices` returns, and an accessor added to read
    /// the cache would be a hole in the type opened for the tests; how many
    /// times the token endpoint is called says the same thing from outside.
    struct ControlPlane {
        base: String,
        seen: Arc<StdMutex<Vec<String>>>,
    }

    impl ControlPlane {
        /// Start one, answering `bodies` in order.
        async fn start(bodies: Vec<(u16, String)>) -> Self {
            let listener = TcpListener::bind("127.0.0.1:0").await.expect("bind a loopback port");
            let base = format!("http://{}", listener.local_addr().expect("read the bound port"));
            let seen = Arc::new(StdMutex::new(Vec::new()));
            let recorder = Arc::clone(&seen);
            tokio::spawn(async move {
                for (status, body) in bodies {
                    let Ok((mut socket, _)) = listener.accept().await else { return };
                    let mut scratch = [0_u8; 4096];
                    let read = socket.read(&mut scratch).await.unwrap_or(0);
                    let request = String::from_utf8_lossy(&scratch[..read]).into_owned();
                    if let Ok(mut log) = recorder.lock() {
                        log.push(request);
                    }
                    let reply = format!(
                        "HTTP/1.1 {status} X\r\ncontent-type: application/json\r\ncontent-length: {}\r\nconnection: close\r\n\r\n{body}",
                        body.len()
                    );
                    let _ = socket.write_all(reply.as_bytes()).await;
                    let _ = socket.shutdown().await;
                }
            });
            Self { base, seen }
        }

        /// Every request it was sent, in order.
        fn requests(&self) -> Vec<String> {
            self.seen.lock().map(|log| log.clone()).unwrap_or_default()
        }

        /// How many of them went to the OAuth token endpoint.
        fn token_exchanges(&self) -> usize {
            self.requests().iter().filter(|request| request.contains("/api/v2/oauth/token")).count()
        }
    }

    /// A JSON grant with the given token and lifetime.
    fn grant(token: &str, seconds: u64) -> (u16, String) {
        (200, format!(r#"{{"access_token":"{token}","expires_in":{seconds}}}"#))
    }

    /// An empty device listing.
    fn empty_listing() -> (u16, String) {
        (200, r#"{"devices":[]}"#.to_owned())
    }

    /// An OAuth client, which is the credential that mints access tokens.
    fn oauth() -> Credential {
        Credential::OauthClient { client_id: "id".to_owned(), client_secret: "secret".to_owned() }
    }

    #[tokio::test]
    async fn presents_the_bearer_it_was_granted_when_it_lists() {
        let plane = ControlPlane::start(vec![
            grant("tok-1", 3600),
            (200, r#"{"devices":[{"id":"1","name":"a.ts.net"}]}"#.to_owned()),
        ])
        .await;
        let client = TailscaleClient::at(reqwest::Client::new(), &plane.base, oauth());
        let devices = client.devices(DEFAULT_TAILNET).await.expect("the listing succeeds");
        assert_eq!(devices.len(), 1);
        let requests = plane.requests();
        let listing = requests.get(1).expect("the listing reached the control plane");
        assert!(listing.contains("authorization: Bearer tok-1"), "listing sent: {listing}");
        assert!(listing.contains("fields=all"), "listing sent: {listing}");
    }

    #[tokio::test]
    async fn presents_an_api_key_as_basic_with_no_password() {
        // Tailscale authenticates an API key as the username of a Basic pair,
        // which is `dGVzdC1rZXk6` — "test-key:" — and not a bearer.
        let plane = ControlPlane::start(vec![empty_listing()]).await;
        let client =
            TailscaleClient::at(reqwest::Client::new(), &plane.base, Credential::ApiKey { key: "test-key".to_owned() });
        client.devices(DEFAULT_TAILNET).await.expect("the listing succeeds");
        let requests = plane.requests();
        let listing = requests.first().expect("the listing reached the control plane");
        assert!(listing.contains("authorization: Basic dGVzdC1rZXk6"), "listing sent: {listing}");
        assert_eq!(plane.token_exchanges(), 0, "an API key mints nothing");
    }

    #[tokio::test]
    async fn reuses_a_token_that_is_outside_its_renewal_margin() {
        let plane = ControlPlane::start(vec![grant("tok-1", 3600), empty_listing(), empty_listing()]).await;
        let client = TailscaleClient::at(reqwest::Client::new(), &plane.base, oauth());
        client.devices(DEFAULT_TAILNET).await.expect("first listing");
        client.devices(DEFAULT_TAILNET).await.expect("second listing");
        assert_eq!(plane.token_exchanges(), 1, "the second listing minted a second token");
    }

    #[tokio::test]
    async fn mints_again_for_a_token_inside_its_renewal_margin() {
        // A lifetime under the margin means the token is already due, so the
        // second listing has to mint rather than present a bearer the control
        // plane is about to reject.
        let plane =
            ControlPlane::start(vec![grant("tok-1", 5), empty_listing(), grant("tok-2", 5), empty_listing()]).await;
        let client = TailscaleClient::at(reqwest::Client::new(), &plane.base, oauth());
        client.devices(DEFAULT_TAILNET).await.expect("first listing");
        client.devices(DEFAULT_TAILNET).await.expect("second listing");
        assert_eq!(plane.token_exchanges(), 2, "the second listing reused a token that was due");
        let requests = plane.requests();
        let second = requests.get(3).expect("the second listing reached the control plane");
        assert!(second.contains("authorization: Bearer tok-2"), "second listing sent: {second}");
    }

    #[tokio::test]
    async fn reports_a_refused_credential_as_unauthorized_rather_than_as_transport() {
        for status in [401_u16, 403] {
            let plane = ControlPlane::start(vec![(status, "{}".to_owned())]).await;
            let client =
                TailscaleClient::at(reqwest::Client::new(), &plane.base, Credential::ApiKey { key: "k".to_owned() });
            let error = client.devices(DEFAULT_TAILNET).await.expect_err("the credential is refused");
            assert!(
                matches!(error, TailscaleError::Unauthorized(code) if code == status),
                "HTTP {status} must map to Unauthorized, got {error:?}"
            );
        }
    }

    #[tokio::test]
    async fn reports_a_refused_token_exchange_rather_than_listing_without_one() {
        let plane = ControlPlane::start(vec![(401, "{}".to_owned())]).await;
        let client = TailscaleClient::at(reqwest::Client::new(), &plane.base, oauth());
        let error = client.devices(DEFAULT_TAILNET).await.expect_err("the exchange is refused");
        assert!(matches!(error, TailscaleError::Unauthorized(401)), "got {error:?}");
        assert_eq!(plane.requests().len(), 1, "nothing was listed without a token");
    }

    #[tokio::test]
    async fn refuses_a_tailnet_name_before_it_reaches_the_wire() {
        let plane = ControlPlane::start(vec![empty_listing()]).await;
        let client = TailscaleClient::at(reqwest::Client::new(), &plane.base, oauth());
        let error = client.devices("../keys").await.expect_err("the name is refused");
        assert!(matches!(error, TailscaleError::Tailnet(_)), "got {error:?}");
        assert!(plane.requests().is_empty(), "an unusable name reached the wire");
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
