# Screena

Self-hosted digital signage & advertising CMS — build slide decks in a Figma-style designer, then push them to any TV via Chromecast or a Raspberry Pi.

## Highlights
- **Block-based slide designer** with drag / resize / z-index layering, multi-select grouping, and live preview
- **7 block types**: Text, Image, Video, Shape, Countdown (9 format presets), Clock, Weather
- **PowerPoint import** — parses `.pptx` files into editable blocks
- **Asset library** — upload images & videos once, reuse across slides
- **Pairing-code playback** — every screen gets a public `/play/{code}` URL
- **Live updates over WebSocket** — TVs reflect edits within ~1 second, no reload

## Quick start

See **[INSTALL.md](./INSTALL.md)** for full setup, Raspberry Pi kiosk, and production-deploy instructions.

```bash
# Backend
cd backend && pip install -r requirements.txt && uvicorn server:app --port 8001 --reload

# Frontend (in another terminal)
cd frontend && yarn install && yarn start
```

Open `http://localhost:3000` and log in with the credentials from `backend/.env`.

## Stack

- **Backend**: FastAPI · Motor · MongoDB · python-pptx · open-meteo (weather)
- **Frontend**: React 19 · react-router · react-rnd · sonner · TailwindCSS

## License

MIT
