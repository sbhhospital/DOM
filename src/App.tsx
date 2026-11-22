import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthSessionProvider, useAuthSession } from './context/AuthSessionContext';
import { DomAppProvider } from './context/DomAppContext';
import { AdminLogin } from './pages/AdminLogin';
import { UnifiedAdminDashboard } from './pages/UnifiedAdminDashboard';
import { LeaderPortal } from './pages/LeaderPortal';
import { BoardroomCheckin } from './pages/BoardroomCheckin';
import { JoinMeetingRedirect } from './pages/JoinMeetingRedirect';
import { ErrorPage } from './pages/ErrorPage';
import { HospitalFooter } from './components/HospitalFooter';
import { PageLoadingBar } from './components/PageLoadingBar';

// Automatic Canonical URL Enforcer: Prevent Vercel preview domain redirects from Google Auth
if (
  typeof window !== 'undefined' &&
  window.location.hostname.endsWith('.vercel.app') &&
  window.location.hostname !== 'sbhdom.vercel.app'
) {
  window.location.replace(`https://sbhdom.vercel.app${window.location.pathname}${window.location.search}${window.location.hash}`);
}

// Admin Protected Route Guard
const AdminProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAdminAuthenticated } = useAuthSession();

  if (!isAdminAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <AuthSessionProvider>
      <DomAppProvider>
        <BrowserRouter>
          <PageLoadingBar />
          <div className="relative min-h-screen">
            <Routes>
              {/* Public Portal: Personal Link & In-Room QR Code Check-in destination */}
              <Route path="/portal" element={<LeaderPortal />} />

              {/* Physical In-Person Boardroom QR Check-In Terminal (5th Floor Conference Room) */}
              <Route path="/boardroom-checkin" element={<BoardroomCheckin />} />

              {/* Unique Daily Meeting Join Link (Date-wise & User-wise Virtual Tracking) */}
              <Route path="/join-meeting" element={<JoinMeetingRedirect />} />
              <Route path="/meet/:token" element={<JoinMeetingRedirect />} />

              {/* Login: Supporting both Admin login and Employee/Leader self login */}
              <Route path="/login" element={<AdminLogin />} />

              {/* Protected Admin Command Center: Unified Dashboard */}
              <Route
                path="/dashboard"
                element={
                  <AdminProtectedRoute>
                    <UnifiedAdminDashboard />
                  </AdminProtectedRoute>
                }
              />

              {/* Default root redirects to Dashboard (or Login if not authenticated) */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />

              {/* Dedicated Error Pages (Hope UI Architecture) */}
              <Route path="/404" element={<ErrorPage code={404} />} />
              <Route path="/403" element={<ErrorPage code={403} />} />
              <Route path="/500" element={<ErrorPage code={500} />} />
              <Route path="/501" element={<ErrorPage code={501} />} />

              {/* Catch-all 404 Not Found route */}
              <Route path="*" element={<ErrorPage code={404} />} />
            </Routes>

            {/* Globally Fixed Footer across all pages */}
            <HospitalFooter />
          </div>
        </BrowserRouter>
      </DomAppProvider>
    </AuthSessionProvider>
  );
};

export default App;
