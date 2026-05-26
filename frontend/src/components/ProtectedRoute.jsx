import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export default function ProtectedRoute({ children }) {
    const { user, loading } = useAuth();
    if (loading || user === null) {
        return (
            <div className="h-screen flex items-center justify-center bg-[#0b0d12]">
                <div className="label-mono" data-testid="auth-loading">Loading…</div>
            </div>
        );
    }
    if (!user) return <Navigate to="/login" replace />;
    return children;
}
