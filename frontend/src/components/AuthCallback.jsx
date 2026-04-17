import { useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function AuthCallback() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setUser } = useAuth();
  const hasProcessed = useRef(false);

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const hash = location.hash;
    const match = hash.match(/session_id=([^&]+)/);
    if (!match) {
      navigate("/");
      return;
    }
    const sessionId = match[1];

    fetch(`${API}/auth/session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ session_id: sessionId }),
    })
      .then((res) => res.json())
      .then((userData) => {
        setUser(userData);
        navigate("/dashboard", { replace: true, state: { user: userData } });
      })
      .catch(() => {
        navigate("/");
      });
    // hasProcessed is a ref (stable) — intentionally excluded from deps.
    // navigate, setUser are stable react-router/context refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.hash]);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-center">
        <div className="flex gap-2 justify-center mb-4">
          <div className="ai-dot"></div>
          <div className="ai-dot"></div>
          <div className="ai-dot"></div>
        </div>
        <p className="text-white/60 font-body text-sm">Signing you in...</p>
      </div>
    </div>
  );
}
