use async_graphql::Subscription;
use futures::stream::Stream;
use std::pin::Pin;

use super::types::*;

pub struct SubscriptionRoot;

#[Subscription]
impl SubscriptionRoot {
    async fn log_updated(
        &self,
    ) -> Pin<Box<dyn Stream<Item = GqlDailyLog> + Send>> {
        Box::pin(futures::stream::empty())
    }

    async fn plan_updated(
        &self,
        table: String,
    ) -> Pin<Box<dyn Stream<Item = GqlAiPlan> + Send>> {
        let _ = table;
        Box::pin(futures::stream::empty())
    }
}
