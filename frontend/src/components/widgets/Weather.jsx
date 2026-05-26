import { useEffect, useState } from "react";
import api from "@/lib/api";

const codeToDescription = (code) => {
    if (code == null) return "—";
    if (code === 0) return "Clear";
    if ([1, 2].includes(code)) return "Mostly clear";
    if (code === 3) return "Overcast";
    if ([45, 48].includes(code)) return "Foggy";
    if ([51, 53, 55].includes(code)) return "Drizzle";
    if ([61, 63, 65, 80, 81, 82].includes(code)) return "Rain";
    if ([71, 73, 75, 77, 85, 86].includes(code)) return "Snow";
    if ([95, 96, 99].includes(code)) return "Thunderstorm";
    return "—";
};

export default function Weather({ location = "London", color = "#FFFFFF", fontFamily = "Manrope" }) {
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        let alive = true;
        const fetchIt = async () => {
            try {
                const { data } = await api.get(`/weather?location=${encodeURIComponent(location)}`);
                if (alive) {
                    setData(data);
                    setError(null);
                }
            } catch (e) {
                if (alive) setError(e.response?.data?.detail || "Weather unavailable");
            }
        };
        fetchIt();
        const t = setInterval(fetchIt, 5 * 60 * 1000);
        return () => {
            alive = false;
            clearInterval(t);
        };
    }, [location]);

    if (error) {
        return (
            <div className="w-full h-full flex items-center justify-center text-sm opacity-70" style={{ color, fontFamily }}>
                {error}
            </div>
        );
    }
    if (!data) {
        return (
            <div className="w-full h-full flex items-center justify-center text-xs opacity-60" style={{ color, fontFamily }}>
                Loading weather…
            </div>
        );
    }

    return (
        <div className="w-full h-full flex flex-col items-start justify-center px-[4%]" style={{ color, fontFamily }}>
            <div className="opacity-70 text-[clamp(10px,1.4vw,14px)] uppercase tracking-[0.25em] font-mono">
                {data.location}
            </div>
            <div className="font-extrabold text-[clamp(40px,9vw,120px)] leading-none tracking-tighter tabular-nums mt-1">
                {Math.round(data.temperature)}°
            </div>
            <div className="mt-1 text-[clamp(13px,1.7vw,22px)] opacity-90 font-semibold">
                {codeToDescription(data.weather_code)}
            </div>
            <div className="opacity-60 text-[clamp(10px,1.2vw,14px)] mt-1">
                wind {Math.round(data.wind)} km/h · humidity {data.humidity}%
            </div>
        </div>
    );
}
