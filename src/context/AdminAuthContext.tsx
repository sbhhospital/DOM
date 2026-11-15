import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface AdminAuthContextType {
  isAdminAuthenticated: boolean;
  adminUsername: string;
  adminName: string;
  loginAdmin: (username: string, pass: string) => Promise<{ success: boolean; message: string }>;
  logoutAdmin: () => void;
  updatePassword: (oldPass: string, newPass: string) => Promise<{ success: boolean; message: string }>;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

export const AdminAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('sbh_admin_logged_in') === 'true';
  });
  const [adminUsername, setAdminUsername] = useState<string>(() => {
    return localStorage.getItem('sbh_admin_username') || 'admin';
  });
  const [adminName, setAdminName] = useState<string>('SBH DOM Administrator');

  // Stored password hash in localStorage or Supabase
  const getStoredPassword = (): string => {
    return localStorage.getItem('sbh_admin_password') || 'admin123';
  };

  const loginAdmin = async (user: string, pass: string): Promise<{ success: boolean; message: string }> => {
    const trimmedUser = user.trim().toLowerCase();
    const currentPass = getStoredPassword();

    // Check with Supabase admin_users if table exists, else fallback to secure local storage
    try {
      const { data, error } = await supabase
        .from('admin_users')
        .select('*')
        .eq('username', trimmedUser)
        .eq('password_hash', pass)
        .maybeSingle();

      if (data && !error) {
        setIsAdminAuthenticated(true);
        setAdminUsername(data.username);
        setAdminName(data.full_name || 'SBH DOM Administrator');
        localStorage.setItem('sbh_admin_logged_in', 'true');
        localStorage.setItem('sbh_admin_username', data.username);
        return { success: true, message: 'Welcome to DOM Admin Command Center!' };
      }
    } catch {
      // Fallback
    }

    if (trimmedUser === 'admin' && pass === currentPass) {
      setIsAdminAuthenticated(true);
      setAdminUsername('admin');
      localStorage.setItem('sbh_admin_logged_in', 'true');
      localStorage.setItem('sbh_admin_username', 'admin');
      return { success: true, message: 'Admin login successful!' };
    }

    return { success: false, message: 'Invalid admin username or password. Default is admin / admin123' };
  };

  const logoutAdmin = () => {
    setIsAdminAuthenticated(false);
    localStorage.removeItem('sbh_admin_logged_in');
  };

  const updatePassword = async (oldPass: string, newPass: string): Promise<{ success: boolean; message: string }> => {
    const currentPass = getStoredPassword();
    if (oldPass !== currentPass) {
      return { success: false, message: 'Current password does not match.' };
    }

    if (newPass.length < 5) {
      return { success: false, message: 'New password must be at least 5 characters long.' };
    }

    localStorage.setItem('sbh_admin_password', newPass);

    // Update in Supabase if exists
    try {
      await supabase
        .from('admin_users')
        .update({ password_hash: newPass })
        .eq('username', adminUsername);
    } catch {
      // Ignore
    }

    return { success: true, message: 'Admin password changed successfully!' };
  };

  return (
    <AdminAuthContext.Provider
      value={{
        isAdminAuthenticated,
        adminUsername,
        adminName,
        loginAdmin,
        logoutAdmin,
        updatePassword,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
};

export const useAdminAuth = () => {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
};
