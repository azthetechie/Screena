from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from db import db
from auth import get_current_user
from models import Playlist, Slide, PlaylistUpdate

router = APIRouter(prefix="/api/playlists", tags=["playlists"])


class CreatePlaylistPayload(BaseModel):
    name: str = "New Playlist"
    width: int = 1920
    height: int = 1080


@router.get("")
async def list_playlists(user: dict = Depends(get_current_user)):
    docs = await db.playlists.find({"owner_id": user["id"]}, {"_id": 0}).to_list(500)
    # return summary (no slide blocks payload) for list view
    return [
        {
            "id": d["id"],
            "name": d["name"],
            "width": d["width"],
            "height": d["height"],
            "slide_count": len(d.get("slides", [])),
            "updated_at": d.get("updated_at"),
            "created_at": d.get("created_at"),
        }
        for d in docs
    ]


@router.post("")
async def create_playlist(payload: CreatePlaylistPayload, user: dict = Depends(get_current_user)):
    p = Playlist(owner_id=user["id"], name=payload.name, width=payload.width, height=payload.height)
    # default first slide
    p.slides = [Slide(name="Slide 1")]
    await db.playlists.insert_one(p.model_dump())
    return p.model_dump()


@router.get("/{playlist_id}")
async def get_playlist(playlist_id: str, user: dict = Depends(get_current_user)):
    doc = await db.playlists.find_one({"id": playlist_id, "owner_id": user["id"]}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Playlist not found")
    return doc


@router.put("/{playlist_id}")
async def update_playlist(playlist_id: str, payload: PlaylistUpdate, user: dict = Depends(get_current_user)):
    doc = await db.playlists.find_one({"id": playlist_id, "owner_id": user["id"]})
    if not doc:
        raise HTTPException(status_code=404, detail="Playlist not found")
    update_data = {k: v for k, v in payload.model_dump(exclude_none=True).items()}
    if "slides" in update_data:
        # convert pydantic slide models if needed (they're already dicts via model_dump)
        update_data["slides"] = [s if isinstance(s, dict) else s.model_dump() for s in update_data["slides"]]
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.playlists.update_one({"id": playlist_id}, {"$set": update_data})
    new_doc = await db.playlists.find_one({"id": playlist_id}, {"_id": 0})
    return new_doc


@router.delete("/{playlist_id}")
async def delete_playlist(playlist_id: str, user: dict = Depends(get_current_user)):
    res = await db.playlists.delete_one({"id": playlist_id, "owner_id": user["id"]})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Playlist not found")
    # un-assign from any screens
    await db.screens.update_many({"playlist_id": playlist_id}, {"$set": {"playlist_id": None}})
    return {"ok": True}
