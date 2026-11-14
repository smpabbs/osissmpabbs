window.MOCK_CANDIDATES = [
  {
    no: 1,
    nama: 'Ahmaddin Haq',
    foto: '../assets/ahmadin.jpeg',
    visi: 'Terwujudnya peserta didik yang berkarakter mulia, berprestasi, kreatif, inovatif, disiplin, mandiri, serta memiliki kepedulian dan tanggung jawab terhadap lingkungan.',
    misi: [
      'Menciptakan Lingkungan Sekolah yang Bersih, Rapi, dan Nyaman — Menumbuhkan kesadaran seluruh siswa untuk menjaga kebersihan dan kerapian lingkungan sekolah melalui aksi nyata serta program peduli lingkungan yang berkelanjutan.',
      'Mengoptimalkan OSIS sebagai Wadah Aspirasi dan Sumber Inspirasi — Menjadikan OSIS sebagai jembatan yang aktif, terbuka, dan tepercaya dalam menampung serta menyalurkan ide, harapan, dan saran dari seluruh siswa demi kemajuan sekolah.',
      'Membangun Tata Kelola Organisasi OSIS yang Sehat dan Bertanggung Jawab — Membentuk karakter pengurus OSIS yang solid, berintegritas, transparan, serta bertanggung jawab penuh dalam menjalankan setiap program kerja.',
      'Mendukung Pengembangan Minat, Bakat, dan Potensi Siswa — Mendorong pembentukan wadah, klub, atau tim di berbagai bidang (akademik, olahraga, seni, musik, hingga teknologi) yang didukung penuh oleh fasilitas sekolah untuk menyalurkan potensi siswa.',
      'Meningkatkan Kreativitas dan Partisipasi Aktif Siswa — Mengadakan berbagai kegiatan positif, inovatif, dan menarik guna memberikan ruang bagi siswa untuk berkarya, berprestasi, mengasah kemampuan, serta mempererat kerja sama antarsiswa.',
    ],
  },
  {
    no: 2,
    nama: 'Ammar Sakhi Al Faruq',
    foto: '../assets/faruq.jpeg',
    visi: 'Mewujudkan lingkungan sekolah yang aman, nyaman, dan adil bagi seluruh murid, dengan komunikasi yang terbuka antara siswa, guru, dan OSIS.',
    misi: [
      'Menjamin keamanan dan kenyamanan seluruh murid di lingkungan sekolah.',
      'Mendorong terciptanya budaya saling menghormati antar siswa, guru, dan seluruh warga sekolah.',
      'Mendorong komunikasi terbuka antara siswa, guru, dan OSIS.',
      'Menjalankan program dengan prinsip berpikir matang dulu, kemudian bertindak.',
    ],
  },
  {
    no: 3,
    nama: 'Fazila Inas Tasnim M.',
    foto: '../assets/inas.jpeg',
    visi: 'Mewujudkan OSIS SMP ABBS Surakarta sebagai organisasi yang terbuka dalam mendengarkan suara siswa dan mendukung penuh pengembangan minat serta bakat siswa, seperti membaca, menulis, olahraga, seni, dan lainnya.',
    misi: [
      'Kotak Aspirasi — Ide bisa disampaikan anonim.',
      'Forum Dengar Pendapat — Sebulan sekali.',
      'Pengembangan Ekskul.',
      'Classmeet sesuai bakat.',
    ],
  },
  {
    no: 4,
    nama: 'Kirana Ramadhania Larasati',
    foto: '../assets/kirana.jpeg',
    visi: 'Menjadikan OSIS sebagai wadah yang aktif, kreatif, dan aspiratif untuk menciptakan lingkungan sekolah yang nyaman, positif, serta mendorong setiap siswa berani berkembang dan berkontribusi.',
    misi: [
      'Mendorong siswa untuk berani menyampaikan ide, pendapat, dan aspirasi.',
      'Mengembangkan kegiatan sekolah yang kreatif, menarik, dan bermanfaat bagi siswa.',
      'Membangun kerja sama yang baik antara OSIS, siswa, dan pihak sekolah.',
      'Menciptakan lingkungan sekolah yang positif, nyaman, dan saling menghargai.',
      'Menjadikan OSIS sebagai organisasi yang bertanggung jawab, terbuka, dan mau mendengarkan siswa.',
    ],
  },
  {
    no: 5,
    nama: 'Kuni Rafa Saira',
    foto: '../assets/kuni.jpeg',
    visi: 'Mewujudkan OSIS yang aktif, inovatif, harmonis, dan berdampak nyata melalui pengembangan potensi siswa, penguatan karakter, serta kolaborasi berkelanjutan di dalam maupun di luar sekolah.',
    misi: [
      'Keagamaan dan Karakter — Mengoptimalkan kegiatan keagamaan untuk menumbuhkan keimanan, kedisiplinan, dan karakter positif siswa.',
      'Internal Organisasi — Membangun kepengurusan OSIS yang solid, bertanggung jawab, komunikatif, dan suportif serta mengembangkan potensi setiap anggotanya.',
      'Inovasi dan Potensi Siswa — Menghadirkan program kreatif, inovatif, dan berkelanjutan sebagai wadah pengembangan bakat serta kreativitas seluruh siswa.',
      'Aspirasi Siswa — Membangun OSIS yang terbuka terhadap ide, kritik, dan aspirasi siswa melalui evaluasi serta tindak lanjut.',
      'Kolaborasi Eksternal — Memperluas kontribusi dan citra positif sekolah melalui kolaborasi dengan pihak luar yang bermanfaat bagi masyarakat.',
    ],
  },
];

window.mockMissionParts = function (item) {
  const separator = ' — ';
  const index = item.indexOf(separator);
  if (index > -1) return [item.slice(0, index), item.slice(index + separator.length)];
  return [null, item];
};

window.mockMissionList = function (items) {
  const list = document.createElement('ul');
  list.className = 'misi-list';
  for (const item of items) {
    const [title, text] = window.mockMissionParts(item);
    const li = document.createElement('li');
    if (title) {
      const strong = document.createElement('strong');
      strong.textContent = title;
      const desc = document.createElement('span');
      desc.className = 'desc';
      desc.textContent = text;
      li.append(strong, desc);
    } else {
      const span = document.createElement('span');
      span.className = 'text';
      span.textContent = text;
      li.appendChild(span);
    }
    list.appendChild(li);
  }
  return list;
};
