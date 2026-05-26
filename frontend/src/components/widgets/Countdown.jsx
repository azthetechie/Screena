import { useEffect, useState } from "react";

function pad(n) {
    return String(n).padStart(2, "0");
}

export default function Countdown({ targetDate, color = "#FFFFFF", fontFamily = "Manrope" }) {
    const [now, setNow] = useState(Date.now());

    useEffect(() => {
        const t = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(t);
    }, []);

    const target = targetDate ? new Date(targetDate).getTime() : 0;
    const diff = Math.max(0, target - now);
    const days = Math.floor(diff / (24 * 3600 * 1000));
    const hours = Math.floor((diff % (24 * 3600 * 1000)) / (3600 * 1000));
    const mins = Math.floor((diff % (3600 * 1000)) / 60000);
    const secs = Math.floor((diff % 60000) / 1000);

    const cell = (n, label) => (
        <div className="flex flex-col items-center min-w-0">
            <div
                style={{ color, fontFamily }}
                className="font-extrabold text-[clamp(28px,7vw,80px)] leading-none tracking-tighter tabular-nums"
            >
                {pad(n)}
            </div>
            <div style={{ color }} className="opacity-70 mt-1 text-[clamp(10px,1.2vw,12px)] uppercase tracking-[0.25em] font-mono">
                {label}
            </div>
        </div>
    );

    return (
        <div className="w-full h-full flex items-center justify-center gap-[4%]" style={{ fontFamily }}>
            {cell(days, "days")}
            <span style={{ color }} className="opacity-40 font-extrabold text-[clamp(20px,5vw,60px)] -mt-3">
                :
            </span>
            {cell(hours, "hrs")}
            <span style={{ color }} className="opacity-40 font-extrabold text-[clamp(20px,5vw,60px)] -mt-3">
                :
            </span>
            {cell(mins, "min")}
            <span style={{ color }} className="opacity-40 font-extrabold text-[clamp(20px,5vw,60px)] -mt-3">
                :
            </span>
            {cell(secs, "sec")}
        </div>
    );
}
