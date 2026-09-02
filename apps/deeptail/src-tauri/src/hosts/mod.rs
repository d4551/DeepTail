//! The host registry: which harness hosts this installation knows, how to
//! reach them, and what to call them. Nothing secret lives here — the device
//! token for each host is held by [`crate::secrets`] in the platform's own
//! credential store, and this file is deliberately readable.

mod record;
mod store;

pub use record::{HostRecord, OriginError};
pub use store::HostStore;
