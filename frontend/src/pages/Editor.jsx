import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Rnd } from "react-rnd";
import api from "@/lib/api";
import BlockRenderer from "@/components/BlockRenderer";
import AssetLibrary from "@/components/AssetLibrary";
import {
    Type,
    Image as ImageIcon,
    Video,
    Square,
    Circle as CircleIcon,
    Timer,
    Clock as ClockIcon,
    Cloud,
    Save,
    Play,
    Plus,
    Trash2,
    ChevronUp,
    ChevronDown,
    Copy,
    ArrowLeft,
    Layers as LayersIcon,
    Pencil,
    Eye,
    EyeOff,
    MonitorPlay,
} from "lucide-react";
import { toast } from "sonner";

const newBlock = (type) => {
    const base = {
        id: crypto.randomUUID(),
        type,
        x: 200,
        y: 200,
        width: 600,
        height: 200,
        rotation: 0,
        opacity: 1,
        borderRadius: 0,
    };
    if (type === "text")
        return {
            ...base,
            text: "Headline",
            fontSize: 96,
            fontFamily: "Manrope",
            fontWeight: "800",
            color: "#FFFFFF",
            align: "left",
        };
    if (type === "image") return { ...base, width: 400, height: 400, objectFit: "cover", src: "" };
    if (type === "video") return { ...base, width: 800, height: 450, objectFit: "cover", src: "" };
    if (type === "shape")
        return { ...base, width: 300, height: 300, shape: "rectangle", background: "#3B82F6" };
    if (type === "countdown")
        return {
            ...base,
            width: 900,
            height: 240,
            targetDate: new Date(Date.now() + 7 * 86400 * 1000).toISOString().slice(0, 16),
            color: "#FFFFFF",
            fontFamily: "Manrope",
            countdownFormat: "dhms",
        };
    if (type === "clock")
        return { ...base, width: 700, height: 240, timeFormat: "24h", color: "#FFFFFF", fontFamily: "Manrope" };
    if (type === "weather")
        return { ...base, width: 600, height: 280, location: "London", color: "#FFFFFF", fontFamily: "Manrope" };
    return base;
};

const TOOLS = [
    { type: "text", icon: Type, label: "Text" },
    { type: "image", icon: ImageIcon, label: "Image" },
    { type: "video", icon: Video, label: "Video" },
    { type: "shape", icon: Square, label: "Shape" },
    { type: "countdown", icon: Timer, label: "Countdown" },
    { type: "clock", icon: ClockIcon, label: "Clock" },
    { type: "weather", icon: Cloud, label: "Weather" },
];

const BLOCK_ICON = {
    text: Type,
    image: ImageIcon,
    video: Video,
    shape: Square,
    countdown: Timer,
    clock: ClockIcon,
    weather: Cloud,
};

export default function Editor() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [playlist, setPlaylist] = useState(null);
    const [activeSlideIdx, setActiveSlideIdx] = useState(0);
    const [selectedBlockId, setSelectedBlockId] = useState(null);
    const [saving, setSaving] = useState(false);
    const [dirty, setDirty] = useState(false);
    const [scale, setScale] = useState(0.4);
    const canvasWrapRef = useRef(null);
    // Asset library state
    const [libraryOpen, setLibraryOpen] = useState(false);
    const [libraryTarget, setLibraryTarget] = useState(null); // {blockId, kind}
    // Slide drag-reorder state
    const [dragSlideIdx, setDragSlideIdx] = useState(null);
    const [dragOverIdx, setDragOverIdx] = useState(null);

    useEffect(() => {
        (async () => {
            try {
                const { data } = await api.get(`/playlists/${id}`);
                setPlaylist(data);
            } catch {
                toast.error("Playlist not found");
                navigate("/dashboard");
            }
        })();
    }, [id, navigate]);

    const slide = playlist?.slides?.[activeSlideIdx];
    const blocks = slide?.blocks || [];
    const selectedBlock = blocks.find((b) => b.id === selectedBlockId) || null;

    // Auto-scale canvas to fit available area
    useEffect(() => {
        if (!playlist) return;
        const compute = () => {
            const el = canvasWrapRef.current;
            if (!el) return;
            const rect = el.getBoundingClientRect();
            const padding = 60;
            const sx = (rect.width - padding) / playlist.width;
            const sy = (rect.height - padding) / playlist.height;
            setScale(Math.min(sx, sy, 1));
        };
        compute();
        window.addEventListener("resize", compute);
        return () => window.removeEventListener("resize", compute);
    }, [playlist]);

    // ----- Slide ops -----
    const updateSlide = useCallback(
        (idx, mut) => {
            setPlaylist((p) => {
                const slides = p.slides.map((s, i) => (i === idx ? { ...s, ...mut(s) } : s));
                return { ...p, slides };
            });
            setDirty(true);
        },
        [setPlaylist]
    );

    const updateBlock = useCallback(
        (blockId, patch) => {
            updateSlide(activeSlideIdx, (s) => ({
                blocks: s.blocks.map((b) => (b.id === blockId ? { ...b, ...patch } : b)),
            }));
        },
        [activeSlideIdx, updateSlide]
    );

    const addBlock = (type) => {
        const b = newBlock(type);
        b.z = (blocks.reduce((m, x) => Math.max(m, x.z || 0), 0) || 0) + 1;
        updateSlide(activeSlideIdx, (s) => ({ blocks: [...s.blocks, b] }));
        setSelectedBlockId(b.id);
    };

    const deleteBlock = (blockId) => {
        updateSlide(activeSlideIdx, (s) => ({ blocks: s.blocks.filter((b) => b.id !== blockId) }));
        if (selectedBlockId === blockId) setSelectedBlockId(null);
    };

    const duplicateBlock = (blockId) => {
        const b = blocks.find((x) => x.id === blockId);
        if (!b) return;
        const copy = { ...b, id: crypto.randomUUID(), x: b.x + 30, y: b.y + 30, z: (blocks.reduce((m, x) => Math.max(m, x.z || 0), 0) || 0) + 1 };
        updateSlide(activeSlideIdx, (s) => ({ blocks: [...s.blocks, copy] }));
        setSelectedBlockId(copy.id);
    };

    const reorderZ = (blockId, dir) => {
        // sort blocks by z, swap with neighbor
        const sorted = [...blocks].sort((a, b) => (a.z || 0) - (b.z || 0));
        const i = sorted.findIndex((b) => b.id === blockId);
        const j = dir === "up" ? i + 1 : i - 1;
        if (j < 0 || j >= sorted.length) return;
        const a = sorted[i],
            b = sorted[j];
        const tmpZ = a.z;
        updateSlide(activeSlideIdx, (s) => ({
            blocks: s.blocks.map((x) => (x.id === a.id ? { ...x, z: b.z } : x.id === b.id ? { ...x, z: tmpZ } : x)),
        }));
    };

    // ----- Slide list ops -----
    const addSlide = () => {
        const s = { id: crypto.randomUUID(), name: `Slide ${playlist.slides.length + 1}`, duration: 8, background: "#0B0D12", blocks: [], transition: "fade" };
        setPlaylist((p) => ({ ...p, slides: [...p.slides, s] }));
        setActiveSlideIdx(playlist.slides.length);
        setDirty(true);
    };

    const removeSlide = (idx) => {
        if (playlist.slides.length === 1) return toast.error("Need at least one slide");
        setPlaylist((p) => ({ ...p, slides: p.slides.filter((_, i) => i !== idx) }));
        setActiveSlideIdx((cur) => Math.max(0, Math.min(cur, playlist.slides.length - 2)));
        setDirty(true);
    };

    // ----- Persistence -----
    const save = async () => {
        setSaving(true);
        try {
            const { data } = await api.put(`/playlists/${id}`, {
                name: playlist.name,
                width: playlist.width,
                height: playlist.height,
                slides: playlist.slides,
            });
            setPlaylist(data);
            setDirty(false);
            toast.success("Saved");
        } catch (e) {
            toast.error("Save failed");
        } finally {
            setSaving(false);
        }
    };

    // ----- Asset library opener -----
    // The Inspector calls this with the selected block; we just remember the
    // target then open the library modal which handles upload + selection.
    const openAssetLibrary = (blockId, kind) => {
        setLibraryTarget({ blockId, kind });
        setLibraryOpen(true);
    };

    const onAssetPicked = (asset) => {
        if (libraryTarget && asset?.data) {
            updateBlock(libraryTarget.blockId, { src: asset.data });
        }
        setLibraryOpen(false);
        setLibraryTarget(null);
    };

    // ----- Slide thumbnail drag-reorder -----
    const moveSlide = (from, to) => {
        if (from === to || from < 0 || to < 0) return;
        setPlaylist((p) => {
            const slides = [...p.slides];
            const [m] = slides.splice(from, 1);
            slides.splice(to, 0, m);
            return { ...p, slides };
        });
        // adjust active idx
        setActiveSlideIdx((cur) => {
            if (cur === from) return to;
            if (from < cur && to >= cur) return cur - 1;
            if (from > cur && to <= cur) return cur + 1;
            return cur;
        });
        setDirty(true);
    };

    const sortedBlocks = useMemo(() => [...blocks].sort((a, b) => (a.z || 0) - (b.z || 0)), [blocks]);

    if (!playlist) {
        return (
            <div className="h-screen flex items-center justify-center bg-[#0b0d12]">
                <div className="label-mono">Loading editor…</div>
            </div>
        );
    }

    return (
        <div className="h-screen flex flex-col bg-[#0b0d12] overflow-hidden">
            {/* Top bar */}
            <header className="h-14 border-b border-soft flex items-center justify-between px-4 bg-panel shrink-0">
                <div className="flex items-center gap-4">
                    <Link to="/dashboard" className="tool-btn" data-testid="back-to-dashboard"><ArrowLeft size={16} /></Link>
                    <div className="flex items-center gap-2">
                        <MonitorPlay size={16} className="text-[#3b82f6]" />
                        <input
                            data-testid="playlist-name-input"
                            value={playlist.name}
                            onChange={(e) => { setPlaylist({ ...playlist, name: e.target.value }); setDirty(true); }}
                            className="bg-transparent text-sm font-semibold font-display outline-none border-b border-transparent focus:border-white/20 px-1"
                        />
                    </div>
                    {dirty && <span className="label-mono">unsaved</span>}
                </div>

                <div className="flex items-center gap-1 bg-white/[0.03] p-1 rounded-md border border-soft">
                    {TOOLS.map((t) => {
                        const Icon = t.icon;
                        return (
                            <button
                                key={t.type}
                                title={t.label}
                                data-testid={`add-${t.type}-block`}
                                className="tool-btn"
                                onClick={() => addBlock(t.type)}
                            >
                                <Icon size={16} />
                            </button>
                        );
                    })}
                </div>

                <div className="flex items-center gap-2">
                    <Link to={`/preview/${id}`} target="_blank" className="btn-ghost inline-flex items-center gap-2" data-testid="preview-button">
                        <Play size={14} /> Preview
                    </Link>
                    <button onClick={save} className="btn-primary inline-flex items-center gap-2" disabled={saving} data-testid="save-button">
                        <Save size={14} /> {saving ? "Saving…" : "Save"}
                    </button>
                </div>
            </header>

            <div className="flex-1 flex overflow-hidden">
                {/* Left panel */}
                <aside className="w-64 border-r border-soft bg-panel flex flex-col shrink-0">
                    <div className="p-3 border-b border-soft flex items-center justify-between">
                        <div className="label-mono">Slides</div>
                        <button className="tool-btn" onClick={addSlide} title="Add slide" data-testid="add-slide-button"><Plus size={14} /></button>
                    </div>
                    <div className="overflow-y-auto p-2 space-y-1.5 max-h-[40%]">
                        {playlist.slides.map((s, i) => (
                            <div
                                key={s.id}
                                data-testid={`slide-thumb-${i}`}
                                draggable
                                onClick={() => { setActiveSlideIdx(i); setSelectedBlockId(null); }}
                                onDragStart={(e) => { setDragSlideIdx(i); e.dataTransfer.effectAllowed = "move"; }}
                                onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; setDragOverIdx(i); }}
                                onDragLeave={() => setDragOverIdx((cur) => (cur === i ? null : cur))}
                                onDrop={(e) => { e.preventDefault(); if (dragSlideIdx !== null) moveSlide(dragSlideIdx, i); setDragSlideIdx(null); setDragOverIdx(null); }}
                                onDragEnd={() => { setDragSlideIdx(null); setDragOverIdx(null); }}
                                className={`group cursor-pointer rounded-md border transition-all ${
                                    i === activeSlideIdx ? "border-[#3b82f6] bg-[#3b82f6]/10" : "border-soft hover:border-strong"
                                } ${dragOverIdx === i && dragSlideIdx !== i ? "ring-2 ring-[#3b82f6]" : ""} ${dragSlideIdx === i ? "opacity-50" : ""}`}
                            >
                                <div className="flex items-center gap-2 px-2 py-1.5">
                                    <span className="label-mono w-5">{String(i + 1).padStart(2, "0")}</span>
                                    <span className="text-xs truncate flex-1">{s.name}</span>
                                    <button className="tool-btn opacity-0 group-hover:opacity-100" onClick={(e) => { e.stopPropagation(); removeSlide(i); }} title="Delete slide" data-testid={`delete-slide-${i}`}>
                                        <Trash2 size={11} />
                                    </button>
                                </div>
                                <div className="mx-2 mb-2 aspect-video rounded border border-soft" style={{ background: s.background || "#0b0d12", position: "relative", overflow: "hidden" }}>
                                    {/* mini preview */}
                                    {s.blocks.slice(0, 8).map((b) => (
                                        <div key={b.id} style={{
                                            position: "absolute",
                                            left: `${(b.x / playlist.width) * 100}%`,
                                            top: `${(b.y / playlist.height) * 100}%`,
                                            width: `${(b.width / playlist.width) * 100}%`,
                                            height: `${(b.height / playlist.height) * 100}%`,
                                            background: b.type === "text" ? "rgba(255,255,255,0.4)" : b.background || "rgba(59,130,246,0.5)",
                                            borderRadius: b.shape === "circle" ? "50%" : "1px",
                                        }} />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="px-3 py-2 border-t border-soft flex items-center justify-between">
                        <div className="label-mono inline-flex items-center gap-2"><LayersIcon size={11} /> Layers</div>
                        <span className="label-mono">{blocks.length}</span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-1">
                        {sortedBlocks.length === 0 && <div className="text-xs text-muted2 px-2 py-3">No layers · use the toolbar to add a block</div>}
                        {[...sortedBlocks].reverse().map((b) => {
                            const Icon = BLOCK_ICON[b.type] || Square;
                            const active = b.id === selectedBlockId;
                            return (
                                <div
                                    key={b.id}
                                    data-testid={`layer-item-${b.id}`}
                                    onClick={() => setSelectedBlockId(b.id)}
                                    className={`flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer border transition ${
                                        active ? "bg-[#3b82f6]/15 border-[#3b82f6]/40 text-white" : "border-transparent hover:bg-white/5 text-secondary2"
                                    }`}
                                >
                                    <Icon size={13} />
                                    <span className="text-xs flex-1 truncate">
                                        {b.type === "text" ? (b.text?.slice(0, 24) || "Text") : `${b.type[0].toUpperCase()}${b.type.slice(1)}`}
                                    </span>
                                    <span className="label-mono">z{b.z}</span>
                                </div>
                            );
                        })}
                    </div>
                </aside>

                {/* Canvas area */}
                <div
                    ref={canvasWrapRef}
                    className="flex-1 bg-canvas canvas-grid relative overflow-hidden flex items-center justify-center"
                    onClick={() => setSelectedBlockId(null)}
                >
                    <div
                        style={{
                            width: playlist.width * scale,
                            height: playlist.height * scale,
                        }}
                        className="relative shadow-[0_30px_120px_-30px_rgba(0,0,0,0.8)]"
                    >
                        <div
                            style={{
                                width: playlist.width,
                                height: playlist.height,
                                transform: `scale(${scale})`,
                                transformOrigin: "top left",
                                background: slide.background || "#0B0D12",
                                position: "relative",
                                overflow: "hidden",
                            }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            {sortedBlocks.map((b) => (
                                <Rnd
                                    key={b.id}
                                    scale={scale}
                                    bounds="parent"
                                    position={{ x: b.x, y: b.y }}
                                    size={{ width: b.width, height: b.height }}
                                    onDragStart={() => setSelectedBlockId(b.id)}
                                    onDragStop={(e, d) => updateBlock(b.id, { x: Math.round(d.x), y: Math.round(d.y) })}
                                    onResizeStart={() => setSelectedBlockId(b.id)}
                                    onResizeStop={(e, dir, ref, delta, pos) =>
                                        updateBlock(b.id, {
                                            width: Math.round(parseFloat(ref.style.width)),
                                            height: Math.round(parseFloat(ref.style.height)),
                                            x: Math.round(pos.x),
                                            y: Math.round(pos.y),
                                        })
                                    }
                                    style={{ zIndex: b.z || 0 }}
                                    resizeHandleClasses={{
                                        topLeft: "rnd-handle", topRight: "rnd-handle",
                                        bottomLeft: "rnd-handle", bottomRight: "rnd-handle",
                                        top: "rnd-handle", left: "rnd-handle",
                                        right: "rnd-handle", bottom: "rnd-handle",
                                    }}
                                    enableResizing={selectedBlockId === b.id}
                                >
                                    <div
                                        data-testid={`canvas-block-${b.id}`}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedBlockId(b.id);
                                        }}
                                        style={{ width: "100%", height: "100%", position: "relative", outline: selectedBlockId === b.id ? "2px solid #3B82F6" : "none" }}
                                    >
                                        <BlockRenderer block={b} />
                                    </div>
                                </Rnd>
                            ))}
                        </div>
                    </div>

                    {/* Scale label */}
                    <div className="absolute bottom-3 right-4 label-mono">{Math.round(scale * 100)}%</div>
                    <div className="absolute bottom-3 left-4 label-mono">
                        {playlist.width}×{playlist.height}
                    </div>
                </div>

                {/* Right inspector */}
                <aside className="w-72 border-l border-soft bg-panel flex flex-col shrink-0 overflow-y-auto">
                    {!selectedBlock ? (
                        <SlideInspector slide={slide} idx={activeSlideIdx} updateSlide={updateSlide} />
                    ) : (
                        <BlockInspector
                            block={selectedBlock}
                            updateBlock={(p) => updateBlock(selectedBlock.id, p)}
                            onDelete={() => deleteBlock(selectedBlock.id)}
                            onDuplicate={() => duplicateBlock(selectedBlock.id)}
                            onMoveUp={() => reorderZ(selectedBlock.id, "up")}
                            onMoveDown={() => reorderZ(selectedBlock.id, "down")}
                            onUpload={() => openAssetLibrary(selectedBlock.id, selectedBlock.type === "video" ? "video" : "image")}
                        />
                    )}
                </aside>
            </div>

            <AssetLibrary
                open={libraryOpen}
                filter={libraryTarget?.kind || null}
                onClose={() => { setLibraryOpen(false); setLibraryTarget(null); }}
                onSelect={onAssetPicked}
            />
        </div>
    );
}

function Field({ label, children }) {
    return (
        <div className="space-y-1.5">
            <div className="label-mono">{label}</div>
            {children}
        </div>
    );
}

function Section({ title, children }) {
    return (
        <div className="p-4 border-b border-soft space-y-3">
            <div className="text-xs font-semibold text-white/80 font-display tracking-wide">{title}</div>
            {children}
        </div>
    );
}

function SlideInspector({ slide, idx, updateSlide }) {
    return (
        <div>
            <Section title="Slide">
                <Field label="Name">
                    <input
                        data-testid="slide-name-input"
                        className="input-field"
                        value={slide.name}
                        onChange={(e) => updateSlide(idx, () => ({ name: e.target.value }))}
                    />
                </Field>
                <Field label="Duration (s)">
                    <input
                        data-testid="slide-duration-input"
                        type="number"
                        min="1"
                        step="0.5"
                        className="input-field"
                        value={slide.duration}
                        onChange={(e) => updateSlide(idx, () => ({ duration: parseFloat(e.target.value) || 1 }))}
                    />
                </Field>
                <Field label="Background">
                    <input
                        type="color"
                        data-testid="slide-bg-color"
                        className="input-field h-9 p-1"
                        value={slide.background || "#0B0D12"}
                        onChange={(e) => updateSlide(idx, () => ({ background: e.target.value }))}
                    />
                </Field>
                <Field label="Transition">
                    <select
                        data-testid="slide-transition-select"
                        className="input-field"
                        value={slide.transition || "fade"}
                        onChange={(e) => updateSlide(idx, () => ({ transition: e.target.value }))}
                    >
                        <option value="fade">Fade</option>
                        <option value="slide">Slide</option>
                        <option value="none">None</option>
                    </select>
                </Field>
            </Section>
            <div className="p-4 text-xs text-muted2">Tip: select a block on the canvas to edit its properties.</div>
        </div>
    );
}

function BlockInspector({ block, updateBlock, onDelete, onDuplicate, onMoveUp, onMoveDown, onUpload }) {
    return (
        <div>
            <Section title={`${block.type[0].toUpperCase()}${block.type.slice(1)} Block`}>
                <div className="flex items-center gap-1">
                    <button className="tool-btn" onClick={onMoveUp} title="Bring forward" data-testid="block-move-up">
                        <ChevronUp size={14} />
                    </button>
                    <button className="tool-btn" onClick={onMoveDown} title="Send back" data-testid="block-move-down">
                        <ChevronDown size={14} />
                    </button>
                    <button className="tool-btn" onClick={onDuplicate} title="Duplicate" data-testid="block-duplicate">
                        <Copy size={14} />
                    </button>
                    <div className="flex-1" />
                    <button className="tool-btn" onClick={onDelete} title="Delete" data-testid="block-delete">
                        <Trash2 size={14} />
                    </button>
                </div>
            </Section>

            <Section title="Position & Size">
                <div className="grid grid-cols-2 gap-2">
                    <Field label="X"><input className="input-field" type="number" value={Math.round(block.x)} onChange={(e) => updateBlock({ x: parseFloat(e.target.value) || 0 })} data-testid="block-x" /></Field>
                    <Field label="Y"><input className="input-field" type="number" value={Math.round(block.y)} onChange={(e) => updateBlock({ y: parseFloat(e.target.value) || 0 })} data-testid="block-y" /></Field>
                    <Field label="W"><input className="input-field" type="number" value={Math.round(block.width)} onChange={(e) => updateBlock({ width: parseFloat(e.target.value) || 1 })} data-testid="block-w" /></Field>
                    <Field label="H"><input className="input-field" type="number" value={Math.round(block.height)} onChange={(e) => updateBlock({ height: parseFloat(e.target.value) || 1 })} data-testid="block-h" /></Field>
                </div>
                <Field label="Z-Index">
                    <input className="input-field" type="number" value={block.z || 0} onChange={(e) => updateBlock({ z: parseInt(e.target.value) || 0 })} data-testid="block-z" />
                </Field>
                <Field label="Opacity">
                    <input className="input-field" type="number" min="0" max="1" step="0.05" value={block.opacity ?? 1} onChange={(e) => updateBlock({ opacity: parseFloat(e.target.value) })} data-testid="block-opacity" />
                </Field>
                <Field label="Radius (px)">
                    <input className="input-field" type="number" min="0" value={block.borderRadius || 0} onChange={(e) => updateBlock({ borderRadius: parseFloat(e.target.value) || 0 })} data-testid="block-radius" />
                </Field>
            </Section>

            {block.type === "text" && (
                <Section title="Typography">
                    <Field label="Text">
                        <textarea data-testid="block-text" className="input-field h-24" value={block.text || ""} onChange={(e) => updateBlock({ text: e.target.value })} />
                    </Field>
                    <div className="grid grid-cols-2 gap-2">
                        <Field label="Size"><input className="input-field" type="number" value={block.fontSize || 32} onChange={(e) => updateBlock({ fontSize: parseFloat(e.target.value) || 12 })} data-testid="block-font-size" /></Field>
                        <Field label="Weight">
                            <select className="input-field" value={block.fontWeight || "600"} onChange={(e) => updateBlock({ fontWeight: e.target.value })} data-testid="block-font-weight">
                                {["400", "500", "600", "700", "800"].map((w) => <option key={w} value={w}>{w}</option>)}
                            </select>
                        </Field>
                    </div>
                    <Field label="Family">
                        <select className="input-field" value={block.fontFamily || "Manrope"} onChange={(e) => updateBlock({ fontFamily: e.target.value })} data-testid="block-font-family">
                            <option value="Manrope">Manrope</option>
                            <option value="IBM Plex Sans">IBM Plex Sans</option>
                            <option value="IBM Plex Mono">IBM Plex Mono</option>
                            <option value="Georgia">Georgia</option>
                            <option value="Arial">Arial</option>
                        </select>
                    </Field>
                    <Field label="Align">
                        <select className="input-field" value={block.align || "left"} onChange={(e) => updateBlock({ align: e.target.value })} data-testid="block-align">
                            <option value="left">Left</option>
                            <option value="center">Center</option>
                            <option value="right">Right</option>
                        </select>
                    </Field>
                    <Field label="Color">
                        <input type="color" className="input-field h-9 p-1" value={block.color || "#FFFFFF"} onChange={(e) => updateBlock({ color: e.target.value })} data-testid="block-color" />
                    </Field>
                    <Field label="Background">
                        <input type="color" className="input-field h-9 p-1" value={block.background || "#000000"} onChange={(e) => updateBlock({ background: e.target.value })} data-testid="block-bg" />
                    </Field>
                </Section>
            )}

            {(block.type === "image" || block.type === "video") && (
                <Section title={block.type === "image" ? "Image" : "Video"}>
                    <button className="btn-ghost w-full inline-flex items-center justify-center gap-2" onClick={onUpload} data-testid="block-upload-asset">
                        <Pencil size={13} /> {block.src ? "Replace" : "Pick"} from library
                    </button>
                    <Field label="Fit">
                        <select className="input-field" value={block.objectFit || "cover"} onChange={(e) => updateBlock({ objectFit: e.target.value })} data-testid="block-object-fit">
                            <option value="cover">Cover</option>
                            <option value="contain">Contain</option>
                            <option value="fill">Fill</option>
                        </select>
                    </Field>
                </Section>
            )}

            {block.type === "shape" && (
                <Section title="Shape">
                    <Field label="Type">
                        <select className="input-field" value={block.shape || "rectangle"} onChange={(e) => updateBlock({ shape: e.target.value })} data-testid="block-shape-type">
                            <option value="rectangle">Rectangle</option>
                            <option value="circle">Circle</option>
                        </select>
                    </Field>
                    <Field label="Fill">
                        <input type="color" className="input-field h-9 p-1" value={block.background || "#3B82F6"} onChange={(e) => updateBlock({ background: e.target.value })} data-testid="block-shape-color" />
                    </Field>
                </Section>
            )}

            {block.type === "countdown" && (
                <Section title="Countdown">
                    <Field label="Target Date & Time">
                        <input type="datetime-local" className="input-field" value={(block.targetDate || "").slice(0, 16)} onChange={(e) => updateBlock({ targetDate: e.target.value })} data-testid="block-target-date" />
                    </Field>
                    <Field label="Format">
                        <select
                            className="input-field"
                            value={block.countdownFormat || "dhms"}
                            onChange={(e) => updateBlock({ countdownFormat: e.target.value })}
                            data-testid="block-countdown-format"
                        >
                            <option value="dhms">Days · Hours · Mins · Secs</option>
                            <option value="dhm">Days · Hours · Mins</option>
                            <option value="dh">Days · Hours</option>
                            <option value="d">Days only</option>
                            <option value="hms">Hours · Mins · Secs</option>
                            <option value="hm">Hours · Mins</option>
                            <option value="h">Hours only</option>
                            <option value="ms">Mins · Secs</option>
                            <option value="s">Seconds only</option>
                        </select>
                    </Field>
                    <Field label="Color">
                        <input type="color" className="input-field h-9 p-1" value={block.color || "#FFFFFF"} onChange={(e) => updateBlock({ color: e.target.value })} data-testid="block-countdown-color" />
                    </Field>
                </Section>
            )}

            {block.type === "clock" && (
                <Section title="Clock">
                    <Field label="Format">
                        <select className="input-field" value={block.timeFormat || "24h"} onChange={(e) => updateBlock({ timeFormat: e.target.value })} data-testid="block-time-format">
                            <option value="24h">24h</option>
                            <option value="12h">12h AM/PM</option>
                        </select>
                    </Field>
                    <Field label="Color">
                        <input type="color" className="input-field h-9 p-1" value={block.color || "#FFFFFF"} onChange={(e) => updateBlock({ color: e.target.value })} data-testid="block-clock-color" />
                    </Field>
                </Section>
            )}

            {block.type === "weather" && (
                <Section title="Weather">
                    <Field label="Location">
                        <input className="input-field" value={block.location || "London"} onChange={(e) => updateBlock({ location: e.target.value })} data-testid="block-weather-location" />
                    </Field>
                    <Field label="Color">
                        <input type="color" className="input-field h-9 p-1" value={block.color || "#FFFFFF"} onChange={(e) => updateBlock({ color: e.target.value })} data-testid="block-weather-color" />
                    </Field>
                </Section>
            )}
        </div>
    );
}
