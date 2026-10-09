import time
from collections import defaultdict
from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from core.config import RATE_LIMIT


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Simple in-memory rate limiter.
    Limits: RATE_LIMIT requests per 60 seconds per IP.
    """
    
    def __init__(self, app, max_requests: int = RATE_LIMIT, window_seconds: int = 60):
        super().__init__(app)
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.requests = defaultdict(list)   # {ip: [timestamps]}
    
    async def dispatch(self, request: Request, call_next):
        # Skip rate limit for health/docs
        if request.url.path in ["/health", "/docs", "/openapi.json", "/redoc", "/"]:
            return await call_next(request)
        
        # Get client IP
        client_ip = request.client.host if request.client else "unknown"
        now = time.time()
        
        # Clean old requests (outside window)
        self.requests[client_ip] = [
            ts for ts in self.requests[client_ip]
            if now - ts < self.window_seconds
        ]
        
        # Check limit
        if len(self.requests[client_ip]) >= self.max_requests:
            oldest = self.requests[client_ip][0]
            retry_after = int(self.window_seconds - (now - oldest)) + 1
            
            return JSONResponse(
                status_code=429,
                content={
                    "detail": f"Rate limit exceeded. Try again in {retry_after} seconds.",
                    "type": "rate_limit"
                },
                headers={
                    "Retry-After": str(retry_after),
                    "X-RateLimit-Limit": str(self.max_requests),
                    "X-RateLimit-Remaining": "0",
                }
            )
        
        # Add current request
        self.requests[client_ip].append(now)
        
        # Process request
        response = await call_next(request)
        
        # Add rate limit headers
        remaining = self.max_requests - len(self.requests[client_ip])
        response.headers["X-RateLimit-Limit"] = str(self.max_requests)
        response.headers["X-RateLimit-Remaining"] = str(max(0, remaining))
        
        return response