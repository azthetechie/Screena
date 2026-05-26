import { useEffect, useRef, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import api from "@/lib/api";
import BlockRenderer from "@/components/BlockRenderer";

/**
 * Renders a single slide centered + scaled into the viewport so the
 * 1920x1080 (or any) design canvas fits any TV / Chromecast / Raspberry Pi.
 */
function ScaledSlide({ slide, designWidth, designHeight }) {
    const [scale, setScale] = useState(1);
    const wrapRef = useRef(null);

    useEffect(() => {
        const compute = () => {
            if (!wrapRef.current) return;
            const { width, height } = wrapRef.current.getBoundingClientRect();
            setScale(Math.min(width / designWidth, height / designHeight));
        };
        compute();
        window.addEventListener("resize", compute);
        return () => window.removeEventListener("resize", compute);
    }, [designWidth, designHeight]);

    return (
        <div ref={wrapRef} className="w-full h-full flex items-center justify-center" data-testid="player-slide-wrap">
            <div
                style={{
                    width: designWidth * scale,
                    height: designHeight * scale,
                    background: slide.background || "#0B0D12",
                    position: "relative",
                    overflow: "hidden",
                }}
            >
                <div
                    style={{
                        width: designWidth,
                        height: designHeight,
                        transform: `scale(${scale})`,
                        transformOrigin: "top left",
                        position: "absolute",
                        top: 0,
                        left: 0,
                    }}
                >
                    {[...slide.blocks]
                        .sort((a, b) => (a.z || 0) - (b.z || 0))
                        .map((b) => (
                            <div
                                key={b.id}
                                style={{
                                    position: "absolute",
                                    left: b.x,
                                    top: b.y,
                                    width: b.width,
                                    height: b.height,
                                    zIndex: b.z || 0,
                                    transform: b.rotation ? `rotate(${b.rotation}deg)` : undefined,
                                }}
                            >
                                <BlockRenderer block={b} />
                            </div>
                        ))}
                </div>
            </div>
        </div>
    );
}

/**
 * Player route. Loads playlist either by:
 *   - playlist id (private preview: /preview/:id, auth required)
 *   - pair code (public: /play/:code)
 */
export default function Player({ mode = "code" }) {
    const params = useParams();
    const [playlist, setPlaylist] = useState(null);
    const [error, setError] = useState(null);
    const [idx, setIdx] = useState(0);
    const [fade, setFade] = useState(true);
    const timerRef = useRef(null);

    const load = useCallback(async () => {
        try {
            if (mode === "preview") {
                const { data } = await api.get(`/playlists/${params.id}`);
                setPlaylist(data);
            } else {
                const { data } = await api.get(`/play/${params.code}`);
                if (!data.playlist) {
                    setError(`Screen "${data.screen.name}" is paired but no playlist has been assigned yet.`);
                    setPlaylist({ screen: data.screen });
                } else {
                    setPlaylist(data.playlist);
                }
            }
        } catch (e) {
            setError(e.response?.data?.detail || "Could not load player");
        }
    }, [mode, params.id, params.code]);

    useEffect(() => {
        load();
    }, [load]);

    // Live updates via WebSocket on public player. Falls back to a 30s poll
    // if the socket can't connect (e.g. browser blocks ws).
    useEffect(() => {
        if (mode !== "code" || !params.code) return;
        const backend = process.env.REACT_APP_BACKEND_URL || window.location.origin;
        const wsBase = backend.replace(/^http/i, "ws");
        const url = `${wsBase}/api/play/ws/${params.code}`;
        let ws;
        let alive = true;
        let pollTimer = null;
        let pingTimer = null;
        const startPoll = () => {
            if (pollTimer) return;
            pollTimer = setInterval(load, 30000);
        };
        const connect = () => {
            try {
                ws = new WebSocket(url);
                ws.onopen = () => {
                    if (pollTimer) {
                        clearInterval(pollTimer);
                        pollTimer = null;
                    }
                    // periodic keep-alive ping (any text)
                    pingTimer = setInterval(() => {
                        try { ws.send("ping"); } catch { /* noop */ }
                    }, 25000);
                };
                ws.onmessage = (ev) => {
                    try {
                        const msg = JSON.parse(ev.data);
                        if (msg.type === "playlist_updated") {
                            if (!msg.playlist) {
                                setError(`No playlist assigned to this screen yet.`);
                            } else {
                                setError(null);
                                setPlaylist(msg.playlist);
                                setIdx(0);
                            }
                        }
                    } catch { /* noop */ }
                };
                ws.onerror = () => { /* swallow */ };
                ws.onclose = () => {
                    if (pingTimer) clearInterval(pingTimer);
                    if (!alive) return;
                    // try reconnect after 3s, plus enable polling fallback
                    startPoll();
                    setTimeout(() => alive && connect(), 3000);
                };
            } catch {
                startPoll();
            }
        };
        connect();
        return () => {
            alive = false;
            if (ws) try { ws.close(); } catch { /* noop */ }
            if (pollTimer) clearInterval(pollTimer);
            if (pingTimer) clearInterval(pingTimer);
        };
    }, [mode, params.code, load]);

    // Advance slides
    useEffect(() => {
        if (!playlist?.slides?.length) return;
        if (timerRef.current) clearTimeout(timerRef.current);
        const dur = (playlist.slides[idx]?.duration || 8) * 1000;
        timerRef.current = setTimeout(() => {
            setFade(false);
            setTimeout(() => {
                setIdx((i) => (i + 1) % playlist.slides.length);
                setFade(true);
            }, 400);
        }, dur);
        return () => clearTimeout(timerRef.current);
    }, [idx, playlist]);

    if (error) {
        return (
            <div className="player-root flex items-center justify-center text-white" data-testid="player-error">
                <div className="text-center px-8">
                    <div className="label-mono mb-3">// Screena</div>
                    <div className="font-display text-2xl font-bold">{error}</div>
                    {playlist?.screen && (
                        <div className="label-mono mt-4">code · {playlist.screen.pair_code}</div>
                    )}
                </div>
            </div>
        );
    }

    if (!playlist) {
        return (
            <div className="player-root flex items-center justify-center text-white">
                <div className="label-mono">Loading…</div>
            </div>
        );
    }

    if (!playlist.slides?.length) {
        return (
            <div className="player-root flex items-center justify-center text-white">
                <div className="text-center">
                    <div className="font-display text-2xl font-bold">{playlist.name}</div>
                    <div className="label-mono mt-3">No slides yet</div>
                </div>
            </div>
        );
    }

    const slide = playlist.slides[idx];

    return (
        <div className="player-root" data-testid="player-root">
            <div
                key={slide.id}
                style={{
                    width: "100%",
                    height: "100%",
                    opacity: fade ? 1 : 0,
                    transition: "opacity 400ms ease",
                }}
            >
                <ScaledSlide slide={slide} designWidth={playlist.width || 1920} designHeight={playlist.height || 1080} />
            </div>
        </div>
    );
}
