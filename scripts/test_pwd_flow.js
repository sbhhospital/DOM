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

async function testPasswordFlow() {
  console.log('1. Setting leader password for Naman Mishra in Supabase...');
  const { data: leaders } = await supabase.from('leaders').select('*').limit(1);
  if (!leaders || leaders.length === 0) return;
  const lead = leaders[0];

  const { data: insData, error: insErr } = await supabase.from('admin_audit_logs').insert([{
    actor_id: null,
    action: 'LEADER_PASSWORD',
    entity_type: 'USER_PASSWORD',
    entity_id: lead.id,
    reason: `Password for ${lead.full_name} (${lead.email})`,
    after_data: {
      leader_id: lead.id,
      full_name: lead.full_name,
      email: lead.email,
      employee_code: lead.employee_code,
      password: 'mypassword123',
      updated_at: new Date().toISOString()
    }
  }]).select('*');

  console.log('Insert leader password result:', { id: insData?.[0]?.id, error: insErr });

  console.log('\n2. Querying latest password for leader ID:', lead.id);
  const { data: pwdRows, error: readErr } = await supabase
    .from('admin_audit_logs')
    .select('*')
    .eq('entity_id', lead.id)
    .eq('action', 'LEADER_PASSWORD')
    .order('created_at', { ascending: false })
    .limit(1);

  console.log('Retrieved password from Supabase:', pwdRows?.[0]?.after_data?.password);
  console.log('Full after_data object stored in Supabase:');
  console.log(pwdRows?.[0]?.after_data);

  console.log('\n3. Querying latest Admin password in Supabase:');
  const { data: adminRows } = await supabase
    .from('admin_audit_logs')
    .select('*')
    .eq('entity_id', 'admin')
    .eq('action', 'ADMIN_CREDENTIAL')
    .order('created_at', { ascending: false })
    .limit(1);

  console.log('Admin password in Supabase:', adminRows?.[0]?.after_data?.password);
  console.log(adminRows?.[0]?.after_data);
}

testPasswordFlow();
