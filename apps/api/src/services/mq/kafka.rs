#![allow(dead_code)]
use anyhow::Result;
use serde::Serialize;

const TOPIC_USER_EVENTS: &str = "user_events";
const TOPIC_COACH_EVENTS: &str = "coach_events";
const TOPIC_PAYMENT_EVENTS: &str = "payment_events";

#[derive(Debug, Serialize, Clone)]
pub struct EventEnvelope {
    pub event_type: String,
    pub user_id: String,
    pub timestamp: String,
    pub data: serde_json::Value,
}

pub struct KafkaProducer {
    brokers: String,
}

impl KafkaProducer {
    pub fn new(brokers: String) -> Self {
        Self { brokers }
    }

    async fn publish(&self, topic: &str, event: &EventEnvelope) -> Result<()> {
        // ponytail: stub — no live producer; create rdkafka::FutureProducer here when ready
        tracing::info!(topic = topic, "kafka publish (stub) {:?}", serde_json::to_string(event));
        Ok(())
    }

    pub async fn log_user_event(&self, event: &EventEnvelope) -> Result<()> {
        self.publish(TOPIC_USER_EVENTS, event).await
    }

    pub async fn log_coach_event(&self, event: &EventEnvelope) -> Result<()> {
        self.publish(TOPIC_COACH_EVENTS, event).await
    }

    pub async fn log_payment_event(&self, event: &EventEnvelope) -> Result<()> {
        self.publish(TOPIC_PAYMENT_EVENTS, event).await
    }
}
