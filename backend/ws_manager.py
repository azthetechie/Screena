"""In-memory websocket connection manager for live screen updates."""
from collections import defaultdict
from typing import Dict, Set
from fastapi import WebSocket


class ConnectionManager:
    def __init__(self):
        # pair_code -> set of websockets
        self.connections: Dict[str, Set[WebSocket]] = defaultdict(set)

    async def connect(self, pair_code: str, ws: WebSocket):
        await ws.accept()
        self.connections[pair_code].add(ws)

    def disconnect(self, pair_code: str, ws: WebSocket):
        if pair_code in self.connections:
            self.connections[pair_code].discard(ws)
            if not self.connections[pair_code]:
                self.connections.pop(pair_code, None)

    async def broadcast(self, pair_code: str, message: dict):
        """Send JSON to every connection on this pair_code; drop dead ones."""
        if pair_code not in self.connections:
            return
        dead = []
        for ws in list(self.connections[pair_code]):
            try:
                await ws.send_json(message)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.connections[pair_code].discard(ws)


manager = ConnectionManager()
