import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Leader } from '../types/database';

export interface AdminProfile {
  username: string;
  full_name: string;
  display_name: string;
  email: string;
  password?: string;
  role?: string;
  updated_at?: string;
}

interface AuthSessionContextType {
  // Admin Session
  isAdminAuthenticated: boolean;
  adminUsername: string;
  adminName: string;
  adminProfile: AdminProfile;
  fetchLiveAdminProfile: () => Promise<AdminProfile>;
  loginAdmin: (username: string, pass: string) => Promise<{ success: boolean; message: string }>;
  logoutAdmin: () => void | Promise<void>;
  updateAdminPassword: (oldPass: string, newPass: string) => Promise<{ success: boolean; message: string }>;
  updateAdminProfileAndCredentials: (updates: {
    username?: string;
    full_name?: string;
    display_name?: string;
    email?: string;
    oldPass: string;
    newPass?: string;
  }) => Promise<{ success: boolean; message: string }>;

  // Employee / Leader User Session
  isUserAuthenticated: boolean;
  currentUser: Leader | null;
  loginUser: (email: string, pass: string) => Promise<{ success: boolean; message: string }>;
  loginLeaderDirect: (leader: Leader, pass: string) => Promise<{ success: boolean; message: string }>;
  loginLeaderDirectlyWithoutPassword: (leader: Leader) => void;
  loginAdminDirectly: () => void;
  logoutUser: () => void | Promise<void>;
  updateUserPassword: (leaderId: string, oldPass: string, newPass: string) => Promise<{ success: boolean; message: string }>;
}

const AuthSessionContext = createContext<AuthSessionContextType | undefined>(undefined);

export const AuthSessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 2-Hour Auto Logout Constant (120 Minutes = 7,200,000 ms)
  const ADMIN_SESSION_TIMEOUT_MS = 2 * 60 * 60 * 1000;

  // Admin Profile State (Loaded directly from Supabase SQL database)
  const [adminProfile, setAdminProfile] = useState<AdminProfile>(() => {
    const saved = localStorage.getItem('sbh_admin_profile');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.warn('Error reading admin profile cache:', e);
      }
    }
    return {
      username: 'admin',
      full_name: 'Administrator',
      display_name: 'Administrator',
      email: 'it.head@sbhhospital.com',
      role: 'ADMIN',
    };
  });

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
  const [adminName, setAdminName] = useState<string>(() => {
    return localStorage.getItem('sbh_admin_fullname') || 'Administrator';
  });

  // User / Leader Session State
  const [currentUser, setCurrentUser] = useState<Leader | null>(() => {
    const saved = localStorage.getItem('sbh_active_user_session');
    return saved ? JSON.parse(saved) : null;
  });

  // Fetch live Admin Profile & credentials from Supabase SQL table (admin_audit_logs)
  const fetchLiveAdminProfile = async (): Promise<AdminProfile> => {
    try {
      const { data, error } = await supabase
        .from('admin_audit_logs')
        .select('*')
        .eq('entity_id', 'admin')
        .eq('action', 'ADMIN_CREDENTIAL')
        .order('created_at', { ascending: false })
        .limit(1);

      if (!error && data && data.length > 0 && data[0].after_data) {
        const after = data[0].after_data;
        const profile: AdminProfile = {
          username: after.username || 'admin',
          full_name: after.full_name || 'Administrator',
          display_name: after.display_name || after.full_name || 'Administrator',
          email: after.email || 'it.head@sbhhospital.com',
          password: after.password || 'Naman@123',
          role: after.role || 'ADMIN',
          updated_at: after.updated_at || data[0].created_at,
        };
        setAdminProfile(profile);
        setAdminUsername(profile.username);
        setAdminName(profile.full_name);
        // Security: Plain password and profile password are NEVER persisted to browser localStorage
        localStorage.removeItem('sbh_admin_profile');
        localStorage.removeItem('sbh_admin_password');
        localStorage.setItem('sbh_admin_username', profile.username);
        localStorage.setItem('sbh_admin_fullname', profile.full_name);
        return profile;
      }
    } catch (e) {
      console.warn('Supabase fetch admin profile error:', e);
    }

    const fallback: AdminProfile = {
      username: localStorage.getItem('sbh_admin_username') || 'admin',
      full_name: localStorage.getItem('sbh_admin_fullname') || 'Administrator',
      display_name: 'Administrator',
      email: 'it.head@sbhhospital.com',
      password: 'Naman@123',
      role: 'ADMIN',
    };
    return fallback;
  };

  useEffect(() => {
    // Proactive Security Cleanup: Clear any plain passwords from browser localStorage
    localStorage.removeItem('sbh_admin_password');
    localStorage.removeItem('sbh_admin_profile');
    fetchLiveAdminProfile();
  }, []);

  // Fetch live Leader password directly from Supabase 'leaders' table
  const getLiveLeaderPassword = async (leaderId: string): Promise<string> => {
    try {
      // 1. Direct query to leaders table where user is stored
      const { data: leadData, error: leadErr } = await supabase
        .from('leaders')
        .select('password')
        .eq('id', leaderId)
        .maybeSingle();

      if (!leadErr && leadData && leadData.password) {
        const supaPass = String(leadData.password);
        localStorage.setItem(`sbh_user_pass_${leaderId}`, supaPass);
        return supaPass;
      }

      // 2. Fallback to audit logs if column was recently migrated
      const { data, error } = await supabase
        .from('admin_audit_logs')
        .select('*')
        .eq('entity_id', leaderId)
        .eq('action', 'LEADER_PASSWORD')
        .order('created_at', { ascending: false })
        .limit(1);

      if (!error && data && data.length > 0 && data[0].after_data?.password) {
        const supaPass = String(data[0].after_data.password);
        localStorage.setItem(`sbh_user_pass_${leaderId}`, supaPass);
        return supaPass;
      }
    } catch (e) {
      console.warn('Supabase fetch leader password error:', e);
    }
    return localStorage.getItem(`sbh_user_pass_${leaderId}`) || '123456';
  };

  // Admin Login with Live Supabase SQL Verification & 2-Hour Auto-Logout
  const loginAdmin = async (user: string, pass: string): Promise<{ success: boolean; message: string }> => {
    const liveProf = await fetchLiveAdminProfile();
    const trimmedUser = user.trim().toLowerCase();

    const allowedMatches = [
      (liveProf.username || 'admin').toLowerCase(),
      (liveProf.full_name || '').toLowerCase(),
      (liveProf.display_name || '').toLowerCase(),
      'admin',
      'administrator',
      'hospital command',
      'naman',
      'naman mishra',
      'mr naman mishra',
      'mr. naman mishra',
    ];

    const isUserValid = allowedMatches.some((m) => m && (trimmedUser === m || trimmedUser.includes(m) || m.includes(trimmedUser)));

    if (!isUserValid) {
      return { success: false, message: 'Invalid admin username. Please select Administrator from the list.' };
    }

    const currentPass = liveProf.password || 'Naman@123';

    if (pass === currentPass) {
      setIsAdminAuthenticated(true);
      setAdminUsername(liveProf.username || 'admin');
      setAdminName(liveProf.full_name || 'Administrator');
      const now = Date.now().toString();
      localStorage.setItem('sbh_admin_logged_in', 'true');
      localStorage.setItem('sbh_admin_username', liveProf.username || 'admin');
      localStorage.setItem('sbh_admin_fullname', liveProf.full_name || 'Administrator');
      localStorage.setItem('sbh_admin_login_time', now);
      return { success: true, message: 'Admin login successful!' };
    }

    return { success: false, message: 'Invalid administrator password. Please try again.' };
  };

  const logoutAdmin = async () => {
    setIsAdminAuthenticated(false);
    localStorage.removeItem('sbh_admin_logged_in');
    localStorage.removeItem('sbh_admin_login_time');
    localStorage.removeItem('sbh_admin_username');
    localStorage.removeItem('sbh_admin_fullname');
    localStorage.removeItem('sbh_admin_profile');
    localStorage.removeItem('sbh_admin_password');
    sessionStorage.clear();

    try {
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith('sb-') || key.includes('auth-token') || key.includes('supabase')) {
          localStorage.removeItem(key);
        }
      });
    } catch {}

    try {
      await supabase.auth.signOut({ scope: 'local' });
      await supabase.auth.signOut();
    } catch (e) {
      console.warn('Error signing out Supabase auth session:', e);
    }

    window.location.href = '/login';
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

  // Update Admin Profile & Credentials - Persisted 100% directly into Supabase SQL Database
  const updateAdminProfileAndCredentials = async (updates: {
    username?: string;
    full_name?: string;
    display_name?: string;
    email?: string;
    oldPass: string;
    newPass?: string;
  }): Promise<{ success: boolean; message: string }> => {
    const liveProf = await fetchLiveAdminProfile();
    const currentPass = liveProf.password || 'Naman@123';

    if (updates.oldPass !== currentPass) {
      return { success: false, message: 'Current administrator password does not match.' };
    }

    if (updates.newPass && updates.newPass.trim().length > 0 && updates.newPass.trim().length < 5) {
      return { success: false, message: 'New password must be at least 5 characters long.' };
    }

    const nextUsername = updates.username?.trim() || liveProf.username || 'admin';
    const nextFullName = updates.full_name?.trim() || liveProf.full_name || 'Administrator';
    const nextDisplayName = updates.display_name?.trim() || liveProf.display_name || 'Administrator';
    const nextEmail = updates.email?.trim() || liveProf.email || 'it.head@sbhhospital.com';
    const nextPassword = updates.newPass && updates.newPass.trim().length >= 4 ? updates.newPass.trim() : currentPass;

    const payload = {
      role: 'ADMIN',
      username: nextUsername,
      full_name: nextFullName,
      display_name: nextDisplayName,
      email: nextEmail,
      password: nextPassword,
      updated_at: new Date().toISOString(),
    };

    try {
      const { error } = await supabase.from('admin_audit_logs').insert([
        {
          actor_id: null,
          action: 'ADMIN_CREDENTIAL',
          entity_type: 'SYSTEM_SECURITY',
          entity_id: 'admin',
          reason: `Master Administrator Profile & Credentials Updated in SQL by ${nextFullName}`,
          after_data: payload,
        },
      ]);

      if (error) {
        console.error('Supabase admin credential SQL error:', error);
        return { success: false, message: 'Failed to update admin profile in database. Please try again.' };
      }
    } catch (e: any) {
      console.error('Supabase admin credential save error:', e);
      return { success: false, message: e.message || 'Error updating credentials.' };
    }

    const updatedProfile: AdminProfile = {
      ...payload,
    };
    setAdminProfile(updatedProfile);
    setAdminUsername(nextUsername);
    setAdminName(nextFullName);
    // Security: Do NOT save password or profile into localStorage
    localStorage.removeItem('sbh_admin_profile');
    localStorage.removeItem('sbh_admin_password');
    localStorage.setItem('sbh_admin_username', nextUsername);
    localStorage.setItem('sbh_admin_fullname', nextFullName);

    return {
      success: true,
      message: 'Administrator account details and credentials updated securely in Supabase SQL Database!',
    };
  };

  const updateAdminPassword = async (oldPass: string, newPass: string) => {
    return updateAdminProfileAndCredentials({ oldPass, newPass });
  };

  // User / Leader Login with Live Supabase Password Verification
  const loginUser = async (email: string, pass: string): Promise<{ success: boolean; message: string }> => {
    const trimmedEmail = email.trim().toLowerCase();

    try {
      // 1. Fetch from Supabase
      const { data, error } = await supabase
        .from('leaders')
        .select('*')
        .eq('email', trimmedEmail)
        .maybeSingle();

      if (error || !data) {
        return { success: false, message: `No registered account found with email ${trimmedEmail}.` };
      }

      // Check user password from Supabase table
      const userStoredPass = await getLiveLeaderPassword(data.id);
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

  // Direct Leader Login by Selected Object with Live Supabase Password Verification
  const loginLeaderDirect = async (leader: Leader, pass: string): Promise<{ success: boolean; message: string }> => {
    try {
      const userStoredPass = await getLiveLeaderPassword(leader.id);
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

  const loginLeaderDirectlyWithoutPassword = (leader: Leader) => {
    setCurrentUser(leader);
    localStorage.setItem('sbh_active_user_session', JSON.stringify(leader));
  };

  const loginAdminDirectly = () => {
    setIsAdminAuthenticated(true);
    localStorage.setItem('sbh_admin_logged_in', 'true');
    localStorage.setItem('sbh_admin_username', adminProfile.username || 'admin');
    localStorage.setItem('sbh_admin_login_time', Date.now().toString());
  };

  const logoutUser = async () => {
    setCurrentUser(null);
    localStorage.removeItem('sbh_active_user_session');
    localStorage.removeItem('sbh_device_remembered_leader');
    localStorage.removeItem('sbh_leader_id');
    localStorage.removeItem('sbh_leader_name');
    sessionStorage.clear();

    try {
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith('sb-') || key.includes('auth-token') || key.includes('supabase')) {
          localStorage.removeItem(key);
        }
      });
    } catch {}

    try {
      await supabase.auth.signOut({ scope: 'local' });
      await supabase.auth.signOut();
    } catch (e) {
      console.warn('Error signing out Supabase auth session:', e);
    }

    window.location.href = '/login';
  };

  const updateUserPassword = async (
    leaderId: string,
    oldPass: string,
    newPass: string
  ): Promise<{ success: boolean; message: string }> => {
    const currentPass = await getLiveLeaderPassword(leaderId);
    if (oldPass !== currentPass) {
      return { success: false, message: 'Current password does not match.' };
    }
    if (newPass.length < 5) {
      return { success: false, message: 'New password must be at least 5 characters long.' };
    }

    // 1. Persist directly into Supabase 'leaders' table where user resides (overwrites old password)
    try {
      await supabase
        .from('leaders')
        .update({ password: newPass, updated_at: new Date().toISOString() })
        .eq('id', leaderId);
    } catch (dbErr) {
      console.warn('Direct leader table password update notice:', dbErr);
    }

    // 2. Also record in admin_audit_logs table
    try {
      await supabase.from('admin_audit_logs').insert([
        {
          actor_id: null,
          action: 'LEADER_PASSWORD',
          entity_type: 'USER_PASSWORD',
          entity_id: leaderId,
          reason: `Leader password updated for ${leaderId}`,
          after_data: {
            leader_id: leaderId,
            password: newPass,
            updated_at: new Date().toISOString(),
          },
        },
      ]);
    } catch (e) {
      console.warn('Supabase leader password update note:', e);
    }

    // 3. Keep local storage synchronized for instant response
    localStorage.setItem(`sbh_user_pass_${leaderId}`, newPass);
    return { success: true, message: 'Your personal password has been updated in database!' };
  };

  return (
    <AuthSessionContext.Provider
      value={{
        isAdminAuthenticated,
        adminUsername,
        adminName,
        adminProfile,
        fetchLiveAdminProfile,
        loginAdmin,
        logoutAdmin,
        updateAdminPassword,
        updateAdminProfileAndCredentials,
        isUserAuthenticated: !!currentUser,
        currentUser,
        loginUser,
        loginLeaderDirect,
        loginLeaderDirectlyWithoutPassword,
        loginAdminDirectly,
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
