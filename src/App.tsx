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


// Admin Protected Route Guard
const AdminProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAdminAuthenticated } = useAuthSession();

  if (!isAdminAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

// Root Smart Redirect Guard (Preserves OAuth tokens & routes to correct role)
const RootRedirect: React.FC = () => {
  const { isAdminAuthenticated, isUserAuthenticated } = useAuthSession();
  const hash = typeof window !== 'undefined' ? window.location.hash : '';
  const search = typeof window !== 'undefined' ? window.location.search : '';

  // If OAuth tokens or errors returned in URL from Supabase Google Auth
  if (hash.includes('access_token=') || search.includes('code=') || hash.includes('error=')) {
    return <Navigate to={`/login${search}${hash}`} replace />;
  }

  if (isAdminAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  if (isUserAuthenticated) {
    return <Navigate to="/portal" replace />;
  }

  return <Navigate to="/login" replace />;
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

              {/* Default root routes intelligently based on auth status & OAuth parameters */}
              <Route path="/" element={<RootRedirect />} />

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
