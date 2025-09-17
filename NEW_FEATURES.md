# Các Tính Năng Mới Của HiPet

## 1. Global Search (Tìm kiếm toàn cục)

### Tính năng:
- Tìm kiếm thú cưng theo tên, loại, giống
- Gợi ý tìm kiếm thông minh (autocomplete)
- Tìm kiếm người bán
- Lọc theo danh mục

### Sử dụng:
1. Nhập từ khóa vào ô tìm kiếm ở header
2. Chọn gợi ý hoặc nhấn Enter để tìm kiếm
3. Kết quả hiển thị trong phần pets

### API Endpoints:
- `GET /api/search/suggestions?q={query}` - Lấy gợi ý tìm kiếm
- `GET /api/search?q={query}&page={page}&limit={limit}` - Tìm kiếm toàn cục

## 2. Advertisement System (Hệ thống quảng cáo)

### Vị trí quảng cáo:
- **Top Banner**: Phía trên danh sách thú cưng
- **Sidebar**: Bên phải trong phần pets
- **Floating**: Popup nổi (hiện sau 30 giây)
- **Bottom Banner**: Cuối trang

### Tính năng quản lý:
- Dashboard quản lý chiến dịch (`marketing.html`)
- Theo dõi lượt xem và click
- Quản lý ngân sách và thời gian
- Phân tích hiệu quả

### API Endpoints:
- `GET /api/ads/active` - Lấy quảng cáo đang hoạt động
- `POST /api/ads/{id}/impression` - Ghi nhận lượt xem
- `POST /api/ads/{id}/click` - Ghi nhận lượt click

## 3. User Rating System (Hệ thống đánh giá)

### Tính năng:
- Đánh giá người bán từ 1-5 sao
- Hệ thống uy tín dựa trên:
  - Đánh giá trung bình
  - Số lượng giao dịch
  - Xác thực email/phone/CMND
  - Thời gian phản hồi

### Cấp độ uy tín:
- **90-100 điểm**: Siêu uy tín (Premium)
- **75-89 điểm**: Rất uy tín (Verified)
- **60-74 điểm**: Uy tín (Trusted)
- **< 60 điểm**: Mới tham gia (Basic)

### API Endpoints:
- `POST /api/users/{id}/rate` - Đánh giá người dùng
- `GET /api/users/top-sellers` - Lấy top sellers

## 4. Marketing Dashboard

### Truy cập:
- URL: `marketing.html`
- Dành cho advertiser và admin

### Tính năng:
- **Dashboard**: Tổng quan doanh thu và thống kê
- **Campaigns**: Quản lý chiến dịch quảng cáo
- **Ad Spaces**: Quản lý vị trí quảng cáo
- **Advertisers**: Quản lý khách hàng
- **Analytics**: Phân tích chi tiết
- **Billing**: Hóa đơn và thanh toán
- **Settings**: Cài đặt hệ thống

## 5. Database Changes

### Bảng mới:
- `user_ratings`: Lưu đánh giá người dùng
- `advertisements`: Quản lý quảng cáo
- `ad_analytics`: Thống kê quảng cáo

### Cột mới trong users:
- `rating`: Đánh giá trung bình
- `total_ratings`: Tổng số đánh giá
- `total_sales`: Tổng số giao dịch
- `response_time`: Thời gian phản hồi (giờ)
- `phone_verified`: Xác thực phone
- `id_verified`: Xác thực CMND
- `premium`: Tài khoản premium

## 6. Frontend Files

### Files mới:
- `marketing.html`: Dashboard quản lý marketing
- `marketing-styles.css`: Styling cho dashboard
- `marketing-script.js`: JavaScript cho dashboard

### Files cập nhật:
- `index.html`: Thêm global search và ad positions
- `styles.css`: Thêm styling cho search, ads, ratings
- `app.js`: Thêm functionality cho tất cả tính năng mới

## 7. Cách triển khai

### Bước 1: Cập nhật database
```bash
# Chạy script schema.sql để tạo bảng mới
wrangler d1 execute hipet --file=./schema.sql
```

### Bước 2: Deploy backend
```bash
# Deploy worker với API endpoints mới
wrangler publish
```

### Bước 3: Cập nhật frontend
- Upload các file HTML/CSS/JS mới
- Đảm bảo CDN Font Awesome và Chart.js hoạt động

### Bước 4: Test tính năng
1. Kiểm tra global search
2. Tạo quảng cáo test
3. Thử đánh giá người dùng
4. Truy cập marketing dashboard

## 8. Hướng dẫn sử dụng cho Admin

### Quản lý quảng cáo:
1. Truy cập `marketing.html`
2. Tạo campaign mới
3. Upload hình ảnh/video
4. Chọn vị trí và thời gian
5. Theo dõi hiệu quả

### Quản lý người dùng:
1. Xem danh sách top sellers
2. Xác thực tài khoản
3. Quản lý cấp độ premium

## 9. Monitoring và Analytics

### Metrics quan trọng:
- Tỷ lệ click-through rate (CTR) của quảng cáo
- Số lượng tìm kiếm thành công
- Điểm uy tín trung bình của sellers
- Doanh thu từ quảng cáo

### Tools sử dụng:
- Chart.js cho biểu đồ
- Cloudflare Analytics
- Custom tracking trong database

## 10. Future Enhancements

### Có thể mở rộng:
- Machine learning cho gợi ý tìm kiếm
- Real-time bidding cho quảng cáo
- Social features (follow sellers)
- Mobile app integration
- Payment gateway integration
- Advanced analytics với AI insights
