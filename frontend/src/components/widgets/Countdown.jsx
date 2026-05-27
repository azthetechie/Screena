import { useEffect, useState } from "react";

const UNITS_BY_FORMAT = {
    dhms: ["d", "h", "m", "s"],
    dhm: ["d", "h", "m"],
    dh: ["d", "h"],
    d: ["d"],
    hms: ["h", "m", "s"],
    hm: ["h", "m"],
    h: ["h"],
    ms: ["m", "s"],
    s: ["s"],
};

const LABEL = { d: "days", h: "hrs", m: "min", s: "sec" };
const DIVISOR = { d: 86400, h: 3600, m: 60, s: 1 };

export default function Countdown({
    targetDate,
    color = "#FFFFFF",
    fontFamily = "Manrope",
    countdownFormat = "dhms",
}) {
    const units = UNITS_BY_FORMAT[countdownFormat] || UNITS_BY_FORMAT.dhms;
    const needsSeconds = units.includes("s");
    const [now, setNow] = useState(Date.now());

    useEffect(() => {
        const t = setInterval(() => setNow(Date.now()), needsSeconds ? 1000 : 30000);
        return () => clearInterval(t);
    }, [needsSeconds]);

    const target = targetDate ? new Date(targetDate).getTime() : 0;
    const diffSec = Math.max(0, Math.floor((target - now) / 1000));

    // Compute values — the first unit absorbs any larger remainder so e.g.
    // format "h" displays the total number of hours, not a 0-23 wraparound.
    const values = {};
    let remaining = diffSec;
    units.forEach((u) => {
        const v = Math.floor(remaining / DIVISOR[u]);
        values[u] = v;
        remaining -= v * DIVISOR[u];
    });

    return (
        <div className="w-full h-full flex items-center justify-center gap-[3%]" style={{ fontFamily, color }}>
            {units.map((u, i) => (
                <div key={u} className="flex items-center gap-[3%]">
                    {i > 0 && (
                        <span className="opacity-40 font-extrabold text-[clamp(20px,5vw,80px)] -mt-[0.2em] leading-none">
                            :
                        </span>
                    )}
                    <div className="flex flex-col items-center">
                        <div className="font-extrabold text-[clamp(28px,8vw,140px)] leading-none tracking-tighter tabular-nums">
                            {String(values[u]).padStart(2, "0")}
                        </div>
                        <div className="opacity-70 mt-1 text-[clamp(10px,1.2vw,14px)] uppercase tracking-[0.25em] font-mono">
                            {LABEL[u]}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
