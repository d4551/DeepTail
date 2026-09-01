use std::sync::Mutex;

use tauri::{AppHandle, Manager, Runtime};

use super::record::HostRecord;

/// Why the registry could not be read or written.
#[derive(Debug, thiserror::Error)]
pub enum HostStoreError {
    #[error("host registry i/o failed: {0}")]
    Io(#[from] std::io::Error),
    #[error("host registry is not valid JSON: {0}")]
    Decode(#[from] serde_json::Error),
    #[error("no application data directory is available on this platform")]
    NoDataDir,
    #[error("no host is registered under id {0:?}")]
    Unknown(String),
    #[error("host registry lock was poisoned by an earlier panic")]
    Poisoned,
}

/// The non-secret host registry, persisted as one JSON file in the app data
/// directory. Reads are served from memory; every mutation rewrites the file
/// before returning, so a crash cannot leave the caller believing a host was
/// saved when it was not.
pub struct HostStore {
    path: std::path::PathBuf,
    hosts: Mutex<Vec<HostRecord>>,
}

impl HostStore {
    /// Load the registry, creating an empty one on first run.
    ///
    /// # Errors
    /// Returns [`HostStoreError`] when the data directory is unavailable or the
    /// existing file cannot be read or decoded. A corrupt file is surfaced
    /// rather than silently replaced: it holds the only record of which hosts
    /// the operator paired.
    pub fn load<R: Runtime>(app: &AppHandle<R>) -> Result<Self, HostStoreError> {
        let dir = app.path().app_data_dir().map_err(|_| HostStoreError::NoDataDir)?;
        std::fs::create_dir_all(&dir)?;
        let path = dir.join("hosts.json");
        let hosts = match std::fs::read(&path) {
            Ok(bytes) => serde_json::from_slice(&bytes)?,
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => Vec::new(),
            Err(error) => return Err(error.into()),
        };
        Ok(Self { path, hosts: Mutex::new(hosts) })
    }

    /// Every registered host, in insertion order.
    ///
    /// # Errors
    /// Returns [`HostStoreError::Poisoned`] when an earlier panic left the lock
    /// unusable. A command reports that; it does not take the process down.
    pub fn list(&self) -> Result<Vec<HostRecord>, HostStoreError> {
        Ok(self.locked()?.clone())
    }

    /// Take the registry lock, mapping poisoning to an ordinary error.
    fn locked(&self) -> Result<std::sync::MutexGuard<'_, Vec<HostRecord>>, HostStoreError> {
        self.hosts.lock().map_err(|_| HostStoreError::Poisoned)
    }

    /// One host by id.
    ///
    /// # Errors
    /// Returns [`HostStoreError::Unknown`] when no host carries that id.
    pub fn get(&self, id: &str) -> Result<HostRecord, HostStoreError> {
        self.locked()?
            .iter()
            .find(|host| host.id == id)
            .cloned()
            .ok_or_else(|| HostStoreError::Unknown(id.to_owned()))
    }

    /// Insert or replace one host, then persist.
    ///
    /// # Errors
    /// Returns [`HostStoreError`] when the registry cannot be written.
    pub fn upsert(&self, record: HostRecord) -> Result<(), HostStoreError> {
        let mut hosts = self.locked()?;
        match hosts.iter_mut().find(|host| host.id == record.id) {
            Some(existing) => *existing = record,
            None => hosts.push(record),
        }
        Self::persist(&self.path, &hosts)
    }

    /// Remove one host, then persist. Removing a host the registry does not
    /// hold is not an error — the caller's intent is already satisfied.
    ///
    /// # Errors
    /// Returns [`HostStoreError`] when the registry cannot be written.
    pub fn remove(&self, id: &str) -> Result<(), HostStoreError> {
        let mut hosts = self.locked()?;
        hosts.retain(|host| host.id != id);
        Self::persist(&self.path, &hosts)
    }

    /// Write the registry through a temporary file so an interrupted write
    /// cannot truncate the existing one.
    fn persist(path: &std::path::Path, hosts: &[HostRecord]) -> Result<(), HostStoreError> {
        let staged = path.with_extension("json.tmp");
        std::fs::write(&staged, serde_json::to_vec_pretty(hosts)?)?;
        std::fs::rename(&staged, path)?;
        Ok(())
    }
}
