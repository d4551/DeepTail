//! Device enrolment. The operator already performs one ceremony to reach a
//! harness host — `dsh web` prints a root URL carrying a single-use launch
//! token. Pairing reuses exactly that token rather than inventing a second
//! secret for a person to copy.
//!
//! On desktop the operator pastes the printed URL. On mobile the same URL is
//! scanned as a QR code, which is why `tauri-plugin-barcode-scanner` is a
//! mobile-only dependency.

use serde::Deserialize;
use url::Url;

use crate::hosts::{HostRecord, OriginError};

/// Why a pairing input was refused.
#[derive(Debug, thiserror::Error)]
pub enum PairingError {
    #[error(transparent)]
    Origin(#[from] OriginError),
    #[error("pairing link carries no ?token= parameter; copy the whole URL dsh printed")]
    NoToken,
    #[error("host refused the launch token (HTTP {0}); it expires when dsh restarts, so print a fresh URL")]
    Rejected(u16),
    #[error("host pairing response was not the expected JSON: {0}")]
    Malformed(String),
}

/// The host's answer to a pairing request.
#[derive(Debug, Deserialize)]
pub struct PairingGrant {
    /// Stable identity the host filed this device under.
    pub device_id: String,
    /// The long-lived bearer this device presents from now on.
    pub token: String,
}

/// Split a printed launch URL into the origin to register and the one-time
/// token to spend.
///
/// # Errors
/// Returns [`PairingError`] when the URL is not a usable host origin or
/// carries no launch token.
pub fn parse_link(link: &str) -> Result<(String, String), PairingError> {
    let url = Url::parse(link.trim()).map_err(|_| OriginError::Unparsable(link.to_owned()))?;
    let token = url
        .query_pairs()
        .find(|(key, _)| key == "token")
        .map(|(_, value)| value.into_owned())
        .ok_or(PairingError::NoToken)?;
    let origin = HostRecord::canonical_origin(&url.origin().ascii_serialization())?;
    Ok((origin, token))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn splits_a_printed_launch_url() {
        let (origin, token) = parse_link("https://harness.example:3080/?token=abc123").unwrap();
        assert_eq!(origin, "https://harness.example:3080");
        assert_eq!(token, "abc123");
    }

    #[test]
    fn refuses_a_url_without_a_token() {
        assert!(matches!(parse_link("https://harness.example/"), Err(PairingError::NoToken)));
    }

    #[test]
    fn refuses_a_plaintext_remote_host() {
        let error = parse_link("http://harness.example:3080/?token=abc").unwrap_err();
        assert!(matches!(error, PairingError::Origin(OriginError::InsecureRemote(_))));
    }
}
