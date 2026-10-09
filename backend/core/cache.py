import redis
import hashlib
import json
from core.config import REDIS_URL, CACHE_TTL

# Connect to Redis (TLS enabled)
try:
    redis_client = redis.from_url(REDIS_URL, decode_responses=True)
    redis_client.ping()
    print("Redis connected")
except Exception as e:
    print(f"Redis connection failed: {e}")
    redis_client = None


def _cache_key(question: str) -> str:
    """Generate cache key from question"""
    normalized = question.lower().strip()
    hashed = hashlib.sha256(normalized.encode()).hexdigest()
    return f"graph:{hashed}"


def get_cached(question: str):
    """Get cached response if exists"""
    if not redis_client:
        return None
    try:
        data = redis_client.get(_cache_key(question))
        return json.loads(data) if data else None
    except Exception as e:
        print(f"Cache read error: {e}")
        return None


def set_cached(question: str, response: dict, ttl: int = CACHE_TTL):
    """Save response to cache"""
    if not redis_client:
        return
    try:
        redis_client.setex(_cache_key(question), ttl, json.dumps(response))
    except Exception as e:
        print(f"Cache write error: {e}")


def clear_cache(question: str = None):
    """Clear cache (all or specific)"""
    if not redis_client:
        return
    try:
        if question:
            redis_client.delete(_cache_key(question))
        else:
            for key in redis_client.scan_iter("graph:*"):
                redis_client.delete(key)
        print("Cache cleared")
    except Exception as e:
        print(f"Cache clear error: {e}")