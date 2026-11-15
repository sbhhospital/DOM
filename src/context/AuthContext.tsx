import React, { createContext, useContext, useState, useEffect } from 'react';
import { Leader, UserRole } from '../types/database';
import { supabase } from '../lib/supabase';
import { INITIAL_LEADERS } from '../data/initialData';

interface AuthContextType {
  currentLeader: Leader | null;
  isAuthenticated: boolean;
  loginWithEmail: (email: string) => Promise<{ success: boolean; message: string }>;
  logout: () => void;
  allLeaders: Leader[];
  isLoading: boolean;
  switchLeader: (leaderId: string) => void;
  addNewLeader: (leader: Omit<Leader, 'id' | 'created_at' | 'updated_at'>) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [allLeaders, setAllLeaders] = useState<Leader[]>(INITIAL_LEADERS);
  const [currentLeader, setCurrentLeader] = useState<Leader | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // 1. Fetch Leaders from live Supabase database
  const fetchLeadersFromSupabase = async () => {
    try {
      const { data, error } = await supabase
        .from('leaders')
        .select('*, department:departments(*)');

      if (!error && data && data.length > 0) {
        setAllLeaders(data as Leader[]);
        return data as Leader[];
      } else {
        // If Supabase table is empty, insert default leaders into Supabase
        await seedSupabaseLeaders();
        return INITIAL_LEADERS;
      }
    } catch (err) {
      console.warn('Could not fetch from Supabase, using local fallback', err);
      return INITIAL_LEADERS;
    }
  };

  const seedSupabaseLeaders = async () => {
    try {
      const { data: depts } = await supabase.from('departments').select('id, code');
      const deptMap: Record<string, string> = {};
      if (depts) {
        depts.forEach((d) => {
          deptMap[d.code] = d.id;
        });
      }

      const leadersToInsert = INITIAL_LEADERS.map((l) => ({
        full_name: l.full_name,
        email: l.email,
        phone: l.phone,
        department_id: deptMap[l.department?.code || 'ADMIN-EXEC'] || null,
        role: l.role,
        employee_code: l.employee_code,
        expected_mode: l.expected_mode,
        is_active: true,
      }));

      const { data } = await supabase.from('leaders').insert(leadersToInsert).select('*, department:departments(*)');
      if (data && data.length > 0) {
        setAllLeaders(data as Leader[]);
      }
    } catch (e) {
      console.error('Error seeding leaders', e);
    }
  };

  useEffect(() => {
    fetchLeadersFromSupabase().then((leaders) => {
      // Check if user session was saved
      const savedEmail = localStorage.getItem('sbh_auth_email');
      if (savedEmail) {
        const found = leaders.find((l) => l.email.toLowerCase() === savedEmail.toLowerCase());
        if (found) setCurrentLeader(found);
      }
      setIsLoading(false);
    });
  }, []);

  const loginWithEmail = async (email: string): Promise<{ success: boolean; message: string }> => {
    const trimmed = email.trim().toLowerCase();
    const leader = allLeaders.find((l) => l.email.toLowerCase() === trimmed);

    if (!leader) {
      return {
        success: false,
        message: 'Account not found. Please contact SBH Medical HR or DOM Administration to register your email.',
      };
    }

    if (!leader.is_active) {
      return {
        success: false,
        message: 'Your hospital leadership account is inactive. Please reach out to HR administration.',
      };
    }

    setCurrentLeader(leader);
    localStorage.setItem('sbh_auth_email', leader.email);
    return { success: true, message: `Welcome back, ${leader.full_name}!` };
  };

  const logout = () => {
    setCurrentLeader(null);
    localStorage.removeItem('sbh_auth_email');
  };

  const switchLeader = (leaderId: string) => {
    const matching = allLeaders.find((l) => l.id === leaderId);
    if (matching) {
      setCurrentLeader(matching);
      localStorage.setItem('sbh_auth_email', matching.email);
    }
  };

  const addNewLeader = async (leaderData: Omit<Leader, 'id' | 'created_at' | 'updated_at'>): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('leaders')
        .insert([leaderData])
        .select('*, department:departments(*)');

      if (!error && data && data.length > 0) {
        setAllLeaders((prev) => [...prev, data[0] as Leader]);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to add leader:', err);
      return false;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentLeader,
        isAuthenticated: !!currentLeader,
        loginWithEmail,
        logout,
        allLeaders,
        isLoading,
        switchLeader,
        addNewLeader,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
