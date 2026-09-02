//! The wire. Everything DeepTail sends to a harness host goes through here, so
//! the device token is attached in exactly one place and never crosses into
//! JavaScript.

mod http;
mod mux;

pub use http::{call, FetchRequest, FetchResponse};
pub use mux::{MuxFrame, MuxRegistry};
