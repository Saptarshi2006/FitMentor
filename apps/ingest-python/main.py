from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import httpx
import os
import redis as redis_lib

SM_API = "https://api.supermemory.ai"
SM_KEY = os.environ.get("SUPERMEMORY_API_KEY", "")

# Total Supermemory storage pool (tokens)
TOTAL_SM_POOL = 1_000_000

# Tier percentages
TIER_PERCENTAGE = {
    "free": 0.5,     # 500,000 tokens
    "pro": 0.7,      # 700,000 tokens
    "premium": 1.0,  # 1,000,000 tokens
}

app = FastAPI(title="FitMentor Ingest")

# Redis connection for storage tracking
r = None
try:
    r = redis_lib.Redis.from_url(os.environ.get("REDIS_URL", "redis://redis:6379"), decode_responses=True)
    r.ping()
except Exception:
    r = None


class IngestRequest(BaseModel):
    container_tag: str
    content: str
    tier: str = "free"


@app.get("/v1/health")
async def health():
    return {"ok": True}


@app.get("/v1/storage-usage")
async def storage_usage(container_tag: str):
    """Check current storage usage for a user."""
    if not r:
        return {"used": 0, "limit": TOTAL_SM_POOL, "tier": "free"}
    used = int(r.get(f"quota:sm:{container_tag}") or "0")
    return {"used": used, "limit": TOTAL_SM_POOL}


@app.post("/v1/ingest")
async def ingest(req: IngestRequest):
    if not SM_KEY:
        return {"ok": False, "error": "SUPERMEMORY_API_KEY not set"}

    # Check storage quota
    content_tokens = len(req.content.split())  # rough token estimate
    tier_pct = TIER_PERCENTAGE.get(req.tier, TIER_PERCENTAGE["free"])
    user_limit = int(TOTAL_SM_POOL * tier_pct)

    if r:
        used = int(r.get(f"quota:sm:{req.container_tag}") or "0")
        if used + content_tokens > user_limit:
            raise HTTPException(
                status_code=429,
                detail=f"Storage limit reached for {req.tier} plan ({used}/{user_limit} tokens used)",
            )

    async with httpx.AsyncClient(timeout=15) as client:
        res = await client.post(
            f"{SM_API}/v3/documents",
            headers={
                "Authorization": f"Bearer {SM_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "content": req.content,
                "containerTag": req.container_tag,
            },
        )

    if not res.is_success:
        raise HTTPException(
            status_code=502,
            detail=f"Supermemory ingest failed ({res.status_code}): {res.text}",
        )

    # Track storage usage
    if r:
        r.incrby(f"quota:sm:{req.container_tag}", content_tokens)

    return {"ok": True}
