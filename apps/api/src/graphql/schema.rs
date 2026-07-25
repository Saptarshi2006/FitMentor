use async_graphql::Schema;

use super::mutations::MutationRoot;
use super::queries::QueryRoot;

pub type AppSchema = Schema<QueryRoot, MutationRoot, async_graphql::EmptySubscription>;

pub fn create_schema() -> AppSchema {
    Schema::build(QueryRoot, MutationRoot, async_graphql::EmptySubscription).finish()
}
