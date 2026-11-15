-- Migration 00005: 24 Official SBH Departments and RLS Policy Update
-- SBH Group of Hospital, Raipur

-- 1. Ensure RLS allows full management from both SQL and Dashboard
ALTER TABLE departments DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated read departments" ON departments;
DROP POLICY IF EXISTS "Allow admin manage departments" ON departments;
DROP POLICY IF EXISTS "Allow all departments access" ON departments;
CREATE POLICY "Allow all departments access" ON departments FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;

-- 2. Clear out foreign key references to old departments temporarily
UPDATE leaders SET department_id = NULL;

-- 3. Delete the 7 legacy dummy placeholder departments
DELETE FROM departments WHERE name IN (
  'Hospital Administration & Executive Leadership',
  'Cardiology & Cardiac Surgery',
  'Emergency Medicine & Trauma Services',
  'Neurology & Neurosurgery',
  'General & Laparoscopic Surgery',
  'Critical Care Medicine & ICU',
  'Human Resources & Medical Personnel',
  'Orthopaedics & Joint Replacement',
  'Anaesthesiology & Operation Theatres',
  'Nursing Services & Patient Care Administration',
  'Biomedical & Operations Engineering'
);

-- 4. Seed the 24 Official SBH Departments
INSERT INTO departments (name, code, is_active) VALUES
  ('TPA', 'TPA', true),
  ('ACCOUNTANT', 'ACCT', true),
  ('HR', 'HR', true),
  ('OPERATION', 'OPS', true),
  ('PHARMACY', 'PHARM', true),
  ('HOUSE KEEPING', 'HK', true),
  ('MAINTENANCE', 'MAINT', true),
  ('IT', 'IT', true),
  ('MARKETING', 'MKTG', true),
  ('DOCTOR', 'DOC', true),
  ('ADMIN', 'ADMIN', true),
  ('DME & IT', 'DME-IT', true),
  ('STORE', 'STORE', true),
  ('DIGITAL MARKETING', 'DIGI-MKT', true),
  ('OT', 'OT', true),
  ('COUNSELOR', 'COUNSEL', true),
  ('PROMOTIONS', 'PROMO', true),
  ('RECEPTION', 'RECEPT', true),
  ('IVF', 'IVF', true),
  ('COSMETIC', 'COSM', true),
  ('COO', 'COO', true),
  ('DIRECTOR', 'DIR', true),
  ('ACCOUNTS', 'ACCOUNTS', true),
  ('LAB', 'LAB', true)
ON CONFLICT (code) DO UPDATE SET 
  name = EXCLUDED.name,
  is_active = true,
  updated_at = NOW();

-- 5. Auto-link the 21 Leaders in Supabase to their exact departments
UPDATE leaders SET department_id = (SELECT id FROM departments WHERE code = 'IT' LIMIT 1) WHERE email ILIKE '%it@%' OR email ILIKE '%asstit%' OR full_name ILIKE '%naman%' OR employee_code = '10231';
UPDATE leaders SET department_id = (SELECT id FROM departments WHERE code = 'HK' LIMIT 1) WHERE email ILIKE '%manager.hk%' OR full_name ILIKE '%ugrasen%';
UPDATE leaders SET department_id = (SELECT id FROM departments WHERE code = 'RECEPT' LIMIT 1) WHERE email ILIKE '%enquiry.eye%' OR full_name ILIKE '%deepu mourya%';
UPDATE leaders SET department_id = (SELECT id FROM departments WHERE code = 'OPS' LIMIT 1) WHERE email ILIKE '%floormanager%' OR email ILIKE '%operation.manager%' OR full_name ILIKE '%deepmala%' OR full_name ILIKE '%swapnil%';
UPDATE leaders SET department_id = (SELECT id FROM departments WHERE code = 'OT' LIMIT 1) WHERE email ILIKE 'oe@%' OR full_name ILIKE '%suman bala%';
UPDATE leaders SET department_id = (SELECT id FROM departments WHERE code = 'IVF' LIMIT 1) WHERE email ILIKE '%ivf%' OR full_name ILIKE '%poonam%';
UPDATE leaders SET department_id = (SELECT id FROM departments WHERE code = 'DOC' LIMIT 1) WHERE email ILIKE '%draakriti%' OR full_name ILIKE '%aakriti%';
UPDATE leaders SET department_id = (SELECT id FROM departments WHERE code = 'STORE' LIMIT 1) WHERE email ILIKE '%store.women%' OR full_name ILIKE '%pratima%';
UPDATE leaders SET department_id = (SELECT id FROM departments WHERE code = 'PHARM' LIMIT 1) WHERE email ILIKE '%pharmacy%' OR full_name ILIKE '%umesh%';
UPDATE leaders SET department_id = (SELECT id FROM departments WHERE code = 'COSM' LIMIT 1) WHERE email ILIKE '%skin.care%' OR full_name ILIKE '%monika%' OR full_name ILIKE '%khushi%';
UPDATE leaders SET department_id = (SELECT id FROM departments WHERE code = 'MKTG' LIMIT 1) WHERE email ILIKE '%marketing%' OR full_name ILIKE '%alokesh%' OR full_name ILIKE '%dewangan%';
UPDATE leaders SET department_id = (SELECT id FROM departments WHERE code = 'LAB' LIMIT 1) WHERE email ILIKE '%metrolabs%' OR full_name ILIKE '%santos%';
UPDATE leaders SET department_id = (SELECT id FROM departments WHERE code = 'COO' LIMIT 1) WHERE email ILIKE '%coo@%' OR full_name ILIKE '%nikhilesh%';
UPDATE leaders SET department_id = (SELECT id FROM departments WHERE code = 'ADMIN' LIMIT 1) WHERE email ILIKE '%admin@%' OR full_name ILIKE '%shilpa%';
UPDATE leaders SET department_id = (SELECT id FROM departments WHERE code = 'ACCOUNTS' LIMIT 1) WHERE (email ILIKE '%accounts.women%' OR full_name ILIKE '%ajay%') AND department_id IS NULL;
UPDATE leaders SET department_id = (SELECT id FROM departments WHERE code = 'ACCOUNTS' LIMIT 1) WHERE (email ILIKE '%accounts.eye%' OR full_name ILIKE '%supriya%') AND department_id IS NULL;
UPDATE leaders SET department_id = (SELECT id FROM departments WHERE code = 'COUNSEL' LIMIT 1) WHERE email ILIKE '%crm%' OR full_name ILIKE '%crm%';
