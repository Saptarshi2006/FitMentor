#![allow(dead_code)]

use futures::stream::{self, Stream, StreamExt};
use serde::Serialize;

/// LLM streaming client stub.
/// Works with any OpenAI-compatible API (OpenAI, Anthropic via proxy, etc.).
pub struct LlmClient {
    api_key: String,
    model: String,
    http: reqwest::Client,
}

#[derive(Debug, Clone, Serialize)]
pub struct ChatMessage {
    pub role: String,
    pub content: String,
}

#[derive(Debug, Serialize)]
struct LlmRequest {
    model: String,
    messages: Vec<ChatMessage>,
    stream: bool,
}

pub type BoxStream = std::pin::Pin<Box<dyn Stream<Item = anyhow::Result<String>> + Send>>;

impl LlmClient {
    pub fn new(api_key: String, model: String) -> Self {
        Self {
            api_key,
            model,
            http: reqwest::Client::new(),
        }
    }

    pub fn build_system_prompt(user_context: &str) -> String {
        format!(
            "You are FitMentor, an AI fitness coach. \
             Be concise, actionable, and encouraging. \
             User context:\n{user_context}"
        )
    }

    pub async fn stream_chat(&self, messages: Vec<ChatMessage>) -> anyhow::Result<BoxStream> {
        if self.api_key.is_empty() {
            return Ok(Box::pin(stream::once(async {
                Ok("AI coach is not configured. Set LLM_API_KEY to enable.".to_string())
            })));
        }

        let url = "https://api.openai.com/v1/chat/completions";
        let body = LlmRequest {
            model: self.model.clone(),
            messages,
            stream: true,
        };

        let resp = self
            .http
            .post(url)
            .bearer_auth(&self.api_key)
            .json(&body)
            .send()
            .await?
            .error_for_status()?;

        // TODO: parse SSE stream from resp.bytes_stream()
        let stream = resp
            .bytes_stream()
            .filter_map(|chunk| async move {
                match chunk {
                    Ok(bytes) => {
                        let text = String::from_utf8_lossy(&bytes).to_string();
                        Some(Ok(text))
                    }
                    Err(e) => Some(Err(e.into())),
                }
            });

        Ok(Box::pin(stream))
    }
}
