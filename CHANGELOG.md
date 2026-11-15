# CHANGELOG — DOM Attendance Automation System

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased] - 2026-10-20

### Added
- **Project Inception & Architecture**: Authored `brain.md` detailing all hospital operational business rules, user roles, database models, reminder engine, and QR verification specs.
- **Project Structure**: Established Vite + React 19 + TypeScript base application.
- **Documentation**:
  - `docs/ARCHITECTURE.md`: High-level system design, edge functions, and security boundaries.
  - `docs/DATABASE_SCHEMA.md`: Full SQL schema, constraints, triggers, and indices.
  - `docs/BUSINESS_RULES.md`: Explicit transition rules for physical and virtual attendance, leave exemptions, and escalation workflows.
  - `docs/GOOGLE_MEET_INTEGRATION.md`: Participant reconciliation and API strategy.
  - `docs/WHATSAPP_INTEGRATION.md`: Server-side adapter, webhook verification, and group escalation design.
  - `docs/DEPLOYMENT.md`: Vercel + Supabase deployment runbook.
  - `docs/SECURITY.md`: Supabase Row Level Security (RLS) policies, JWT validation, and HMAC QR signatures.
  - `docs/TESTING.md`: Test matrix covering QR fraud prevention, scheduler idempotency, and leave overrides.
- **Environment Template**: `.env.example` with non-secret variable placeholders.
