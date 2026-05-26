import { Link, useLocation, useNavigate } from "react-router-dom";
import { MonitorPlay, LayoutDashboard, Tv, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const items = [
    { to: "/dashboard", label: "Playlists", icon: LayoutDashboard, testid: "nav-playlists" },
    { to: "/screens", label: "Screens", icon: Tv, testid: "nav-screens" },
];

export default function AppShell({ children, fullBleed = false }) {
    const loc = useLocation();
    const navigate = useNavigate();
    const { user, logout } = useAuth();

    return (
        <div className="h-screen w-screen flex flex-col bg-[#0b0d12] overflow-hidden">
            <header className="h-14 border-b border-soft flex items-center justify-between px-4 bg-panel shrink-0">
                <div className="flex items-center gap-8">
                    <Link to="/dashboard" className="flex items-center gap-2" data-testid="brand-link">
                        <MonitorPlay size={20} className="text-[#3b82f6]" />
                        <span className="font-display font-extrabold tracking-tight text-sm">SCREENA</span>
                    </Link>
                    <nav className="flex items-center gap-1">
                        {items.map((it) => {
                            const Icon = it.icon;
                            const active = loc.pathname.startsWith(it.to);
                            return (
                                <Link
                                    key={it.to}
                                    to={it.to}
                                    data-testid={it.testid}
                                    className={`inline-flex items-center gap-2 px-3 h-9 rounded-md text-[13px] font-medium transition-colors ${
                                        active
                                            ? "bg-white/5 text-white"
                                            : "text-secondary2 hover:bg-white/5 hover:text-white"
                                    }`}
                                >
                                    <Icon size={15} />
                                    {it.label}
                                </Link>
                            );
                        })}
                    </nav>
                </div>
                <div className="flex items-center gap-3">
                    <div className="label-mono hidden sm:block">{user?.email}</div>
                    <button
                        data-testid="logout-button"
                        onClick={async () => {
                            await logout();
                            navigate("/login");
                        }}
                        className="tool-btn"
                        title="Sign out"
                    >
                        <LogOut size={16} />
                    </button>
                </div>
            </header>
            <main className={`flex-1 overflow-${fullBleed ? "hidden" : "auto"}`}>{children}</main>
        </div>
    );
}
