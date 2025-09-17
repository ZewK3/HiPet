# HiPet Backend - Cloudflare Workers

Backend cho nền tảng mua bán thú cưng HiPet, được phát triển với Cloudflare Workers.

## Tính năng

- **Xác thực người dùng**: Đăng ký, đăng nhập, phân quyền (user, admin, support)
- **Quản lý thú cưng**: CRUD thú cưng với filter và search
- **Ví điện tử**: Nạp tiền, rút tiền, lịch sử giao dịch
- **Chat**: Tin nhắn giữa người mua và người bán
- **API RESTful**: Đầy đủ endpoints cho frontend

## API Endpoints

### Authentication
- `POST /api/auth/register` - Đăng ký tài khoản
- `POST /api/auth/login` - Đăng nhập
- `GET /api/auth/verify` - Xác thực token

### Pets
- `GET /api/pets` - Lấy danh sách thú cưng
- `POST /api/pets` - Đăng tin bán thú cưng
- `GET /api/pets/:id` - Lấy thông tin thú cưng
- `PUT /api/pets/:id` - Cập nhật thông tin thú cưng
- `DELETE /api/pets/:id` - Xóa tin bán thú cưng

### Wallet
- `GET /api/wallet/transactions` - Lịch sử giao dịch
- `POST /api/wallet/deposit` - Nạp tiền
- `POST /api/wallet/withdraw` - Rút tiền

### Chat
- `GET /api/chat/messages` - Lấy tin nhắn
- `POST /api/chat/messages` - Gửi tin nhắn

### Users (Admin only)
- `GET /api/users` - Lấy danh sách người dùng
- `GET /api/users/:id` - Lấy thông tin người dùng
- `PUT /api/users/:id` - Cập nhật thông tin người dùng

## Triển khai

### Yêu cầu
- Node.js (v16 trở lên)
- Tài khoản Cloudflare
- Wrangler CLI

### Cài đặt Wrangler
```bash
npm install -g wrangler
```

### Xác thực Cloudflare
```bash
wrangler login
```

### Triển khai lên Cloudflare Workers

1. **Cập nhật cấu hình**:
   Chỉnh sửa file `wrangler.toml` với thông tin của bạn.

2. **Triển khai**:
   ```bash
   cd backend
   wrangler publish
   ```

3. **Xem logs**:
   ```bash
   wrangler tail
   ```

### Cấu hình môi trường Production

1. **Thiết lập KV Storage** (cho data persistence):
   ```bash
   wrangler kv:namespace create "HIPET_DATA"
   wrangler kv:namespace create "HIPET_DATA" --preview
   ```

2. **Thiết lập R2 Storage** (cho file upload):
   ```bash
   wrangler r2 bucket create hipet-files
   ```

3. **Thiết lập Secrets**:
   ```bash
   wrangler secret put JWT_SECRET
   wrangler secret put DATABASE_URL
   ```

### Cấu hình Database (Tùy chọn)

Để sử dụng database thay vì lưu trữ trong memory:

1. **D1 Database** (Cloudflare):
   ```bash
   wrangler d1 create hipet-db
   wrangler d1 execute hipet-db --file=./schema.sql
   ```

2. **External Database**:
   Cập nhật connection string trong environment variables.

## Development

### Local Development
```bash
wrangler dev
```

### Testing
```bash
npm test
```

### Environment Variables

- `JWT_SECRET`: Secret key cho JWT tokens
- `API_VERSION`: Phiên bản API
- `DATABASE_URL`: Connection string cho database (tùy chọn)

## Security Features

- CORS headers được cấu hình đúng
- JWT token authentication
- Role-based access control
- Input validation và sanitization
- Rate limiting (có thể thêm)

## Monitoring

- Sử dụng Cloudflare Analytics để theo dõi performance
- Error logging với `console.error`
- Health check endpoint có thể thêm

## Scaling

- Cloudflare Workers tự động scale
- Có thể thêm caching với Cache API
- Rate limiting với Durable Objects

## Lưu ý

- Hiện tại sử dụng in-memory storage, thích hợp cho demo
- Cho production, nên sử dụng KV/D1/external database
- Passwords nên được hash (bcrypt, scrypt)
- Implement rate limiting cho production
- Thêm input validation và sanitization chi tiết hơn
