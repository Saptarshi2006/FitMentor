#![allow(dead_code)]
use anyhow::Result;
use serde::Serialize;

const QUEUE_NOTIFICATIONS: &str = "notifications";
const QUEUE_JOBS: &str = "background_jobs";

#[derive(Debug, Serialize, Clone)]
pub struct JobMessage {
    pub job_type: String,
    pub user_id: String,
    pub payload: serde_json::Value,
}

#[derive(Debug, Serialize, Clone)]
pub struct NotificationMessage {
    pub channel: String,
    pub user_id: String,
    pub title: String,
    pub body: String,
}

pub struct RabbitMqClient {
    url: String,
}

impl RabbitMqClient {
    pub fn new(url: String) -> Self {
        Self { url }
    }

    async fn publish<T: Serialize>(&self, queue: &str, msg: &T) -> Result<()> {
        // ponytail: stub — no live AMQP connection; wire lapin channel here when ready
        tracing::info!(queue = queue, "rabbitmq publish (stub) {:?}", serde_json::to_string(msg));
        Ok(())
    }

    pub async fn enqueue_job(&self, job: &JobMessage) -> Result<()> {
        self.publish(QUEUE_JOBS, job).await
    }

    pub async fn send_notification(&self, notif: &NotificationMessage) -> Result<()> {
        self.publish(QUEUE_NOTIFICATIONS, notif).await
    }
}
