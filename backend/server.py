from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import logging
from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware

from auth import auth_router, seed_admin, ensure_indexes
from routes_playlists import router as playlists_router
from routes_screens import router as screens_router, public_router as play_router
from routes_pptx import router as pptx_router
from routes_weather import router as weather_router
from routes_assets import router as assets_router

app = FastAPI(
    title="Screena - Digital Signage CMS",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

# Mount API routers (each defines /api/* prefix)
app.include_router(auth_router)
app.include_router(playlists_router)
app.include_router(screens_router)
app.include_router(play_router)
app.include_router(pptx_router)
app.include_router(weather_router)
app.include_router(assets_router)


@app.get("/api/health")
async def health():
    return {"status": "ok"}


cors_origins_env = os.environ.get("CORS_ORIGINS", "*").strip()
if cors_origins_env == "*":
    # Echo any origin via regex so credentials (cookies) still work.
    app.add_middleware(
        CORSMiddleware,
        allow_origin_regex=".*",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
else:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[o.strip() for o in cors_origins_env.split(",") if o.strip()],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)


@app.on_event("startup")
async def _on_startup():
    await ensure_indexes()
    await seed_admin()
    logger.info("Screena ready. Admin seeded.")
