#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# Screena — Raspberry Pi kiosk installer / updater.
#
# Fresh install (downloads deps, writes autostart entries):
#   curl -fsSL https://raw.githubusercontent.com/<your-org>/screena/main/scripts/install-pi.sh \
#     | bash -s -- https://signage.example.com/play/A1B2C3
#
# Update the screen URL only (no package install, instant):
#   ./install-pi.sh --update https://signage.example.com/play/NEW123
#
# Pass the **full public URL** of the screen (the value shown next to the
# pairing code on the Screens page).
# ---------------------------------------------------------------------------
set -e

c_blue()  { printf "\033[1;34m%s\033[0m\n" "$*"; }
c_green() { printf "\033[1;32m%s\033[0m\n" "$*"; }
c_red()   { printf "\033[1;31m%s\033[0m\n" "$*"; }
c_dim()   { printf "\033[2m%s\033[0m\n"   "$*"; }

usage() {
    cat <<EOF
Usage:
  $0 <screen-url>               # fresh install
  $0 --update <screen-url>      # change URL only (no apt install)

Example:
  $0 https://signage.example.com/play/A1B2C3
  $0 --update https://signage.example.com/play/Z9Y8X7
EOF
}

# --- Argument parsing ------------------------------------------------------
MODE="install"
URL=""

case "${1:-}" in
    -h|--help|"")
        usage
        exit 0
        ;;
    --update|-u)
        MODE="update"
        URL="${2:-}"
        ;;
    *)
        URL="$1"
        ;;
esac

if [ -z "$URL" ]; then
    c_red "✗ No URL provided."
    usage
    exit 1
fi

if ! echo "$URL" | grep -qE '^https?://'; then
    c_red "✗ URL must start with http:// or https://"
    exit 1
fi

if [ "$(id -u)" -eq 0 ]; then
    c_red "✗ Run this script as the regular pi user, NOT root."
    echo "  It will use sudo for package installs."
    exit 1
fi

AUTOSTART_DIR="$HOME/.config/autostart"
KIOSK_DESKTOP="$AUTOSTART_DIR/screena.desktop"

# --- Helper: write the kiosk .desktop entry --------------------------------
write_kiosk_entry() {
    local browser="$1"
    local url="$2"
    mkdir -p "$AUTOSTART_DIR"
    cat > "$KIOSK_DESKTOP" <<EOF
[Desktop Entry]
Type=Application
Name=Screena Kiosk
Comment=Auto-launches the assigned digital signage URL in fullscreen
Exec=$browser --kiosk --noerrdialogs --disable-infobars --incognito --disable-features=Translate --no-first-run --start-fullscreen "$url"
X-GNOME-Autostart-enabled=true
EOF
    chmod +x "$KIOSK_DESKTOP"
}

# --- Helper: detect installed chromium binary ------------------------------
detect_browser() {
    for b in chromium-browser chromium google-chrome; do
        if command -v "$b" >/dev/null 2>&1; then
            echo "$b"
            return 0
        fi
    done
    return 1
}

# ===========================================================================
# UPDATE MODE — just rewrite the autostart .desktop and bail
# ===========================================================================
if [ "$MODE" = "update" ]; then
    if [ ! -f "$KIOSK_DESKTOP" ]; then
        c_red "✗ No existing kiosk install found at $KIOSK_DESKTOP"
        echo "  Run without --update to do a fresh install first."
        exit 1
    fi

    BROWSER="$(detect_browser || true)"
    if [ -z "$BROWSER" ]; then
        c_red "✗ No chromium / chrome binary found. Run a fresh install."
        exit 1
    fi

    c_blue "▶ Updating kiosk URL to:"
    c_dim  "  $URL"
    write_kiosk_entry "$BROWSER" "$URL"
    c_green "  ✓ $KIOSK_DESKTOP rewritten"

    # Try to relaunch chromium in place so the change takes effect immediately.
    if pgrep -x "$BROWSER" >/dev/null 2>&1; then
        c_blue "▶ Relaunching chromium with the new URL…"
        pkill -x "$BROWSER" 2>/dev/null || true
        sleep 1
        # Launch detached, suppress output, so the script can exit.
        DISPLAY="${DISPLAY:-:0}" nohup "$BROWSER" \
            --kiosk --noerrdialogs --disable-infobars --incognito \
            --disable-features=Translate --no-first-run --start-fullscreen \
            "$URL" >/dev/null 2>&1 &
        c_green "  ✓ Chromium restarted"
    else
        c_dim "  (chromium is not running — the new URL will be used on next boot)"
    fi

    c_green ""
    c_green "============================================================"
    c_green "  Screen URL updated."
    c_green "  No reboot needed unless chromium was idle."
    c_green "============================================================"
    exit 0
fi

# ===========================================================================
# FRESH INSTALL
# ===========================================================================
c_blue "▶ Installing kiosk dependencies (chromium-browser, unclutter, xscreensaver)…"
sudo apt-get update -y
sudo apt-get install -y --no-install-recommends \
    chromium-browser \
    unclutter \
    xscreensaver

BROWSER="$(detect_browser || true)"
if [ -z "$BROWSER" ]; then
    c_red "✗ No chromium / chrome binary found after install. Aborting."
    exit 1
fi
c_dim "  using: $BROWSER"

c_blue "▶ Writing autostart entry…"
write_kiosk_entry "$BROWSER" "$URL"
c_green "  ✓ $KIOSK_DESKTOP"

c_blue "▶ Disabling screen blanking + power management…"
if command -v gsettings >/dev/null 2>&1; then
    gsettings set org.gnome.desktop.session idle-delay 0 2>/dev/null || true
    gsettings set org.gnome.desktop.screensaver lock-enabled false 2>/dev/null || true
fi

cat > "$AUTOSTART_DIR/screena-noblank.desktop" <<'EOF'
[Desktop Entry]
Type=Application
Name=Screena No-Blank
Exec=bash -c "xset s off; xset -dpms; xset s noblank"
X-GNOME-Autostart-enabled=true
EOF
chmod +x "$AUTOSTART_DIR/screena-noblank.desktop"

cat > "$AUTOSTART_DIR/screena-unclutter.desktop" <<'EOF'
[Desktop Entry]
Type=Application
Name=Screena Unclutter
Exec=unclutter -idle 1 -root
X-GNOME-Autostart-enabled=true
EOF
chmod +x "$AUTOSTART_DIR/screena-unclutter.desktop"

c_green "  ✓ blanking + cursor + idle disabled"

c_blue "▶ Cleaning previous chromium state (so kiosk starts clean each boot)…"
rm -rf "$HOME/.config/chromium/Singleton"* 2>/dev/null || true

c_green ""
c_green "============================================================"
c_green "  Screena Pi kiosk installed!"
c_green ""
c_green "    Will display: $URL"
c_green ""
c_green "  Reboot to start the kiosk:    sudo reboot"
c_green "  Change URL later (instant):   $0 --update <new-url>"
c_green "  Remove the kiosk:             rm ~/.config/autostart/screena*.desktop"
c_green "============================================================"
c_green ""
