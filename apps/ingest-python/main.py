from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import httpx
import os

SM_API = "https://api.supermemory.ai"
SM_KEY = os.environ.get("SUPERMEMORY_API_KEY", "")

app = FastAPI(title="FitMentor Ingest")


class IngestRequest(BaseModel):
    container_tag: str
    content: str


@app.get("/v1/health")
async def health():
    return {"ok": True}


@app.post("/v1/ingest")
async def ingest(req: IngestRequest):
    if not SM_KEY:
        return {"ok": False, "error": "SUPERMEMORY_API_KEY not set"}

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

    return {"ok": True}
