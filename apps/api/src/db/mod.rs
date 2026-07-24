pub mod shard;

/// Create a ShardRouter from comma-separated database URLs.
/// If only one URL is provided, acts as a single-shard router.
pub async fn create_shard_router(urls: &[String]) -> Result<shard::ShardRouter, sqlx::Error> {
    shard::ShardRouter::new(urls).await
}
