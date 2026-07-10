# Album ảnh Google Drive

Web slideshow tĩnh, mobile-first, không framework và không cần backend. Ảnh chỉ được đọc từ thư mục Google Drive bạn cấu hình.

## Kết nối Google Drive

1. Tạo một thư mục trên Drive và đưa ảnh vào đó.
2. Chọn **Chia sẻ → Quyền truy cập chung → Bất kỳ ai có đường liên kết → Người xem**.
3. Trong [Google Cloud Console](https://console.cloud.google.com/), tạo/chọn project và bật **Google Drive API**.
4. Tạo API key ở **APIs & Services → Credentials**. Nên giới hạn key theo website (HTTP referrer) và chỉ cho phép Google Drive API.
5. Lấy ID thư mục trong URL: `drive.google.com/drive/folders/ID_THU_MUC`.
6. Điền `googleDriveApiKey` và `googleDriveFolderId` trong `config.js`.

> Lưu ý riêng tư: chế độ này yêu cầu thư mục có thể xem bằng đường liên kết. Nếu muốn album hoàn toàn riêng tư, cần bổ sung đăng nhập Google OAuth và một backend/proxy; không nên đặt client secret trong trình duyệt.

Ảnh được tự động tải qua thumbnail CDN của Google theo kích thước màn hình (tối đa `maxImageWidth`, mặc định 1600px) để giảm dung lượng. Có thể hạ giá trị này trong `config.js` nếu ưu tiên tốc độ hơn độ phân giải. Service Worker cache tối đa 60 ảnh đã xem và dùng lại ngay trong các lần mở sau; danh sách Drive vẫn luôn gọi mạng để ảnh mới xuất hiện kịp thời.

## Chạy thử

Không mở trực tiếp bằng `file://`. Chạy một static server, ví dụ:

```powershell
python -m http.server 4173
```

Sau đó mở `http://localhost:4173`. Có thể deploy nguyên thư mục lên Netlify, Cloudflare Pages, Vercel hoặc GitHub Pages.

## Triển khai miễn phí bằng GitHub Pages

Dự án đã có workflow `.github/workflows/deploy-pages.yml`. Khi mã nguồn được đẩy lên nhánh `main`, GitHub Actions sẽ tự xuất bản website. Trong repository, mở **Settings → Pages → Build and deployment → Source**, chọn **GitHub Actions**. URL mặc định có dạng `https://ten-tai-khoan.github.io/ten-repository/`.

## Trải nghiệm có sẵn

- Tự động trình chiếu, tạm dừng/tiếp tục, toàn màn hình.
- Vuốt trái/phải trên điện thoại; phím mũi tên và Space trên desktop.
- Ảnh mới tải lên Google Drive được hiển thị trước tiên.
- Thả tim và bình luận riêng cho từng ảnh; dữ liệu được lưu trên trình duyệt hiện tại.
- Chỉ tải ảnh hiện tại và preload một ảnh tiếp theo.
- Tạm dừng tải nền khi tab bị ẩn; hỗ trợ `prefers-reduced-motion`.

## Lưu ý về tim và bình luận

Phiên bản tĩnh lưu tương tác bằng `localStorage`, vì vậy tim/bình luận chỉ xuất hiện trên đúng trình duyệt đã tạo chúng. Để nhiều thành viên trong gia đình thấy cùng dữ liệu trên các thiết bị khác nhau, cần kết nối thêm một backend như Firebase, Supabase hoặc API riêng.
