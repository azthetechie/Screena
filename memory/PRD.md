# Screena — Digital Signage & Advertising CMS

## Original Problem Statement
> Make an advertising screen system that integrates to TVs via Chromecast or a Raspberry Pi web browser. It should let users build slides in-app, import PowerPoints into adverts, and provide a designer with resizable / positionable blocks. Needs a countdown-to-date widget, the ability to layer screens (z-index), and a fullscreen display mode that renders like it would on the actual TV.

## User Choices
- Authentication: **JWT-based custom auth (email/password)**
- PowerPoint import: **Advanced — parsed into editable blocks**
- Display playback: **Public URL link with pairing code + in-app Preview/Play**
- Block types: **Text, Image, Video, Shape, Countdown, Clock, Weather**
- Media storage: **Base64 in MongoDB**

## Architecture
- **Backend**: FastAPI + Motor (MongoDB) on port 8001
  - `auth.py` — JWT (httpOnly cookies), bcrypt, brute-force lockout, admin seeding
  - `routes_playlists.py` — playlist CRUD with slides + blocks (owner-isolated)
  - `routes_screens.py` — screens CRUD + public `/api/play/{pair_code}`
  - `routes_pptx.py` — `python-pptx` parser → editable blocks (text/image/shape)
  - `routes_weather.py` — open-meteo proxy (no API key)
- **Frontend**: React 19 + react-router 7 + react-rnd + sonner
  - `/login`, `/register`
  - `/dashboard` — playlists grid (Bento), create / import PPTX
  - `/editor/:id` — designer canvas (drag/resize/z-index), 7 block types
  - `/screens` — device manager with pair-code public URL
  - `/preview/:id` — authenticated playback
  - `/play/:code` — public fullscreen player (Chromecast / Raspberry Pi)

## What's been implemented (2026-05-26)
- JWT auth with httpOnly cookies (admin seeded on startup)
- Playlist CRUD with multi-slide / multi-block schema
- Designer with toolbar, draggable/resizable blocks (react-rnd), inspector panel, layers list, slide thumbnails, z-index reorder, duplicate/delete
- All seven block types render in editor + player: text, image (base64 upload), video (base64 upload), shape (rect/circle), countdown, clock, weather
- PPTX import via `python-pptx` — converts text frames, pictures, and auto-shapes into editable blocks scaled to a 1920×1080 canvas
- Screen pair-code generation (6-char alphanumeric) + public URL playback page with crossfade transitions, heartbeats every 30s
- Open-meteo weather proxy (geocoding + current temp / wind / humidity)
- Backend tested 24/24 pytest cases passing (auth, playlists, screens, pptx import, weather, owner isolation)

## Bugs fixed during build
- Clipboard `writeText` fallback in `Screens.jsx` (Cross-origin iframe denied — added try/catch + execCommand fallback)

## Backlog / Future
**P1**
- Replace `prompt()`/`confirm()` on Screens page with proper dialog modals
- Asset library (reusable images / videos across slides)
- Slide reorder via drag-and-drop in thumbnail panel
- Slide-level transitions per type (currently single fade)
- Rotation handle on blocks (rotation field already in schema)

**P2**
- Schedule playlists by day-part or date range
- Multiple users per screen (org / team)
- Push live edits to the player without page reload (websocket)
- Export deck as PDF / video
- Cloud / S3 storage for assets beyond 8MB limit
