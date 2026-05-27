# Screena — Install & Setup

A self-hosted digital-signage CMS: build slide decks in the browser, then push them to any TV via a Chromecast or a Raspberry Pi running a web browser.

This guide covers a clean install on Linux / macOS / WSL. Same steps work on bare Windows with minor PowerShell tweaks.

---

## 1. Prerequisites

Install these once on the machine that will host the **backend + frontend** (the "studio server"):

| Tool         | Version          | Install                                                                                  |
| ------------ | ---------------- | ---------------------------------------------------------------------------------------- |
| Python       | 3.11 or newer    | `sudo apt install python3 python3-venv python3-pip` (Linux) or [python.org](https://python.org) |
| Node.js      | 18 or newer      | [nodejs.org](https://nodejs.org) or `nvm install --lts`                                  |
| Yarn         | classic 1.x      | `npm install -g yarn` (do **not** use npm — the project pins via yarn.lock)              |
| MongoDB      | 6.x or 7.x       | [mongodb.com/docs/manual/installation](https://www.mongodb.com/docs/manual/installation) — local or Atlas cloud |
| Git          | any              | `sudo apt install git`                                                                   |

> ℹ️ The TVs and Raspberry Pis only need a Chrome-based browser. They do **not** need Python, Node, or MongoDB.

---

## 2. Clone the repository

```bash
git clone <your-repo-url> screena
cd screena
```

You should now have a tree like:

```
screena/
├── backend/      # FastAPI + Motor (Python)
├── frontend/     # React + react-rnd (Node)
└── README.md
```

---

## 3. Backend setup

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate           # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

### 3.1 Configure `backend/.env`

Create `backend/.env` (or copy the existing one). Replace `JWT_SECRET` with a long random string — **anything you keep secret will do**.

```env
MONGO_URL="mongodb://localhost:27017"
DB_NAME="screena_db"
CORS_ORIGINS="*"
JWT_SECRET="paste-a-64-char-hex-string-here"
ADMIN_EMAIL="admin@screena.app"
ADMIN_PASSWORD="change-me-on-first-login"
```

Generate a secure `JWT_SECRET` quickly:

```bash
openssl rand -hex 32
```

If your Mongo lives on a different host or has auth, swap `MONGO_URL` for e.g.
`mongodb+srv://user:pass@cluster.mongodb.net`.

### 3.2 Run the backend

```bash
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

Verify it's up: `curl http://localhost:8001/api/health` → `{"status":"ok"}`.

On first run it auto-seeds an admin user using `ADMIN_EMAIL` / `ADMIN_PASSWORD`. Indexes are also created automatically.

---

## 4. Frontend setup

In a **new terminal**:

```bash
cd frontend
yarn install
```

### 4.1 Configure `frontend/.env`

```env
REACT_APP_BACKEND_URL="http://localhost:8001"
WDS_SOCKET_PORT=443
```

If you'll access the studio from a different machine (e.g. a Mac controlling a server on the LAN), set `REACT_APP_BACKEND_URL` to that machine's reachable URL (e.g. `http://192.168.1.42:8001`).

### 4.2 Run the frontend

```bash
yarn start
```

Open `http://localhost:3000` and log in with the admin credentials from `backend/.env`.

---

## 5. First-run smoke test

1. **Login** with `admin@screena.app` / your `ADMIN_PASSWORD`.
2. **New Playlist** → opens the slide designer.
3. From the toolbar, add a Text block, a Shape, and a Countdown. Drag to reposition. Click **Save**.
4. Go to **Screens** → **New Screen**, name it "Lobby TV".
5. Assign the playlist you just made.
6. Copy the public URL (next to the pairing code) — that URL is what you open on your TV/Chromecast/Pi.

You now have a working CMS. Anything you save in the editor live-pushes to all paired TVs via WebSocket within ~1s.

---

## 6. Putting it on a TV

### Option A — Chromecast (easiest)

1. Cast a Chrome tab from your laptop:
   - Open the public screen URL (e.g. `http://your-server.local:3000/play/A1B2C3`) in Chrome.
   - Click ⋮ → **Cast…** → pick your Chromecast → **Cast tab**.
2. Push the Chrome tab to fullscreen on the Chromecast.

> 💡 Tip: for permanent setups, use a **Chromecast with Google TV** running the [Stable Kiosk](https://chrome.google.com/webstore/detail/kiosk/afhcomalholahplbjhnmahkoekoijban) app or pair with a small "always-on" laptop.

### Option B — Raspberry Pi (recommended for permanent installs)

Tested with **Raspberry Pi OS Bookworm** + Chromium kiosk mode:

```bash
sudo apt update && sudo apt install -y chromium-browser unclutter
```

Create `~/.config/autostart/screena.desktop`:

```desktop
[Desktop Entry]
Type=Application
Name=Screena
Exec=chromium-browser --kiosk --noerrdialogs --disable-infobars --incognito http://your-server.local:3000/play/A1B2C3
```

(replace `A1B2C3` with the pairing code from your Screens page)

Reboot — the Pi will boot straight into the player.

To prevent screen sleep:

```bash
sudo apt install -y xscreensaver
xset s off; xset -dpms; xset s noblank
```

### Option C — Smart TV with a web browser

Some Samsung Tizen / LG webOS / Android TV models can browse to the public URL directly. Same `/play/<code>` URL works.

---

## 7. Importing PowerPoint files

In the dashboard, click **Import PPTX** and select a `.pptx` file. Screena will:

- Convert each slide to a Screena slide
- Parse text frames into editable Text blocks
- Embed pictures as base64 Image blocks
- Convert auto-shapes (rectangles, ellipses) into Shape blocks
- Scale everything to a 1920×1080 canvas

You can then open the deck in the editor and continue tweaking.

---

## 8. Production deployment notes

The dev commands above are fine for a single studio machine. For production:

### Backend (FastAPI)

```bash
pip install gunicorn
gunicorn server:app \
  -w 2 -k uvicorn.workers.UvicornWorker \
  -b 0.0.0.0:8001 \
  --timeout 120
```

Put a reverse proxy in front (nginx, Caddy, Traefik). **WebSockets** (`/api/play/ws/{code}`) need `Upgrade` headers forwarded. Sample nginx block:

```nginx
location /api/ {
    proxy_pass http://127.0.0.1:8001;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_read_timeout 86400s;
}
```

If you serve over HTTPS, set `secure=True` for cookies in `backend/auth.py` (see `_set_auth_cookies`).

### Frontend (React)

```bash
yarn build
```

Output goes in `frontend/build/`. Serve as static files via nginx / Caddy / S3+CloudFront / Vercel / Netlify — anywhere static hosting works. Make sure `REACT_APP_BACKEND_URL` is set to your **public** backend URL at build time.

### MongoDB

- For ≤ ~50 screens with mostly text/shape content, a single 1 GB Mongo instance is plenty.
- Base64 images & videos are stored inside Mongo documents (you chose that during setup). MongoDB has a **16 MB per-document limit**, so the editor caps individual asset uploads at 8 MB.
- If you start hitting limits, swap the asset storage in `routes_assets.py` for S3-compatible object storage.

---

## 9. Troubleshooting

| Symptom                                                  | Fix                                                                                                       |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `pymongo.errors.ServerSelectionTimeoutError`             | Mongo not running. `sudo systemctl start mongod`                                                          |
| Frontend says "Network Error" on login                   | `REACT_APP_BACKEND_URL` is wrong or backend isn't on port 8001. `curl $REACT_APP_BACKEND_URL/api/health`. |
| `WebSocket closed before connection`                     | Reverse proxy not forwarding `Upgrade` header. See nginx snippet above.                                   |
| TV says "No playlist assigned"                           | Open **Screens** → pick a playlist for that screen. The TV refreshes automatically.                       |
| Editor shows blocks at the same position after PPTX      | Some PPTX files use slide masters with 0×0 placeholders; drag blocks apart manually after import.         |
| Forgot admin password                                    | Set a new `ADMIN_PASSWORD` in `backend/.env` and restart the backend — it re-hashes on startup.           |
| 5 wrong passwords → "Too many failed attempts"           | Wait 15 minutes, or `db.login_attempts.deleteMany({})` in Mongo.                                          |

---

## 10. Default credentials & data location

- **Default login**: whatever you set in `backend/.env` (`ADMIN_EMAIL` / `ADMIN_PASSWORD`). The shipped defaults are `admin@screena.app` / `admin123` — **change them on first run**.
- **MongoDB database**: whatever `DB_NAME` is set to (default `screena_db`). All your playlists, screens, assets, and users live there. To back up:

  ```bash
  mongodump --uri "$MONGO_URL" --db screena_db --out ./backups/$(date +%F)
  ```

That's it. Happy advertising 📺
