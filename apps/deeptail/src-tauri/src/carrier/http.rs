use serde::{Deserialize, Serialize};

use crate::hosts::HostRecord;

/// Why a call to a harness host failed before the caller saw a response.
#[derive(Debug, thiserror::Error)]
pub enum CarrierError {
    #[error("request to {origin} failed: {source}")]
    Transport { origin: String, source: reqwest::Error },
    #[error("request path {0:?} is not a relative /api path")]
    BadPath(String),
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
    // The webview builds its URL against its own origin, so only the path is
    // meaningful here. Refusing anything else keeps a page from steering the
    // authenticated client at an arbitrary host.
    if !request.path.starts_with("/api") {
        return Err(CarrierError::BadPath(request.path));
    }
    let url = format!("{}{}", host.origin, request.path);
    let method = reqwest::Method::from_bytes(request.method.as_bytes())
        .map_err(|_| CarrierError::BadPath(request.method.clone()))?;

    let mut builder = client.request(method, &url).bearer_auth(token);
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
