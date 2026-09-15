# Rollback Permanen dan Form Tambah Activity

## Perubahan
- Tambahkan tombol **Hapus permanen** pada setiap data di Rollback Ticket dan Rollback Daily Activity.
- Tampilkan konfirmasi sebelum penghapusan permanen agar data tidak terhapus tanpa sengaja.
- Setelah berhasil dihapus, perbarui jumlah badge dan daftar rollback secara otomatis.
- Ubah tombol **Tambah Activity** agar membuka pop-up formulir, bukan langsung membuat baris kosong.
- Susun 15 isian formulir sesuai urutan kolom: Date, On Duty, Shift, Category, Source Information, To Do, Product, Customer, Nama Lokasi, Kontak PIC, RFO General, Type Modem & SN KIT, Problem, Action, Status.
- Gunakan pilihan dropdown yang sama dengan tabel untuk kolom yang sudah memiliki daftar pilihan.
- Simpan activity hanya setelah pengguna menekan tombol simpan; activity baru tetap muncul di baris paling bawah.

## Detail Teknis
- Penghapusan permanen menggunakan operasi delete pada data yang sudah memiliki tanda terhapus.
- Aksi hapus permanen tetap hanya tersedia untuk super user, mengikuti aturan akses yang sudah ada.
- Konfirmasi dibuat terpisah untuk satu tiket/activity yang dipilih agar tidak salah menghapus data lain.
- Form menggunakan komponen dialog dan kontrol input yang sudah dipakai aplikasi agar tampilannya konsisten.

## Verifikasi
- Uji buka rollback tiket dan activity, batalkan serta setujui hapus permanen.
- Uji formulir tambah activity, seluruh urutan isian, penyimpanan, dan posisi data baru.
- Pastikan tampilan user biasa tetap tidak memiliki akses hapus dan rollback.