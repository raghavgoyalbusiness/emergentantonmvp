import "./App.css";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import AuthCallback from "@/components/AuthCallback";
import Layout from "@/components/Layout";
import LandingPage from "@/pages/LandingPage";
import Dashboard from "@/pages/Dashboard";
import InfluencerDiscovery from "@/pages/InfluencerDiscovery";
import CampaignPipeline from "@/pages/CampaignPipeline";
import CampaignWizard from "@/pages/CampaignWizard";
import Analytics from "@/pages/Analytics";
import BillingPage from "@/pages/BillingPage";
import Inbox from "@/pages/Inbox";
import Settings from "@/pages/Settings";
import BrandAgent from "@/pages/BrandAgent";
import ShaderBackground from "@/components/ui/shader-background";

// Exit is slightly longer so the WebGL shader portal is visible for a beat
const pageVariants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.28, ease: [0.25, 0.46, 0.45, 0.94] } },
  exit:    { opacity: 0, y: -8, transition: { duration: 0.25, ease: "easeIn" } },
};

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="flex gap-2">
          <div className="ai-dot" />
          <div className="ai-dot" />
          <div className="ai-dot" />
        </div>
      </div>
    );
  }
  if (!user) return <Navigate to="/" replace />;
  return children;
}

function AppRouter() {
  const location = useLocation();
  if (location.hash?.includes("session_id=")) {
    return <AuthCallback />;
  }
  // Pause the shader on the landing page so Spline 3D gets full GPU bandwidth
  const isLanding = location.pathname === '/';
  return (
    <>
      {/* WebGL shader — paused on landing page to prevent GPU conflict with Spline */}
      <ShaderBackground active={!isLanding} />

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={location.pathname}
          variants={pageVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          style={{ width: "100%" }}
        >
          <Routes location={location}>
            <Route path="/" element={<LandingPage />} />
            <Route path="/subscription" element={<ProtectedRoute><Layout><BillingPage /></Layout></ProtectedRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>} />
            <Route path="/discovery" element={<ProtectedRoute><Layout><InfluencerDiscovery /></Layout></ProtectedRoute>} />
            <Route path="/campaigns" element={<ProtectedRoute><Layout><CampaignPipeline /></Layout></ProtectedRoute>} />
            <Route path="/campaigns/new" element={<ProtectedRoute><Layout><CampaignWizard /></Layout></ProtectedRoute>} />
            <Route path="/analytics" element={<ProtectedRoute><Layout><Analytics /></Layout></ProtectedRoute>} />
            <Route path="/payments" element={<ProtectedRoute><Layout><BillingPage /></Layout></ProtectedRoute>} />
            <Route path="/inbox" element={<ProtectedRoute><Layout><Inbox /></Layout></ProtectedRoute>} />
            <Route path="/brand-agent" element={<ProtectedRoute><Layout><BrandAgent /></Layout></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Layout><Settings /></Layout></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </motion.div>
      </AnimatePresence>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRouter />
      </AuthProvider>
    </BrowserRouter>
  );
}
