import os
from dotenv import load_dotenv

load_dotenv()

# ============================================================
# Redis Config — Short Variables
# ============================================================
RD_USER = "default"
RD_PASS = os.getenv("RP", "")
RD_HOST = os.getenv("RH", "tight-gopher-188525.upstash.io")
RD_PORT = os.getenv("RPORT", "6379")

#  IMPORTANT: rediss:// (double s) for TLS
REDIS_URL = f"rediss://{RD_USER}:{RD_PASS}@{RD_HOST}:{RD_PORT}"

# ============================================================
# Cache Config
# ============================================================
CACHE_TTL = int(os.getenv("CACHE_TTL_SECONDS", 3600))

# ============================================================
# Rate Limiting - Environment-Based
# ============================================================
APP_ENV = os.getenv("APP_ENV", "development")

if APP_ENV == "production":
    _default_rate_limit = 10
else:
    _default_rate_limit = 100

RATE_LIMIT = int(os.getenv("RATE_LIMIT_PER_MINUTE", _default_rate_limit))

print(f"Enviornment:{APP_ENV}")
print(f" Rate Limit:{RATE_LIMIT}/min")