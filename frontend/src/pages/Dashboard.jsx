import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "@/lib/api";
import AppShell from "@/components/AppShell";
import { Plus, FileUp, MonitorPlay, Trash2, ArrowRight, Layers } from "lucide-react";
import { toast } from "sonner";

export default function Dashboard() {
    const navigate = useNavigate();
    const [playlists, setPlaylists] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const fileRef = useRef(null);

    const load = async () => {
        try {
            const { data } = await api.get("/playlists");
            setPlaylists(data);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    const createNew = async () => {
        const { data } = await api.post("/playlists", { name: "Untitled Deck", width: 1920, height: 1080 });
        navigate(`/editor/${data.id}`);
    };

    const onUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        const fd = new FormData();
        fd.append("file", file);
        try {
            const { data } = await api.post("/pptx/import", fd, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            toast.success(`Imported "${data.name}" · ${data.slide_count} slides`);
            await load();
            navigate(`/editor/${data.id}`);
        } catch (e2) {
            toast.error(e2.response?.data?.detail || "Failed to import");
        } finally {
            setUploading(false);
            if (fileRef.current) fileRef.current.value = "";
        }
    };

    const remove = async (id) => {
        if (!confirm("Delete this playlist?")) return;
        await api.delete(`/playlists/${id}`);
        await load();
    };

    return (
        <AppShell>
            <div className="max-w-6xl mx-auto px-8 py-12">
                <div className="flex items-end justify-between mb-10">
                    <div>
                        <div className="label-mono mb-3">// Studio</div>
                        <h1 className="font-display text-4xl sm:text-5xl font-extrabold tracking-tighter leading-none">
                            Playlists
                        </h1>
                        <p className="text-secondary2 mt-3 text-sm">
                            Build advertising decks. Cycle them on any TV via a pairing code.
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <input
                            ref={fileRef}
                            type="file"
                            accept=".pptx"
                            onChange={onUpload}
                            className="hidden"
                            data-testid="pptx-file-input"
                        />
                        <button
                            data-testid="import-pptx-button"
                            className="btn-ghost inline-flex items-center gap-2"
                            onClick={() => fileRef.current?.click()}
                            disabled={uploading}
                        >
                            <FileUp size={15} /> {uploading ? "Importing…" : "Import PPTX"}
                        </button>
                        <button
                            data-testid="new-playlist-button"
                            className="btn-primary inline-flex items-center gap-2"
                            onClick={createNew}
                        >
                            <Plus size={15} /> New playlist
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="label-mono">Loading…</div>
                ) : playlists.length === 0 ? (
                    <div
                        className="bento-card flex flex-col items-center justify-center text-center py-20"
                        data-testid="empty-state"
                    >
                        <Layers size={36} className="text-[#3b82f6] mb-4" />
                        <div className="font-display text-xl font-bold mb-1">No playlists yet</div>
                        <div className="text-secondary2 text-sm mb-6 max-w-md">
                            Create a deck from scratch or import a PowerPoint file. We&apos;ll parse the
                            shapes and images into editable blocks.
                        </div>
                        <div className="flex gap-2">
                            <button className="btn-primary inline-flex items-center gap-2" onClick={createNew}>
                                <Plus size={14} /> Create deck
                            </button>
                            <button className="btn-ghost inline-flex items-center gap-2" onClick={() => fileRef.current?.click()}>
                                <FileUp size={14} /> Upload PPTX
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {playlists.map((p) => (
                            <div key={p.id} className="bento-card group" data-testid={`playlist-card-${p.id}`}>
                                <div className="flex items-start justify-between mb-4">
                                    <div className="w-9 h-9 rounded-md bg-white/5 border border-soft flex items-center justify-center">
                                        <MonitorPlay size={16} className="text-[#3b82f6]" />
                                    </div>
                                    <button
                                        className="tool-btn opacity-0 group-hover:opacity-100"
                                        onClick={() => remove(p.id)}
                                        title="Delete"
                                        data-testid={`delete-playlist-${p.id}`}
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                                <div className="font-display text-lg font-bold mb-1 truncate">{p.name}</div>
                                <div className="label-mono">
                                    {p.slide_count} slides · {p.width}×{p.height}
                                </div>
                                <div className="mt-5 flex items-center justify-between">
                                    <Link
                                        to={`/editor/${p.id}`}
                                        data-testid={`open-editor-${p.id}`}
                                        className="text-sm font-medium text-white inline-flex items-center gap-1.5 hover:gap-2 transition-all"
                                    >
                                        Open editor <ArrowRight size={14} />
                                    </Link>
                                    <Link
                                        to={`/preview/${p.id}`}
                                        data-testid={`preview-playlist-${p.id}`}
                                        className="text-xs label-mono hover:text-white transition-colors"
                                    >
                                        Preview →
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </AppShell>
    );
}
