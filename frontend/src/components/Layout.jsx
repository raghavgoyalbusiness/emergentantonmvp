import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import {
  LayoutDashboard, Search, Kanban, BarChart3, CreditCard,
  MessageSquare, Settings, LogOut, Menu, X, Zap, Bell
} from "lucide-react";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
  { icon: Search, label: "Discovery", path: "/discovery" },
  { icon: Kanban, label: "Campaigns", path: "/campaigns" },
  { icon: BarChart3, label: "Analytics", path: "/analytics" },
  { icon: CreditCard, label: "Payments", path: "/payments" },
  { icon: MessageSquare, label: "Inbox", path: "/inbox" },
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
        bg-[#0A0F2E]/95 backdrop-blur-xl border-r border-white/5 flex-col`}
    >
      <div className="p-6 border-b border-white/5">
        <Link to="/dashboard" className="flex items-center gap-2" onClick={() => setSidebarOpen(false)}>
          <div className="w-8 h-8 rounded-lg bg-[#00D4C8] flex items-center justify-center">
            <Zap className="w-4 h-4 text-[#0A0F2E]" strokeWidth={2.5} />
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
          return (
            <Link
              key={path}
              to={path}
              onClick={() => setSidebarOpen(false)}
              data-testid={`nav-${label.toLowerCase()}`}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200
                ${active
                  ? "bg-[#00D4C8]/10 text-[#00D4C8] border border-[#00D4C8]/20"
                  : "text-white/60 hover:text-white hover:bg-white/5"
                }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" strokeWidth={1.5} />
              {label}
              {label === "Inbox" && (
                <span className="ml-auto bg-[#00D4C8] text-[#0A0F2E] text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">3</span>
              )}
            </Link>
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
          className="w-full flex items-center gap-2 px-3 py-2 text-white/50 hover:text-white hover:bg-white/5 rounded-lg text-sm transition-all"
        >
          <LogOut className="w-4 h-4" strokeWidth={1.5} />
          Sign Out
        </button>
      </div>
    </aside>
  );

  return (
    <div className="min-h-screen bg-[#0A0F2E]">
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
        <header className="sticky top-0 z-30 h-14 bg-[#0A0F2E]/80 backdrop-blur-xl border-b border-white/5 flex items-center px-4 lg:px-6 gap-4">
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
