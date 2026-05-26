"""Pydantic models for Screena."""
from __future__ import annotations
from typing import List, Optional, Any, Dict
from pydantic import BaseModel, Field
from datetime import datetime, timezone
import uuid


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class Block(BaseModel):
    """A single design block on a slide."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    type: str  # text | image | video | shape | countdown | clock | weather
    x: float = 0
    y: float = 0
    width: float = 200
    height: float = 100
    rotation: float = 0
    z: int = 0
    # type-specific data
    text: Optional[str] = None
    fontSize: Optional[float] = 32
    fontFamily: Optional[str] = "Manrope"
    fontWeight: Optional[str] = "700"
    color: Optional[str] = "#FFFFFF"
    align: Optional[str] = "left"
    background: Optional[str] = None
    borderRadius: Optional[float] = 0
    opacity: Optional[float] = 1
    # image / video
    src: Optional[str] = None  # base64 data URL or remote URL
    objectFit: Optional[str] = "cover"
    # shape
    shape: Optional[str] = "rectangle"  # rectangle | circle
    # countdown
    targetDate: Optional[str] = None
    # weather
    location: Optional[str] = None
    # clock
    timeFormat: Optional[str] = "24h"


class Slide(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str = "Untitled Slide"
    duration: float = 8.0  # seconds
    background: str = "#0B0D12"
    blocks: List[Block] = Field(default_factory=list)
    transition: str = "fade"  # fade | slide | none


class Playlist(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    owner_id: str
    name: str = "New Playlist"
    width: int = 1920
    height: int = 1080
    slides: List[Slide] = Field(default_factory=list)
    created_at: str = Field(default_factory=_now_iso)
    updated_at: str = Field(default_factory=_now_iso)


class Screen(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    owner_id: str
    name: str = "New Screen"
    pair_code: str = ""
    playlist_id: Optional[str] = None
    last_seen: Optional[str] = None
    paired: bool = False
    created_at: str = Field(default_factory=_now_iso)


class PlaylistUpdate(BaseModel):
    name: Optional[str] = None
    width: Optional[int] = None
    height: Optional[int] = None
    slides: Optional[List[Slide]] = None


class ScreenUpdate(BaseModel):
    name: Optional[str] = None
    playlist_id: Optional[str] = None
