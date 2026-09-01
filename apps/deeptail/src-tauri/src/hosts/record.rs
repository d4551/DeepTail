use serde::{Deserialize, Serialize};
use url::Url;

/// One harness host this installation has paired with.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HostRecord {
    /// Stable local identity; also the secret-store account name.
    pub id: String,
    /// Human-readable label shown in the host picker.
    pub label: String,
    /// Canonical origin, always scheme + authority with no path (`https://harness.example:3080`).
    pub origin: String,
    /// Epoch milliseconds of the last successful connection, absent until one succeeds.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub last_seen: Option<u64>,
}

/// Why an origin was refused when adding a host.
#[derive(Debug, thiserror::Error)]
pub enum OriginError {
    #[error("host origin {0:?} is not a valid absolute URL")]
    Unparsable(String),
    #[error("host origin {0:?} must be http or https")]
    Scheme(String),
    #[error("host origin {0:?} carries a path, query, or fragment; give scheme and authority only")]
    NotBare(String),
    #[error(
        "host origin {0:?} is plaintext and not loopback: the device token would cross the \
         network in the clear, so pair over https or reach the host through a tunnel"
    )]
    InsecureRemote(String),
}

impl HostRecord {
    /// Normalize and admit one operator-supplied origin.
    ///
    /// Plaintext is accepted only for loopback, matching the harness's own
    /// posture: its browser session cookie is not `Secure` and it terminates no
    /// TLS, which is tolerable on a local socket and not over a network.
    ///
    /// # Errors
    /// Returns [`OriginError`] when the origin is unparsable, is not an HTTP
    /// scheme, carries more than an authority, or is plaintext off loopback.
    pub fn canonical_origin(raw: &str) -> Result<String, OriginError> {
        let url = Url::parse(raw.trim()).map_err(|_| OriginError::Unparsable(raw.to_owned()))?;
        if !matches!(url.scheme(), "http" | "https") {
            return Err(OriginError::Scheme(raw.to_owned()));
        }
        if url.path() != "/" || url.query().is_some() || url.fragment().is_some() {
            return Err(OriginError::NotBare(raw.to_owned()));
        }
        let host = url.host_str().ok_or_else(|| OriginError::Unparsable(raw.to_owned()))?;
        if url.scheme() == "http" && !is_loopback(host) {
            return Err(OriginError::InsecureRemote(raw.to_owned()));
        }
        // `Url` already lowercased the host and dropped a default port.
        Ok(url.origin().ascii_serialization())
    }

    /// The `ws://` or `wss://` origin matching this host's HTTP origin.
    #[must_use]
    pub fn socket_origin(&self) -> String {
        if let Some(rest) = self.origin.strip_prefix("https://") {
            format!("wss://{rest}")
        } else if let Some(rest) = self.origin.strip_prefix("http://") {
            format!("ws://{rest}")
        } else {
            self.origin.clone()
        }
    }
}

/// Whether a URL host names the local loopback interface.
fn is_loopback(host: &str) -> bool {
    if host == "localhost" || host == "[::1]" {
        return true;
    }
    host.parse::<std::net::IpAddr>().is_ok_and(|ip| ip.is_loopback())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn accepts_https_and_drops_the_default_port() {
        assert_eq!(
            HostRecord::canonical_origin("https://harness.example:443").unwrap(),
            "https://harness.example"
        );
    }

    #[test]
    fn accepts_plaintext_loopback() {
        assert_eq!(
            HostRecord::canonical_origin("http://127.0.0.1:3080").unwrap(),
            "http://127.0.0.1:3080"
        );
    }

    #[test]
    fn refuses_plaintext_off_loopback() {
        let error = HostRecord::canonical_origin("http://harness.example:3080").unwrap_err();
        assert!(matches!(error, OriginError::InsecureRemote(_)));
    }

    #[test]
    fn refuses_an_origin_carrying_a_path() {
        let error = HostRecord::canonical_origin("https://harness.example/api").unwrap_err();
        assert!(matches!(error, OriginError::NotBare(_)));
    }

    #[test]
    fn socket_origin_tracks_the_scheme() {
        let secure = HostRecord {
            id: "a".into(),
            label: "a".into(),
            origin: "https://harness.example".into(),
            last_seen: None,
        };
        assert_eq!(secure.socket_origin(), "wss://harness.example");
    }
}
