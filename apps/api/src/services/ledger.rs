#![allow(dead_code)]

/// TigerBeetle ledger client stub.
/// Double-entry accounting for payment events.
/// Ponytail: HTTP client to TigerBeetle REST API, 2 account types.
pub struct LedgerClient {
    base_url: String,
    http: reqwest::Client,
}

#[derive(Debug, Clone)]
pub struct Transfer {
    pub debit_account_id: u128,
    pub credit_account_id: u128,
    pub amount: u64,
    pub ledger: u32,
    pub code: u16,
}

impl LedgerClient {
    pub fn new(base_url: String) -> Self {
        Self {
            base_url,
            http: reqwest::Client::new(),
        }
    }

    /// Create a double-entry transfer.
    pub async fn create_transfer(&self, transfer: Transfer) -> anyhow::Result<()> {
        // TODO: POST {base_url}/transfers
        tracing::info!(
            "TigerBeetle transfer: {} → {} amount={}",
            transfer.debit_account_id,
            transfer.credit_account_id,
            transfer.amount,
        );
        Ok(())
    }
}

// Account IDs (deterministic from user_id + type)
// Ponytail: simple hash, no external lookup needed.
pub mod accounts {
    /// Polar settlement account (where money comes from).
    pub const POLAR_SETTLEMENT: u128 = 1;
    /// Refund liability account.
    pub const REFUND_LIABILITY: u128 = 2;
    /// Base for user wallets: user_wallet(user_id) = 10000 + hash(user_id)
    pub fn user_wallet(user_id: &str) -> u128 {
        10_000 + simple_hash(user_id)
    }

    fn simple_hash(s: &str) -> u128 {
        s.bytes()
            .fold(0u128, |acc, b| acc.wrapping_mul(31).wrapping_add(b as u128))
            % 9_000
    }
}
