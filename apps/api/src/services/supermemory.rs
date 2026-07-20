#![allow(dead_code)]

use serde::{Deserialize, Serialize};

/// Supermemory client stub.
/// Full implementation: https://docs.supermemory.ai
/// Ponytail: HTTP client with API key, 3 endpoints (get context, search, ingest).
pub struct SupermemoryClient {
    api_key: String,
    http: reqwest::Client,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct MemoryContext {
    pub user_profile: Option<String>,
    pub relevant_memories: Vec<String>,
}

impl SupermemoryClient {
    pub fn new(api_key: String) -> Self {
        Self {
            api_key,
            http: reqwest::Client::new(),
        }
    }

    /// Get user context from Supermemory for coach prompts.
    pub async fn get_user_context(&self, _user_id: &str) -> anyhow::Result<MemoryContext> {
        if self.api_key.is_empty() {
            // Stub: return empty context when no key
            return Ok(MemoryContext {
                user_profile: None,
                relevant_memories: vec![],
            });
        }
        // TODO: GET https://api.supermemory.ai/v1/memories?user_id={user_id}
        todo!("Supermemory get_user_context")
    }

    /// Search relevant memories for a query.
    pub async fn search(&self, _user_id: &str, _query: &str) -> anyhow::Result<Vec<String>> {
        if self.api_key.is_empty() {
            return Ok(vec![]);
        }
        // TODO: POST https://api.supermemory.ai/v1/search
        todo!("Supermemory search")
    }

    /// Ingest a conversation summary after chat.
    pub async fn ingest(&self, _user_id: &str, _content: &str) -> anyhow::Result<()> {
        if self.api_key.is_empty() {
            return Ok(());
        }
        // TODO: POST https://api.supermemory.ai/v1/memories
        todo!("Supermemory ingest")
    }
}
