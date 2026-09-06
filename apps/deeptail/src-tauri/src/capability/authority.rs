//! Who may spend what, and until when.

use std::collections::HashMap;
use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};

use serde::Serialize;

use super::catalog::{self, Subject};

/// The subject string a device-scoped grant is keyed and serialised under.
const DEVICE: &str = "device";

/// Milliseconds since the Unix epoch, which is the clock the page compares
/// `expiresAt` against.
///
/// # Panics
/// Panics only if the system clock is before the Unix epoch, which no host
/// this app can pair with can report.
#[must_use]
pub fn now_ms() -> u64 {
    u64::try_from(
        SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system clock is before the Unix epoch")
            .as_millis(),
    )
    .unwrap_or(u64::MAX)
}

/// One issued grant, in the shape the page's ledger reads.
#[derive(Debug, Clone, Serialize)]
pub struct Grant {
    /// The capability this grant pays for.
    pub capability: &'static str,
    /// `device`, or the id of the one host this grant covers.
    pub subject: String,
    /// Which issuance this grant belongs to; an older one never displaces a newer.
    pub revision: u64,
    /// When it stops being spendable, in milliseconds since the epoch.
    #[serde(rename = "expiresAt")]
    pub expires_at: u64,
}

/// Everything the page needs to mirror this authority.
#[derive(Debug, Clone, Serialize)]
pub struct Snapshot {
    /// Always `native`. The page refuses a snapshot claiming any other issuer.
    pub issuer: &'static str,
    /// Changes whenever the pairing context does, so nothing survives a re-pair.
    pub context: String,
    /// Every grant live at the moment the snapshot was taken.
    pub grants: Vec<Grant>,
}

/// Why a spend was refused.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Denial {
    /// Nothing was ever issued for this capability under this subject.
    NoGrant,
    /// A grant was issued and has aged out.
    Expired,
    /// The route named a capability the registry does not declare.
    Undeclared,
}

impl Denial {
    /// What the webview is told, which names the condition and nothing else.
    #[must_use]
    pub fn message(self) -> &'static str {
        match self {
            Self::NoGrant => "no live grant for this route",
            Self::Expired => "the grant for this route has expired",
            Self::Undeclared => "this route names no declared capability",
        }
    }
}

/// One issued grant as the authority holds it.
///
/// Only the expiry: the revision travels to the page, which uses it to refuse
/// a replayed snapshot, but the authority clears its books on every issuance
/// so there is no older grant here for a newer one to be compared against.
#[derive(Debug, Clone, Copy)]
struct Issued {
    expires_at: u64,
}

/// The authority's own books.
#[derive(Debug, Default)]
struct Books {
    context: String,
    revision: u64,
    live: HashMap<(String, String), Issued>,
}

/// The native authority. One per application.
#[derive(Debug, Default)]
pub struct GrantAuthority {
    books: Mutex<Books>,
}

impl GrantAuthority {
    /// The subject key one capability is issued under for one host.
    fn subject_of(capability: &str, host: &str) -> Option<String> {
        catalog::descriptor(capability).map(|declared| match declared.subject {
            Subject::Device => DEVICE.to_owned(),
            Subject::Host => host.to_owned(),
        })
    }

    /// Mint a fresh grant of every declared capability and return the mirror.
    ///
    /// Every previous grant is dropped: an issuance is the whole of what may be
    /// spent, not an addition to it, so a host that has just been forgotten
    /// cannot leave a grant behind.
    #[must_use]
    pub fn issue(&self, hosts: &[String], now: u64) -> Snapshot {
        let mut books = self.books.lock().unwrap_or_else(|held| held.into_inner());
        books.revision = books.revision.saturating_add(1);
        books.context = format!("{}-{}", uuid::Uuid::new_v4(), books.revision);
        books.live.clear();
        let revision = books.revision;
        let mut grants = Vec::new();
        for declared in catalog::CAPABILITIES {
            let subjects: Vec<String> = match declared.subject {
                Subject::Device => vec![DEVICE.to_owned()],
                Subject::Host => hosts.to_vec(),
            };
            for subject in subjects {
                let expires_at = now.saturating_add(declared.ttl_seconds.saturating_mul(1000));
                books
                    .live
                    .insert((declared.id.to_owned(), subject.clone()), Issued { expires_at });
                grants.push(Grant {
                    capability: declared.id,
                    subject,
                    revision,
                    expires_at,
                });
            }
        }
        Snapshot {
            issuer: "native",
            context: books.context.clone(),
            grants,
        }
    }

    /// Whether one capability may be spent for one host, right now.
    ///
    /// # Errors
    /// Returns the reason when the capability is undeclared, was never issued
    /// under this subject, or has aged out.
    pub fn spend(&self, capability: &str, host: &str, now: u64) -> Result<(), Denial> {
        let Some(subject) = Self::subject_of(capability, host) else {
            return Err(Denial::Undeclared);
        };
        let books = self.books.lock().unwrap_or_else(|held| held.into_inner());
        let Some(issued) = books.live.get(&(capability.to_owned(), subject)) else {
            return Err(Denial::NoGrant);
        };
        if issued.expires_at <= now {
            return Err(Denial::Expired);
        }
        Ok(())
    }

    /// Drop everything issued, so nothing survives a change of pairing.
    pub fn invalidate(&self) {
        let mut books = self.books.lock().unwrap_or_else(|held| held.into_inner());
        books.live.clear();
        books.context = String::new();
    }
}

/// The `namespace/method` a request path names, or None when it is not an
/// `/api` route.
///
/// The query is dropped and the leading `/api/` is stripped, so what is looked
/// up is exactly the spelling the registry declares.
#[must_use]
pub fn route_of(path: &str) -> Option<&str> {
    let without_query = path.split(['?', '#']).next().unwrap_or(path);
    let route = without_query.strip_prefix("/api/")?;
    if route.is_empty() {
        return None;
    }
    Some(route.trim_end_matches('/'))
}

/// Whether one request may be carried to one host.
///
/// A route the registry prices is one a DeepTail action reaches, and the page
/// may reach it only while this authority says so. A route it does not price is
/// the harness client's own call, made for itself once it has booted, and is
/// carried unpriced: this gate is the control plane's, not the client's.
///
/// Written as a decision over the authority rather than over the command's
/// state so it can be driven directly. It was reachable only through a Tauri
/// command before, which meant the refusal this whole module exists for was
/// never once exercised.
///
/// # Errors
/// Returns the reason, naming the route, when a priced route has no live grant.
pub fn admit(authority: &GrantAuthority, host: &str, path: &str, now: u64) -> Result<(), String> {
    let Some(route) = route_of(path) else {
        return Ok(());
    };
    let Some(needed) = catalog::capability_for_route(route) else {
        return Ok(());
    };
    authority
        .spend(needed, host, now)
        .map_err(|denial| format!("{route}: {}", denial.message()))
}
