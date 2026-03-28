# RumahQu

RumahQu adalah aplikasi manajemen inventaris rumah tangga berbasis React + TypeScript dengan backend TypeScript/Express dan PostgreSQL.

## Stack

- Frontend: React 18, Vite, Tailwind CSS, shadcn/ui, React Query
- Backend: Express 5, PostgreSQL, cookie session auth, Argon2id
- Shared contracts: `shared/contracts.ts`
- Tests: Vitest, Testing Library, Supertest

## Fitur yang tersedia

- Registrasi, login, logout, bootstrap session, dan update profil
- Personal group otomatis saat user baru mendaftar
- Pembuatan grup baru
- Invite anggota berdasarkan email user yang sudah terdaftar
- Terima/tolak invite
- Daftar anggota per grup dan penghapusan anggota sesuai role
- CRUD inventaris berbasis grup
- Statistik expiry di sisi frontend
- CSRF protection untuk semua mutation yang memakai cookie auth
- Rate limiting untuk endpoint autentikasi

## Setup lokal

1. Install dependency:

```bash
npm install
```

2. Copy environment:

```bash
cp .env.example .env
```

3. Jalankan PostgreSQL lokal via Docker:

```bash
docker compose up -d postgres
```

4. Jalankan migrasi:

```bash
npm run db:migrate
```

5. Jalankan frontend + backend:

```bash
npm run dev
```

Frontend akan tersedia di `http://localhost:8080`, backend di `http://localhost:3001`.

## Deploy ke VPS

Stack deploy production yang disiapkan di repo ini:

- `Dockerfile` untuk build frontend + backend dalam satu image
- `docker-compose.prod.yml` untuk menjalankan app production
- `.env.production.example` sebagai template environment VPS
- `deploy/nginx/rumahqu.conf` sebagai contoh reverse proxy Nginx

### 1. Push ke repository Git

Setelah repo ini terhubung ke remote Anda, push branch yang ingin dideploy:

```bash
git push -u origin main
```

### 2. Clone di VPS

```bash
git clone <repo-anda> rumahqu
cd rumahqu
```

### 3. Siapkan environment production

```bash
cp .env.production.example .env.production
```

Isi minimal value berikut dengan data production Anda:

- `DATABASE_URL`
- `SESSION_SECRET`
- `APP_ORIGIN`

`APP_ORIGIN` harus sama persis dengan domain HTTPS aplikasi Anda, misalnya `https://rumahqu.com`.

Untuk setup production di repo ini, PostgreSQL diasumsikan terpasang native di VPS, bukan lewat Docker Compose. Karena app tetap berjalan di container Docker, `DATABASE_URL` harus mengarah ke host VPS memakai hostname `host.docker.internal`, misalnya:

```env
DATABASE_URL=postgresql://pantrytrack:password-aman@host.docker.internal:5432/pantrytrack
DATABASE_SSL=false
```

Jika Anda memakai PostgreSQL managed yang mewajibkan TLS, set `DATABASE_SSL=true`. Jika sertifikatnya self-signed, Anda juga bisa set `DATABASE_SSL_REJECT_UNAUTHORIZED=false`.

### 4. Siapkan PostgreSQL di VPS

Install PostgreSQL di OS VPS Anda, lalu buat database dan user production. Contoh perintah SQL:

```sql
CREATE USER pantrytrack WITH PASSWORD 'ganti-dengan-password-yang-kuat';
CREATE DATABASE pantrytrack OWNER pantrytrack;
```

Pastikan PostgreSQL menerima koneksi dari host lokal VPS pada port `5432`, karena container app akan connect ke database host melalui `host.docker.internal`.

### 5. Jalankan container production

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
```

App akan listen di `127.0.0.1:3001`, jadi aman untuk diproxy lewat Nginx di VPS.

Saat container start, backend akan otomatis menjalankan migrasi database sebelum menerima request.

### 6. Pasang reverse proxy Nginx

Gunakan contoh config di `deploy/nginx/rumahqu.conf`, lalu arahkan domain ke VPS dan aktifkan HTTPS. Setelah HTTPS aktif, biarkan `COOKIE_SECURE=true`.

### 7. Update saat ada perubahan baru

```bash
git pull
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
```

### Perintah bantu production

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml logs -f app
docker compose --env-file .env.production -f docker-compose.prod.yml ps
```

## Script penting

```bash
npm run dev
npm run dev:web
npm run dev:api
npm run db:migrate
npm run build
npm run build:web
npm run build:api
npm run typecheck
npm run lint
npm run test
```

## Environment variables

### Frontend

- `VITE_API_BASE_URL`: opsional. Jika kosong, frontend otomatis memakai origin yang sama dengan domain aplikasi.

### Backend

- `PORT`: port backend
- `NODE_ENV`: `development`, `test`, atau `production`
- `DATABASE_URL`: koneksi Postgres utama
- `DATABASE_SSL`: aktifkan TLS untuk koneksi Postgres jika database mewajibkannya
- `DATABASE_SSL_REJECT_UNAUTHORIZED`: validasi sertifikat TLS Postgres saat `DATABASE_SSL=true`
- `TEST_DATABASE_URL`: koneksi Postgres untuk integration test API
- `SESSION_SECRET`: secret minimal 32 karakter untuk hashing token session
- `APP_ORIGIN`: origin frontend yang diizinkan oleh CORS
- `COOKIE_SECURE`: `true` di production HTTPS
- `SESSION_TTL_HOURS`: TTL session dalam jam
- `AUTH_RATE_LIMIT_WINDOW_MS`: window rate limit auth
- `AUTH_RATE_LIMIT_MAX`: jumlah request auth maksimum per window

## Struktur utama

```text
shared/
  contracts.ts
server/
  src/
    app.ts
    config.ts
    db/
      migrations/
  tests/
src/
  contexts/
  components/
  pages/
  lib/api/
```

## API utama

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `PATCH /api/me`
- `GET /api/groups`
- `POST /api/groups`
- `GET /api/groups/:groupId/members`
- `POST /api/groups/:groupId/invites`
- `POST /api/invites/:inviteId/accept`
- `POST /api/invites/:inviteId/decline`
- `DELETE /api/groups/:groupId/members/:userId`
- `GET /api/inventory?groupId=...`
- `POST /api/inventory`
- `PATCH /api/inventory/:itemId`
- `DELETE /api/inventory/:itemId`
- `GET /api/health`

## Backup dan restore Postgres

Backup:

```bash
pg_dump "%DATABASE_URL%" > rumahqu-backup.sql
```

Restore:

```bash
psql "%DATABASE_URL%" -f rumahqu-backup.sql
```

Di PowerShell Anda juga bisa memakai:

```powershell
$env:DATABASE_URL="postgresql://pantrytrack:pantrytrack@localhost:5432/pantrytrack"
pg_dump $env:DATABASE_URL > rumahqu-backup.sql
psql $env:DATABASE_URL -f rumahqu-backup.sql
```

## Catatan testing

- Frontend tests berjalan lewat `npm run test`.
- API integration tests diaktifkan jika `TEST_DATABASE_URL` tersedia dan database test dapat diakses.
- Endpoint backend otomatis menjalankan migrasi saat server start.
