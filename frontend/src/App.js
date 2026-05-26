import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Dashboard from "@/pages/Dashboard";
import Editor from "@/pages/Editor";
import Screens from "@/pages/Screens";
import Player from "@/pages/Player";
import { Toaster } from "sonner";

function App() {
    return (
        <AuthProvider>
            <BrowserRouter>
                <Toaster theme="dark" position="bottom-right" richColors />
                <Routes>
                    <Route path="/" element={<Navigate to="/dashboard" replace />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />

                    {/* Public player (Chromecast / Raspberry Pi browser) */}
                    <Route path="/play/:code" element={<Player mode="code" />} />

                    {/* Authenticated preview */}
                    <Route
                        path="/preview/:id"
                        element={
                            <ProtectedRoute>
                                <Player mode="preview" />
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="/dashboard"
                        element={
                            <ProtectedRoute>
                                <Dashboard />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/screens"
                        element={
                            <ProtectedRoute>
                                <Screens />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/editor/:id"
                        element={
                            <ProtectedRoute>
                                <Editor />
                            </ProtectedRoute>
                        }
                    />
                    <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Routes>
            </BrowserRouter>
        </AuthProvider>
    );
}

export default App;
