//! A loopback control plane every tailscale test shares: it answers scripted
//! bodies and records what it was asked for.
//!
//! The requests are the evidence. Whether a token is reused or minted again
//! is not visible in what `devices` returns, and an accessor added to read
//! the cache would be a hole in the type opened for the tests; how many
//! times the token endpoint is called says the same thing from outside.

use std::sync::{Arc, Mutex};

use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::TcpListener;

use super::api::Credential;

/// A loopback HTTP server answering `bodies` in order, recording every request.
pub(crate) struct ControlPlane {
    pub(crate) base: String,
    seen: Arc<Mutex<Vec<String>>>,
}

impl ControlPlane {
    /// Start one, answering `bodies` in order.
    pub(crate) async fn start(bodies: Vec<(u16, String)>) -> Self {
        let listener = TcpListener::bind("127.0.0.1:0").await.expect("bind a loopback port");
        let base = format!("http://{}", listener.local_addr().expect("read the bound port"));
        let seen = Arc::new(Mutex::new(Vec::new()));
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
    pub(crate) fn requests(&self) -> Vec<String> {
        self.seen.lock().map(|log| log.clone()).unwrap_or_default()
    }

    /// How many of them went to the OAuth token endpoint.
    pub(crate) fn token_exchanges(&self) -> usize {
        self.requests().iter().filter(|request| request.contains("/api/v2/oauth/token")).count()
    }
}

/// A JSON grant with the given token and lifetime.
pub(crate) fn grant(token: &str, seconds: u64) -> (u16, String) {
    (200, format!(r#"{{"access_token":"{token}","expires_in":{seconds}}}"#))
}

/// An empty device listing.
pub(crate) fn empty_listing() -> (u16, String) {
    (200, r#"{"devices":[]}"#.to_owned())
}

/// An OAuth client, which is the credential that mints access tokens.
pub(crate) fn oauth() -> Credential {
    Credential::OauthClient { client_id: "id".to_owned(), client_secret: "secret".to_owned() }
}
