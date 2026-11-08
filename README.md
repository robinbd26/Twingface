# Twingface — Bangladeshi Social Media Platform

A modern social media platform built with Next.js 15, Prisma, PostgreSQL, and Tailwind CSS v4.

---

## 🚀 Tech Stack

| Layer | Technology | Version |
|-------|------------|---------|
| Framework | Next.js | 15.3.2 |
| Language | TypeScript | 5.x |
| Styling | Tailwind CSS | v4 |
| ORM | Prisma | 6.x |
| Database | PostgreSQL | 15+ |
| Auth | NextAuth.js | Built-in |
| Password Hash | argon2 | 0.41.x |
| Media | Cloudinary | 2.x |
| Tests | Vitest | 3.x |
| Lint | ESLint | 9.x |

---

## 📋 Prerequisites

Before you begin, make sure you have:

- **Node.js** 20+ installed
- **PostgreSQL** 15+ running on `localhost:5432`
- A **Cloudinary** account (free tier OK)
- Git installed

---

## 🇧🇩 Quick Setup (বাংলা / বাংলlish গাইড)

### Step 1: Clone & Install

```bash
cd twingface
npm install
```

### Step 2: Environment

```bash
cp .env.example .env
```

Edit `.env` with your values. `.env` is ignored by Git; commit only the placeholder values in `.env.example`, never real API keys, passwords, or secrets. Variables prefixed with `NEXT_PUBLIC_` are sent to the browser and must not contain private API keys.

If a real credential was ever committed, changing this file does not remove it from Git history. Rotate that credential before making the repository public.

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/twingface?schema=public"
NEXTAUTH_SECRET="your-secret-here"
NEXTAUTH_URL="http://localhost:3000"
CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"
SUPER_ADMIN_PASSWORD="replace-with-a-unique-strong-password"
MEDIAWORLD_SEED_PASSWORD="replace-with-a-different-strong-password"
```

### Step 3: Database

```bash
npm run db:generate
npm run db:push
```

### Step 4: Seed Users

```bash
npm run db:seed:super-admin
npm run db:seed:mediaworld-users
npm run db:seed:mediaworld-taxonomy
```

### Step 5: Run Dev Server

```bash
npm run dev
```

Open: **http://localhost:3000/login**

---

## 🔐 Login Credentials (৬টি ইউজার)

| Username | Role | Password |
|----------|------|----------|
| `super_admin` | SUPER_ADMIN | `ROBIN087654321robin###` |
| `profile-1` | USER | `ROBIN087654321robin###` |
| `profile-2` | USER | `ROBIN087654321robin###` |
| `profile-3` | USER | `ROBIN087654321robin###` |
| `profile-4` | USER | `ROBIN087654321robin###` |
| `profile-5` | USER | `ROBIN087654321robin###` |

---

## 🎯 What Each User Can Do (প্রত্যেক ইউজার কী করতে পারবে)

- **profile-1 to profile-5**: Regular users. Their MediaProfiles are `PENDING` — they won't show in Find Talent until Super Admin approves them.
- **super_admin**: Super Admin. Login → go to `/mediaworld` → see the **Super Admin Dashboard** with pending approvals → Approve/Reject profiles.

---

## 📁 Seed Script Location

`scripts/seed-mediaworld-users.ts`

You can re-run this anytime with:
```bash
npm run db:seed:mediaworld-users
```

It uses `upsert`, so running it again won't create duplicates — it will just update existing records.

---

## 🛠 Troubleshooting (সমস্যা সমাধান)

### `Cannot find module './4243.js'`

**Cause**: Corrupted `.next-dev` cache (Next.js `distDir` uses `.next-dev`, not `.next`).

**Fix**:
```bash
rm -rf .next-dev
npm run dev
```

### `nul` path error in Turbopack

**Cause**: Windows path resolution issue in globals.css.

**Fix**: Clear `.next-dev` cache and restart:
```bash
rm -rf .next-dev
npm run dev
```

### Prisma schema file lock on Windows

**Cause**: OS-level lock on `prisma/schema.prisma`.

**Fix**: Use `build_schema.js` → `schema.new.prisma` → `mv` workaround, then restart.

---

## 📜 Available Scripts

| Script | Command | Purpose |
|--------|---------|---------|
| `dev` | `next dev` | Start dev server |
| `build` | `next build` | Production build |
| `lint` | `eslint src --max-warnings=0` | Run ESLint |
| `test` | `vitest run` | Run tests |
| `db:generate` | `prisma generate` | Generate Prisma client |
| `db:push` | `prisma db push` | Push schema to DB |
| `db:seed:super-admin` | `node scripts/seed-super-admin.ts` | Seed super admin |
| `db:seed:mediaworld-users` | `node scripts/seed-mediaworld-users.ts` | Seed 6 users |
| `db:seed:mediaworld-taxonomy` | `node scripts/seed-mediaworld-taxonomy.ts` | Seed taxonomy data |

---

## 🔧 Modified Files

| File | Changes |
|------|---------|
| `prisma/schema.prisma` | Extended with rental/industry models (13 models, 6 enums) |
| `src/lib/mediaworld/taxonomy.ts` | Fixed to match actual schema relations |
| `.env` | Added `SUPER_ADMIN_PASSWORD` and `MEDIAWORLD_SEED_PASSWORD` |
| `package.json` | Added `db:seed:mediaworld-users` script |
| `scripts/super-admin-credentials.ts` | Changed super-admin username from `admin` to `super_admin` |
| `README.md` | Complete rewrite with setup guide, credentials, troubleshooting |
