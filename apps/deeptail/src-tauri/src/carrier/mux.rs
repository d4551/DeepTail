use std::collections::HashMap;
use std::sync::Mutex;

use futures_util::{SinkExt, StreamExt};
use serde::Serialize;
use tauri::ipc::Channel;
use tokio::sync::mpsc;
use tokio_tungstenite::tungstenite::client::IntoClientRequest;
use tokio_tungstenite::tungstenite::Message;

use crate::hosts::HostRecord;

/// One event from the host's Remote stream mux, shaped so the page-side
/// adapter can present it as an ordinary `WebSocket` to the harness's own mux
/// client. The harness protocol is text-only, so binary frames never appear.
#[derive(Debug, Clone, Serialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum MuxFrame {
    Open,
    Message { data: String },
    Error { message: String },
    Close { code: u16, reason: String },
}

/// Live mux sockets, keyed by host id. One socket per host is all the harness
/// gateway needs: it multiplexes every logical stream over that single
/// connection.
#[derive(Default)]
pub struct MuxRegistry {
    senders: Mutex<HashMap<String, mpsc::UnboundedSender<Message>>>,
}

impl MuxRegistry {
    /// Open the mux socket for one host and pump its frames into `channel`.
    ///
    /// Holding the socket here rather than in the webview is what makes the
    /// connection possible at all: Tauri serves the page from a secure-context
    /// origin, which forbids `ws://` outright and cannot set an
    /// `Authorization` header on a handshake. Neither limit applies to us.
    ///
    /// # Errors
    /// Returns the handshake failure as a string when the socket cannot open;
    /// once open, later failures arrive on `channel` as [`MuxFrame::Error`]
    /// rather than as a return value.
    pub async fn open(
        &self,
        host: &HostRecord,
        token: &str,
        channel: Channel<MuxFrame>,
    ) -> Result<(), String> {
        let url = format!("{}/api/remote.mux", host.socket_origin());
        let mut request = url.into_client_request().map_err(|e| e.to_string())?;
        request
            .headers_mut()
            .insert("authorization", format!("Bearer {token}").parse().map_err(|_| "invalid device token".to_owned())?);

        let (socket, _) = tokio_tungstenite::connect_async(request).await.map_err(|e| e.to_string())?;
        let (mut write, mut read) = socket.split();
        let (tx, mut rx) = mpsc::unbounded_channel::<Message>();
        // Re-opening a host replaces its socket. Close the one being displaced
        // rather than dropping its sender: an orphaned pump task would hold the
        // old connection open against the host for as long as it stayed alive.
        if let Some(previous) = self.senders()?.insert(host.id.clone(), tx) {
            let _ = previous.send(Message::Close(None));
        }

        let _ = channel.send(MuxFrame::Open);

        // Outbound: whatever the page-side adapter sends.
        tokio::spawn(async move {
            while let Some(message) = rx.recv().await {
                if write.send(message).await.is_err() {
                    break;
                }
            }
        });

        // Inbound: text frames verbatim. The harness's own mux client parses
        // them, so the protocol has exactly one implementation.
        let id = host.id.clone();
        let registry_channel = channel.clone();
        tokio::spawn(async move {
            while let Some(next) = read.next().await {
                match next {
                    Ok(Message::Text(text)) => {
                        let _ = registry_channel.send(MuxFrame::Message { data: text.to_string() });
                    }
                    Ok(Message::Close(frame)) => {
                        let (code, reason) = frame
                            .map(|f| (u16::from(f.code), f.reason.to_string()))
                            .unwrap_or((1005, String::new()));
                        let _ = registry_channel.send(MuxFrame::Close { code, reason });
                        break;
                    }
                    Ok(_) => {
                        // The gateway sends text only; anything else means we
                        // are not talking to the protocol we think we are.
                        let _ = registry_channel.send(MuxFrame::Error {
                            message: format!("host {id} sent a non-text mux frame"),
                        });
                        break;
                    }
                    Err(error) => {
                        let _ = registry_channel.send(MuxFrame::Error { message: error.to_string() });
                        break;
                    }
                }
            }
        });
        Ok(())
    }

    /// Take the socket table, mapping poisoning to an ordinary error.
    fn senders(&self) -> Result<std::sync::MutexGuard<'_, HashMap<String, mpsc::UnboundedSender<Message>>>, String> {
        self.senders.lock().map_err(|_| "mux socket table lock was poisoned by an earlier panic".to_owned())
    }

    /// Send one text frame on an open socket.
    ///
    /// # Errors
    /// Returns an error when no socket is open for that host, or when the pump
    /// task has already exited.
    pub fn send(&self, host_id: &str, data: String) -> Result<(), String> {
        let senders = self.senders()?;
        let sender = senders.get(host_id).ok_or_else(|| format!("no open mux socket for host {host_id}"))?;
        sender.send(Message::text(data)).map_err(|_| format!("mux socket for host {host_id} is closed"))
    }

    /// Close and forget the socket for one host. Closing an absent socket is
    /// not an error — the caller's intent is already satisfied.
    ///
    /// # Errors
    /// Returns an error when the socket table lock is poisoned.
    pub fn close(&self, host_id: &str) -> Result<(), String> {
        if let Some(sender) = self.senders()?.remove(host_id) {
            let _ = sender.send(Message::Close(None));
        }
        Ok(())
    }
}
