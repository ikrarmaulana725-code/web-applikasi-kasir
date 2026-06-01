# Qasir Modern

Qasir Modern sekarang sudah dipindahkan ke stack backend:

- Next.js App Router
- Prisma ORM
- PostgreSQL
- Auth custom dengan password `bcrypt` dan session JWT di cookie `httpOnly`

Versi HTML/CSS/JS lama tetap ada di root sebagai referensi awal, tetapi aplikasi utama sekarang berjalan dari Next.js.

## Setup

1. Salin atau sesuaikan `.env`.

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/qasir_modern?schema=public"
AUTH_SECRET="ganti-dengan-random-secret-minimal-32-karakter"
```

2. Jalankan PostgreSQL.

Jika ada Docker:

```bash
docker compose up -d
```

Jika tidak ada Docker, buat database PostgreSQL bernama `qasir_modern`, lalu sesuaikan `DATABASE_URL`.

3. Install dependency.

```bash
npm install
```

4. Buat tabel dan isi data demo.

```bash
npm run prisma:migrate -- --name init
npm run prisma:seed
```

5. Jalankan aplikasi.

```bash
npm run dev
```

Buka `http://localhost:3000`.

## Akun Demo

| Role | Username | Password |
| --- | --- | --- |
| Owner | owner | 123456 |
| Admin | admin | 123456 |
| Kasir | kasir | 123456 |
| Staff Gudang | gudang | 123456 |

## Fitur Backend

- Login aman dengan hash password.
- Session tersimpan di cookie `httpOnly`.
- Role access untuk owner, admin, kasir, dan gudang.
- CRUD produk dan kategori.
- POS checkout via API backend.
- Transaksi database atomic: validasi stok, simpan invoice, simpan item, simpan pembayaran, kurangi stok, catat stock movement.
- Refund owner/admin dengan pengembalian stok otomatis.
- Stok masuk, stok keluar, penyesuaian stok.
- Laporan omzet, modal, laba kotor.
- Pengaturan toko dan struk.

## Verifikasi

Perintah yang sudah lolos:

```bash
npm run build
npx prisma validate
npm run prisma:generate
```

Migrasi dan seed membutuhkan PostgreSQL aktif. Di mesin ini Docker/PostgreSQL belum tersedia, jadi langkah database belum dijalankan langsung.

## Versi Android

Versi Android tersedia di folder `android-app`.

```bash
cd android-app
npm.cmd install
npm.cmd run build
npm.cmd run cap:sync
```

Untuk membuka project native:

```bash
npm.cmd run android
```

Catatan koneksi:

- Emulator Android memakai `VITE_API_BASE_URL=http://10.0.2.2:3000`.
- HP fisik harus memakai IP komputer, misalnya `http://192.168.1.10:3000`.
- Backend sudah mendukung Bearer token untuk aplikasi Android dan cookie `httpOnly` untuk web.
