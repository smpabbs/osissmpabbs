-- Skema Pemilihan Ketua OSIS SMP ABBS Surakarta
-- Jalankan di project Supabase tempat suara disimpan (project kedua).
-- Tabel diberi prefix osis_ agar tidak bentrok dengan tabel yang sudah ada.

create table if not exists public.osis_candidates (
  no_urut    integer primary key,
  nama       text not null,
  kelas      text,
  foto_url   text,
  visi       text not null default '',
  misi       text not null default '',
  aktif      boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.osis_votes (
  voter_id      uuid primary key,
  voter_nama    text not null,
  voter_role    text not null check (voter_role in ('siswa','guru')),
  voter_nis     text,
  voter_kelas   text,
  candidate_nos integer[] not null,
  created_at    timestamptz not null default now(),
  constraint osis_votes_jumlah_suara check (cardinality(candidate_nos) = 1)
);

alter table public.osis_candidates enable row level security;
alter table public.osis_votes enable row level security;
revoke all on public.osis_candidates, public.osis_votes from anon, authenticated;

-- Data kandidat.
insert into public.osis_candidates (no_urut, nama, kelas, foto_url, visi, misi) values
  (1, 'Ahmaddin Haq', null, '/assets/ahmadin.jpeg',
   'Terwujudnya peserta didik yang berkarakter mulia, berprestasi, kreatif, inovatif, disiplin, mandiri, serta memiliki kepedulian dan tanggung jawab terhadap lingkungan.',
   $misi$Menciptakan Lingkungan Sekolah yang Bersih, Rapi, dan Nyaman — Menumbuhkan kesadaran seluruh siswa untuk menjaga kebersihan dan kerapian lingkungan sekolah melalui aksi nyata serta program peduli lingkungan yang berkelanjutan.
Mengoptimalkan OSIS sebagai Wadah Aspirasi dan Sumber Inspirasi — Menjadikan OSIS sebagai jembatan yang aktif, terbuka, dan tepercaya dalam menampung serta menyalurkan ide, harapan, dan saran dari seluruh siswa demi kemajuan sekolah.
Membangun Tata Kelola Organisasi OSIS yang Sehat dan Bertanggung Jawab — Membentuk karakter pengurus OSIS yang solid, berintegritas, transparan, serta bertanggung jawab penuh dalam menjalankan setiap program kerja.
Mendukung Pengembangan Minat, Bakat, dan Potensi Siswa — Mendorong pembentukan wadah, klub, atau tim di berbagai bidang (akademik, olahraga, seni, musik, hingga teknologi) yang didukung penuh oleh fasilitas sekolah untuk menyalurkan potensi siswa.
Meningkatkan Kreativitas dan Partisipasi Aktif Siswa — Mengadakan berbagai kegiatan positif, inovatif, dan menarik guna memberikan ruang bagi siswa untuk berkarya, berprestasi, mengasah kemampuan, serta mempererat kerja sama antarsiswa.$misi$),
  (2, 'Ammar Sakhi Al Faruq', null, '/assets/faruq.jpeg',
   'Mewujudkan lingkungan sekolah yang aman, nyaman, dan adil bagi seluruh murid, dengan komunikasi yang terbuka antara siswa, guru, dan OSIS.',
   $misi$Menjamin keamanan dan kenyamanan seluruh murid di lingkungan sekolah.
Mendorong terciptanya budaya saling menghormati antar siswa, guru, dan seluruh warga sekolah.
Mendorong komunikasi terbuka antara siswa, guru, dan OSIS.
Menjalankan program dengan prinsip berpikir matang dulu, kemudian bertindak.$misi$),
  (3, 'Fazila Inas Tasnim M.', null, '/assets/inas.jpeg',
   'Mewujudkan OSIS SMP ABBS Surakarta sebagai organisasi yang terbuka dalam mendengarkan suara siswa dan mendukung penuh pengembangan minat serta bakat siswa, seperti membaca, menulis, olahraga, seni, dan lainnya.',
   $misi$Kotak Aspirasi — Ide bisa disampaikan anonim.
Forum Dengar Pendapat — Sebulan sekali.
Pengembangan Ekskul.
Classmeet sesuai bakat.$misi$),
  (4, 'Kirana Ramadhania Larasati', null, '/assets/kirana.jpeg',
   'Menjadikan OSIS sebagai wadah yang aktif, kreatif, dan aspiratif untuk menciptakan lingkungan sekolah yang nyaman, positif, serta mendorong setiap siswa berani berkembang dan berkontribusi.',
   $misi$Mendorong siswa untuk berani menyampaikan ide, pendapat, dan aspirasi.
Mengembangkan kegiatan sekolah yang kreatif, menarik, dan bermanfaat bagi siswa.
Membangun kerja sama yang baik antara OSIS, siswa, dan pihak sekolah.
Menciptakan lingkungan sekolah yang positif, nyaman, dan saling menghargai.
Menjadikan OSIS sebagai organisasi yang bertanggung jawab, terbuka, dan mau mendengarkan siswa.$misi$),
  (5, 'Kuni Rafa Saira', null, '/assets/kuni.jpeg',
   'Mewujudkan OSIS yang aktif, inovatif, harmonis, dan berdampak nyata melalui pengembangan potensi siswa, penguatan karakter, serta kolaborasi berkelanjutan di dalam maupun di luar sekolah.',
   $misi$Keagamaan dan Karakter — Mengoptimalkan kegiatan keagamaan untuk menumbuhkan keimanan, kedisiplinan, dan karakter positif siswa.
Internal Organisasi — Membangun kepengurusan OSIS yang solid, bertanggung jawab, komunikatif, dan suportif serta mengembangkan potensi setiap anggotanya.
Inovasi dan Potensi Siswa — Menghadirkan program kreatif, inovatif, dan berkelanjutan sebagai wadah pengembangan bakat serta kreativitas seluruh siswa.
Aspirasi Siswa — Membangun OSIS yang terbuka terhadap ide, kritik, dan aspirasi siswa melalui evaluasi serta tindak lanjut.
Kolaborasi Eksternal — Memperluas kontribusi dan citra positif sekolah melalui kolaborasi dengan pihak luar yang bermanfaat bagi masyarakat.$misi$)
on conflict (no_urut) do nothing;
