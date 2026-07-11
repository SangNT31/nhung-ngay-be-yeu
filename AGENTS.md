# Repository Guidelines

## Cấu Trúc Dự Án
Đây là album ảnh tĩnh dùng Vinext/React. `app/layout.jsx` khai báo metadata, preconnect và khung HTML chung; `app/page.jsx` render `components/AlbumPage.jsx`, nơi chứa giao diện chính. Logic trình duyệt nằm trong `app.js`: slideshow, tải ảnh Google Drive, bình luận/thả tim qua Firebase và service worker. CSS toàn cục ở `styles.css`. Tệp tĩnh gồm `index.html`, `manifest.webmanifest`, `sw.js`; demo SVG và icon nằm trong `assets/`. Script build nằm trong `scripts/`.

## Lệnh Build, Test & Phát Triển
- `npm ci`: cài dependency đúng theo `package-lock.json`.
- `npm run dev`: copy asset public rồi chạy Vinext local.
- `npm run build`: chuẩn bị asset, build app và copy metadata hosting vào `dist/`.
- `npm start`: chạy bản Vinext đã build.
- `python -m http.server 4173`: xem thử luồng static từ `index.html` theo `README.md`.

## Quy Ước Code & Đặt Tên
Dùng ES modules, dấu chấm phẩy, nháy kép và thụt lề hai khoảng trắng. Component React dùng PascalCase, ví dụ `AlbumPage`; biến và hàm dùng camelCase, ví dụ `loadReactions`. Với `app.js`, giữ phong cách browser-native hiện có, ưu tiên helper nhỏ và tránh thêm framework nếu không cần. Khi sửa text tiếng Việt hiển thị, cập nhật cả `aria-label`, `title` và metadata liên quan.

## Kiểm Thử
Hiện chưa có script test tự động. Trước khi gửi thay đổi, chạy `npm run build` và kiểm tra thủ công trên trình duyệt: play/pause slideshow, nút trước/sau, drawer thư viện, bình luận, thả tim, fullscreen, PWA install nếu khả dụng và thao tác vuốt trên mobile. Nếu thêm test sau này, đặt gần module liên quan và bổ sung `npm test`.

## Commit & Pull Request
Commit gần đây dùng câu ngắn, dạng mệnh lệnh, ví dụ `stream and compress Drive images faster` hoặc `sync comments with Firebase realtime database`. Hãy mô tả thay đổi hành vi, không chỉ tên file. Pull request cần có tóm tắt, ghi chú kiểm thử, issue liên quan nếu có, và ảnh chụp/video ngắn cho thay đổi UI. Nêu rõ thay đổi liên quan đến Drive, Firebase, service worker hoặc cache.

## Bảo Mật & Cấu Hình
`config.js` được gửi tới trình duyệt, nên chỉ đặt cấu hình client public ở đây. Giới hạn Google Drive và Firebase key theo domain/API trong console. Không commit server secret, private key hoặc service account JSON.
