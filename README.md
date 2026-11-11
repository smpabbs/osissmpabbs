# Pemilihan Ketua OSIS — SMP ABBS Surakarta

Bilik suara digital: siswa dan guru masuk dengan akun LMS, memilih kandidat, lalu suara disimpan ke Supabase.

- Jumlah pilihan diatur otomatis oleh server.
- Satu akun hanya bisa mengirim **satu kali**.
- Login memakai akun LMS yang sudah ada (NIS untuk siswa, username untuk guru). Tidak ada akun baru.
- Setelah suara terkirim, layar terima kasih tampil **6 detik** lalu sesi otomatis logout.

## Cara kerja

```
Browser (HTML/CSS/JS statis)
        │
        ▼
/api/osis.js  (Vercel serverless function)
        │
        ├── project LMS  → cek NIS/username, verifikasi password, baca role & sekolah
        └── project suara → simpan suara, cek sudah memilih atau belum
```

Kedua key Supabase hanya ada di server (environment variable). Browser tidak pernah menerima service key.

- Login: project LMS `drlsnhnqxkcgcuskswwx` (schema `public`, RPC `get_email_by_nis` / `get_email_by_username`).
- Suara: project `fsrfvkaqbhfuptsooxiv`, tabel `osis_candidates` dan `osis_votes`.
- Hanya akun **siswa/guru**, **status aktif**, dan **sekolah SMP ABBS Surakarta** yang boleh memilih.

## Struktur

```
index.html            halaman login, bilik suara, terima kasih
styles.css
app.js
api/osis.js           satu endpoint: GET sesi, POST login / vote / logout / pantau
pantau/               halaman panitia: podium + partisipasi per kelas
dev-server.mjs        server lokal (halaman + API sekaligus)
package.json          script npm run dev / npm test
assets/               favicon + 5 foto kandidat + visimisi.txt
supabase/schema.sql   tabel + data kandidat (sudah dijalankan)
tests/osis.test.js
.env.local            key asli untuk lokal — JANGAN di-commit
.env.example          contoh nama environment variable
vercel.json           function di region sin1
```

## Menjalankan lokal

Butuh Node.js 20+.

```bash
npm run dev
```

Buka `http://localhost:3000`. Perintah ini menjalankan halaman statis **dan** `/api/osis` sekaligus, jadi login bisa dites tanpa Vercel CLI.

**Jangan** membuka `index.html` langsung (`file://`) atau memakai Live Server biasa — endpoint `/api/osis` tidak akan jalan dan login menampilkan **"Tidak dapat terhubung ke server."**

Alternatif: `npx vercel dev` (perlu login/link project Vercel).

Tes logika pemilihan:

```bash
npm test
```

## Deploy (GitHub + Vercel)

1. Buat repo GitHub, lalu dari folder ini:

   ```bash
   git init
   git add .
   git commit -m "Pemilihan Ketua OSIS SMP ABBS Surakarta"
   gh repo create osis-smp-abbs --public --source=. --push
   ```

   (Atau buat repo lewat web GitHub lalu `git remote add origin ...` dan `git push`.)

2. Di Vercel: **Add New → Project → import repo**. Framework preset: **Other**. Tidak perlu build command.

3. Tambahkan **Environment Variables** (Production + Preview):

   | Nama | Nilai |
   |---|---|
   | `LMS_SUPABASE_URL` | `https://drlsnhnqxkcgcuskswwx.supabase.co` |
   | `LMS_SUPABASE_ANON_KEY` | anon key project LMS |
   | `LMS_SUPABASE_SERVICE_KEY` | service_role key project LMS (opsional, untuk persentase partisipasi di `/pantau`) |
   | `VOTE_SUPABASE_URL` | `https://fsrfvkaqbhfuptsooxiv.supabase.co` |
   | `VOTE_SUPABASE_SERVICE_KEY` | service_role key project suara |
   | `PANTAU_PASSWORD` | password halaman `/pantau` (opsional, default `osis2627`) |

   Salin nilainya dari `.env.local`. **Jangan** commit `.env.local`.

4. Deploy. Bagikan URL Vercel ke siswa/guru.

`vercel.json` menempatkan function di `sin1` (Singapura) supaya dekat ke Supabase Tokyo (LMS) dan Mumbai (suara).

## Troubleshooting

- **"Tidak dapat terhubung ke server"** → halaman dibuka tanpa server API. Jalankan `npm run dev`, jangan buka `index.html` langsung.
- **"Server belum dikonfigurasi"** → environment variable belum terbaca. Cek `.env.local` saat lokal, atau Environment Variables di Vercel.
- **"NIS atau username tidak ditemukan"** → cek NIS/username akun di LMS; pastikan akun sekolah SMP ABBS dan statusnya aktif.
- **"Password salah"** → gunakan password akun LMS, bukan password lain.
- **"Akun ini bukan warga SMP ABBS Surakarta"** → akun LMS terdaftar di unit/sekolah lain.

## Mengganti data kandidat

Semua data ada di project suara → **Table Editor → `osis_candidates`**. Foto dan visi/misi seluruh kandidat sudah terisi. Nama lengkap kandidat 3: **Fazila Inas Tasnim M.**

Lewat SQL Editor:

```sql
update osis_candidates set
  nama = 'Ahmaddin Haq',
  kelas = '8A',
  foto_url = '/assets/ahmadin.jpeg',
  visi = 'Visi lengkap kandidat.',
  misi = E'Misi pertama — penjelasan misi pertama.\nMisi kedua — penjelasan misi kedua.'
where no_urut = 1;
```

Format `misi`: satu misi per baris. Jika memakai ` — ` (spasi, em dash, spasi), bagian kiri tampil sebagai judul tebal dan bagian kanan sebagai penjelasan.

### Foto

Foto ada di folder `assets/` dengan nama `ahmadin.jpeg`, `faruq.jpeg`, `inas.jpeg`, `kirana.jpeg`, dan `kuni.jpeg`. Untuk mengganti, timpa file dengan nama yang sama, atau simpan nama baru lalu ubah `foto_url` di `osis_candidates`, commit, dan deploy ulang.

Bisa juga memakai Supabase Storage: buat bucket publik, unggah foto, lalu isi `foto_url` dengan URL publik file tersebut.

Bila `foto_url` kosong atau gambar gagal dimuat, kartu menampilkan inisial nama.

## Melihat hasil

Halaman panitia: buka `/pantau` (mis. `https://osissmpabbs.vercel.app/pantau`), lalu masukkan password panitia. Halaman menampilkan podium 5 kandidat, persentase perolehan suara, dan partisipasi pemilih per kelas serta guru. Data diperbarui otomatis setiap 5 detik.

- Password diatur lewat env `PANTAU_PASSWORD`; bila env kosong dipakai `osis2627`.
- Persentase kandidat dihitung dari seluruh suara berbobot: siswa 1 suara, guru 2 suara. Setiap pemilih tetap memilih 1 kandidat. Jumlah persentase seluruh kandidat = 100% dari semua suara.
- Persentase partisipasi per kelas dan guru memerlukan env `LMS_SUPABASE_SERVICE_KEY` (service_role project LMS). Tanpa env itu, halaman tetap menampilkan jumlah suara yang sudah masuk, tetapi total pemilih dan persentasenya tampil "—".
- Halaman ini tidak ditautkan dari bilik suara dan diberi `noindex`. Jangan bagikan URL/password ke siswa.

Rekap langsung di SQL Editor project suara:

```sql
-- Jumlah suara per kandidat (setiap pilihan dihitung)
select c.no_urut, c.nama, count(v.voter_id) as suara
from osis_candidates c
left join osis_votes v on c.no_urut = any(v.candidate_nos)
group by c.no_urut, c.nama
order by c.no_urut;

-- Jumlah pemilih yang sudah mengirim
select voter_role, count(*) as jumlah
from osis_votes
group by voter_role;
```

## Keamanan & aturan

- RLS aktif di `osis_candidates` dan `osis_votes`; `anon`/`authenticated` tidak punya akses langsung. Hanya function server (service role) yang bisa membaca/menulis. **Jangan matikan RLS.**
- `osis_votes.voter_id` adalah primary key → satu akun satu baris. Constraint database memaksa tepat 1 pilihan per akun; bobot suara guru (2) dihitung saat rekap.
- Pilihan tidak ditampilkan di situs. Panitia tetap bisa melihat `voter_id`/nama/NIS di tabel untuk audit dan mencegah double-vote — ini bukan surat suara anonim.
- Server memverifikasi ulang role, sekolah, dan status akun setiap kali vote — bukan hanya mengandalkan data dari browser.
- Cookie sesi berumur 1 jam, `HttpOnly`, `SameSite=Lax`, dan `Secure` di HTTPS. Tombol **Keluar** menghapus sesi; cookie juga dihapus otomatis setelah suara terkirim, dan layar terima kasih kembali ke login setelah 6 detik.
- Siswa/guru yang lupa password harus reset lewat LMS, bukan lewat situs ini.
- Dua token `sbp_...` yang dipakai saat setup **tidak** ada di aplikasi ini. Keduanya hanya dipakai untuk membuat tabel dan mengambil key. Bila tidak dipakai lagi, revoke di Supabase → Account → Access Tokens.

## Mengulang pemilihan (hati-hati)

Hanya untuk uji coba, jangan saat pemilihan berlangsung:

```sql
delete from osis_votes;
```

Setelah itu semua akun bisa memilih lagi.

## Catatan

- Foto dan visi/misi seluruh kandidat sudah terisi.
- Halaman login tidak menampilkan aturan jumlah pilihan. Setelah login, jumlah yang harus dipilih hanya terlihat dari indikator progres di bilik suara.
- Pemilih melihat halaman login secara publik, tetapi hanya akun LMS SMP ABBS yang aktif yang bisa masuk dan memilih.
- Belum ada halaman admin/rekap di situs; rekap diambil lewat SQL di atas.
