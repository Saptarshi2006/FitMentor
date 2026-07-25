use crate::auth::middleware::AuthUser;
use crate::services::cache::CacheService;
use crate::AppState;
use sqlx::PgPool;

pub struct GqlContext {
    pub pool: PgPool,
    pub cache: CacheService,
    pub user: Option<AuthUser>,
}

impl GqlContext {
    pub fn new(state: &AppState, user: Option<AuthUser>) -> Self {
        Self {
            pool: state.pool.clone(),
            cache: state.cache.clone(),
            user,
        }
    }

    pub fn require_user(&self) -> Result<&AuthUser, async_graphql::Error> {
        self.user
            .as_ref()
            .ok_or_else(|| async_graphql::Error::new("Unauthorized"))
    }
}
