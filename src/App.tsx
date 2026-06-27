import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/useAuthStore';

// Participant Pages
import LandingPage from './app/LandingPage';
import LoginPage from './app/LoginPage';
import OnboardingPage from './app/OnboardingPage';
import MainLayout from './app/participant/MainLayout';
import DashboardPage from './app/participant/DashboardPage';
import ConnectionsPage from './app/participant/ConnectionsPage';
import RequestsPage from './app/participant/RequestsPage';
import ChatPage from './app/participant/ChatPage';
import LocationPage from './app/participant/LocationPage';
import ProfilePage from './app/participant/ProfilePage';
import AuraBoardPage from './app/participant/AuraBoardPage';

// Admin Pages
import AdminLoginPage from './app/admin/AdminLoginPage';
import AdminDashboard from './app/admin/AdminDashboard';
import AdminEventDetail from './app/admin/AdminEventDetail';
import AdminReports from './app/admin/AdminReports';

import { Toaster } from 'react-hot-toast';

// 1. Participant Access Guard
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, profile, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0F0F10] text-zinc-100 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-t-transparent border-brand-indigo rounded-full animate-spin"></div>
      </div>
    );
  }

  // Force sign in
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Force onboarding if profile is incomplete
  const isOnboardingComplete = profile && profile.looking_for && profile.event_id;
  if (!isOnboardingComplete && window.location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}

// 2. Admin Access Guard
function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0F0F10] text-zinc-100 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-t-transparent border-brand-rose rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return <Navigate to="/admin/login" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  const initialize = useAuthStore(state => state.initialize);

  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <>
      {/* Toast Notification Container */}
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#18181B',
            color: '#F4F4F5',
            border: '1px solid #27272A',
            fontSize: '13px',
            borderRadius: '12px'
          }
        }}
      />

      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/onboarding" element={<ProtectedRoute><OnboardingPage /></ProtectedRoute>} />

        {/* Protected Participant Portal */}
        <Route path="/app" element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
          <Route index element={<Navigate to="/app/home" replace />} />
          <Route path="home" element={<DashboardPage />} />
          <Route path="aura-board" element={<AuraBoardPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="connections" element={<ConnectionsPage />} />
          <Route path="requests" element={<RequestsPage />} />
          <Route path="chat" element={<ChatPage />} />
          <Route path="chat/:connectionId" element={<ChatPage />} />
          <Route path="location" element={<LocationPage />} />
        </Route>

        {/* Admin Portal */}
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route path="/admin/dashboard" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
        <Route path="/admin/event/:eventId" element={<AdminRoute><AdminEventDetail /></AdminRoute>} />
        <Route path="/admin/reports" element={<AdminRoute><AdminReports /></AdminRoute>} />

        {/* Wildcard Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
