# Du lieu test loyalty

Chay trong `backend`: `npm run seed:loyalty` de xem truoc, them `-- --apply` de ghi vao database dang cau hinh. Script dung transaction, khong ghi de tai khoan cu; chay lai khi email test da ton tai se dung. Mat khau ngau nhien duoc in sau khi commit, hoac truyen `LOYALTY_TEST_PASSWORD`.

Tat ca tai khoan co role user, email `loyalty.<case>@example.test`, ten bat dau `[TEST LOYALTY]`. Ma chuong trinh va don bat dau `TESTLOYALTYV1`.

| Case | Truong hop |
| --- | --- |
| new | Member, 0 diem, vi va lich su rong, khong du diem doi |
| near-vip | Chi tieu 2.999.999, con 1 dong len VIP, 299 diem |
| vip | Dung moc 3 trieu, 250 diem, 15 log de test phan trang va bo loc |
| near-vvip | Chi tieu 9.999.999, con 1 dong len VVIP, 999 diem |
| vvip | Dung moc 10 trieu, 1.000 diem, hang cao nhat |
| debt | Dieu chinh diem thu cong, so du -50, diem kha dung 0, can bu 50 |
| review | 100 diem, chua doi soat, khong duoc doi thuong |

Vi VIP co voucher giam co dinh, phan tram, bap nuoc, gioi han hang, da dung, het han, tam ngung, chua bat dau va chuong trinh xoa mem. Danh muc doi thuong co nhieu gia diem va mot muc het so luong. Thu voucher VIP bang tai khoan new de kiem tra sai chu so huu. Dieu kien don toi thieu la 100.000 dong.

Script khong bat `LOYALTY_REDEMPTION_ENABLED`, khong doi du lieu hay diem cua user cu. Khi flag dang false, UI doi thuong bi khoa dung theo cau hinh. Chi bat flag tren moi truong test sau khi da kiem tra dieu kien trien khai.

Don la fixture mo phong, tham chieu suat chieu co san nhung khong giu ghe, khong tao ve va khong goi cong thanh toan. Du lieu nay test UI/so du/trang thai, KHONG thay the test thanh toan thuc te. Don test co the xuat hien trong thong ke admin; phan thuong test co the hien trong danh muc chung, nhung ma mau la personal_only. Chi dung trong database phat trien. Du lieu da seed tu phien ban cu khong bi script sua lai.

Han voucher tinh theo thoi diem chay script (+30 ngay, -1 ngay voi het han, +7 ngay voi chua bat dau). Khong tu dong gia han hay reset du lieu da test.
