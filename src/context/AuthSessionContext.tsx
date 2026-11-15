import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Leader } from '../types/database';

interface AuthSessionContextType {
  // Admin Session
  isAdminAuthenticated: boolean;
  adminUsername: string;
  adminName: string;
  loginAdmin: (username: string, pass: string) => Promise<{ success: boolean; message: string }>;
  logoutAdmin: () => void;
  updateAdminPassword: (oldPass: string, newPass: string) => Promise<{ success: boolean; message: string }>;

  // Employee / Leader User Session
  isUserAuthenticated: boolean;
  currentUser: Leader | null;
  loginUser: (email: string, pass: string) => Promise<{ success: boolean; message: string }>;
  loginLeaderDirect: (leader: Leader, pass: string) => Promise<{ success: boolean; message: string }>;
  logoutUser: () => void;
  updateUserPassword: (leaderId: string, oldPass: string, newPass: string) => Promise<{ success: boolean; message: string }>;
}

const AuthSessionContext = createContext<AuthSessionContextType | undefined>(undefined);

export const AuthSessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 2-Hour Auto Logout Constant (120 Minutes = 7,200,000 ms)
  const ADMIN_SESSION_TIMEOUT_MS = 2 * 60 * 60 * 1000;

  // Admin Session State
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(() => {
    const isLoggedIn = localStorage.getItem('sbh_admin_logged_in') === 'true';
    const loginTime = localStorage.getItem('sbh_admin_login_time');
    if (isLoggedIn && loginTime) {
      const elapsed = Date.now() - parseInt(loginTime, 10);
      if (elapsed > ADMIN_SESSION_TIMEOUT_MS) {
        localStorage.removeItem('sbh_admin_logged_in');
        localStorage.removeItem('sbh_admin_login_time');
        return false;
      }
      return true;
    }
    return false;
  });
  const [adminUsername, setAdminUsername] = useState<string>(() => {
    return localStorage.getItem('sbh_admin_username') || 'admin';
  });
  const [adminName, setAdminName] = useState<string>('SBH DOM Administrator');

  // User / Leader Session State
  const [currentUser, setCurrentUser] = useState<Leader | null>(() => {
    const saved = localStorage.getItem('sbh_active_user_session');
    return saved ? JSON.parse(saved) : null;
  });

  const getStoredAdminPassword = (): string => {
    return localStorage.getItem('sbh_admin_password') || 'admin123';
  };

  // Admin Login with 2-Hour Auto-Logout Timer Initialization
  const loginAdmin = async (user: string, pass: string): Promise<{ success: boolean; message: string }> => {
    const trimmedUser = user.trim().toLowerCase();
    const currentPass = getStoredAdminPassword();

    if (trimmedUser === 'admin' && pass === currentPass) {
      setIsAdminAuthenticated(true);
      setAdminUsername('admin');
      const now = Date.now().toString();
      localStorage.setItem('sbh_admin_logged_in', 'true');
      localStorage.setItem('sbh_admin_username', 'admin');
      localStorage.setItem('sbh_admin_login_time', now);
      return { success: true, message: 'Admin login successful!' };
    }

    return { success: false, message: 'Invalid admin username or password. Please try again.' };
  };

  const logoutAdmin = () => {
    setIsAdminAuthenticated(false);
    localStorage.removeItem('sbh_admin_logged_in');
    localStorage.removeItem('sbh_admin_login_time');
  };

  // Periodic Check for 2-Hour Auto-Logout
  useEffect(() => {
    if (!isAdminAuthenticated) return;

    const interval = setInterval(() => {
      const loginTime = localStorage.getItem('sbh_admin_login_time');
      if (loginTime) {
        const elapsed = Date.now() - parseInt(loginTime, 10);
        if (elapsed >= ADMIN_SESSION_TIMEOUT_MS) {
          logoutAdmin();
          alert('Admin session has expired after 2 hours for security. Please sign in again.');
          window.location.href = '/login';
        }
      }
    }, 15000); // Check every 15 seconds

    return () => clearInterval(interval);
  }, [isAdminAuthenticated]);

  const updateAdminPassword = async (oldPass: string, newPass: string): Promise<{ success: boolean; message: string }> => {
    const currentPass = getStoredAdminPassword();
    if (oldPass !== currentPass) {
      return { success: false, message: 'Current admin password does not match.' };
    }
    if (newPass.length < 5) {
      return { success: false, message: 'New password must be at least 5 characters long.' };
    }
    localStorage.setItem('sbh_admin_password', newPass);
    return { success: true, message: 'Admin password changed successfully!' };
  };

  // User / Leader Login
  const loginUser = async (email: string, pass: string): Promise<{ success: boolean; message: string }> => {
    const trimmedEmail = email.trim().toLowerCase();

    try {
      // 1. Fetch from Supabase
      const { data, error } = await supabase
        .from('leaders')
        .select('*, department:departments(*)')
        .eq('email', trimmedEmail)
        .maybeSingle();

      if (error || !data) {
        return { success: false, message: `No registered account found with email ${trimmedEmail}.` };
      }

      // Check user password (from Supabase table column or localStorage or default fallback)
      const userStoredPass = (data as any).password || localStorage.getItem(`sbh_user_pass_${data.id}`) || '123456';
      if (pass !== userStoredPass) {
        return { success: false, message: 'Invalid password. Please check and try again.' };
      }

      setCurrentUser(data as Leader);
      localStorage.setItem('sbh_active_user_session', JSON.stringify(data));
      return { success: true, message: `Welcome ${data.full_name}!` };
    } catch (e: any) {
      return { success: false, message: e.message || 'Login failed.' };
    }
  };

  // Direct Leader Login by Selected Object
  const loginLeaderDirect = async (leader: Leader, pass: string): Promise<{ success: boolean; message: string }> => {
    try {
      const userStoredPass = (leader as any).password || localStorage.getItem(`sbh_user_pass_${leader.id}`) || '123456';
      if (pass !== userStoredPass) {
        return { success: false, message: 'Invalid leader password. Please check and try again.' };
      }

      setCurrentUser(leader);
      localStorage.setItem('sbh_active_user_session', JSON.stringify(leader));
      return { success: true, message: `Welcome, ${leader.full_name}!` };
    } catch (e: any) {
      return { success: false, message: e.message || 'Login failed.' };
    }
  };

  const logoutUser = () => {
    setCurrentUser(null);
    localStorage.removeItem('sbh_active_user_session');
  };

  const updateUserPassword = async (
    leaderId: string,
    oldPass: string,
    newPass: string
  ): Promise<{ success: boolean; message: string }> => {
    const currentPass = localStorage.getItem(`sbh_user_pass_${leaderId}`) || '123456';
    if (oldPass !== currentPass) {
      return { success: false, message: 'Current password does not match.' };
    }
    if (newPass.length < 5) {
      return { success: false, message: 'New password must be at least 5 characters long.' };
    }
    localStorage.setItem(`sbh_user_pass_${leaderId}`, newPass);
    try {
      await supabase.from('leaders').update({ password: newPass } as any).eq('id', leaderId);
    } catch (e) {
      // Ignored if password column doesn't exist yet
    }
    return { success: true, message: 'Your personal password has been updated!' };
  };

  return (
    <AuthSessionContext.Provider
      value={{
        isAdminAuthenticated,
        adminUsername,
        adminName,
        loginAdmin,
        logoutAdmin,
        updateAdminPassword,
        isUserAuthenticated: !!currentUser,
        currentUser,
        loginUser,
        loginLeaderDirect,
        logoutUser,
        updateUserPassword,
      }}
    >
      {children}
    </AuthSessionContext.Provider>
  );
};

export const useAuthSession = () => {
  const context = useContext(AuthSessionContext);
  if (!context) {
    throw new Error('useAuthSession must be used within an AuthSessionProvider');
  }
  return context;
};
