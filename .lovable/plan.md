# Login Manual dengan Verifikasi OTP

## Perubahan
- Kolom email selalu kosong saat halaman login dibuka dan tidak diisi otomatis oleh aplikasi.
- Login tahap pertama memakai email dan kata sandi yang diketik pengguna.
- Setelah kata sandi benar, kirim kode OTP ke email tersebut dan tampilkan kolom kode OTP.
- Akses aplikasi diberikan hanya setelah OTP berhasil diverifikasi.
- Tetap batasi seluruh akses hanya untuk `ahmadarifrinaldi@gmail.com`; email lain langsung ditolak.
- Pertahankan opsi aktivasi akun pertama kali dengan email dan kata sandi manual.
- Hapus tombol Kunci dan layar kunci aplikasi dari halaman utama; login akun tetap menjadi pengaman utama.

## Validasi
- Pastikan halaman awal menampilkan kolom email kosong.
- Pastikan email yang salah ditolak sebelum proses login.
- Pastikan login yang benar berpindah ke tahap OTP dan verifikasi berhasil membuka aplikasi.
- Pastikan tombol dan layar kunci aplikasi sudah tidak tampil.
