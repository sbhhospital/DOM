import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const env = fs.readFileSync('.env', 'utf8');
const lines = env.split('\n');
const envVars = {};
for (const line of lines) {
  const parts = line.trim().split('=');
  if (parts.length >= 2) {
    envVars[parts[0].trim()] = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
  }
}
const supabase = createClient(envVars.VITE_SUPABASE_URL, envVars.VITE_SUPABASE_ANON_KEY);

async function test() {
  const testTables = [
    'leaders',
    'departments',
    'meetings',
    'attendance_records',
    'attendance_events',
    'leave_requests',
    'attendance_exceptions',
    'reminder_jobs',
    'notification_logs',
    'admin_audit_logs',
    'integration_settings',
    'admin_users',
    'app_settings',
    'user_passwords',
    'system_credentials'
  ];
  for (const t of testTables) {
    const { data, error } = await supabase.from(t).select('*').limit(1);
    console.log(t.padEnd(25), '->', error ? 'ERR: ' + error.message : 'EXISTS (count ' + data.length + ')');
  }
}

test();
