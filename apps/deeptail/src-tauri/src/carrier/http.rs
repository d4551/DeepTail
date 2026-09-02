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
/// A refusal is not an error here: an authentication failure is something the
/// caller must be able to read and act on, so it is returned as the status it
/// is rather than raised as a transport failure.
///
/// # Errors
/// Returns [`CarrierError`] when the path is not a relative `/api` path or the
/// transport fails.
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

    // Every status the host answers with is carried to the webview as a status,
    // including the ones it refuses on. Turning 401 into a transport failure
    // here made a revoked token indistinguishable from an unreachable host, so
    // the one state the operator can actually clear — pair this host again —
    // could never be reached: the surface that offers it reads the status, and
    // the status never arrived.
    let status = response.status();
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
    use tokio::io::{AsyncReadExt, AsyncWriteExt};
    use tokio::net::TcpListener;

    const ORIGIN: &str = "https://harness.example:3080";

    /// Answer one request with the given status line and an empty body.
    ///
    /// The point of the test below is what crosses the IPC boundary, so the
    /// host is a real socket rather than a stubbed client: a status the code
    /// swallows cannot be faked back into existence.
    async fn serve_once(status: &'static str) -> String {
        let listener = TcpListener::bind("127.0.0.1:0").await.expect("bind a loopback port");
        let origin = format!("http://{}", listener.local_addr().expect("read the bound port"));
        tokio::spawn(async move {
            let (mut socket, _) = listener.accept().await.expect("accept one request");
            let mut scratch = [0_u8; 1024];
            let _ = socket.read(&mut scratch).await;
            let reply = format!("HTTP/1.1 {status}\r\ncontent-length: 0\r\nconnection: close\r\n\r\n");
            let _ = socket.write_all(reply.as_bytes()).await;
            let _ = socket.shutdown().await;
        });
        origin
    }

    #[tokio::test]
    async fn carries_a_refused_status_to_the_webview_rather_than_failing() {
        let origin = serve_once("401 Unauthorized").await;
        let host = HostRecord { id: "h-1".to_owned(), label: "Test host".to_owned(), origin };
        let request = FetchRequest {
            path: "/api/session/list".to_owned(),
            method: "POST".to_owned(),
            headers: Vec::new(),
            body: None,
        };
        let response = call(&reqwest::Client::new(), &host, "stale-token", request)
            .await
            .expect("a refusal is a response, not a transport failure");
        // The surface that offers re-pairing reads this number. Raising instead
        // would leave a revoked token looking exactly like an offline host.
        assert_eq!(response.status, 401);
    }

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
