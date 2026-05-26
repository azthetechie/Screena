import { useEffect, useRef, useState } from "react";
import api from "@/lib/api";
import { X, Upload, Trash2, Image as ImageIcon, Video, Search } from "lucide-react";
import { toast } from "sonner";

/**
 * Asset library modal.
 * Props:
 *   - open: bool
 *   - filter: "image" | "video" | null (filters list)
 *   - onClose(): close without selection
 *   - onSelect(asset): asset = { id, type, mime, data (data URL), name }
 */
export default function AssetLibrary({ open, filter = null, onClose, onSelect }) {
    const [assets, setAssets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [query, setQuery] = useState("");
    const fileRef = useRef(null);

    useEffect(() => {
        if (!open) return;
        load();
    }, [open]);

    const load = async () => {
        setLoading(true);
        try {
            const { data } = await api.get("/assets");
            setAssets(data);
        } catch {
            toast.error("Could not load assets");
        } finally {
            setLoading(false);
        }
    };

    const upload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 8 * 1024 * 1024) {
            toast.error("File too large (max 8MB)");
            if (fileRef.current) fileRef.current.value = "";
            return;
        }
        setUploading(true);
        const fd = new FormData();
        fd.append("file", file);
        fd.append("name", file.name);
        try {
            const { data } = await api.post("/assets", fd, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            toast.success("Uploaded");
            // Use newly uploaded asset directly
            onSelect(data);
        } catch (e2) {
            toast.error(e2.response?.data?.detail || "Upload failed");
        } finally {
            setUploading(false);
            if (fileRef.current) fileRef.current.value = "";
        }
    };

    const pick = async (asset) => {
        // List endpoint excludes the `data` field — fetch full asset to get the data URL
        try {
            const { data } = await api.get(`/assets/${asset.id}`);
            onSelect(data);
        } catch {
            toast.error("Could not load asset");
        }
    };

    const remove = async (id, e) => {
        e.stopPropagation();
        if (!confirm("Delete this asset?")) return;
        await api.delete(`/assets/${id}`);
        setAssets((a) => a.filter((x) => x.id !== id));
    };

    if (!open) return null;

    const list = assets.filter((a) => {
        if (filter && a.type !== filter) return false;
        if (query && !(a.name || "").toLowerCase().includes(query.toLowerCase())) return false;
        return true;
    });

    return (
        <div
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-6"
            onClick={onClose}
            data-testid="asset-library-overlay"
        >
            <div
                className="bg-panel border border-soft rounded-xl w-full max-w-4xl max-h-[80vh] flex flex-col overflow-hidden"
                onClick={(e) => e.stopPropagation()}
                data-testid="asset-library-dialog"
            >
                <div className="px-5 py-4 border-b border-soft flex items-center justify-between">
                    <div>
                        <div className="font-display text-lg font-bold">Asset Library</div>
                        <div className="label-mono mt-1">{filter ? `Filter · ${filter}s` : "All assets"} · base64 in MongoDB</div>
                    </div>
                    <button className="tool-btn" onClick={onClose} data-testid="asset-library-close">
                        <X size={16} />
                    </button>
                </div>

                <div className="px-5 py-3 border-b border-soft flex items-center gap-3">
                    <div className="flex-1 relative">
                        <Search size={14} className="absolute left-3 top-2.5 text-muted2" />
                        <input
                            data-testid="asset-search"
                            className="input-field pl-8"
                            placeholder="Search assets…"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                        />
                    </div>
                    <input
                        ref={fileRef}
                        type="file"
                        accept={filter === "video" ? "video/*" : filter === "image" ? "image/*" : "image/*,video/*"}
                        className="hidden"
                        onChange={upload}
                        data-testid="asset-upload-input"
                    />
                    <button
                        className="btn-primary inline-flex items-center gap-2"
                        onClick={() => fileRef.current?.click()}
                        disabled={uploading}
                        data-testid="asset-upload-button"
                    >
                        <Upload size={14} /> {uploading ? "Uploading…" : "Upload"}
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-5">
                    {loading ? (
                        <div className="label-mono">Loading…</div>
                    ) : list.length === 0 ? (
                        <div className="text-center py-16 text-muted2 text-sm">
                            No assets yet — upload one to reuse it across slides.
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                            {list.map((a) => (
                                <div
                                    key={a.id}
                                    onClick={() => pick(a)}
                                    className="group relative cursor-pointer border border-soft hover:border-[#3b82f6] rounded-md overflow-hidden transition-colors bg-black"
                                    data-testid={`asset-card-${a.id}`}
                                >
                                    <div className="aspect-square flex items-center justify-center bg-black/40">
                                        {a.type === "image" ? (
                                            <ImageIcon size={28} className="text-white/40" />
                                        ) : (
                                            <Video size={28} className="text-white/40" />
                                        )}
                                        <span className="absolute top-2 left-2 label-mono bg-black/70 px-1.5 py-0.5 rounded">
                                            {a.type}
                                        </span>
                                    </div>
                                    <div className="px-2.5 py-2 border-t border-soft bg-card2">
                                        <div className="text-xs truncate">{a.name}</div>
                                        <div className="label-mono mt-0.5">
                                            {Math.round((a.size || 0) / 1024)} KB
                                        </div>
                                    </div>
                                    <button
                                        className="tool-btn absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 bg-black/60"
                                        onClick={(e) => remove(a.id, e)}
                                        title="Delete"
                                        data-testid={`asset-delete-${a.id}`}
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
