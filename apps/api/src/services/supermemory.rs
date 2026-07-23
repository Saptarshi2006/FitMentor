use serde::{Deserialize, Serialize};

const SM_API: &str = "https://api.supermemory.ai";

#[derive(Clone)]
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

    pub fn is_enabled(&self) -> bool {
        !self.api_key.is_empty()
    }

    /// Get user context from Supermemory for coach prompts.
    pub async fn get_user_context(&self, _user_id: &str) -> anyhow::Result<MemoryContext> {
        if !self.is_enabled() {
            return Ok(MemoryContext {
                user_profile: None,
                relevant_memories: vec![],
            });
        }
        // TODO: POST /v4/profile
        Ok(MemoryContext {
            user_profile: None,
            relevant_memories: vec![],
        })
    }

    /// Search relevant memories for a query.
    pub async fn search(&self, _user_id: &str, _query: &str) -> anyhow::Result<Vec<String>> {
        if !self.is_enabled() {
            return Ok(vec![]);
        }
        // TODO: POST /v4/search
        Ok(vec![])
    }

    /// Store a conversation exchange in Supermemory.
    pub async fn ingest(&self, container_tag: &str, content: &str) -> anyhow::Result<()> {
        if !self.is_enabled() {
            return Ok(());
        }
        let body = serde_json::json!({
            "content": content,
            "containerTag": container_tag,
        });
        let res = self
            .http
            .post(format!("{SM_API}/v3/documents"))
            .header("Authorization", format!("Bearer {}", self.api_key))
            .header("Content-Type", "application/json")
            .json(&body)
            .send()
            .await?;
        if !res.status().is_success() {
            let status = res.status();
            let text = res.text().await.unwrap_or_default();
            anyhow::bail!("Supermemory ingest failed ({status}): {text}");
        }
        Ok(())
    }
}
