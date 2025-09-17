# 🚀 HiPet Backend - Cloudflare Workers Deploy Guide

## 📋 Hướng dẫn Deploy lên Cloudflare Workers

### 1️⃣ **File sẵn sàng deploy:**
- `worker-clean.js` - File worker chính (production ready)
- `wrangler.toml` - File cấu hình Cloudflare Workers
- `schema.sql` - Database schema

### 2️⃣ **Chuẩn bị trên Cloudflare Dashboard:**

#### **A. Tạo D1 Database:**
```bash
# Tạo database
npx wrangler d1 create hipet-db

# Lấy database ID từ output và cập nhật vào wrangler.toml
```

#### **B. Tạo R2 Bucket:**
```bash
# Tạo R2 bucket
npx wrangler r2 bucket create hipet-files
```

#### **C. Tạo KV Namespace:**
```bash
# Tạo KV namespace cho cache
npx wrangler kv:namespace create "CACHE"
npx wrangler kv:namespace create "CACHE" --preview
```

### 3️⃣ **Cập nhật wrangler.toml:**

```toml
name = "hipet-backend"
main = "worker-clean.js"  # ⚠️ Đổi từ worker.js thành worker-clean.js
compatibility_date = "2023-12-01"

[[d1_databases]]
binding = "DB"
database_name = "hipet-db"
database_id = "YOUR_DATABASE_ID_HERE"  # ⚠️ Thay bằng ID thực

[[r2_buckets]]
binding = "BUCKET"
bucket_name = "hipet-files"

[[kv_namespaces]]
binding = "CACHE"
id = "YOUR_KV_ID_HERE"          # ⚠️ Thay bằng ID thực
preview_id = "YOUR_PREVIEW_ID"  # ⚠️ Thay bằng preview ID thực

[vars]
JWT_SECRET = "your-super-secret-jwt-key-here"  # ⚠️ Đổi thành secret key thật
```

### 4️⃣ **Setup Database:**

```bash
# Import schema vào D1 database
npx wrangler d1 execute hipet-db --file=./schema.sql

# Hoặc dùng remote command
npx wrangler d1 execute hipet-db --remote --file=./schema.sql
```

### 5️⃣ **Deploy Worker:**

```bash
# Deploy lên staging
npx wrangler deploy --env staging

# Deploy lên production  
npx wrangler deploy --env production
```

### 6️⃣ **Cấu hình Custom Domain (Optional):**

1. Vào Cloudflare Dashboard > Workers & Pages
2. Chọn worker `hipet-backend`  
3. Vào tab "Settings" > "Triggers"
4. Thêm Custom Domain: `api.yourdomain.com`

### 7️⃣ **Environment Variables/Secrets:**

```bash
# Set JWT secret (production)
npx wrangler secret put JWT_SECRET

# Set R2 domain (if using custom domain)
npx wrangler secret put R2_DOMAIN
```

### 8️⃣ **Test API Endpoints:**

```bash
# Test authentication
curl -X POST https://hipet-backend.your-subdomain.workers.dev/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'

# Test pets listing
curl https://hipet-backend.your-subdomain.workers.dev/api/pets
```

---

## 🔧 **Troubleshooting:**

### **Lỗi thường gặp:**

1. **"Module not found"** → Đảm bảo `main = "worker-clean.js"` trong wrangler.toml

2. **"DB is not defined"** → Kiểm tra D1 database binding trong wrangler.toml

3. **"BUCKET is not defined"** → Kiểm tra R2 bucket binding

4. **"CORS errors"** → Đã có CORS headers trong worker-clean.js

5. **"JWT errors"** → Đặt JWT_SECRET trong environment variables

### **Kiểm tra logs:**

```bash
# Xem logs real-time
npx wrangler tail

# Xem logs với filter
npx wrangler tail --grep "error"
```

---

## ✅ **Verification Checklist:**

- [ ] D1 Database created và schema imported
- [ ] R2 Bucket created  
- [ ] KV Namespace created
- [ ] wrangler.toml cập nhật đúng IDs
- [ ] JWT_SECRET được set
- [ ] worker-clean.js deploy thành công
- [ ] API endpoints hoạt động
- [ ] CORS headers working
- [ ] File upload to R2 working

---

## 🎯 **API Endpoints Available:**

### **Authentication:**
- `POST /api/auth/register` - Đăng ký
- `POST /api/auth/login` - Đăng nhập  
- `GET /api/auth/verify` - Verify token

### **Pets:**
- `GET /api/pets` - Danh sách pets
- `POST /api/pets` - Tạo pet mới
- `GET /api/pets/{id}` - Chi tiết pet
- `PUT /api/pets/{id}` - Cập nhật pet
- `DELETE /api/pets/{id}` - Xóa pet

### **Upload:**
- `POST /api/upload/image` - Upload pet images
- `POST /api/upload/avatar` - Upload user avatar

### **Users:**
- `GET /api/users/{id}` - User profile
- `GET /api/users/{id}/post-history` - Post history

### **Search:**
- `GET /api/search?q={query}` - Tìm kiếm pets

### **Chat:**
- `GET /api/chat/conversations` - Danh sách hội thoại
- `GET /api/chat/messages?userId={id}` - Messages với user
- `POST /api/chat/send` - Gửi message

### **Wallet:**
- `GET /api/wallet/transactions` - Lịch sử giao dịch
- `POST /api/wallet/deposit` - Nạp tiền
- `POST /api/wallet/withdraw` - Rút tiền

### **Ratings:**
- `POST /api/ratings/rate` - Đánh giá user

### **Others:**
- `GET /api/top-sellers` - Top sellers
- `GET /api/files/{key}` - Serve files from R2

---

**✨ Ready to deploy! Copy `worker-clean.js` content và paste vào Cloudflare Workers editor!**
