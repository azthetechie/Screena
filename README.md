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

### Option 1b — Docker with automatic HTTPS (public-facing)

For a public-facing install with TLS via Let's Encrypt:

1. Point an A record (e.g. `signage.example.com`) at the server's public IP.
2. Open ports `80` and `443`.
3. Set `DOMAIN` and `ADMIN_EMAIL_FOR_TLS` (plus `JWT_SECRET`) in `.env`.
4. Run:

```bash
docker compose -f docker-compose.https.yml up --build -d
```

Caddy will fetch the TLS cert on first boot (~30 s) and renew it automatically thereafter. The studio is then at `https://<your-domain>`.

### Option 1c — Pre-built images from GHCR (low-RAM hosts, ARM, fast boots)

If you push tags via the included [`release.yml`](./.github/workflows/release.yml) GitHub Action, images appear at `ghcr.io/<owner>/screena-backend` and `ghcr.io/<owner>/screena-frontend` (multi-arch: `linux/amd64` + `linux/arm64`). Then:

```bash
# .env: set OWNER=<your-github-username>, SCREENA_VERSION=v1.2.3 (or latest)
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

No local Docker build needed — perfect for a Raspberry Pi 4 running the studio.

### Option 2 — `setup.sh` (no Docker)

You need Python 3.11+, Node 18+, Yarn, and a running MongoDB on `localhost:27017`.

```bash
./setup.sh
```

### Option 3 — Manual

See **[INSTALL.md](./INSTALL.md)** for full step-by-step setup and production deployment notes.

## Setting up a Raspberry Pi kiosk

On a freshly-flashed Raspberry Pi OS, run one command (replace the URL with your actual public screen URL):

```bash
curl -fsSL https://raw.githubusercontent.com/<your-org>/screena/main/scripts/install-pi.sh \
  | bash -s -- https://signage.example.com/play/A1B2C3
```

That installs `chromium-browser`, writes an autostart entry, disables screen blanking, and hides the mouse cursor. Reboot and the Pi boots straight into the player.

Need to **point an existing Pi at a different screen URL**? Skip the package install — just update the URL:

```bash
./install-pi.sh --update https://signage.example.com/play/Z9Y8X7
```

The script rewrites the autostart entry and relaunches Chromium with the new URL immediately (no reboot needed).

## API

FastAPI ships a live OpenAPI + Swagger UI:

- **Swagger UI**: <http://localhost:8001/api/docs>
- **ReDoc**:      <http://localhost:8001/api/redoc>
- **OpenAPI JSON**: <http://localhost:8001/api/openapi.json>

(or replace `localhost:8001` with your public backend URL in production)

## Stack

- **Backend**: FastAPI · Motor · MongoDB · python-pptx · open-meteo (weather)
- **Frontend**: React 19 · react-router · react-rnd · sonner · TailwindCSS
- **Container**: nginx (static + reverse proxy) · mongo:7 · Caddy (auto-TLS)

## Releasing

This repo uses [**release-please**](https://github.com/googleapis/release-please) to fully automate versioning. Use [Conventional Commits](https://www.conventionalcommits.org/) on PR titles / squash-merges:

| Commit prefix | Effect                          |
| ------------- | ------------------------------- |
| `feat: …`     | minor bump (`0.x.0`)            |
| `fix: …`      | patch bump (`0.0.x`)            |
| `feat!: …`    | major bump (`x.0.0`)            |
| `chore: …`    | no version change               |

Flow:

1. Merge feature PRs to `main` using Conventional Commit titles.
2. The `release-please` workflow keeps an open **Release PR** that bumps `frontend/package.json` + `backend/pyproject.toml` and regenerates `CHANGELOG.md`.
3. Merge the Release PR → release-please cuts a `v<X.Y.Z>` tag → the `release.yml` workflow builds & pushes multi-arch images to GHCR.

No manual version edits, no manual tagging.

## License

MIT
