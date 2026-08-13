import os
import json
import logging
from datetime import date
from typing import Any
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse

import httpx
import psycopg2
import psycopg2.extras
import redis as redis_lib

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")

AI_MODEL = "@cf/meta/llama-4-scout-17b-16e-instruct"

# Total AI token pool shared across all users
TOTAL_AI_POOL = 10_000

# Tier multipliers for dynamic fair-share distribution
TIER_MULTIPLIER = {
    "free": 1.0,
    "pro": 1.4,
    "premium": 2.0,
}

r = None
db_conn = None

def connect_redis():
    global r
    url = os.environ.get("REDIS_URL", "redis://redis:6379")
    try:
        r = redis_lib.Redis.from_url(url, decode_responses=True)
        r.ping()
        logger.info("Connected to Redis for quota tracking")
    except Exception as e:
        logger.warning("Redis unavailable, quota tracking disabled: %s", e)
        r = None

def get_db():
    """Get database connection from the HTTP handler."""
    return GenerateHandler.conn if hasattr(GenerateHandler, 'conn') else None

def get_user_tier(cf_sub: str) -> str:
    """Look up user's subscription tier from the database."""
    try:
        conn = get_db()
        if conn is None:
            return "free"
        cur = conn.cursor()
        cur.execute(
            "SELECT tier FROM subscriptions WHERE user_id = "
            "(SELECT id FROM users WHERE cf_access_sub = %s LIMIT 1) "
            "AND status = 'active' LIMIT 1",
            (cf_sub,),
        )
        row = cur.fetchone()
        if row and row[0]:
            return row[0]
    except Exception as e:
        logger.warning("Failed to lookup tier for %s: %s", cf_sub, e)
    return "free"

def check_quota(cf_sub: str) -> bool:
    if r is None:
        return True
    today = date.today().isoformat()
    tier = get_user_tier(cf_sub)
    mult = TIER_MULTIPLIER.get(tier, 1.0)

    # Register as active user if first request today
    was_new = r.set(f"quota:planner:seen:{cf_sub}:{today}", "1", ex=86400, nx=True)
    if was_new:
        r.incr(f"quota:planner:active:{tier}")
        r.expire(f"quota:planner:active:{tier}", 86400)

    # Read active counts
    free = int(r.get("quota:planner:active:free") or "0")
    pro = int(r.get("quota:planner:active:pro") or "0")
    premium = int(r.get("quota:planner:active:premium") or "0")

    # Compute dynamic fair-share limit
    weighted = free * 1.0 + pro * 1.4 + premium * 2.0
    user_limit = int(TOTAL_AI_POOL * mult / weighted) if weighted > 0 else TOTAL_AI_POOL

    # Check + consume
    used = int(r.get(f"quota:planner:user:{cf_sub}:{today}") or "0")
    if used >= user_limit:
        logger.warning("User %s (%s) daily AI limit reached (%d/%d)", cf_sub, tier, used, user_limit)
        return False
    r.incr(f"quota:planner:user:{cf_sub}:{today}")
    r.expire(f"quota:planner:user:{cf_sub}:{today}", 86400)
    return True

def call_ai_worker(system: str, prompt: str, max_tokens: int = 2048) -> str:
    worker_url = os.environ.get("AI_WORKER_URL", "")
    shared_secret = os.environ.get("API_SHARED_SECRET", "")
    if not worker_url or not shared_secret:
        logger.warning("AI_WORKER_URL or API_SHARED_SECRET not set")
        return ""

    try:
        with httpx.Client(timeout=120) as client:
            resp = client.post(
                worker_url,
                headers={
                    "x-api-key": shared_secret,
                    "Content-Type": "application/json",
                },
                json={
                    "system": system,
                    "prompt": prompt,
                    "max_tokens": max_tokens,
                },
            )
            resp.raise_for_status()
            data = resp.json()
            return data.get("result", "")
    except Exception as e:
        logger.error("AI Worker call failed: %s", e)
        return ""


def _parse_health(profile: dict) -> str:
    raw = profile.get("health_conditions") or profile.get("healthConditions", [])
    if isinstance(raw, str):
        try:
            raw = json.loads(raw)
        except json.JSONDecodeError:
            return raw.strip("[]\" ")
    if isinstance(raw, list):
        return ", ".join(raw)
    return str(raw) if raw else "none"


def _ai_retry(system: str, prompt: str, max_tokens: int = 2048, retries: int = 3) -> list | dict:
    for attempt in range(retries):
        raw = call_ai_worker(system, prompt, max_tokens)
        if raw:
            try:
                return json.loads(raw)
            except json.JSONDecodeError as e:
                if attempt < retries - 1:
                    logger.warning("AI JSON parse error (attempt %d): %s — retrying", attempt + 1, e)
                    continue
        else:
            if attempt < retries - 1:
                logger.warning("AI returned empty (attempt %d) — retrying", attempt + 1)
                continue
    return []


def generate_meal_plan(profile: dict) -> list[dict]:
    diet = profile.get("diet", "mixed")
    budget = profile.get("budget_per_day") or profile.get("budgetPerDay", 150)
    health_str = _parse_health(profile)

    system = (
        'You are a meal planner for Indian beginners. '
        'Return a JSON object with a "meals" array (4 items: Breakfast, Lunch, Snack, Dinner). '
        "Each meal has name (string), items (string), kcal (number), protein (number). "
        'Example: {"meals":[{"name":"Poha","items":"poha, peanuts, onion","kcal":400,"protein":12}]}. '
        "Return ONLY the JSON object, no markdown."
    )
    prompt = f"Diet: {diet}, budget: INR {budget}/day, health: {health_str}"

    parsed = _ai_retry(system, prompt, 2048)
    meals = parsed.get("meals") if isinstance(parsed, dict) and isinstance(parsed.get("meals"), list) else (parsed if isinstance(parsed, list) else [])
    plan_id = f"plan-{date.today().isoformat()}"
    return [{"id": plan_id, "title": "Today's Plan", "budgetPerDay": budget, "diet": diet, "meals": meals}]


def generate_workout_plan(profile: dict) -> list[dict]:
    days = profile.get("days_per_week") or profile.get("daysPerWeek", 3)
    goal = profile.get("goal", "fitness")
    place = profile.get("place", "home")
    exp = profile.get("experience", "beginner")
    health_str = _parse_health(profile)

    system = (
        f"You are a fitness coach for Indian beginners. "
        f"Generate a JSON workout plan ({days} days). "
        "Each day has title, focus, exercises[]. "
        "Each exercise has name (string), sets (number), reps (string), rest (string), "
        "muscles (string[]), tips (string), alt (string). "
        "Return ONLY the JSON array. Be very concise."
    )
    prompt = f"Goal: {goal}, place: {place}, experience: {exp}, health: {health_str}"

    return _ai_retry(system, prompt, 4096)


def save_plan(conn, table: str, cf_sub: str, plan: list[dict]) -> None:
    today = date.today()
    with conn.cursor() as cur:
        cur.execute(
            f"""INSERT INTO {table} (user_id, date, plan)
                VALUES (%s, %s, %s)
                ON CONFLICT (user_id, date) DO UPDATE SET
                    plan = EXCLUDED.plan,
                    updated_at = now()""",
            (cf_sub, today, json.dumps(plan)),
        )
    conn.commit()


def _generate_tips(system: str, prompt: str) -> list[str]:
    result = _ai_retry(system, prompt + " Return ONLY a JSON array of strings, e.g. [\"tip1\", \"tip2\", \"tip3\"]. No markdown.", 1024)
    if isinstance(result, list):
        return result
    return []


def generate_bmi_advice(profile: dict) -> list[str]:
    bmi = profile.get("bmi")
    if not bmi:
        weight = profile.get("weightKg", 70)
        height = profile.get("heightCm", 170)
        h_m = height / 100
        bmi = round(weight / (h_m * h_m), 1) if h_m > 0 else 21.0

    category = "Underweight" if bmi < 18.5 else "Normal" if bmi < 25 else "Overweight" if bmi < 30 else "Obese"
    goal = profile.get("goal", "fitness")
    diet = profile.get("diet", "mixed")
    place = profile.get("place", "home")

    system = "You are a fitness and nutrition coach. Give personalized advice based on BMI and goals."
    prompt = f"BMI: {bmi} ({category}), Goal: {goal}, Diet: {diet}, Place: {place}. Give 3-4 specific tips."
    return _generate_tips(system, prompt)


def generate_sleep_advice(profile: dict, logs: list[dict]) -> list[str]:
    sleep_vals = [l.get("sleep", 0) or 0 for l in logs if l.get("sleep")]
    avg = round(sum(sleep_vals) / max(len(sleep_vals), 1), 1) if sleep_vals else 7
    system = "You are a sleep coach. Analyze sleep patterns and give personalized tips."
    prompt = f"Average sleep: {avg}h over last {len(logs)} days. Give 3 specific tips."
    return _generate_tips(system, prompt)


def generate_injury_prevention(profile: dict) -> list[str]:
    exp = profile.get("experience", "beginner")
    place = profile.get("place", "home")
    goal = profile.get("goal", "fitness")
    system = "You are a physio therapist. Give general injury prevention advice."
    prompt = f"Experience: {exp}, Place: {place}, Goal: {goal}. Give 3 general injury prevention tips."
    return _generate_tips(system, prompt)


def generate_form_tips(profile: dict) -> list[str]:
    exp = profile.get("experience", "beginner")
    place = profile.get("place", "home")
    goal = profile.get("goal", "fitness")
    system = "You are a strength coach. Give general exercise form advice."
    prompt = f"Experience: {exp}, Place: {place}, Goal: {goal}. Give 3 general form tips for common exercises."
    return _generate_tips(system, prompt)


def get_users(conn) -> list[dict]:
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("SELECT id, cf_access_sub, name FROM users")
        return cur.fetchall()


def get_user_by_cf_sub(conn, cf_sub: str) -> dict | None:
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("SELECT id, cf_access_sub, name FROM users WHERE cf_access_sub = %s", (cf_sub,))
        return cur.fetchone()


def get_profile(conn, user_id) -> dict | None:
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("SELECT * FROM profiles WHERE user_id = %s", (str(user_id),))
        return cur.fetchone()


def get_recent_logs(conn, user_id, days: int = 7) -> list[dict]:
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(
            "SELECT * FROM daily_logs WHERE user_id = %s ORDER BY date DESC LIMIT %s",
            (str(user_id), days),
        )
        return cur.fetchall()


def generate_for_user(conn, cf_sub: str) -> None:
    if not check_quota(cf_sub):
        return
    user = get_user_by_cf_sub(conn, cf_sub)
    if not user:
        logger.warning("User %s not found, skipping", cf_sub)
        return

    user_uuid = user["id"]
    logger.info("Processing user %s (%s)", user["name"], cf_sub)

    profile = get_profile(conn, user_uuid)
    if not profile:
        logger.warning("No profile for %s, skipping", cf_sub)
        return

    recent_logs = get_recent_logs(conn, user_uuid, 7)

    meal_plan = generate_meal_plan(profile)
    save_plan(conn, "meal_plans", cf_sub, meal_plan)
    logger.info("  Meal plan saved")

    workout_plan = generate_workout_plan(profile)
    save_plan(conn, "workout_plans", cf_sub, workout_plan)
    logger.info("  Workout plan saved")

    bmi_advice = generate_bmi_advice(profile)
    save_plan(conn, "bmi_advice", cf_sub, bmi_advice)
    logger.info("  BMI advice saved")

    sleep_advice = generate_sleep_advice(profile, recent_logs)
    save_plan(conn, "sleep_advice", cf_sub, sleep_advice)
    logger.info("  Sleep advice saved")

    injury_advice = generate_injury_prevention(profile)
    save_plan(conn, "injury_advice", cf_sub, injury_advice)
    logger.info("  Injury prevention saved")

    form_advice = generate_form_tips(profile)
    save_plan(conn, "form_advice", cf_sub, form_advice)
    logger.info("  Form tips saved")


def run():
    connect_redis()
    conn = psycopg2.connect(os.environ["DATABASE_URL"])
    users = get_users(conn)
    logger.info("Loaded %d users", len(users))

    for user in users:
        try:
            generate_for_user(conn, user["cf_access_sub"])
        except Exception as e:
            logger.error("Failed for user %s: %s", user["cf_access_sub"], e)

    conn.close()
    logger.info("Done")


class GenerateHandler(BaseHTTPRequestHandler):
    conn: psycopg2.extensions.connection | None = None

    def do_POST(self):
        path = urlparse(self.path).path
        if path != "/generate":
            self.send_response(404)
            self.end_headers()
            self.wfile.write(b'{"error":"not found"}')
            return

        length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(length) if length else b"{}"
        try:
            data = json.loads(body)
        except json.JSONDecodeError:
            self.send_response(400)
            self.end_headers()
            self.wfile.write(b'{"error":"invalid json"}')
            return

        cf_sub = data.get("user_id")
        if not cf_sub:
            self.send_response(400)
            self.end_headers()
            self.wfile.write(b'{"error":"missing user_id"}')
            return

        conn = type(self).conn
        if not conn:
            self.send_response(500)
            self.end_headers()
            self.wfile.write(b'{"error":"no database connection"}')
            return

        try:
            generate_for_user(conn, cf_sub)
            self.send_response(200)
            self.end_headers()
            self.wfile.write(b'{"status":"ok"}')
        except Exception as e:
            logger.error("HTTP generate failed for %s: %s", cf_sub, e)
            self.send_response(500)
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}).encode())

    def log_message(self, fmt, *args):
        logger.info(fmt, *args)


def serve():
    connect_redis()
    port = int(os.environ.get("PORT", "8080"))
    conn = psycopg2.connect(os.environ["DATABASE_URL"])
    GenerateHandler.conn = conn
    server = HTTPServer(("0.0.0.0", port), GenerateHandler)
    logger.info("HTTP server listening on port %d", port)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        conn.close()
        server.server_close()


if __name__ == "__main__":
    mode = os.environ.get("MODE", "batch")
    if mode == "http":
        serve()
    else:
        run()
