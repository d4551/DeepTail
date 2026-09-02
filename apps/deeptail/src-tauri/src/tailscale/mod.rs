//! Reaching harness hosts over a tailnet.
//!
//! Two halves that answer to the same fact. [`net`] decides whether a URL names
//! a tailnet peer, which is what makes plaintext admissible: the wire is
//! WireGuard whatever the scheme says. [`api`] lists a tailnet through
//! Tailscale's control-plane API, so a host is chosen from a list of machines
//! the operator already owns rather than typed as a URL.
//!
//! The credential stays on this side of the IPC boundary with every other
//! secret the app holds. The webview receives device records and never the key
//! that listed them.

pub mod api;
pub mod net;

pub use api::{Credential, DEFAULT_TAILNET, TailnetDevice, TailscaleClient};
pub use net::is_tailnet_host;
