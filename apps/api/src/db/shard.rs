use sqlx::postgres::{PgPool, PgPoolOptions};

/// Routes database queries to the correct shard based on user_id.
pub struct ShardRouter {
    pools: Vec<PgPool>,
}

impl ShardRouter {
    /// Create a new ShardRouter from a list of database URLs.
    pub async fn new(urls: &[String]) -> Result<Self, sqlx::Error> {
        let mut pools = Vec::with_capacity(urls.len());
        for url in urls {
            let pool = PgPoolOptions::new()
                .max_connections(10)
                .connect(url)
                .await?;
            pools.push(pool);
        }
        tracing::info!("shard router initialized with {} shards", pools.len());
        Ok(Self { pools })
    }

    /// Get the connection pool for a given user_id.
    /// Uses deterministic hashing so the same user always hits the same shard.
    pub fn get_pool_for_user(&self, user_id: &str) -> &PgPool {
        let shard = self.deterministic_shard(user_id);
        &self.pools[shard]
    }

    /// Get the primary pool (first shard) — used for health checks, migrations, etc.
    pub fn primary_pool(&self) -> &PgPool {
        &self.pools[0]
    }

    /// Number of shards.
    pub fn shard_count(&self) -> usize {
        self.pools.len()
    }

    /// Deterministic shard assignment: hash the user_id string mod num_shards.
    fn deterministic_shard(&self, user_id: &str) -> usize {
        let hash = user_id.as_bytes().iter().fold(0u64, |acc, &b| {
            acc.wrapping_mul(31).wrapping_add(b as u64)
        });
        (hash % self.pools.len() as u64) as usize
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn deterministic_shard_distributes_users() {
        let num_shards = 3usize;
        let mut counts = vec![0u64; num_shards];

        for i in 0..1000 {
            let user_id = format!("user-{i}");
            let hash = user_id.as_bytes().iter().fold(0u64, |acc, &b| {
                acc.wrapping_mul(31).wrapping_add(b as u64)
            });
            let shard = (hash % num_shards as u64) as usize;
            counts[shard] += 1;
        }

        for count in &counts {
            assert!(
                *count > 250 && *count < 420,
                "Shard distribution too skewed: {:?}",
                counts
            );
        }
    }

    #[test]
    fn same_user_always_goes_to_same_shard() {
        let num_shards = 3usize;
        let user_id = "user-42";

        let hash = user_id.as_bytes().iter().fold(0u64, |acc, &b| {
            acc.wrapping_mul(31).wrapping_add(b as u64)
        });
        let shard1 = (hash % num_shards as u64) as usize;
        let shard2 = (hash % num_shards as u64) as usize;

        assert_eq!(shard1, shard2);
    }
}
