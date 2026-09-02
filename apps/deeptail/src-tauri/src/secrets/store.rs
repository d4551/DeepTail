use keyring_core::Entry;

use crate::tailscale::Credential;

/// Service name under which every DeepTail device token is filed.
const SERVICE: &str = "dev.deeptail.app";
/// The account name the tailnet credential is filed under.
///
/// Host ids come from a harness `deviceId`, so this name is prefixed with a
/// character no such id carries: an account collision would silently overwrite
/// one secret with the other.
const TAILNET_ACCOUNT: &str = "@tailscale";

/// Why a device token could not be read, written, or removed.
#[derive(Debug, thiserror::Error)]
pub enum SecretError {
    #[error("credential store unavailable: {0}")]
    Store(String),
    #[error("no device token is stored for host {0:?}; pair the host again")]
    Missing(String),
}

/// Reads and writes one device token per host id.
pub struct SecretStore {
    _private: (),
}

impl SecretStore {
    /// Install this platform's credential store as the process default.
    ///
    /// # Errors
    /// Returns [`SecretError::Store`] when the platform store cannot be
    /// constructed. That is fatal rather than degradable: the alternative is an
    /// app that appears to pair and silently forgets every token.
    pub fn initialize() -> Result<Self, SecretError> {
        #[cfg(target_os = "android")]
        keyring_core::set_default_store(
            android_native_keyring_store::Store::new()
                .map_err(|e| SecretError::Store(e.to_string()))?,
        );
        // The Apple crate exposes no store at its root, and the two targets do
        // not share one: the legacy keychain is compiled only on macOS, where it
        // serves an unsigned desktop build, while iOS compiles only the
        // protected-data store.
        #[cfg(target_os = "macos")]
        keyring_core::set_default_store(
            apple_native_keyring_store::keychain::Store::new()
                .map_err(|e| SecretError::Store(e.to_string()))?,
        );
        #[cfg(target_os = "ios")]
        keyring_core::set_default_store(
            apple_native_keyring_store::protected::Store::new()
                .map_err(|e| SecretError::Store(e.to_string()))?,
        );
        #[cfg(target_os = "windows")]
        keyring_core::set_default_store(
            windows_native_keyring_store::Store::new()
                .map_err(|e| SecretError::Store(e.to_string()))?,
        );
        #[cfg(target_os = "linux")]
        keyring_core::set_default_store(
            dbus_secret_service_keyring_store::Store::new()
                .map_err(|e| SecretError::Store(e.to_string()))?,
        );
        Ok(Self { _private: () })
    }

    /// Read the device token for one host.
    ///
    /// # Errors
    /// Returns [`SecretError::Missing`] when no token is filed for that host,
    /// or [`SecretError::Store`] when the platform store refuses the read.
    pub fn token(&self, host_id: &str) -> Result<String, SecretError> {
        let entry = Entry::new(SERVICE, host_id).map_err(|e| SecretError::Store(e.to_string()))?;
        match entry.get_password() {
            Ok(token) => Ok(token),
            Err(keyring_core::Error::NoEntry) => Err(SecretError::Missing(host_id.to_owned())),
            Err(error) => Err(SecretError::Store(error.to_string())),
        }
    }

    /// File the device token for one host, replacing any previous value.
    ///
    /// # Errors
    /// Returns [`SecretError::Store`] when the platform store refuses the write.
    pub fn store(&self, host_id: &str, token: &str) -> Result<(), SecretError> {
        let entry = Entry::new(SERVICE, host_id).map_err(|e| SecretError::Store(e.to_string()))?;
        entry
            .set_password(token)
            .map_err(|e| SecretError::Store(e.to_string()))
    }

    /// The stored tailnet credential, or `None` when the operator has not
    /// connected one.
    ///
    /// Absence is not an error here, unlike a missing device token: a host that
    /// has lost its token is broken, while an app with no tailnet credential is
    /// simply an app nobody connected to Tailscale.
    ///
    /// # Errors
    /// Returns [`SecretError::Store`] when the platform store refuses the read,
    /// or [`SecretError::Store`] when the stored value is not a credential this
    /// build understands.
    pub fn tailnet_credential(&self) -> Result<Option<Credential>, SecretError> {
        let entry =
            Entry::new(SERVICE, TAILNET_ACCOUNT).map_err(|e| SecretError::Store(e.to_string()))?;
        let stored = match entry.get_password() {
            Ok(value) => value,
            Err(keyring_core::Error::NoEntry) => return Ok(None),
            Err(error) => return Err(SecretError::Store(error.to_string())),
        };
        serde_json::from_str(&stored).map(Some).map_err(|e| {
            SecretError::Store(format!("stored tailnet credential is unreadable: {e}"))
        })
    }

    /// File the tailnet credential, replacing any previous one.
    ///
    /// # Errors
    /// Returns [`SecretError::Store`] when the credential cannot be serialized
    /// or the platform store refuses the write.
    pub fn store_tailnet_credential(&self, credential: &Credential) -> Result<(), SecretError> {
        let entry =
            Entry::new(SERVICE, TAILNET_ACCOUNT).map_err(|e| SecretError::Store(e.to_string()))?;
        let encoded =
            serde_json::to_string(credential).map_err(|e| SecretError::Store(e.to_string()))?;
        entry
            .set_password(&encoded)
            .map_err(|e| SecretError::Store(e.to_string()))
    }

    /// Remove the tailnet credential. Removing an absent one is not an error.
    ///
    /// # Errors
    /// Returns [`SecretError::Store`] when the platform store refuses the delete.
    pub fn forget_tailnet_credential(&self) -> Result<(), SecretError> {
        self.forget(TAILNET_ACCOUNT)
    }

    /// Remove the device token for one host. Removing an absent token is not an
    /// error — the caller's intent is already satisfied.
    ///
    /// # Errors
    /// Returns [`SecretError::Store`] when the platform store refuses the delete.
    pub fn forget(&self, host_id: &str) -> Result<(), SecretError> {
        let entry = Entry::new(SERVICE, host_id).map_err(|e| SecretError::Store(e.to_string()))?;
        match entry.delete_credential() {
            Ok(()) | Err(keyring_core::Error::NoEntry) => Ok(()),
            Err(error) => Err(SecretError::Store(error.to_string())),
        }
    }
}
