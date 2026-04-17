import "./App.css";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import AuthCallback from "@/components/AuthCallback";
import Layout from "@/components/Layout";
import LandingPage from "@/pages/LandingPage";
import Dashboard from "@/pages/Dashboard";
import InfluencerDiscovery from "@/pages/InfluencerDiscovery";
import CampaignPipeline from "@/pages/CampaignPipeline";
import CampaignWizard from "@/pages/CampaignWizard";
import Analytics from "@/pages/Analytics";
import Payments from "@/pages/Payments";
import Inbox from "@/pages/Inbox";
import Settings from "@/pages/Settings";
import BrandAgent from "@/pages/BrandAgent";

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
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/dashboard" element={<ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>} />
      <Route path="/discovery" element={<ProtectedRoute><Layout><InfluencerDiscovery /></Layout></ProtectedRoute>} />
      <Route path="/campaigns" element={<ProtectedRoute><Layout><CampaignPipeline /></Layout></ProtectedRoute>} />
      <Route path="/campaigns/new" element={<ProtectedRoute><Layout><CampaignWizard /></Layout></ProtectedRoute>} />
      <Route path="/analytics" element={<ProtectedRoute><Layout><Analytics /></Layout></ProtectedRoute>} />
      <Route path="/payments" element={<ProtectedRoute><Layout><Payments /></Layout></ProtectedRoute>} />
      <Route path="/inbox" element={<ProtectedRoute><Layout><Inbox /></Layout></ProtectedRoute>} />
      <Route path="/brand-agent" element={<ProtectedRoute><Layout><BrandAgent /></Layout></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><Layout><Settings /></Layout></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
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
