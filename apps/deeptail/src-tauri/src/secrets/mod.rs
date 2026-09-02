//! Device tokens and the tailnet credential, held in the platform's own
//! credential store.
//!
//! The all-in-one `keyring` crate covers only desktop in its default feature,
//! so this uses `keyring-core` with exactly one native store linked per target.
//! That is what makes iOS and Android work at all.

mod store;

pub use store::SecretStore;
