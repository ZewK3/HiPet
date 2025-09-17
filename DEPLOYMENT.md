# 🐾 HiPet Deployment Guide

## Prerequisites

1. **Node.js và npm** - Để cài đặt Wrangler CLI
2. **Cloudflare account** - Để sử dụng Workers, D1, và R2
3. **Git** (tùy chọn) - Để deploy lên GitHub Pages

## Step 1: Cài đặt Wrangler CLI

```bash
npm install -g wrangler
```

## Step 2: Login vào Cloudflare

```bash
wrangler login
```

Lệnh này sẽ mở browser để bạn đăng nhập vào Cloudflare account.

## Step 3: Setup Backend Infrastructure

### Tự động (Khuyến nghị)

**Windows PowerShell:**
```powershell
cd backend
.\setup.ps1
```

**Windows Command Prompt:**
```cmd
cd backend
setup.bat
```

**Linux/macOS:**
```bash
cd backend
chmod +x setup.sh
./setup.sh
```

### Thủ công

Nếu script tự động không hoạt động, bạn có thể thực hiện từng bước:

1. **Tạo D1 Database:**
```bash
wrangler d1 create hipet-db
```

2. **Copy database ID** từ output và update vào `wrangler.toml`:
```toml
[[d1_databases]]
binding = "DB"
database_name = "hipet-db"
database_id = "YOUR_DATABASE_ID_HERE"
```

3. **Tạo R2 Bucket:**
```bash
wrangler r2 bucket create hipet-files
```

4. **Tạo KV Namespace:**
```bash
wrangler kv:namespace create "CACHE"
wrangler kv:namespace create "CACHE" --preview
```

5. **Update KV IDs** vào `wrangler.toml`

6. **Initialize Database Schema:**
```bash
wrangler d1 execute hipet-db --file=schema.sql
```

7. **Set JWT Secret:**
```bash
wrangler secret put JWT_SECRET
# Enter a secure random string when prompted
```

8. **Deploy Worker:**
```bash
wrangler publish
```

## Step 4: Configure Frontend

1. **Lấy Worker URL** từ output của deployment (ví dụ: `https://hipet-backend.your-subdomain.workers.dev`)

2. **Update API URL** trong `frontend/app.js`:
```javascript
const API_BASE = 'https://hipet-backend.your-subdomain.workers.dev';
```

## Step 5: Deploy Frontend (GitHub Pages)

1. **Tạo GitHub repository** mới cho frontend

2. **Upload frontend files:**
```bash
cd frontend
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/yourusername/hipet-frontend.git
git push -u origin main
```

3. **Enable GitHub Pages:**
   - Vào repository Settings
   - Scroll xuống GitHub Pages section
   - Source: Deploy from a branch
   - Branch: main / (root)
   - Save

4. **Website sẽ available tại:** `https://yourusername.github.io/hipet-frontend`

## Step 6: Testing

### Test API Endpoints

```bash
# Test health check
curl https://your-worker-url.workers.dev/health

# Test user registration
curl -X POST https://your-worker-url.workers.dev/api/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","fullName":"Test User"}'

# Test login
curl -X POST https://your-worker-url.workers.dev/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

### Test Frontend

1. Mở website frontend
2. Thử đăng ký tài khoản mới
3. Đăng nhập
4. Thử đăng tin bán pet
5. Test chức năng chat
6. Test nạp/rút tiền

## Step 7: Production Setup (Tùy chọn)

### Custom Domain cho Worker

1. **Add custom domain** trong Cloudflare dashboard:
   - Workers → hipet-backend → Settings → Triggers
   - Add Custom Domain

### Custom Domain cho R2

1. **Enable public access** cho R2 bucket:
```bash
wrangler r2 bucket update hipet-files --public-access-allowed
```

2. **Configure custom domain** trong Cloudflare dashboard

### Environment Variables

Set các environment variables cho production:

```bash
wrangler secret put ENVIRONMENT
# Enter: production

wrangler secret put ADMIN_EMAIL
# Enter: your-admin-email@example.com
```

## Troubleshooting

### Common Issues

1. **Wrangler command not found:**
   - Reinstall: `npm install -g wrangler`
   - Check PATH environment variable

2. **Permission denied errors:**
   - Make sure you're logged in: `wrangler whoami`
   - Check Cloudflare account permissions

3. **Database connection errors:**
   - Verify database ID in wrangler.toml
   - Check if schema was applied correctly

4. **CORS errors:**
   - Make sure API URL is correct in frontend
   - Check worker deployment status

5. **File upload not working:**
   - Verify R2 bucket exists and is accessible
   - Check bucket permissions

### Debug Commands

```bash
# Check worker logs
wrangler tail

# Check database content
wrangler d1 execute hipet-db --command="SELECT * FROM users LIMIT 5;"

# List R2 bucket contents
wrangler r2 object list hipet-files

# Check KV namespace
wrangler kv:key list --binding=CACHE
```

## Support

Nếu gặp vấn đề, kiểm tra:

1. **Cloudflare Dashboard** - Kiểm tra tài nguyên đã được tạo
2. **Worker Logs** - Sử dụng `wrangler tail` để xem real-time logs
3. **Browser Console** - Kiểm tra lỗi JavaScript trong frontend
4. **Network Tab** - Kiểm tra API calls và responses

## Security Notes

- Thay đổi JWT_SECRET trong production
- Không expose sensitive information trong frontend code
- Sử dụng HTTPS cho tất cả connections
- Regularly backup database
- Monitor for suspicious activities

---

**Happy coding! 🐾**
