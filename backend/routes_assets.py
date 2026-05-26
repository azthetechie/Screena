"""Asset library — owner-scoped images / videos as base64 data URLs."""
import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from db import db
from auth import get_current_user
import base64

router = APIRouter(prefix="/api/assets", tags=["assets"])

ALLOWED_TYPES = {
    "image/png", "image/jpeg", "image/jpg", "image/gif", "image/webp", "image/svg+xml",
    "video/mp4", "video/webm", "video/quicktime",
}
MAX_BYTES = 8 * 1024 * 1024  # 8MB cap


@router.get("")
async def list_assets(user: dict = Depends(get_current_user)):
    docs = await db.assets.find(
        {"owner_id": user["id"]},
        {"_id": 0, "data": 0},  # don't ship full base64 in list — only meta + thumbnail
    ).sort("created_at", -1).to_list(500)
    return docs


@router.get("/{asset_id}")
async def get_asset(asset_id: str, user: dict = Depends(get_current_user)):
    doc = await db.assets.find_one({"id": asset_id, "owner_id": user["id"]}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Asset not found")
    return doc


@router.post("")
async def upload_asset(file: UploadFile = File(...), name: str = Form(None), user: dict = Depends(get_current_user)):
    mime = (file.content_type or "").lower()
    if mime not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {mime}")
    data = await file.read()
    if len(data) > MAX_BYTES:
        raise HTTPException(status_code=400, detail="File too large (max 8MB)")
    b64 = base64.b64encode(data).decode("ascii")
    data_url = f"data:{mime};base64,{b64}"
    asset_type = "video" if mime.startswith("video/") else "image"
    doc = {
        "id": str(uuid.uuid4()),
        "owner_id": user["id"],
        "name": name or file.filename or "Untitled",
        "type": asset_type,
        "mime": mime,
        "size": len(data),
        "data": data_url,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.assets.insert_one(doc)
    # Return without the heavy data field for the list flow; include for the upload flow
    return {k: v for k, v in doc.items() if k != "_id"}


@router.delete("/{asset_id}")
async def delete_asset(asset_id: str, user: dict = Depends(get_current_user)):
    res = await db.assets.delete_one({"id": asset_id, "owner_id": user["id"]})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Asset not found")
    return {"ok": True}
