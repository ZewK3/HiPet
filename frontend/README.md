# HiPet Frontend - Pet Trading Platform

Frontend cho nền tảng mua bán thú cưng HiPet, được thiết kế để chạy trên GitHub Pages.

## Tính năng

### 🔐 Xác thực & Phân quyền
- Đăng ký/Đăng nhập người dùng
- Phân quyền: User, Admin, Support
- Profile management

### 🐕 Quản lý thú cưng
- Xem danh sách thú cưng với filter
- Đăng tin bán thú cưng
- Upload hình ảnh
- Tìm kiếm theo loại, giá, địa điểm

### 💰 Ví điện tử
- Hiển thị số dư
- Nạp tiền/Rút tiền
- Lịch sử giao dịch

### 💬 Chat
- Chat trực tiếp giữa người mua và bán
- Notification badge
- Real-time messaging

### 🎨 Giao diện
- Responsive design
- Material Design inspired
- Cute và professional
- Mobile-friendly

## Cấu trúc Project

```
frontend/
├── index.html          # Trang chính
├── styles.css          # CSS styling
├── app.js             # JavaScript logic
└── README.md          # Documentation
```

## Triển khai GitHub Pages

### Cách 1: Trực tiếp từ Repository

1. **Tạo Repository GitHub**:
   ```bash
   git init
   git add .
   git commit -m "Initial commit: HiPet frontend"
   git branch -M main
   git remote add origin https://github.com/USERNAME/hipet-frontend.git
   git push -u origin main
   ```

2. **Kích hoạt GitHub Pages**:
   - Vào Settings của repository
   - Scroll xuống phần "Pages"
   - Chọn Source: "Deploy from a branch"
   - Chọn Branch: "main"
   - Folder: "/ (root)"
   - Click "Save"

3. **Truy cập website**:
   Website sẽ có sẵn tại: `https://USERNAME.github.io/hipet-frontend`

### Cách 2: Sử dụng GitHub Actions (Recommended)

1. **Tạo workflow file** `.github/workflows/deploy.yml`:
   ```yaml
   name: Deploy to GitHub Pages
   
   on:
     push:
       branches: [ main ]
   
   jobs:
     deploy:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v3
         
         - name: Setup Node.js
           uses: actions/setup-node@v3
           with:
             node-version: '18'
             
         - name: Deploy to GitHub Pages
           uses: peaceiris/actions-gh-pages@v3
           with:
             github_token: ${{ secrets.GITHUB_TOKEN }}
             publish_dir: ./frontend
   ```

### Cấu hình Domain tùy chỉnh (Tùy chọn)

1. **Thêm CNAME file**:
   ```
   yourdomain.com
   ```

2. **Cấu hình DNS**:
   - A record: `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
   - Hoặc CNAME: `USERNAME.github.io`

## Cấu hình API Backend

Cập nhật URL của Cloudflare Worker trong `app.js`:

```javascript
const API_BASE = 'https://your-worker.your-subdomain.workers.dev';
```

## Local Development

### Chạy local server:

**Với Python:**
```bash
cd frontend
python -m http.server 8000
```

**Với Node.js:**
```bash
npx serve frontend
```

**Với PHP:**
```bash
cd frontend
php -S localhost:8000
```

Truy cập: `http://localhost:8000`

## Features Overview

### Dashboard chính
- Hero section với call-to-action
- Featured pets grid
- Responsive navigation

### Authentication System
- Modal-based login/register
- JWT token management
- Auto-login persistence

### Pet Management
- Image upload với preview
- Form validation
- Filter và search
- Pagination

### Wallet Integration
- Balance display
- Transaction history
- Deposit/withdraw forms

### Chat System
- Floating chat widget
- Message threading
- Notification badges

## Browser Support

- Chrome 60+
- Firefox 60+
- Safari 12+
- Edge 79+

## Performance Optimizations

- CSS Grid và Flexbox
- Lazy loading images
- Efficient event handling
- Minimal JavaScript libraries

## Security Features

- XSS protection
- CSRF token support
- Secure authentication flow
- Input sanitization

## SEO Optimizations

- Semantic HTML structure
- Meta tags optimization
- Open Graph tags
- Schema.org markup

## Accessibility

- ARIA labels
- Keyboard navigation
- Screen reader support
- Color contrast compliance

## Mobile Optimizations

- Touch-friendly interface
- Responsive breakpoints
- Fast loading
- PWA ready

## Analytics Integration

Thêm Google Analytics:

```html
<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_TRACKING_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'GA_TRACKING_ID');
</script>
```

## Troubleshooting

### CORS Issues
Đảm bảo backend có CORS headers đúng.

### API Connection
Kiểm tra URL của Cloudflare Worker trong `app.js`.

### GitHub Pages không update
- Kiểm tra build status trong Actions tab
- Clear browser cache
- Đợi vài phút để propagate

## Contributing

1. Fork repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Create Pull Request

## License

MIT License - see LICENSE file for details
