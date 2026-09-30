# expense-app — คู่มือสำหรับ AI

กฎสำหรับผู้ช่วย AI ที่ทำงานในโปรเจกต์นี้ ใช้ร่วมกันทั้ง **Claude** (`CLAUDE.md` → `@AGENTS.md`) และ **Codex** (อ่าน `AGENTS.md`) เพื่อให้ทั้งคู่ทำตาม convention เดียวกัน — เขียนกฎของโปรเจกต์ไว้ที่นี่ ไม่ใช่ใน `CLAUDE.md`

แอป: ระบบเบิกจ่ายของบริษัท — พนักงานส่งใบเสร็จค่าสมัคร AI/ซอฟต์แวร์, ผู้จัดการจ่ายเงิน, หัวหน้าทีมรวมยอดรายเดือนไปเบิกกับบริษัท UI เป็นภาษาไทย

## Stack (เทคโนโลยี)
- **Next.js 16** App Router + TypeScript + Turbopack — convention `middleware` ถูกเปลี่ยนชื่อเป็น `proxy` ดูที่ `src/proxy.ts` / `export function proxy` (ไม่ใช่ `middleware`) อ่านหมายเหตุ Next.js ท้ายไฟล์ก่อนเขียนโค้ดเฟรมเวิร์ก
- **Supabase**: Postgres + RLS + Google Auth + Storage คีย์รูปแบบใหม่ (`sb_publishable_` / `sb_secret_`)
- **Vercel** deploy region `sin1` (สิงคโปร์ ที่เดียวกับ Supabase) ใช้ Tailwind CSS

## โมเดลความปลอดภัย — ห้ามข้าม
- `expense_claims` **อ่านได้อย่างเดียว (SELECT-only)** ภายใต้ RLS ทุกการเขียน claim ต้องผ่าน RPC แบบ `SECURITY DEFINER` (`create_claim`, `transition_claim`, `resubmit_claim`, `delete_claim`) ที่ตั้ง `set search_path = ''` — state machine ของสถานะและฟิลด์ที่เซิร์ฟเวอร์ควบคุมถูกบังคับใน RPC เหล่านี้ ห้ามเพิ่ม policy INSERT/UPDATE/DELETE ฝั่ง client บน claim
- เลขที่เบิกออกแบบ atomic ผ่าน `claim_counters` ภายใน `create_claim`
- `people` / `recurring_subscriptions`: ใช้ RLS (`is_manager()`) + `requireManager()` ใน server action — ใช้ session client ไม่ใช่ admin client
- Telegram webhook / cron / reminders: **ใช้ service-role admin client เท่านั้น** (ฝั่งเซิร์ฟเวอร์ ข้าม RLS) ห้ามให้ service key หลุดไป client — webhook ตรวจ `x-telegram-bot-api-secret-token`, cron ตรวจ `Bearer CRON_SECRET`

## Auth & สิทธิ์ (roles)
- Google OAuth — ที่ `auth/callback`: อีเมลใน `ADMIN_EMAILS` → **manager** (ข้ามโดเมน); ไม่ใช่ก็เช็ก `ALLOWED_DOMAIN` → **submitter**; ไม่ตรงเลย → `/auth/denied` — role ตั้งครั้งเดียวตอน login ครั้งแรก หลังจากนั้นเปลี่ยนได้เฉพาะ manager ในหน้า UI
- `getCurrentUser()` คือด่านตรวจ: ไม่ login → `/login`, ถูกปิดใช้งาน → `/auth/denied`, และใช้ cookie `view_as` (ลดสิทธิ์ manager→submitter **เท่านั้น** ไม่มีทางเพิ่มสิทธิ์) ใช้ `requireManager()` กับหน้า `/manage/*` และ action ของ manager

## เวลา — ใช้ Asia/Bangkok ห้าม UTC
- เดือน/วัน/วันที่เชิงธุรกิจ ต้องมาจาก `src/lib/bangkok-time.ts` (`currentPeriodBangkok` / `currentDayBangkok` / `currentDateBangkok`) ห้ามใช้ `new Date().toISOString().slice(...)` หรือ `getUTCDate()` สำหรับวันที่เชิงธุรกิจ — Vercel รันเป็น UTC จะคลาดเคลื่อนได้ถึง 7 ชม. ช่วงใกล้เที่ยงคืน

## Migration
- ไฟล์ SQL เรียงเลขใน `supabase/migrations/` — apply โดยวางใน **Supabase SQL Editor** (`supabase db push` ใช้ไม่ได้ในโหมด non-TTY นี้) **ต้อง apply migration ก่อน deploy โค้ดที่ใช้มันเสมอ**

## Workflow (ขั้นตอนทำงาน)
- ทำงานบน branch `phase1-mvp` — deploy: `git checkout main && git merge --ff-only phase1-mvp && git push origin main && git checkout phase1-mvp` — `main` = production (Vercel auto-deploy เมื่อ push)
- ก่อน deploy ต้องผ่านทั้งหมด: `npx tsc --noEmit`, `npx vitest run`, `npm run build`
- **Two-AI**: ตัวหนึ่งเขียน อีกตัวรีวิว (Claude ↔ Codex ~2-3 รอบ) และต้อง verify สิ่งที่อีกฝ่ายบอกกับไฟล์/คำสั่งจริงก่อนเชื่อเสมอ

## UI conventions
- โทน light admin dashboard: primary `#2563eb`, ตัวอักษร `#111827`, สีจาง `#6b7280`, พื้นหลัง `#f8fafc` — ใช้ shared class เดิม: `card`, `btn-primary`, `btn-ghost`, `field`, `tbl` / `table-card`, และ component `Modal` เน้นใช้ modal แทนการเปิดหน้าใหม่ ข้อความภาษาไทยทั้งหมด
- `AppShell` แยกตาม role: manager ได้ sidebar สีเข้ม, submitter ได้ layout แบบ topbar

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
