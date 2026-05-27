import Countdown from "@/components/widgets/Countdown";
import Clock from "@/components/widgets/Clock";
import Weather from "@/components/widgets/Weather";

/**
 * Render the contents of a block. Used by both the editor canvas and the
 * public player. Positioning/sizing is handled by the parent container.
 */
export default function BlockRenderer({ block }) {
    const common = {
        width: "100%",
        height: "100%",
        opacity: block.opacity ?? 1,
        background: block.background || "transparent",
        borderRadius: (block.borderRadius || 0) + "px",
        overflow: "hidden",
    };

    if (block.type === "text") {
        return (
            <div
                style={{
                    ...common,
                    color: block.color || "#fff",
                    fontFamily: block.fontFamily || "Manrope",
                    fontWeight: block.fontWeight || "600",
                    fontSize: (block.fontSize || 32) + "px",
                    textAlign: block.align || "left",
                    padding: "8px",
                    display: "flex",
                    alignItems: "center",
                    lineHeight: 1.15,
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                }}
            >
                <div style={{ width: "100%" }}>{block.text || "Text"}</div>
            </div>
        );
    }
    if (block.type === "image") {
        return (
            <div style={common}>
                {block.src ? (
                    <img
                        src={block.src}
                        alt=""
                        style={{
                            width: "100%",
                            height: "100%",
                            objectFit: block.objectFit || "cover",
                            display: "block",
                        }}
                        draggable={false}
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-white/5 text-xs label-mono">
                        No image
                    </div>
                )}
            </div>
        );
    }
    if (block.type === "video") {
        return (
            <div style={common}>
                {block.src ? (
                    <video
                        src={block.src}
                        autoPlay
                        muted
                        loop
                        playsInline
                        style={{
                            width: "100%",
                            height: "100%",
                            objectFit: block.objectFit || "cover",
                            display: "block",
                        }}
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-white/5 text-xs label-mono">
                        No video
                    </div>
                )}
            </div>
        );
    }
    if (block.type === "shape") {
        return (
            <div
                style={{
                    ...common,
                    background: block.background || "#3B82F6",
                    borderRadius: block.shape === "circle" ? "50%" : (block.borderRadius || 0) + "px",
                }}
            />
        );
    }
    if (block.type === "countdown") {
        return (
            <div style={common}>
                <Countdown
                    targetDate={block.targetDate}
                    color={block.color || "#fff"}
                    fontFamily={block.fontFamily || "Manrope"}
                    countdownFormat={block.countdownFormat || "dhms"}
                />
            </div>
        );
    }
    if (block.type === "clock") {
        return (
            <div style={common}>
                <Clock
                    timeFormat={block.timeFormat || "24h"}
                    color={block.color || "#fff"}
                    fontFamily={block.fontFamily || "Manrope"}
                />
            </div>
        );
    }
    if (block.type === "weather") {
        return (
            <div style={common}>
                <Weather
                    location={block.location || "London"}
                    color={block.color || "#fff"}
                    fontFamily={block.fontFamily || "Manrope"}
                />
            </div>
        );
    }
    return null;
}
