//! What the authority issues, refuses, and forgets.

use super::authority::{route_of, Denial, GrantAuthority};
use super::catalog;

/// A fixed instant, so expiry is decided by the test rather than by the clock.
const NOW: u64 = 1_700_000_000_000;

#[test]
fn issues_one_grant_per_declared_capability_and_host() {
    let authority = GrantAuthority::default();
    let hosts = vec!["dev-1".to_owned(), "lab-2".to_owned()];
    let snapshot = authority.issue(&hosts, NOW);
    assert_eq!(snapshot.issuer, "native");
    assert!(!snapshot.context.is_empty(), "a snapshot must name its context");
    let device = catalog::CAPABILITIES
        .iter()
        .filter(|entry| entry.subject == catalog::Subject::Device)
        .count();
    let per_host = catalog::CAPABILITIES
        .iter()
        .filter(|entry| entry.subject == catalog::Subject::Host)
        .count();
    // A host-scoped capability is issued once per paired host; a device-scoped
    // one exactly once however many hosts are paired.
    assert_eq!(snapshot.grants.len(), device + per_host * hosts.len());
}

#[test]
fn refuses_a_capability_that_was_never_issued() {
    let authority = GrantAuthority::default();
    let first = catalog::CAPABILITIES[0].id;
    assert_eq!(authority.spend(first, "dev-1", NOW), Err(Denial::NoGrant));
}

#[test]
fn refuses_a_route_naming_a_capability_the_registry_does_not_declare() {
    let authority = GrantAuthority::default();
    let _issued = authority.issue(&["dev-1".to_owned()], NOW);
    assert_eq!(
        authority.spend("session.invented", "dev-1", NOW),
        Err(Denial::Undeclared)
    );
}

#[test]
fn spends_a_live_grant_and_refuses_it_once_it_has_aged_out() {
    let authority = GrantAuthority::default();
    let _issued = authority.issue(&["dev-1".to_owned()], NOW);
    let declared = catalog::descriptor("session.open").expect("session.open is declared");
    let ttl_ms = declared.ttl_seconds * 1000;
    assert_eq!(authority.spend("session.open", "dev-1", NOW), Ok(()));
    assert_eq!(
        authority.spend("session.open", "dev-1", NOW + ttl_ms - 1),
        Ok(())
    );
    // The boundary is exclusive: a grant is spent while it is live, not at the
    // instant it lapses.
    assert_eq!(
        authority.spend("session.open", "dev-1", NOW + ttl_ms),
        Err(Denial::Expired)
    );
}

#[test]
fn will_not_spend_one_hosts_grant_on_another() {
    let authority = GrantAuthority::default();
    let _issued = authority.issue(&["dev-1".to_owned()], NOW);
    let host_scoped = catalog::CAPABILITIES
        .iter()
        .find(|entry| entry.subject == catalog::Subject::Host)
        .expect("the registry declares at least one host-scoped capability");
    assert_eq!(authority.spend(host_scoped.id, "dev-1", NOW), Ok(()));
    assert_eq!(
        authority.spend(host_scoped.id, "lab-2", NOW),
        Err(Denial::NoGrant)
    );
}

#[test]
fn drops_every_grant_when_the_pairing_context_changes() {
    let authority = GrantAuthority::default();
    let _issued = authority.issue(&["dev-1".to_owned()], NOW);
    assert_eq!(authority.spend("session.open", "dev-1", NOW), Ok(()));
    authority.invalidate();
    assert_eq!(
        authority.spend("session.open", "dev-1", NOW),
        Err(Denial::NoGrant)
    );
}

#[test]
fn a_reissue_replaces_what_it_does_not_cover() {
    let authority = GrantAuthority::default();
    let _issued = authority.issue(&["dev-1".to_owned(), "lab-2".to_owned()], NOW);
    assert_eq!(authority.spend("session.open", "lab-2", NOW), Ok(()));
    // lab-2 has been forgotten. Issuance is the whole of what may be spent, so
    // its grant does not survive the next one.
    let second = authority.issue(&["dev-1".to_owned()], NOW);
    assert_eq!(authority.spend("session.open", "dev-1", NOW), Ok(()));
    assert_eq!(
        authority.spend("session.open", "lab-2", NOW),
        Err(Denial::NoGrant)
    );
    assert!(second.grants.iter().all(|grant| grant.revision == 2));
}

#[test]
fn every_issued_grant_names_a_capability_the_page_can_read() {
    let authority = GrantAuthority::default();
    let snapshot = authority.issue(&["dev-1".to_owned()], NOW);
    for grant in &snapshot.grants {
        assert!(
            catalog::descriptor(grant.capability).is_some(),
            "issued an undeclared capability: {}",
            grant.capability
        );
        assert!(grant.expires_at > NOW, "issued a grant already expired");
    }
}

#[test]
fn reads_the_route_out_of_a_request_path() {
    assert_eq!(route_of("/api/session/list"), Some("session/list"));
    assert_eq!(route_of("/api/session/list?after=3"), Some("session/list"));
    assert_eq!(route_of("/api/session/list/"), Some("session/list"));
    assert_eq!(route_of("/api/session/list#frag"), Some("session/list"));
}

#[test]
fn reads_no_route_out_of_a_path_that_is_not_one() {
    assert_eq!(route_of("/plugin/bundle.js"), None);
    assert_eq!(route_of("/api/"), None);
    assert_eq!(route_of("/api"), None);
    assert_eq!(route_of(""), None);
}

#[test]
fn every_priced_route_names_a_declared_capability() {
    // The two halves of the generated table are emitted from one registry, and
    // a route priced in a capability that table does not declare would refuse
    // every call to it with `Undeclared` — a route nothing could ever reach.
    for entry in catalog::ROUTE_CAPABILITIES {
        assert!(
            catalog::descriptor(entry.capability).is_some(),
            "route {} is priced in undeclared {}",
            entry.route,
            entry.capability
        );
    }
}

#[test]
fn prices_each_route_exactly_once() {
    // The lookup is a `find`, so a second row for a route is unreachable by
    // construction and could never disagree with its twin loudly enough to be
    // noticed. The emitter dedupes; this is what says so.
    let mut seen: Vec<&str> = Vec::new();
    for entry in catalog::ROUTE_CAPABILITIES {
        assert!(
            !seen.contains(&entry.route),
            "route {} is priced twice",
            entry.route
        );
        seen.push(entry.route);
    }
}
