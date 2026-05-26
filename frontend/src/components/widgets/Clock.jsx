import { useEffect, useState } from "react";

function pad(n) {
    return String(n).padStart(2, "0");
}

export default function Clock({ timeFormat = "24h", color = "#FFFFFF", fontFamily = "Manrope" }) {
    const [now, setNow] = useState(new Date());
    useEffect(() => {
        const t = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(t);
    }, []);

    let hours = now.getHours();
    let suffix = "";
    if (timeFormat === "12h") {
        suffix = hours >= 12 ? " PM" : " AM";
        hours = hours % 12 || 12;
    }
    const time = `${pad(hours)}:${pad(now.getMinutes())}`;
    const seconds = pad(now.getSeconds());

    const day = now.toLocaleDateString(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
    });

    return (
        <div className="w-full h-full flex flex-col items-center justify-center" style={{ color, fontFamily }}>
            <div className="font-extrabold text-[clamp(40px,10vw,140px)] leading-none tabular-nums tracking-tighter">
                {time}
                <span className="opacity-60 text-[0.45em] align-top tabular-nums ml-1">{seconds}</span>
                <span className="text-[0.45em] font-bold opacity-70 ml-1">{suffix}</span>
            </div>
            <div className="mt-2 text-[clamp(11px,1.4vw,16px)] opacity-70 font-mono uppercase tracking-[0.25em]">
                {day}
            </div>
        </div>
    );
}
