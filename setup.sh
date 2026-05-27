#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# Screena — local development bootstrap.
# Generates JWT_SECRET, writes both .env files (if missing), installs
# dependencies, and starts the backend + frontend in this shell.
# Usage:   ./setup.sh
# Stop:    Ctrl+C (kills the background backend automatically).
# ---------------------------------------------------------------------------
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"
BACKEND="$ROOT/backend"
FRONTEND="$ROOT/frontend"

c_blue()  { printf "\033[1;34m%s\033[0m\n" "$*"; }
c_green() { printf "\033[1;32m%s\033[0m\n" "$*"; }
c_red()   { printf "\033[1;31m%s\033[0m\n" "$*"; }
c_dim()   { printf "\033[2m%s\033[0m\n"   "$*"; }

# --- 1. Tool checks --------------------------------------------------------
require() {
    if ! command -v "$1" >/dev/null 2>&1; then
        c_red "✗ Missing dependency: $1"
        echo "  Install it then re-run ./setup.sh"
        exit 1
    fi
}
c_blue "▶ Checking prerequisites…"
require python3
require node
require yarn

if ! command -v mongod >/dev/null 2>&1 && ! pgrep -x mongod >/dev/null 2>&1; then
    c_dim "  (mongod not found locally — assuming you'll use a remote MONGO_URL)"
fi

# --- 2. Generate JWT_SECRET ------------------------------------------------
gen_secret() {
    if command -v openssl >/dev/null 2>&1; then
        openssl rand -hex 32
    else
        python3 -c "import secrets; print(secrets.token_hex(32))"
    fi
}

# --- 3. Write backend/.env if missing --------------------------------------
if [ ! -f "$BACKEND/.env" ]; then
    c_blue "▶ Writing backend/.env"
    JWT_SECRET="$(gen_secret)"
    cat > "$BACKEND/.env" <<EOF
MONGO_URL="mongodb://localhost:27017"
DB_NAME="screena_db"
CORS_ORIGINS="*"
JWT_SECRET="$JWT_SECRET"
ADMIN_EMAIL="admin@screena.app"
ADMIN_PASSWORD="admin123"
EOF
    c_green "  ✓ backend/.env created (admin: admin@screena.app / admin123)"
else
    c_dim "  • backend/.env already exists — keeping it"
fi

# --- 4. Write frontend/.env if missing -------------------------------------
if [ ! -f "$FRONTEND/.env" ]; then
    c_blue "▶ Writing frontend/.env"
    cat > "$FRONTEND/.env" <<'EOF'
REACT_APP_BACKEND_URL="http://localhost:8001"
WDS_SOCKET_PORT=443
EOF
    c_green "  ✓ frontend/.env created"
else
    c_dim "  • frontend/.env already exists — keeping it"
fi

# --- 5. Python venv + deps -------------------------------------------------
c_blue "▶ Installing backend dependencies"
cd "$BACKEND"
if [ ! -d ".venv" ]; then
    python3 -m venv .venv
fi
# shellcheck disable=SC1091
source .venv/bin/activate
pip install -q --upgrade pip
pip install -q -r requirements.txt
c_green "  ✓ Python deps ready"

# --- 6. Frontend deps ------------------------------------------------------
c_blue "▶ Installing frontend dependencies"
cd "$FRONTEND"
yarn install --silent
c_green "  ✓ Node deps ready"

# --- 7. Start both servers -------------------------------------------------
cd "$BACKEND"
c_blue "▶ Starting backend on http://localhost:8001"
# shellcheck disable=SC1091
source .venv/bin/activate
uvicorn server:app --host 0.0.0.0 --port 8001 --reload >/tmp/screena_backend.log 2>&1 &
BACKEND_PID=$!

cleanup() {
    echo ""
    c_blue "▶ Shutting down…"
    if kill -0 "$BACKEND_PID" 2>/dev/null; then
        kill "$BACKEND_PID" 2>/dev/null || true
    fi
    exit 0
}
trap cleanup INT TERM

# Wait for backend to be ready (max 15s)
for i in $(seq 1 30); do
    if curl -s http://localhost:8001/api/health >/dev/null 2>&1; then
        c_green "  ✓ Backend is up"
        break
    fi
    sleep 0.5
    if [ "$i" -eq 30 ]; then
        c_red "✗ Backend did not start in time. Check /tmp/screena_backend.log"
        cleanup
    fi
done

c_blue "▶ Starting frontend on http://localhost:3000"
echo ""
c_green "============================================================"
c_green "  Screena is starting!"
c_green "    Studio:    http://localhost:3000"
c_green "    Backend:   http://localhost:8001"
c_green "    API docs:  http://localhost:8001/api/docs"
c_green "    Default login: admin@screena.app  /  admin123"
c_green "============================================================"
echo ""

cd "$FRONTEND"
yarn start  # foreground — Ctrl+C exits and triggers cleanup
cleanup
