import { useState } from "react";
import { Link, useNavigate, Navigate } from "react-router-dom";
import { useAuth, formatApiErrorDetail } from "@/contexts/AuthContext";
import { MonitorPlay, ArrowRight } from "lucide-react";

export default function Register() {
    const { user, register } = useAuth();
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [name, setName] = useState("");
    const [password, setPassword] = useState("");
    const [err, setErr] = useState("");
    const [submitting, setSubmitting] = useState(false);

    if (user) return <Navigate to="/dashboard" replace />;

    const onSubmit = async (e) => {
        e.preventDefault();
        setErr("");
        setSubmitting(true);
        try {
            await register(email, password, name);
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
                    <div className="label-mono mb-4">// Create studio</div>
                    <h1 className="font-display text-4xl sm:text-5xl font-extrabold tracking-tighter leading-none mb-2">
                        Get started.
                    </h1>
                    <p className="text-secondary2 text-sm mb-8">Free studio account · no card required.</p>

                    <form onSubmit={onSubmit} className="space-y-4" data-testid="register-form">
                        <div>
                            <label className="label-mono block mb-2">Display name</label>
                            <input
                                data-testid="register-name-input"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="input-field"
                                placeholder="Studio name"
                            />
                        </div>
                        <div>
                            <label className="label-mono block mb-2">Email</label>
                            <input
                                data-testid="register-email-input"
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="input-field"
                                placeholder="you@studio.com"
                            />
                        </div>
                        <div>
                            <label className="label-mono block mb-2">Password</label>
                            <input
                                data-testid="register-password-input"
                                type="password"
                                required
                                minLength={6}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="input-field"
                                placeholder="At least 6 characters"
                            />
                        </div>
                        {err && (
                            <div data-testid="register-error" className="text-sm text-[#ef4444] font-mono">
                                {err}
                            </div>
                        )}
                        <button
                            data-testid="register-submit-button"
                            type="submit"
                            disabled={submitting}
                            className="btn-primary w-full inline-flex items-center justify-center gap-2"
                        >
                            {submitting ? "Creating…" : "Create account"} <ArrowRight size={16} />
                        </button>
                    </form>

                    <div className="mt-6 text-sm text-muted2">
                        Already have an account?{" "}
                        <Link to="/login" data-testid="goto-login-link" className="text-white underline-offset-4 hover:underline">
                            Sign in
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
            </div>
        </div>
    );
}
