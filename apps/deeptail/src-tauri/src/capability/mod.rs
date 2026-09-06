//! The native capability authority.
//!
//! The page holds a mirror of what it may spend, and the mirror is only a
//! mirror: it decides what to draw. This module is the authority the mirror
//! reflects. It mints grants, ages them out, drops them when the pairing
//! context changes, and refuses a priced route the page holds no live grant
//! for — before the call reaches a host.
//!
//! What this is: a time-boxed, context-bound issuance. A grant lasts the TTL
//! the registry declares for its capability, is scoped to one host or to the
//! device as the registry declares, and every grant is dropped when the host
//! registry changes underneath it. A page that was never issued a grant, or
//! whose grant has aged out, cannot reach the route it pays for.
//!
//! What this is not: a per-call consent prompt. Issuance is not a question put
//! to the operator, and this module does not claim it is.

pub mod authority;
pub mod catalog;

#[cfg(test)]
mod tests;
