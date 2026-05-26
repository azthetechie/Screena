import { useEffect, useState } from "react";
import api from "@/lib/api";
import AppShell from "@/components/AppShell";
import { Plus, Tv, Trash2, Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";

export default function Screens() {
    const [screens, setScreens] = useState([]);
    const [playlists, setPlaylists] = useState([]);
    const [loading, setLoading] = useState(true);

    const load = async () => {
        const [s, p] = await Promise.all([api.get("/screens"), api.get("/playlists")]);
        setScreens(s.data);
        setPlaylists(p.data);
        setLoading(false);
    };

    useEffect(() => {
        load();
    }, []);

    const addScreen = async () => {
        const name = prompt("Screen name", "Lobby TV");
        if (!name) return;
        await api.post("/screens", { name });
        await load();
    };

    const remove = async (id) => {
        if (!confirm("Remove this screen?")) return;
        await api.delete(`/screens/${id}`);
        await load();
    };

    const assignPlaylist = async (screenId, playlistId) => {
        await api.put(`/screens/${screenId}`, { playlist_id: playlistId || null });
        await load();
        toast.success("Screen updated");
    };

    const copyLink = async (code) => {
        const url = `${window.location.origin}/play/${code}`;
        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(url);
                toast.success("Public URL copied");
                return;
            }
            throw new Error("clipboard-unavailable");
        } catch {
            // Fallback: temporary textarea + execCommand
            try {
                const ta = document.createElement("textarea");
                ta.value = url;
                ta.style.position = "fixed";
                ta.style.opacity = "0";
                document.body.appendChild(ta);
                ta.focus();
                ta.select();
                document.execCommand("copy");
                document.body.removeChild(ta);
                toast.success("Public URL copied");
            } catch {
                toast.error("Couldn't copy — please copy manually");
            }
        }
    };

    return (
        <AppShell>
            <div className="max-w-6xl mx-auto px-8 py-12">
                <div className="flex items-end justify-between mb-10">
                    <div>
                        <div className="label-mono mb-3">// Devices</div>
                        <h1 className="font-display text-4xl sm:text-5xl font-extrabold tracking-tighter leading-none">
                            Screens
                        </h1>
                        <p className="text-secondary2 mt-3 text-sm max-w-lg">
                            Each screen has a pairing code. Open the public URL on a Chromecast or Raspberry
                            Pi browser to start playing your assigned deck.
                        </p>
                    </div>
                    <button data-testid="add-screen-button" className="btn-primary inline-flex items-center gap-2" onClick={addScreen}>
                        <Plus size={15} /> New screen
                    </button>
                </div>

                {loading ? (
                    <div className="label-mono">Loading…</div>
                ) : screens.length === 0 ? (
                    <div className="bento-card flex flex-col items-center justify-center text-center py-20" data-testid="screens-empty">
                        <Tv size={36} className="text-[#3b82f6] mb-4" />
                        <div className="font-display text-xl font-bold mb-1">No screens yet</div>
                        <div className="text-secondary2 text-sm mb-6 max-w-md">
                            Add a screen, assign a playlist, and open the public URL on your TV.
                        </div>
                        <button className="btn-primary inline-flex items-center gap-2" onClick={addScreen}>
                            <Plus size={14} /> Add screen
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {screens.map((s) => {
                            const playUrl = `${window.location.origin}/play/${s.pair_code}`;
                            return (
                                <div key={s.id} className="bento-card" data-testid={`screen-card-${s.id}`}>
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-md bg-white/5 border border-soft flex items-center justify-center">
                                                <Tv size={16} className="text-[#3b82f6]" />
                                            </div>
                                            <div>
                                                <div className="font-display text-lg font-bold leading-tight">{s.name}</div>
                                                <div className="label-mono mt-1">
                                                    code · <span className="text-white">{s.pair_code}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <button className="tool-btn" onClick={() => remove(s.id)} title="Delete" data-testid={`delete-screen-${s.id}`}>
                                            <Trash2 size={14} />
                                        </button>
                                    </div>

                                    <label className="label-mono block mb-2">Playlist</label>
                                    <select
                                        data-testid={`assign-playlist-select-${s.id}`}
                                        className="input-field"
                                        value={s.playlist_id || ""}
                                        onChange={(e) => assignPlaylist(s.id, e.target.value)}
                                    >
                                        <option value="">— None —</option>
                                        {playlists.map((p) => (
                                            <option key={p.id} value={p.id}>
                                                {p.name} ({p.slide_count} slides)
                                            </option>
                                        ))}
                                    </select>

                                    <div className="mt-4 p-3 rounded-md bg-white/[0.03] border border-soft flex items-center gap-2">
                                        <code className="text-[11px] font-mono text-secondary2 truncate flex-1">{playUrl}</code>
                                        <button className="tool-btn" onClick={() => copyLink(s.pair_code)} title="Copy URL" data-testid={`copy-link-${s.id}`}>
                                            <Copy size={14} />
                                        </button>
                                        <a className="tool-btn" href={playUrl} target="_blank" rel="noreferrer" title="Open" data-testid={`open-screen-${s.id}`}>
                                            <ExternalLink size={14} />
                                        </a>
                                    </div>
                                    <div className="mt-3 label-mono">
                                        {s.paired ? "online · last seen " + (s.last_seen?.slice(11, 19) || "") : "awaiting first connection"}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </AppShell>
    );
}
