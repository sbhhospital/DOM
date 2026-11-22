import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthSession } from '../context/AuthSessionContext';

/**
 * Boardroom Check-in Scanner Router
 * When a user scans the printed Boardroom QR poster with their phone's camera:
 * - If not logged in: redirects to login, preserving destination (/portal?action=room_qr)
 * - If logged in: redirects to Leader Portal with action=room_qr to record physical attendance & show confirmation popup
 * Eliminates duplicate UI; Leader Portal (/portal) serves as the unified interface.
 */
export const BoardroomCheckin: React.FC = () => {
  const { currentUser } = useAuthSession();

  if (!currentUser) {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('sbh_redirect_after_login', '/portal?action=room_qr');
    }
    return <Navigate to="/login?redirect=/portal&action=room_qr" replace />;
  }

  return <Navigate to="/portal?action=room_qr" replace />;
};
