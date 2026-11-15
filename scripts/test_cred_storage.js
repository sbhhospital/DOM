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

async function testAdminCredentialStorage() {
  console.log('Testing saving admin credential to admin_audit_logs in Supabase...');

  const credentialRecord = {
    actor_id: null,
    action: 'ADMIN_CREDENTIAL',
    entity_type: 'SYSTEM_SECURITY',
    entity_id: 'admin',
    reason: 'Master Administrator Password Record',
    after_data: {
      username: 'admin',
      password: 'admin123',
      role: 'ADMIN',
      updated_at: new Date().toISOString()
    }
  };

  const { data, error } = await supabase
    .from('admin_audit_logs')
    .insert([credentialRecord])
    .select('*');

  console.log('Insert result:', { data, error });

  console.log('\nTesting retrieving latest admin credential from Supabase...');
  const { data: latestCred, error: readErr } = await supabase
    .from('admin_audit_logs')
    .select('*')
    .eq('entity_id', 'admin')
    .eq('action', 'ADMIN_CREDENTIAL')
    .order('created_at', { ascending: false })
    .limit(1);

  console.log('Read result:', { latestCred, readErr });
  if (latestCred && latestCred.length > 0) {
    console.log('Retrieved password from Supabase SQL:', latestCred[0].after_data.password);
  }
}

testAdminCredentialStorage();
