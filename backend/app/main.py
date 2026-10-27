"""FastAPI application factory for the Intermediate College Management Portal."""
import logging
import time
import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from app.api.v1.router import api_v1_router
from app.core.config import get_settings
from app.core.errors import error_body, install_error_handlers
from app.core.rate_limit import limiter

settings = get_settings()

logging.basicConfig(
    level=logging.DEBUG if settings.debug else logging.INFO,
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Log startup configuration (no secrets printed)."""
    logging.getLogger("cmp").info(
        "Starting %s | env=%s | db=%s@%s:%s/%s",
        settings.app_name,
        settings.app_env,
        settings.db_user,
        settings.db_host,
        settings.db_port,
        settings.db_name,
    )
    yield


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.app_name,
        version="1.0.0",
        description=(
            "Versioned REST API for the Intermediate College Management Portal. "
            "All responses use JSON; errors follow the "
            "`{\\\"error\\\": {code, message, details, request_id}}` envelope."
        ),
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
        lifespan=lifespan,
    )

    # --- CORS (explicit origins; credentials allowed for refresh cookie) ---
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type", "Idempotency-Key"],
        expose_headers=["X-Request-ID"],
    )

    # --- Rate limiting middleware (headers on all responses) ---
    app.state.limiter = limiter
    app.add_middleware(SlowAPIMiddleware)

    # --- Request ID + access log middleware ---
    @app.middleware("http")
    async def request_context(request: Request, call_next):
        request_id = request.headers.get("X-Request-ID", uuid.uuid4().hex[:12])
        request.state.request_id = request_id
        start = time.perf_counter()
        response = await call_next(request)
        elapsed_ms = (time.perf_counter() - start) * 1000
        logging.getLogger("cmp.access").info(
            "%s %s -> %s (%.1fms) rid=%s",
            request.method,
            request.url.path,
            response.status_code,
            elapsed_ms,
            request_id,
        )
        response.headers["X-Request-ID"] = request_id
        return response

    # --- Error envelope for rate-limit hits (429) ---
    @app.exception_handler(RateLimitExceeded)
    async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
        from fastapi.responses import JSONResponse

        return JSONResponse(
            status_code=429,
            content=error_body(
                "RATE_LIMITED",
                "Too many requests. Please wait and try again.",
                request_id=getattr(request.state, "request_id", ""),
            ),
        )

    install_error_handlers(app)

    # --- Routes ---
    @app.get("/healthz", tags=["ops"], summary="Liveness & DB connectivity check")
    def healthz() -> dict:
        from sqlalchemy import text

        from app.core.database import engine

        try:
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            db = "ok"
        except Exception:  # pragma: no cover
            logging.getLogger("cmp").exception("DB health check failed")
            db = "error"
        return {"status": "ok" if db == "ok" else "degraded", "db": db}

    app.include_router(api_v1_router, prefix="/api/v1")
    return app


app = create_app()
