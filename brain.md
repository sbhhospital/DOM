# Brain.md — DOM Attendance Automation System (SBH Group of Hospital, Raipur)

## 1. Project Purpose & Scope
The **DOM Attendance Automation System** is an enterprise-grade hospital web application developed for **SBH Group of Hospital, Raipur**. It automates, tracks, verifies, escalates, and audits Daily Operations Meeting (DOM) attendance for hospital executive leaders, department heads, and clinical administrators.

---

## 2. Architecture & Complete Operational Workflow

### A. Admin Authentication & Security
- **Single Central Command Center**: All hospital meeting operations are managed from `/dashboard`.
- **Admin Credentials**:
  - Default Username: `admin`
  - Default Password: `admin123`
- **Password Management**: Admin can change their password anytime via the **"Password"** button in the dashboard top bar (stored securely in browser localStorage `sbh_admin_password`).
- **Doctor / Leader Self Login**:
  - Official Hospital Email (`@sbhhospital.com`)
  - Personal Password (default: `123456`)

### B. Daily Unique Meeting Link & Virtual Attendance Tracking
- **Official Google Meet URL**: `https://meet.google.com/jrz-jfku-gir`
- **Personalized Daily Link Generation**:
  - Route: `/join-meeting?token=...` or `/meet/:token`
  - Encodes: Leader ID, Date, Leader Name, Department, Phone, and Target Meet URL.
  - Generates a distinct tracking URL for every single leader for each date.
- **Date-wise & User-wise Click Tracking**:
  - When the user opens their unique daily link:
    - Identifies user & date.
    - Increments and logs `virtual_clicks_count`.
    - Updates timestamp `check_in_at` and `last_click_at`.
    - Sets `evidence_source = 'GOOGLE_MEET_REDIRECT'`.
- **Virtual Attendance QR Code Verification**:
  - For virtual attendees, host displays the **Virtual Session Screen QR Code** on Google Meet screen (`SBH-DOM-SESSION-{date}`).
  - Attendees open the join link on their mobile and point the camera to scan the meeting QR.
  - When scanned, attendance status switches to `VERIFIED` with `evidence_source = 'VIRTUAL_QR_VERIFIED'`.
  - Automatically redirects attendees to Google Meet (`https://meet.google.com/jrz-jfku-gir`).

### C. Daily Attendance Register & Verification Panel
- **Date Selector**: Admin switches to any historical or today's attendance roster.
- **Recorded Modes**:
  - `PHYSICAL` (Boardroom check-in via Static QR)
  - `VIRTUAL` (Google Meet personal link click & QR verification)
  - `INFORMED_ABSENT` (Leaders who reported inability to attend)
  - `INFORMED_LATE` (Late arrival notices with ETA and reason)
- **Live Statuses**:
  - `Present (Verified)`: Confirmed physically present in boardroom or virtual QR confirmed.
  - `Virtual Clicked`: Opened personal link, counted date-wise.
  - `Informed Absence`: Submitted notice with person informed & reason.
  - `Absent`: Unresolved or unexcused.
- **Admin Verification Controls**:
  - Admin verifies physical presence or virtual attendance with 1 click.
  - For informed absentees, Admin sees "Informed: [Person Name]" with **Confirm** or **Deny** buttons.

### D. Automated 2-Stage WhatsApp Broadcasts (CEOITBOX Integration)
- **Stage 1 (09:50 AM)**:
  - Broadcasts meeting notice with agenda, venue, Google Meet link (`https://meet.google.com/jrz-jfku-gir`), and personalized daily tracking links to all department leaders.
- **Stage 2 (10:10 AM)**:
  - Interim live attendance status alert (❌ Red cross for non-attendees, 🏢 physical, 💻 virtual).
- **Stage 3 (10:30 AM)**:
  - Final Frozen Attendance Audit dispatched directly to **Director Sir** (`9644404741`) and executive WhatsApp group.

### E. Conference Room Static QR Code & Public Portal
- **Boardroom Display**: Fixed in SBH Conference Room, 5th Floor.
- Opens `/portal` on mobile where leader selects:
  - **"Attending In-Person"**: Registers boardroom check-in.
  - **"Join Virtually (Meet)"**: Counts virtual attendance and launches Google Meet.
  - **"Cannot attend?"**: Submits prior informed notice.

---

## 3. Technology Stack
- **Frontend**: React 19 + TypeScript, Vite, Tailwind CSS v4, Lucide React
- **Scanning & Barcodes**: `jsqr` (camera QR scanning), `qrcode` (dynamic generator)
- **Database & Backend**: Supabase Cloud PostgreSQL, Supabase JS Client
- **Authentication**: Admin session + User session with password change engine
- **Integrations**: Google Meet URL redirect, CEOITBOX WhatsApp API, Web WhatsApp fallback

---

## 4. Current Status
- Admin credentials active: `admin` / `admin123`.
- Official Google Meet link synced across app: `https://meet.google.com/jrz-jfku-gir`.
- Dedicated Daily Meeting Link Hub live in Admin Dashboard (`Daily Meeting Links` tab).
- `/join-meeting` redirector with camera QR scanning & date-wise/user-wise click tracker live.
- Login page redesigned with executive hospital aesthetic and professional typography.
- Production build verified: `npm run build` succeeds with zero errors.

**Last Updated**: 2026-11-15
