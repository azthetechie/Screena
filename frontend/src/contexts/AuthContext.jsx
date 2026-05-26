import { createContext, useContext, useEffect, useState, useCallback } from "react";
import api from "@/lib/api";

const AuthContext = createContext(null);

export function formatApiErrorDetail(detail) {
    if (detail == null) return "Something went wrong. Please try again.";
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail))
        return detail
            .map((e) => (e && typeof e.msg === "string" ? e.msg : JSON.stringify(e)))
            .filter(Boolean)
            .join(" ");
    if (detail && typeof detail.msg === "string") return detail.msg;
    return String(detail);
}

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null); // null = checking, false = unauth, object = user
    const [loading, setLoading] = useState(true);

    const refresh = useCallback(async () => {
        try {
            const { data } = await api.get("/auth/me");
            setUser(data);
        } catch {
            setUser(false);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        refresh();
    }, [refresh]);

    const login = async (email, password) => {
        const { data } = await api.post("/auth/login", { email, password });
        setUser(data);
        return data;
    };

    const register = async (email, password, name) => {
        const { data } = await api.post("/auth/register", { email, password, name });
        setUser(data);
        return data;
    };

    const logout = async () => {
        try {
            await api.post("/auth/logout");
        } catch (e) {
            // ignore
        }
        setUser(false);
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, register, logout, refresh }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}
