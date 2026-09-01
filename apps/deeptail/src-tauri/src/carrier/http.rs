use serde::{Deserialize, Serialize};
use url::Url;

use crate::hosts::HostRecord;

/// Why a call to a harness host failed before the caller saw a response.
#[derive(Debug, thiserror::Error)]
pub enum CarrierError {
    #[error("request to {origin} failed: {source}")]
    Transport { origin: String, source: reqwest::Error },
    #[error("request path {0:?} does not resolve to an /api path on this host")]
    BadPath(String),
    #[error("request method {0:?} is not a valid HTTP method")]
    BadMethod(String),
    #[error("host rejected the device token (HTTP {0}); pair this host again")]
    Unauthorized(u16),
}

/// One unary call the webview asked us to make, mirroring the `RpcFetch` seam
/// the harness client expects: a URL plus the init fields it actually sets.
#[derive(Debug, Deserialize)]
pub struct FetchRequest {
    /// Path and query below the host origin, always beginning with `/api`.
    pub path: String,
    pub method: String,
    #[serde(default)]
    pub headers: Vec<(String, String)>,
    /// UTF-8 request body; the harness `/api` carrier is JSON-only.
    #[serde(default)]
    pub body: Option<String>,
}

/// The response, flattened for the IPC boundary.
#[derive(Debug, Serialize)]
pub struct FetchResponse {
    pub status: u16,
    pub headers: Vec<(String, String)>,
    pub body: String,
}


/// Resolve a page-supplied path against a host origin, admitting only `/api`.
///
/// The check runs AFTER parsing rather than before: `/api/../admin` passes a
/// prefix test and then normalises away, so a prefix check would let the bearer
/// reach a route the page was never granted. Parsing first, then asserting both
/// the resolved origin and the resolved path, closes that.
///
/// # Errors
/// Returns [`CarrierError::BadPath`] when the origin is unparsable, the path
/// escapes the host, or the result is not under `/api`.
fn resolve_api_url(origin: &str, path: &str) -> Result<Url, CarrierError> {
    let base = Url::parse(origin).map_err(|_| CarrierError::BadPath(origin.to_owned()))?;
    let url = base.join(path).map_err(|_| CarrierError::BadPath(path.to_owned()))?;
    if url.origin() != base.origin() || !(url.path() == "/api" || url.path().starts_with("/api/")) {
        return Err(CarrierError::BadPath(path.to_owned()));
    }
    Ok(url)
}

/// Perform one authenticated call against a host.
///
/// # Errors
/// Returns [`CarrierError`] when the path is not a relative `/api` path, the
/// transport fails, or the host rejects the device token.
pub async fn call(
    client: &reqwest::Client,
    host: &HostRecord,
    token: &str,
    request: FetchRequest,
) -> Result<FetchResponse, CarrierError> {
    let url = resolve_api_url(&host.origin, &request.path)?;
    let method = reqwest::Method::from_bytes(request.method.as_bytes())
        .map_err(|_| CarrierError::BadMethod(request.method.clone()))?;

    let mut builder = client.request(method, url.clone()).bearer_auth(token);
    for (name, value) in request.headers {
        builder = builder.header(name, value);
    }
    if let Some(body) = request.body {
        builder = builder.body(body);
    }

    let response = builder
        .send()
        .await
        .map_err(|source| CarrierError::Transport { origin: host.origin.clone(), source })?;

    let status = response.status();
    if status == reqwest::StatusCode::UNAUTHORIZED {
        return Err(CarrierError::Unauthorized(status.as_u16()));
    }
    let headers = response
        .headers()
        .iter()
        .filter_map(|(name, value)| value.to_str().ok().map(|v| (name.to_string(), v.to_owned())))
        .collect();
    let body = response
        .text()
        .await
        .map_err(|source| CarrierError::Transport { origin: host.origin.clone(), source })?;

    Ok(FetchResponse { status: status.as_u16(), headers, body })
}

#[cfg(test)]
mod tests {
    use super::*;

    const ORIGIN: &str = "https://harness.example:3080";

    #[test]
    fn admits_an_ordinary_api_path() {
        let url = resolve_api_url(ORIGIN, "/api/session/list").unwrap();
        assert_eq!(url.as_str(), "https://harness.example:3080/api/session/list");
    }

    #[test]
    fn keeps_the_query_string() {
        let url = resolve_api_url(ORIGIN, "/api/boot?rev=7").unwrap();
        assert_eq!(url.query(), Some("rev=7"));
    }

    #[test]
    fn refuses_a_traversal_that_escapes_api() {
        let error = resolve_api_url(ORIGIN, "/api/../admin").unwrap_err();
        assert!(matches!(error, CarrierError::BadPath(_)));
    }

    #[test]
    fn refuses_a_prefix_lookalike() {
        let error = resolve_api_url(ORIGIN, "/apikeys").unwrap_err();
        assert!(matches!(error, CarrierError::BadPath(_)));
    }

    #[test]
    fn refuses_an_absolute_url_to_another_host() {
        let error = resolve_api_url(ORIGIN, "https://evil.example/api/session/list").unwrap_err();
        assert!(matches!(error, CarrierError::BadPath(_)));
    }

    #[test]
    fn refuses_a_protocol_relative_url() {
        let error = resolve_api_url(ORIGIN, "//evil.example/api/x").unwrap_err();
        assert!(matches!(error, CarrierError::BadPath(_)));
    }
}
