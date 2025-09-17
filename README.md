# 🐾 HiPet - Pet Trading Platform

A comprehensive, professional pet trading website with full e-commerce functionality, built with modern web technologies.

## ✨ Features

### 🔐 User Management
- **Multi-role Authentication** - User, Admin, Support roles
- **Secure Registration/Login** - JWT-based authentication with role-based access
- **User Profiles** - Complete profile management with avatar upload

### 🐕 Pet Management
- **Pet Listings** - Create detailed pet listings with multiple images
- **Advanced Search & Filter** - Search by type, breed, age, location, price
- **Pet Categories** - Dogs, Cats, Birds, Fish, and more
- **Detailed Pet Profiles** - Comprehensive information including health records

### � Wallet & Transactions
- **Digital Wallet System** - Secure money management
- **Deposit/Withdrawal** - Multiple payment methods support
- **Transaction History** - Complete audit trail
- **Escrow System** - Secure transactions between buyers and sellers

### 💬 Communication
- **Real-time Chat** - Instant messaging between users
- **Message History** - Persistent chat conversations
- **Admin Support Chat** - Direct communication with support team

### 📱 User Experience
- **Responsive Design** - Works perfectly on all devices
- **Modern UI** - Beautiful, intuitive interface with smooth animations
- **File Upload** - Drag & drop image uploads with preview
- **Real-time Updates** - Live notifications and status updates

### 👨‍� Admin Features
- **Admin Dashboard** - Complete platform management
- **User Management** - View, edit, block/unblock users
- **Pet Moderation** - Approve/reject pet listings
- **Transaction Monitoring** - Financial oversight and reporting
- **Support System** - Handle customer support requests

## 🏗 Tech Stack

### Backend (Cloudflare Workers)
- **Runtime:** Cloudflare Workers (V8 Isolates)
- **Database:** Cloudflare D1 (SQLite-based)
- **Storage:** Cloudflare R2 (S3-compatible object storage)
- **Cache:** Cloudflare KV (Key-Value store)
- **Authentication:** JWT with role-based access control
- **API:** RESTful API with comprehensive endpoints

### Frontend (Static Web App)
- **Core:** HTML5, CSS3, Vanilla JavaScript
- **Styling:** Modern CSS with Flexbox/Grid, custom animations
- **Icons:** Font Awesome
- **Responsive:** Mobile-first design approach
- **Deployment:** GitHub Pages ready

### Infrastructure
- **CDN:** Cloudflare global network
- **SSL:** Automatic HTTPS
- **Performance:** Edge computing with sub-100ms response times
- **Security:** DDoS protection, WAF, rate limiting

## � Quick Start

### Prerequisites
- Node.js and npm
- Cloudflare account
- Git (for deployment)

### 1. Clone and Setup
```bash
git clone <your-repo-url>
cd HiPet
```

### 2. Backend Deployment (Automated)
```bash
cd backend

# Windows PowerShell (Recommended)
.\setup.ps1

# Windows Command Prompt
setup.bat

# Linux/macOS
chmod +x setup.sh && ./setup.sh
```

### 3. Frontend Deployment
```bash
cd frontend
# Update API_BASE URL in app.js with your worker URL
# Deploy to GitHub Pages or any static hosting
```

### 4. Manual Setup (if automated setup fails)
See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed manual setup instructions.

## 📚 API Documentation

### Authentication Endpoints
```
POST /api/register - User registration
POST /api/login - User login
POST /api/logout - User logout
GET /api/profile - Get user profile
PUT /api/profile - Update user profile
```

### Pet Management
```
GET /api/pets - List pets with filters
POST /api/pets - Create pet listing
GET /api/pets/:id - Get pet details
PUT /api/pets/:id - Update pet (owner only)
DELETE /api/pets/:id - Delete pet (owner/admin)
POST /api/pets/:id/images - Upload pet images
```

### Wallet & Transactions
```
GET /api/wallet - Get wallet balance
POST /api/wallet/deposit - Deposit money
POST /api/wallet/withdraw - Withdraw money
GET /api/transactions - Transaction history
POST /api/transactions - Create transaction
```

### Chat System
```
GET /api/messages - Get chat messages
POST /api/messages - Send message
GET /api/conversations - List conversations
```

### Admin Endpoints
```
GET /api/admin/users - Manage users
GET /api/admin/pets - Moderate pets
GET /api/admin/transactions - Monitor transactions
PUT /api/admin/users/:id - Update user status
```

## 🗄 Database Schema

### Core Tables
- **users** - User accounts and profiles
- **pets** - Pet listings and details
- **pet_images** - Pet photos and media
- **transactions** - Financial transactions
- **messages** - Chat conversations
- **favorites** - User's favorite pets
- **reviews** - User ratings and reviews

See [backend/schema.sql](backend/schema.sql) for complete schema.

## 🔧 Configuration

### Environment Variables
```bash
JWT_SECRET=your-secure-jwt-secret
ENVIRONMENT=production
ADMIN_EMAIL=admin@yoursite.com
```

### Cloudflare Resources
- **D1 Database:** `hipet-db`
- **R2 Bucket:** `hipet-files`
- **KV Namespace:** `CACHE`

## 🚀 Deployment

### Development
```bash
# Backend
cd backend
wrangler dev

# Frontend
cd frontend
# Serve with any static server
python -m http.server 8000
```

### Production
Follow the automated setup scripts or see [DEPLOYMENT.md](DEPLOYMENT.md) for detailed instructions.

## 🛡 Security Features

- **JWT Authentication** with secure token handling
- **Role-based Access Control** (RBAC)
- **Input Validation** and sanitization
- **SQL Injection Protection** with prepared statements
- **CORS Configuration** for secure cross-origin requests
- **Rate Limiting** to prevent abuse
- **File Upload Security** with type and size validation

## 📱 Browser Support

- Chrome 70+
- Firefox 65+
- Safari 12+
- Edge 79+
- Mobile browsers (iOS Safari, Chrome Mobile)

## 🎨 UI/UX Features

- **Modern Design** with gradient backgrounds and smooth animations
- **Responsive Layout** that works on all screen sizes
- **Intuitive Navigation** with clear visual hierarchy
- **Loading States** and error handling
- **Toast Notifications** for user feedback
- **Modal Dialogs** for forms and confirmations

## 📈 Performance

- **Edge Computing** with Cloudflare Workers
- **Global CDN** for fast content delivery
- **Optimized Images** with R2 storage
- **Efficient Caching** with KV store
- **Lazy Loading** for improved page speed

## 🔮 Future Enhancements

- [ ] Push notifications
- [ ] Mobile app (React Native)
- [ ] Payment gateway integration
- [ ] Video chat for pet viewing
- [ ] AI-powered pet matching
- [ ] Blockchain pet ownership certificates
- [ ] Multi-language support
- [ ] Advanced analytics dashboard

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 📞 Support

- **Documentation:** [DEPLOYMENT.md](DEPLOYMENT.md)
- **Issues:** GitHub Issues
- **Email:** support@hipet.example.com

## 🙏 Acknowledgments

- Cloudflare for amazing developer platform
- Font Awesome for beautiful icons
- Community for feedback and contributions

---

**Made with ❤️ for pet lovers everywhere 🐾**

## 📁 Cấu trúc dự án

```
HiPet/
├── frontend/              # Frontend (GitHub Pages)
│   ├── index.html        # Trang chính
│   ├── styles.css        # Styling
│   ├── app.js           # Logic JavaScript
│   ├── package.json     # Dependencies
│   └── README.md        # Documentation
│
├── backend/              # Backend (Cloudflare Workers)
│   ├── worker.js        # Main worker script
│   ├── wrangler.toml    # Cloudflare config
│   ├── package.json     # Dependencies
│   └── README.md        # Documentation
│
├── .gitignore           # Git ignore file
└── README.md           # Project documentation
```

## 🚀 Triển khai nhanh

### 1. Triển khai Backend (Cloudflare Workers)

```bash
# Cài đặt Wrangler CLI
npm install -g wrangler

# Đăng nhập Cloudflare
wrangler login

# Triển khai Worker
cd backend
wrangler publish
```

### 2. Triển khai Frontend (GitHub Pages)

```bash
# Tạo repository
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/USERNAME/hipet.git
git push -u origin main

# Kích hoạt GitHub Pages trong Settings
```

### 3. Cấu hình API

Cập nhật URL Worker trong `frontend/app.js`:
```javascript
const API_BASE = 'https://your-worker.your-subdomain.workers.dev';
```

## 🛠️ Development

### Local Development

**Frontend:**
```bash
cd frontend
python -m http.server 8000
# Hoặc: npx serve .
```

**Backend:**
```bash
cd backend
wrangler dev
```

### Testing

Truy cập `http://localhost:8000` để test frontend local.

## 🔧 Cấu hình

### Environment Variables

**Backend (.env):**
```
JWT_SECRET=your-secret-key
API_VERSION=1.0.0
```

**Frontend:**
Cập nhật `API_BASE` trong `app.js` với URL của Worker.

## 📱 Demo Account

Tài khoản admin có sẵn:
- **Email**: admin@hipet.vn
- **Password**: admin123

## 🎯 Roadmap

### Phiên bản hiện tại (v1.0)
- ✅ Authentication & Authorization
- ✅ Pet CRUD operations
- ✅ Wallet system
- ✅ Basic chat
- ✅ Responsive UI

### Phiên bản tiếp theo (v1.1)
- 🔄 Real-time chat with WebSockets
- 🔄 Payment gateway integration
- 🔄 Advanced search & filters
- 🔄 Push notifications
- 🔄 Admin dashboard

### Phiên bản dài hạn (v2.0)
- 🔄 Mobile app (React Native)
- 🔄 AI-powered recommendations
- 🔄 Video calls
- 🔄 Blockchain integration
- 🔄 Multi-language support

## 💡 Tính năng nâng cao

### Security
- JWT token authentication
- CORS protection
- Input validation
- Rate limiting ready

### Performance
- CDN delivery via Cloudflare
- Image optimization
- Lazy loading
- Caching strategies

### SEO
- Semantic HTML
- Meta tags optimization
- Open Graph support
- Schema.org markup

## 🤝 Đóng góp

1. Fork project
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

## 📞 Liên hệ

- **Website**: https://hipet.vercel.app
- **Email**: support@hipet.vn
- **GitHub**: https://github.com/hipet-platform

## 🙏 Acknowledgments

- Font Awesome for icons
- Unsplash for sample images
- Cloudflare for hosting
- GitHub for version control

---

**⭐ Nếu project này hữu ích, hãy cho chúng tôi một star!**
