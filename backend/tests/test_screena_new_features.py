"""Tests for Screena NEW features (iteration 2):
- /api/assets POST/GET/GET-by-id/DELETE (owner-scoped, mime whitelist, 8MB cap)
- /api/play/ws/{pair_code} WebSocket (public, initial sync + live broadcasts on playlist/screen edits)
"""
import asyncio
import base64
import io
import json
import os
import uuid

import pytest
import requests
import websockets

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://adscreen-builder.preview.emergentagent.com").rstrip("/")
WS_URL = BASE_URL.replace("https://", "wss://").replace("http://", "ws://")
ADMIN_EMAIL = "admin@screena.app"
ADMIN_PASSWORD = "admin123"


# ---- Fixtures ----
@pytest.fixture(scope="module")
def admin_session():
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/auth/login",
               json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=15)
    assert r.status_code == 200, r.text
    return s


@pytest.fixture(scope="module")
def user_b_session():
    s = requests.Session()
    email = f"test_b_{uuid.uuid4().hex[:8]}@example.com"
    r = s.post(f"{BASE_URL}/api/auth/register",
               json={"email": email, "password": "pw123456", "name": "UserB"}, timeout=15)
    assert r.status_code == 200, r.text
    return s


def _png_bytes():
    # 1x1 transparent PNG
    return base64.b64decode(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNgAAIAAAUAAen63usAAAAASUVORK5CYII="
    )


# ---- /api/assets tests ----
class TestAssets:
    created_id = None

    def test_upload_png(self, admin_session):
        data = _png_bytes()
        files = {"file": ("TEST_one.png", data, "image/png")}
        r = admin_session.post(f"{BASE_URL}/api/assets", files=files,
                               data={"name": "TEST_one"}, timeout=15)
        assert r.status_code == 200, r.text
        a = r.json()
        assert a["mime"] == "image/png"
        assert a["type"] == "image"
        assert a["name"] == "TEST_one"
        assert a["size"] == len(data)
        assert a["data"].startswith("data:image/png;base64,")
        assert "_id" not in a
        TestAssets.created_id = a["id"]

    def test_list_excludes_data_field(self, admin_session):
        r = admin_session.get(f"{BASE_URL}/api/assets", timeout=10)
        assert r.status_code == 200
        items = r.json()
        assert isinstance(items, list)
        match = [x for x in items if x["id"] == TestAssets.created_id]
        assert match, "uploaded asset not in list"
        # data field must NOT be present (it's heavy base64)
        assert "data" not in match[0], "list endpoint should not include data URL"
        assert match[0]["mime"] == "image/png"

    def test_get_single_includes_data(self, admin_session):
        r = admin_session.get(f"{BASE_URL}/api/assets/{TestAssets.created_id}", timeout=10)
        assert r.status_code == 200
        a = r.json()
        assert a["data"].startswith("data:image/png;base64,")
        assert "_id" not in a

    def test_unsupported_mime_rejected(self, admin_session):
        files = {"file": ("evil.txt", b"hi", "text/plain")}
        r = admin_session.post(f"{BASE_URL}/api/assets", files=files, timeout=10)
        assert r.status_code == 400
        assert "Unsupported" in r.text or "unsupported" in r.text.lower()

    def test_video_mp4_allowed(self, admin_session):
        # Fake mp4 bytes - just checking mime whitelist accepts video/mp4
        files = {"file": ("TEST_clip.mp4", b"\x00\x00\x00\x18ftypmp42", "video/mp4")}
        r = admin_session.post(f"{BASE_URL}/api/assets", files=files, timeout=15)
        assert r.status_code == 200, r.text
        assert r.json()["type"] == "video"
        # cleanup
        admin_session.delete(f"{BASE_URL}/api/assets/{r.json()['id']}")

    def test_too_large_rejected(self, admin_session):
        # 8.1 MB
        big = b"\x00" * (8 * 1024 * 1024 + 1024)
        files = {"file": ("big.png", big, "image/png")}
        r = admin_session.post(f"{BASE_URL}/api/assets", files=files, timeout=30)
        assert r.status_code == 400
        assert "large" in r.text.lower()

    def test_owner_isolation(self, user_b_session):
        # user B cannot see admin's asset
        r = user_b_session.get(f"{BASE_URL}/api/assets/{TestAssets.created_id}", timeout=10)
        assert r.status_code == 404
        r = user_b_session.get(f"{BASE_URL}/api/assets", timeout=10)
        assert r.status_code == 200
        assert TestAssets.created_id not in [x["id"] for x in r.json()]

    def test_unauthenticated_blocked(self):
        r = requests.get(f"{BASE_URL}/api/assets", timeout=10)
        assert r.status_code == 401

    def test_delete_asset(self, admin_session):
        r = admin_session.delete(f"{BASE_URL}/api/assets/{TestAssets.created_id}", timeout=10)
        assert r.status_code == 200
        g = admin_session.get(f"{BASE_URL}/api/assets/{TestAssets.created_id}", timeout=10)
        assert g.status_code == 404


# ---- WebSocket /api/play/ws/{pair_code} tests ----
async def _recv_json(ws, timeout=5):
    raw = await asyncio.wait_for(ws.recv(), timeout=timeout)
    return json.loads(raw)


@pytest.mark.asyncio
async def test_ws_initial_sync_and_broadcasts(admin_session):
    # Setup: create a playlist + a screen assigned to it
    plr = admin_session.post(f"{BASE_URL}/api/playlists",
                             json={"name": "TEST_WS_PL"}, timeout=10).json()
    playlist_id = plr["id"]
    scr = admin_session.post(f"{BASE_URL}/api/screens",
                             json={"name": "TEST_WS_SCR"}, timeout=10).json()
    screen_id, pair_code = scr["id"], scr["pair_code"]
    r = admin_session.put(f"{BASE_URL}/api/screens/{screen_id}",
                          json={"playlist_id": playlist_id}, timeout=10)
    assert r.status_code == 200

    url = f"{WS_URL}/api/play/ws/{pair_code}"

    async with websockets.connect(url) as ws1, websockets.connect(url) as ws2:
        # Both clients should receive initial playlist_updated
        m1 = await _recv_json(ws1)
        m2 = await _recv_json(ws2)
        assert m1["type"] == "playlist_updated"
        assert m1["playlist"]["id"] == playlist_id
        assert m2["type"] == "playlist_updated"
        assert m2["playlist"]["id"] == playlist_id

        # ---- TRIGGER 1: PUT /api/playlists/{id} (edit slides) ----
        new_slide = {
            "id": str(uuid.uuid4()),
            "name": "WS Slide",
            "duration": 4.0,
            "background": "#111111",
            "transition": "fade",
            "blocks": [{"id": str(uuid.uuid4()), "type": "text",
                        "x": 5, "y": 5, "width": 200, "height": 60, "z": 1,
                        "text": "WS LIVE"}],
        }
        upd = admin_session.put(f"{BASE_URL}/api/playlists/{playlist_id}",
                                json={"slides": [new_slide], "name": "TEST_WS_PL2"},
                                timeout=10)
        assert upd.status_code == 200
        # Both sockets must receive the broadcast
        m1b = await _recv_json(ws1, timeout=5)
        m2b = await _recv_json(ws2, timeout=5)
        assert m1b["type"] == "playlist_updated"
        assert m1b["playlist"]["name"] == "TEST_WS_PL2"
        assert m1b["playlist"]["slides"][0]["blocks"][0]["text"] == "WS LIVE"
        assert m2b["type"] == "playlist_updated"
        assert m2b["playlist"]["name"] == "TEST_WS_PL2"

        # ---- TRIGGER 2: PUT /api/screens/{id} reassigning playlist_id ----
        new_pl = admin_session.post(f"{BASE_URL}/api/playlists",
                                    json={"name": "TEST_WS_PL_NEW"}, timeout=10).json()
        upd2 = admin_session.put(f"{BASE_URL}/api/screens/{screen_id}",
                                 json={"playlist_id": new_pl["id"]}, timeout=10)
        assert upd2.status_code == 200
        m1c = await _recv_json(ws1, timeout=5)
        assert m1c["type"] == "playlist_updated"
        assert m1c["playlist"]["id"] == new_pl["id"]

    # cleanup
    admin_session.delete(f"{BASE_URL}/api/screens/{screen_id}")
    admin_session.delete(f"{BASE_URL}/api/playlists/{playlist_id}")
    admin_session.delete(f"{BASE_URL}/api/playlists/{new_pl['id']}")


@pytest.mark.asyncio
async def test_ws_invalid_pair_code_closes():
    url = f"{WS_URL}/api/play/ws/ZZZZZZ"
    try:
        async with websockets.connect(url) as ws:
            # Server should close with 4404
            try:
                await asyncio.wait_for(ws.recv(), timeout=5)
                # If we got a message, the server didn't close — failure
                pytest.fail("Expected WS to close for unknown pair_code, but got a message")
            except websockets.ConnectionClosed:
                pass  # expected
    except websockets.InvalidStatus:
        # also acceptable — server rejected handshake
        pass
