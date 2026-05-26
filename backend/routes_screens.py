import random
import string
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from pydantic import BaseModel
from db import db
from auth import get_current_user
from models import Screen, ScreenUpdate
from ws_manager import manager

router = APIRouter(prefix="/api/screens", tags=["screens"])
public_router = APIRouter(prefix="/api/play", tags=["play"])


def _new_pair_code() -> str:
    return "".join(random.choices(string.ascii_uppercase + string.digits, k=6))


class CreateScreenPayload(BaseModel):
    name: str = "New Screen"


@router.get("")
async def list_screens(user: dict = Depends(get_current_user)):
    docs = await db.screens.find({"owner_id": user["id"]}, {"_id": 0}).to_list(500)
    return docs


@router.post("")
async def create_screen(payload: CreateScreenPayload, user: dict = Depends(get_current_user)):
    # generate unique pair code
    for _ in range(8):
        code = _new_pair_code()
        if not await db.screens.find_one({"pair_code": code}):
            break
    s = Screen(owner_id=user["id"], name=payload.name, pair_code=code)
    await db.screens.insert_one(s.model_dump())
    return s.model_dump()


@router.put("/{screen_id}")
async def update_screen(screen_id: str, payload: ScreenUpdate, user: dict = Depends(get_current_user)):
    doc = await db.screens.find_one({"id": screen_id, "owner_id": user["id"]})
    if not doc:
        raise HTTPException(status_code=404, detail="Screen not found")
    update_data = {k: v for k, v in payload.model_dump(exclude_none=True).items()}
    if update_data:
        await db.screens.update_one({"id": screen_id}, {"$set": update_data})
    new_doc = await db.screens.find_one({"id": screen_id}, {"_id": 0})
    # If playlist changed, push fresh playlist payload to the live screen
    if "playlist_id" in update_data:
        playlist = None
        if new_doc.get("playlist_id"):
            playlist = await db.playlists.find_one({"id": new_doc["playlist_id"]}, {"_id": 0})
        await manager.broadcast(new_doc["pair_code"], {"type": "playlist_updated", "playlist": playlist})
    return new_doc


@router.delete("/{screen_id}")
async def delete_screen(screen_id: str, user: dict = Depends(get_current_user)):
    res = await db.screens.delete_one({"id": screen_id, "owner_id": user["id"]})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Screen not found")
    return {"ok": True}


# --- Public player endpoints (NO AUTH) ---
@public_router.get("/{pair_code}")
async def fetch_play(pair_code: str):
    code = pair_code.upper().strip()
    screen = await db.screens.find_one({"pair_code": code}, {"_id": 0})
    if not screen:
        raise HTTPException(status_code=404, detail="Screen not found")
    # update heartbeat
    await db.screens.update_one(
        {"pair_code": code},
        {"$set": {"last_seen": datetime.now(timezone.utc).isoformat(), "paired": True}},
    )
    playlist = None
    if screen.get("playlist_id"):
        playlist = await db.playlists.find_one({"id": screen["playlist_id"]}, {"_id": 0})
    return {
        "screen": {"id": screen["id"], "name": screen["name"], "pair_code": screen["pair_code"]},
        "playlist": playlist,
    }



# --- Public live WebSocket for instant edit push (NO AUTH) ---
@public_router.websocket("/ws/{pair_code}")
async def play_ws(websocket: WebSocket, pair_code: str):
    code = pair_code.upper().strip()
    screen = await db.screens.find_one({"pair_code": code}, {"_id": 0})
    if not screen:
        await websocket.close(code=4404)
        return
    await manager.connect(code, websocket)
    try:
        # Send initial sync payload so the player has the latest playlist
        playlist = None
        if screen.get("playlist_id"):
            playlist = await db.playlists.find_one({"id": screen["playlist_id"]}, {"_id": 0})
        await websocket.send_json({"type": "playlist_updated", "playlist": playlist})
        while True:
            # Keep socket alive; ignore any inbound text (used as keep-alive ping)
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(code, websocket)
    except Exception:
        manager.disconnect(code, websocket)
