import { createClient } from '@supabase/supabase-js';

// SBH Group of Hospitals - Production Supabase Database Configuration
const DEFAULT_SUPABASE_URL = 'https://bbykxaxndzkapdjdgeap.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJieWt4YXhuZHprYXBkamRnZWFwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI1MDI1OTIsImV4cCI6MjEwODA3ODU5Mn0.eIfh3OjbKBsxXZtWJQsbC1EBM-irC1z6QN9W5IPhz-o';

const rawUrl = import.meta.env.VITE_SUPABASE_URL;
const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabaseUrl =
  rawUrl && !rawUrl.includes('placeholder-project') ? rawUrl : DEFAULT_SUPABASE_URL;
const supabaseAnonKey =
  rawKey && !rawKey.includes('placeholder') ? rawKey : DEFAULT_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = true;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});
