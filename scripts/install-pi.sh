#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# Screena — one-command Raspberry Pi kiosk installer.
#
# Run on a freshly-flashed Raspberry Pi OS (Bookworm desktop or Bullseye):
#
#   curl -fsSL https://raw.githubusercontent.com/<your-org>/screena/main/scripts/install-pi.sh \
#     | bash -s -- https://signage.example.com/play/A1B2C3
#
# Or, if you've cloned the repo locally:
#
#   ./scripts/install-pi.sh https://signage.example.com/play/A1B2C3
#
# Pass the **full public URL** of the screen (the value shown next to the
# pairing code on the Screens page).
# ---------------------------------------------------------------------------
set -e

c_blue()  { printf "\033[1;34m%s\033[0m\n" "$*"; }
c_green() { printf "\033[1;32m%s\033[0m\n" "$*"; }
c_red()   { printf "\033[1;31m%s\033[0m\n" "$*"; }
c_dim()   { printf "\033[2m%s\033[0m\n"   "$*"; }

URL="${1:-}"
if [ -z "$URL" ]; then
    c_red "✗ Usage: $0 <screen-url>"
    echo "  e.g. $0 https://signage.example.com/play/A1B2C3"
    exit 1
fi

# Sanity-check URL format
if ! echo "$URL" | grep -qE '^https?://'; then
    c_red "✗ URL must start with http:// or https://"
    exit 1
fi

# Don't run as root — we need a real $HOME for the autostart entry.
if [ "$(id -u)" -eq 0 ]; then
    c_red "✗ Run this script as the regular pi user, NOT root."
    echo "  It will use sudo for package installs."
    exit 1
fi

c_blue "▶ Installing kiosk dependencies (chromium-browser, unclutter, xscreensaver)…"
sudo apt-get update -y
sudo apt-get install -y --no-install-recommends \
    chromium-browser \
    unclutter \
    xscreensaver

# Determine the chromium binary name (varies by distro).
BROWSER=""
for b in chromium-browser chromium google-chrome; do
    if command -v "$b" >/dev/null 2>&1; then
        BROWSER="$b"
        break
    fi
done
if [ -z "$BROWSER" ]; then
    c_red "✗ No chromium / chrome binary found after install. Aborting."
    exit 1
fi
c_dim "  using: $BROWSER"

c_blue "▶ Writing autostart entry…"
AUTOSTART_DIR="$HOME/.config/autostart"
mkdir -p "$AUTOSTART_DIR"
cat > "$AUTOSTART_DIR/screena.desktop" <<EOF
[Desktop Entry]
Type=Application
Name=Screena Kiosk
Comment=Auto-launches the assigned digital signage URL in fullscreen
Exec=$BROWSER --kiosk --noerrdialogs --disable-infobars --incognito --disable-features=Translate --no-first-run --start-fullscreen "$URL"
X-GNOME-Autostart-enabled=true
EOF
chmod +x "$AUTOSTART_DIR/screena.desktop"
c_green "  ✓ $AUTOSTART_DIR/screena.desktop"

c_blue "▶ Disabling screen blanking + power management…"
# Try the modern systemd-logind approach first, then fall back to xset.
if command -v gsettings >/dev/null 2>&1; then
    gsettings set org.gnome.desktop.session idle-delay 0 2>/dev/null || true
    gsettings set org.gnome.desktop.screensaver lock-enabled false 2>/dev/null || true
fi

# X11 fallback — also queued for autostart so it survives reboot.
cat > "$AUTOSTART_DIR/screena-noblank.desktop" <<'EOF'
[Desktop Entry]
Type=Application
Name=Screena No-Blank
Exec=bash -c "xset s off; xset -dpms; xset s noblank"
X-GNOME-Autostart-enabled=true
EOF
chmod +x "$AUTOSTART_DIR/screena-noblank.desktop"

# Hide the mouse cursor when idle for 1s.
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
c_green "  Edit the URL later:           ~/.config/autostart/screena.desktop"
c_green "  Remove the kiosk:             rm ~/.config/autostart/screena*.desktop"
c_green "============================================================"
c_green ""
