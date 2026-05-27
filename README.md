# Screena

Self-hosted digital signage & advertising CMS — build slide decks in a Figma-style designer, then push them to any TV via Chromecast or a Raspberry Pi.

## Highlights

- **Block-based slide designer** with drag / resize / z-index layering, multi-select grouping (with proportional group resize), and live preview
- **7 block types**: Text, Image, Video, Shape, Countdown (9 format presets), Clock, Weather
- **PowerPoint import** — parses `.pptx` files into editable blocks
- **Asset library** — upload images & videos once, reuse across slides
- **Pairing-code playback** — every screen gets a public `/play/{code}` URL
- **Live updates over WebSocket** — TVs reflect edits within ~1 second, no reload

## Quickstart

Pick whichever fits your environment best.

### Option 1 — Docker (recommended)

You need Docker + Docker Compose installed.

```bash
cp .env.example .env
# Edit .env and set a real JWT_SECRET:
echo "JWT_SECRET=$(openssl rand -hex 32)" >> .env

docker compose up --build
```

Open <http://localhost:3000> and log in with the credentials from your `.env`. Mongo, the FastAPI backend, and the React + nginx frontend all run in containers — nothing else to install.

### Option 2 — `setup.sh` (no Docker)

You need Python 3.11+, Node 18+, Yarn, and a running MongoDB on `localhost:27017`.

```bash
./setup.sh
```

The script will:

1. generate a random `JWT_SECRET`
2. write `backend/.env` and `frontend/.env` if missing
3. install Python + Node dependencies
4. start the backend on :8001 and the React dev server on :3000

Press Ctrl+C to stop both.

### Option 3 — Manual

See **[INSTALL.md](./INSTALL.md)** for full step-by-step setup, Raspberry Pi kiosk mode, and production deployment notes (gunicorn, nginx reverse-proxy with WebSocket upgrade, mongo backups, etc.).

## API

FastAPI ships a live OpenAPI + Swagger UI:

- **Swagger UI**: <http://localhost:8001/api/docs>
- **ReDoc**:      <http://localhost:8001/api/redoc>
- **OpenAPI JSON**: <http://localhost:8001/api/openapi.json>

(or replace `localhost:8001` with your public backend URL in production)

## Stack

- **Backend**: FastAPI · Motor · MongoDB · python-pptx · open-meteo (weather)
- **Frontend**: React 19 · react-router · react-rnd · sonner · TailwindCSS
- **Container**: nginx (static + reverse proxy) · mongo:7

## License

MIT
