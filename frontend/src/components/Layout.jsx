import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import {
  LayoutDashboard, Search, Kanban, BarChart3, CreditCard,
  MessageSquare, Settings, LogOut, Menu, X, Zap, Bell, Sparkles
} from "lucide-react";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
  { icon: Search, label: "Discovery", path: "/discovery" },
  { icon: Kanban, label: "Campaigns", path: "/campaigns" },
  { icon: BarChart3, label: "Analytics", path: "/analytics" },
  { icon: CreditCard, label: "Payments", path: "/payments" },
  { icon: MessageSquare, label: "Inbox", path: "/inbox" },
  { icon: Sparkles, label: "Brand Agent", path: "/brand-agent" },
  { icon: Settings, label: "Settings", path: "/settings" },
];

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const Sidebar = ({ mobile = false }) => (
    <aside
      className={`${mobile ? "fixed inset-y-0 left-0 z-50 w-64" : "hidden lg:flex w-64 flex-col fixed inset-y-0 left-0 z-40"} 
        glass-3 flex-col`}
    >
      <div className="p-6 border-b border-white/5">
        <Link to="/" data-testid="logo-home-btn" className="flex items-center gap-2" onClick={() => setSidebarOpen(false)}>
          <div className="w-8 h-8 rounded-lg bg-[#00D4C8]/20 backdrop-blur-xl border border-[#00D4C8]/40 flex items-center justify-center">
            <Zap className="w-4 h-4 text-[#00D4C8]" strokeWidth={2.5} />
          </div>
          <span className="font-heading font-bold text-white text-lg leading-none">
            Influencer<br />
            <span className="text-[#00D4C8]">Connect</span>
          </span>
        </Link>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map(({ icon: Icon, label, path }) => {
          const active = location.pathname === path;
          const isAI = label === "Brand Agent";
          return (
            <div key={path}>
              {isAI && <div className="my-2 border-t border-white/5" />}
              <Link
                to={path}
                onClick={() => setSidebarOpen(false)}
                data-testid={`nav-${label.toLowerCase().replace(/ /g, "-")}`}
                className={`relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150
                  ${active
                    ? isAI
                      ? "text-[#00D4C8] border border-[#00D4C8]/30"
                      : "text-[#00D4C8] border border-[#00D4C8]/20"
                    : isAI
                      ? "text-[#00D4C8]/70 hover:text-[#00D4C8] border border-transparent hover:border-[#00D4C8]/10"
                      : "text-white/60 hover:text-white border border-transparent hover:border-white/5"
                  }`}
              >
                {active && (
                  <div
                    className={`absolute inset-0 rounded-lg ${isAI ? "bg-[#00D4C8]/15" : "bg-[#00D4C8]/10"}`}
                  />
                )}
                <Icon className="w-4 h-4 flex-shrink-0 relative z-10" strokeWidth={1.5} />
                <span className="relative z-10">{label}</span>
                {label === "Inbox" && (
                  <span className="ml-auto relative z-10 bg-[#00D4C8]/20 backdrop-blur-sm border border-[#00D4C8]/40 text-[#00D4C8] text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">3</span>
                )}
                {isAI && (
                  <span className="ml-auto relative z-10 text-[0.6rem] bg-[#00D4C8]/10 text-[#00D4C8] border border-[#00D4C8]/20 px-1.5 py-0.5 rounded-full font-semibold tracking-wide">AI</span>
                )}
              </Link>
            </div>
          );
        })}
      </nav>

      <div className="p-4 border-t border-white/5">
        <div className="flex items-center gap-3 mb-3 p-2 rounded-lg bg-white/3">
          {user?.picture ? (
            <img src={user.picture} alt={user.name} className="w-8 h-8 rounded-full object-cover" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-[#00D4C8]/20 flex items-center justify-center">
              <span className="text-[#00D4C8] text-xs font-bold">{user?.name?.[0] || "U"}</span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-semibold truncate">{user?.name || "User"}</p>
            <p className="text-white/40 text-xs truncate">{user?.email || ""}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          data-testid="logout-btn"
          className="w-full flex items-center gap-2 px-3 py-2 text-white/50 hover:text-white hover:bg-white/5 rounded-lg text-sm transition-colors active:scale-[0.97]"
        >
          <LogOut className="w-4 h-4" strokeWidth={1.5} />
          Sign Out
        </button>
      </div>
    </aside>
  );

  return (
    <div className="min-h-screen bg-transparent">
      <Sidebar />

      {/* Mobile sidebar */}
      {sidebarOpen && (
        <div className="lg:hidden">
          <div className="fixed inset-0 bg-black/60 z-40" onClick={() => setSidebarOpen(false)} />
          <Sidebar mobile />
        </div>
      )}

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-30 h-14 glass-3 flex items-center px-4 lg:px-6 gap-4">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-white/60 hover:text-white p-1"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex-1" />
          <button className="relative text-white/50 hover:text-white p-2 rounded-lg hover:bg-white/5 transition-colors">
            <Bell className="w-4 h-4" strokeWidth={1.5} />
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-[#00D4C8] rounded-full"></span>
          </button>
        </header>

        <main className="p-4 lg:p-6 min-h-[calc(100vh-56px)]">
          {children}
        </main>
      </div>
    </div>
  );
}
