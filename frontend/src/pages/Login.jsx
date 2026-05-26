import { useState } from "react";
import { Link, useNavigate, Navigate } from "react-router-dom";
import { useAuth, formatApiErrorDetail } from "@/contexts/AuthContext";
import { MonitorPlay, ArrowRight } from "lucide-react";

export default function Login() {
    const { user, login } = useAuth();
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [err, setErr] = useState("");
    const [submitting, setSubmitting] = useState(false);

    if (user) return <Navigate to="/dashboard" replace />;

    const onSubmit = async (e) => {
        e.preventDefault();
        setErr("");
        setSubmitting(true);
        try {
            await login(email, password);
            navigate("/dashboard");
        } catch (e2) {
            setErr(formatApiErrorDetail(e2.response?.data?.detail) || e2.message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="h-screen w-screen grid grid-cols-1 md:grid-cols-2 bg-[#0b0d12]">
            <div className="flex flex-col px-10 md:px-20 py-12 justify-between">
                <div className="flex items-center gap-2.5">
                    <MonitorPlay size={26} className="text-[#3b82f6]" />
                    <span className="font-display font-extrabold text-xl tracking-tight">SCREENA</span>
                </div>

                <div className="max-w-sm w-full">
                    <div className="label-mono mb-4">// Authenticate</div>
                    <h1 className="font-display text-4xl sm:text-5xl font-extrabold tracking-tighter leading-none mb-2">
                        Sign in.
                    </h1>
                    <p className="text-secondary2 text-sm mb-8">
                        Control your TVs, decks and advertising playlists from one studio.
                    </p>

                    <form onSubmit={onSubmit} className="space-y-4" data-testid="login-form">
                        <div>
                            <label className="label-mono block mb-2">Email</label>
                            <input
                                data-testid="login-email-input"
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="input-field"
                                placeholder="you@studio.com"
                                autoComplete="email"
                            />
                        </div>
                        <div>
                            <label className="label-mono block mb-2">Password</label>
                            <input
                                data-testid="login-password-input"
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="input-field"
                                placeholder="••••••••"
                                autoComplete="current-password"
                            />
                        </div>
                        {err && (
                            <div data-testid="login-error" className="text-sm text-[#ef4444] font-mono">
                                {err}
                            </div>
                        )}
                        <button
                            data-testid="login-submit-button"
                            type="submit"
                            className="btn-primary w-full inline-flex items-center justify-center gap-2"
                            disabled={submitting}
                        >
                            {submitting ? "Signing in…" : "Continue"} <ArrowRight size={16} />
                        </button>
                    </form>

                    <div className="mt-6 text-sm text-muted2">
                        No account?{" "}
                        <Link to="/register" data-testid="goto-register-link" className="text-white underline-offset-4 hover:underline">
                            Create one
                        </Link>
                    </div>
                </div>

                <div className="label-mono">v0.1 · build/preview</div>
            </div>

            <div
                className="hidden md:block relative"
                style={{
                    backgroundImage:
                        "url('https://static.prod-images.emergentagent.com/jobs/f6ec4d38-c3c1-4669-832f-f7ae93c81b81/images/02c3116c825c3f81463ed4815254cea5afb696b63355cc9907759762a89e0353.png')",
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                }}
            >
                <div className="grain-overlay" />
                <div className="absolute bottom-10 left-10 right-10">
                    <div className="label-mono mb-2 text-white/60">// Digital signage CMS</div>
                    <div className="font-display text-3xl font-bold leading-tight max-w-md">
                        Design ads. Schedule decks. Push to any TV.
                    </div>
                </div>
            </div>
        </div>
    );
}
