-- Migration 00003: Seed Realistic Master Data for SBH Group of Hospital, Raipur
-- Medical, Surgical, Administrative, and Clinical Super-specialties

-- 1. Departments
INSERT INTO departments (id, name, code, is_active) VALUES
  ('11111111-1111-1111-1111-111111111101', 'Hospital Administration & Executive Leadership', 'ADMIN-EXEC', true),
  ('11111111-1111-1111-1111-111111111102', 'Cardiology & Cardiac Surgery', 'CARDIO', true),
  ('11111111-1111-1111-1111-111111111103', 'Emergency Medicine & Trauma Services', 'EMERG-MED', true),
  ('11111111-1111-1111-1111-111111111104', 'Neurology & Neurosurgery', 'NEURO', true),
  ('11111111-1111-1111-1111-111111111105', 'General & Laparoscopic Surgery', 'GEN-SURG', true),
  ('11111111-1111-1111-1111-111111111106', 'Critical Care Medicine & ICU', 'ICU-CCM', true),
  ('11111111-1111-1111-1111-111111111107', 'Orthopaedics & Joint Replacement', 'ORTHO', true),
  ('11111111-1111-1111-1111-111111111108', 'Anaesthesiology & Operation Theatres', 'ANAESTH', true),
  ('11111111-1111-1111-1111-111111111109', 'Nursing Services & Patient Care Administration', 'NURSING', true),
  ('11111111-1111-1111-1111-111111111110', 'Biomedical & Operations Engineering', 'BIOMED', true),
  ('11111111-1111-1111-1111-111111111111', 'Human Resources & Medical Personnel', 'HR-MED', true);

-- 2. Hospital Leaders
INSERT INTO leaders (id, full_name, email, phone, department_id, role, employee_code, expected_mode, is_active) VALUES
  -- Director
  ('22222222-2222-2222-2222-222222222201', 'Dr. Alok Verma', 'director@sbh.org', '+919876543201', '11111111-1111-1111-1111-111111111101', 'DIRECTOR', 'SBH-DIR-01', 'PHYSICAL', true),
  -- Admin / DOM Coordinator
  ('22222222-2222-2222-2222-222222222202', 'Dr. Neha Agrawal', 'dom.admin@sbh.org', '+919876543202', '11111111-1111-1111-1111-111111111101', 'ADMIN', 'SBH-ADM-02', 'PHYSICAL', true),
  -- HR Manager
  ('22222222-2222-2222-2222-222222222203', 'Pooja Sharma', 'hr@sbh.org', '+919876543203', '11111111-1111-1111-1111-111111111111', 'HR', 'SBH-HR-03', 'PHYSICAL', true),
  -- Department Heads / Leaders
  ('22222222-2222-2222-2222-222222222204', 'Dr. Rajesh Deshmukh', 'rajesh.cardio@sbh.org', '+919876543204', '11111111-1111-1111-1111-111111111102', 'LEADER', 'SBH-HOD-04', 'PHYSICAL', true),
  ('22222222-2222-2222-2222-222222222205', 'Dr. Sunita Rao', 'sunita.emerg@sbh.org', '+919876543205', '11111111-1111-1111-1111-111111111103', 'LEADER', 'SBH-HOD-05', 'PHYSICAL', true),
  ('22222222-2222-2222-2222-222222222206', 'Dr. Vikramaditya Singh', 'vikram.neuro@sbh.org', '+919876543206', '11111111-1111-1111-1111-111111111104', 'LEADER', 'SBH-HOD-06', 'PHYSICAL', true),
  ('22222222-2222-2222-2222-222222222207', 'Dr. Meenakshi Soni', 'meenakshi.surg@sbh.org', '+919876543207', '11111111-1111-1111-1111-111111111105', 'LEADER', 'SBH-HOD-07', 'PHYSICAL', true),
  ('22222222-2222-2222-2222-222222222208', 'Dr. Ankit Tripathi', 'ankit.icu@sbh.org', '+919876543208', '11111111-1111-1111-1111-111111111106', 'LEADER', 'SBH-HOD-08', 'PHYSICAL', true),
  ('22222222-2222-2222-2222-222222222209', 'Dr. Tarun Dewangan', 'tarun.ortho@sbh.org', '+919876543209', '11111111-1111-1111-1111-111111111107', 'LEADER', 'SBH-HOD-09', 'PHYSICAL', true),
  ('22222222-2222-2222-2222-222222222210', 'Dr. Kavita Pillai', 'kavita.ot@sbh.org', '+919876543210', '11111111-1111-1111-1111-111111111108', 'LEADER', 'SBH-HOD-10', 'PHYSICAL', true),
  ('22222222-2222-2222-2222-222222222211', 'Sister Leena Mathew', 'leena.nursing@sbh.org', '+919876543211', '11111111-1111-1111-1111-111111111109', 'LEADER', 'SBH-NSG-11', 'PHYSICAL', true),
  ('22222222-2222-2222-2222-222222222212', 'Er. Manish Chandrakar', 'manish.biomed@sbh.org', '+919876543212', '11111111-1111-1111-1111-111111111110', 'LEADER', 'SBH-ENG-12', 'PHYSICAL', true);

-- Link Department Heads
UPDATE departments SET head_leader_id = '22222222-2222-2222-2222-222222222201' WHERE code = 'ADMIN-EXEC';
UPDATE departments SET head_leader_id = '22222222-2222-2222-2222-222222222204' WHERE code = 'CARDIO';
UPDATE departments SET head_leader_id = '22222222-2222-2222-2222-222222222205' WHERE code = 'EMERG-MED';
UPDATE departments SET head_leader_id = '22222222-2222-2222-2222-222222222206' WHERE code = 'NEURO';
UPDATE departments SET head_leader_id = '22222222-2222-2222-2222-222222222207' WHERE code = 'GEN-SURG';
UPDATE departments SET head_leader_id = '22222222-2222-2222-2222-222222222208' WHERE code = 'ICU-CCM';
UPDATE departments SET head_leader_id = '22222222-2222-2222-2222-222222222209' WHERE code = 'ORTHO';
UPDATE departments SET head_leader_id = '22222222-2222-2222-2222-222222222210' WHERE code = 'ANAESTH';
UPDATE departments SET head_leader_id = '22222222-2222-2222-2222-222222222211' WHERE code = 'NURSING';
UPDATE departments SET head_leader_id = '22222222-2222-2222-2222-222222222212' WHERE code = 'BIOMED';
UPDATE departments SET head_leader_id = '22222222-2222-2222-2222-222222222203' WHERE code = 'HR-MED';
