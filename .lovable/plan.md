# Login Aman untuk Reporting CC 3

## Tujuan
Memulihkan tampilan semua data ticket secara aman: hanya pengguna yang sudah masuk dapat membuka dashboard, daftar ticket, dan Daily Activity.

## Yang akan dibuat
- Halaman masuk dengan email/kata sandi dan Google.
- Pendaftaran akun tim dengan konfirmasi email.
- Lupa kata sandi dan halaman untuk membuat kata sandi baru.
- Perlindungan untuk Dashboard, Daftar Ticket, dan Daily Activity; pengguna yang belum masuk diarahkan ke halaman masuk.
- Tombol keluar yang membersihkan data tersimpan di perangkat sebelum kembali ke halaman masuk.
- Navigasi setelah masuk diarahkan ke Dashboard.

## Akses data
- Data profil tambahan tidak dibuat, sesuai pilihan Anda.
- Aturan database tetap membatasi pembacaan ticket kepada pengguna yang sudah masuk.
- Akun yang masuk dapat melihat seluruh data ticket yang tersedia bagi tim.

## Detail teknis
- Gunakan autentikasi Lovable Cloud dengan sesi aman.
- Pindahkan tiga halaman operasional ke area yang dilindungi tanpa mengubah alamat `/tickets` dan `/daily-activity`; dashboard menjadi `/dashboard`.
- Halaman `/` mengarahkan pengguna ke halaman masuk atau dashboard sesuai sesi.
- Tambahkan sinkronisasi status masuk/keluar agar data langsung dimuat setelah login.
- Pastikan setiap halaman memiliki metadata unik dan periksa alur masuk, keluar, serta pemuatan ticket.
