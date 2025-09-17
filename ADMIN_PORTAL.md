# HiPet Admin Portal Documentation

## Overview
HiPet Admin Portal là hệ thống quản lý tổng thể cho nền tảng thú cưng HiPet. Portal này cho phép admin quản lý người dùng, thú cưng, giao dịch, và cài đặt hệ thống.

## Portal Structure

### URL: `D:\Web\HiPet\frontend\portal\admin\index.html`

## Core Features

### 1. Dashboard
- **Mục đích**: Tổng quan về hoạt động hệ thống
- **Thống kê chính**:
  - Tổng số người dùng
  - Tổng số thú cưng
  - Giao dịch hôm nay
  - Doanh thu tổng
  - Điểm tin cậy trung bình
  - Tỷ lệ xác minh tài khoản
- **Thống kê nâng cao**:
  - Báo cáo theo thời gian (hôm nay, 7 ngày, 30 ngày, năm)
  - Biểu đồ growth trend
  - Health score của hệ thống

### 2. Quản lý người dùng (Users)
- **Danh sách user**: Tìm kiếm, filter, pagination
- **Thông tin user**:
  - Thông tin cơ bản (tên, email, phone, địa chỉ)
  - Trạng thái tài khoản (active, suspended, verified)
  - Trust score và rating
  - Subscription type và thông tin thanh toán
  - Thống kê hoạt động (tổng bán, tổng mua)
- **Hành động**:
  - Suspend/Unsuspend user
  - Verify/Unverify account
  - Adjust trust score
  - View transaction history
  - Send messages/notifications

### 3. Quản lý thú cưng (Pets)
- **Danh sách pets**: Tìm kiếm theo tên, loại, seller
- **Thông tin pet**:
  - Thông tin cơ bản (tên, loại, giá, seller)
  - Trạng thái (available, sold, pending, flagged)
  - Hình ảnh và mô tả
  - Thống kê (views, favorites, inquiries)
- **Hành động**:
  - Approve/Reject listings
  - Flag inappropriate content
  - Feature listings
  - Remove listings
  - Contact seller

### 4. Giao dịch (Transactions)
- **Danh sách giao dịch**: Filter theo trạng thái, thời gian
- **Thông tin giao dịch**:
  - Buyer và seller information
  - Pet details
  - Payment information
  - Transaction status
  - Commission earned
- **Hành động**:
  - Process refunds
  - Resolve disputes
  - Update transaction status
  - Generate invoices

### 5. Báo cáo (Reports)
- **Revenue reports**: Daily, weekly, monthly revenue
- **User analytics**: Registration trends, activity patterns
- **Pet statistics**: Popular categories, pricing trends
- **System health**: Performance metrics, error logs
- **Commission reports**: Platform earnings breakdown

### 6. Cài đặt (Settings)
- **System settings**: Site configuration
- **Payment settings**: Commission rates, payment methods
- **Email templates**: Notification templates
- **Security settings**: Authentication, access control
- **Feature flags**: Enable/disable features

## Database Tables Interaction

### Primary Tables
- **users**: User management, verification, trust scores
- **pets**: Pet listings, approval status, featured listings
- **transactions**: Payment processing, commission tracking
- **conversations**: Customer support, dispute resolution
- **system_settings**: Platform configuration

### Key Relationships
```sql
-- User statistics query
SELECT 
    COUNT(*) as total_users,
    SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active_users,
    SUM(CASE WHEN is_verified = 1 THEN 1 ELSE 0 END) as verified_users,
    AVG(trust_score) as avg_trust_score,
    AVG(rating) as avg_rating
FROM users 
WHERE is_deleted = 0;

-- Pet statistics query
SELECT 
    COUNT(*) as total_pets,
    SUM(CASE WHEN status = 'available' THEN 1 ELSE 0 END) as available_pets,
    SUM(CASE WHEN status = 'sold' THEN 1 ELSE 0 END) as sold_pets,
    SUM(CASE WHEN featured = 1 THEN 1 ELSE 0 END) as featured_pets,
    AVG(price) as avg_price
FROM pets 
WHERE is_deleted = 0;

-- Transaction statistics query
SELECT 
    COUNT(*) as total_transactions,
    SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_transactions,
    SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END) as total_revenue,
    SUM(CASE WHEN status = 'completed' THEN commission_amount ELSE 0 END) as total_commission
FROM transactions 
WHERE created_at >= date('now', '-30 days');
```

## Worker.js Endpoints (Current & Missing)

### Existing Endpoints
```javascript
// User Management
GET /api/users/{id} - Get user details
PUT /api/users/{id} - Update user
POST /api/users/{id}/rate - Rate user

// Pet Management  
GET /api/pets - List pets with filters
POST /api/pets - Create pet
GET /api/pets/{id} - Get pet details

// Authentication
POST /api/auth/login - User login
POST /api/auth/register - User registration
```

### Missing Admin Endpoints (Need Implementation)
```javascript
// Admin Dashboard
GET /api/admin/dashboard/stats - Dashboard statistics
GET /api/admin/dashboard/recent-activity - Recent activities

// User Management
GET /api/admin/users - List all users with admin filters
PUT /api/admin/users/{id}/status - Update user status (suspend/activate)
PUT /api/admin/users/{id}/verify - Verify/unverify user
PUT /api/admin/users/{id}/trust-score - Update trust score
DELETE /api/admin/users/{id} - Soft delete user

// Pet Management
GET /api/admin/pets - List all pets with admin view
PUT /api/admin/pets/{id}/status - Update pet status (approve/reject/flag)
PUT /api/admin/pets/{id}/feature - Feature/unfeature pet
DELETE /api/admin/pets/{id} - Remove pet listing

// Transaction Management
GET /api/admin/transactions - List all transactions
PUT /api/admin/transactions/{id}/status - Update transaction status
POST /api/admin/transactions/{id}/refund - Process refund
GET /api/admin/transactions/{id}/dispute - Get dispute details

// Reports
GET /api/admin/reports/revenue - Revenue reports
GET /api/admin/reports/users - User analytics
GET /api/admin/reports/pets - Pet statistics
GET /api/admin/reports/system-health - System performance

// Settings
GET /api/admin/settings - Get system settings
PUT /api/admin/settings - Update system settings
GET /api/admin/settings/commission-rates - Get commission rates
PUT /api/admin/settings/commission-rates - Update commission rates
```

## Required Worker.js Functions to Implement

### Dashboard Functions
```javascript
async function getDashboardStats(request) {
    // Get user, pet, transaction, revenue statistics
    // Return aggregated data for dashboard cards
}

async function getRecentActivity(request) {
    // Get recent user registrations, pet listings, transactions
    // Return activity feed for dashboard
}
```

### User Management Functions
```javascript
async function getAllUsers(request) {
    // List users with pagination, search, filters
    // Include admin-specific fields (trust_score, verification status)
}

async function updateUserStatus(request, userId) {
    // Suspend/activate user accounts
    // Update is_active field and log action
}

async function verifyUser(request, userId) {
    // Verify/unverify user accounts
    // Update verification fields and trust score
}

async function updateTrustScore(request, userId) {
    // Admin adjustment of user trust scores
    // Log trust score changes for audit
}
```

### Pet Management Functions
```javascript
async function getAllPetsAdmin(request) {
    // List all pets with admin view (including flagged, pending)
    // More detailed information than public API
}

async function updatePetStatus(request, petId) {
    // Approve/reject/flag pet listings
    // Update status and notify seller
}

async function featurePet(request, petId) {
    // Feature/unfeature pet listings
    // Update featured status and billing if needed
}
```

### Transaction Management Functions
```javascript
async function getAllTransactions(request) {
    // List all transactions with admin filters
    // Include commission and dispute information
}

async function processRefund(request, transactionId) {
    // Process refunds for disputed transactions
    // Update transaction status and wallet balances
}

async function resolveDispute(request, transactionId) {
    // Mark disputes as resolved
    // Update transaction and conversation status
}
```

## CSS Styling
- **File**: `D:\Web\HiPet\frontend\portal\assets\css\admin.css`
- **Theme**: Professional admin dashboard với dark sidebar
- **Components**: Data tables, charts, forms, modals, cards

## JavaScript Functionality (Missing)
- **Data tables**: Sorting, filtering, pagination
- **Charts**: Revenue charts, user growth charts
- **Form validation**: User editing, settings forms
- **AJAX**: API calls for CRUD operations
- **Real-time updates**: Dashboard stats refresh

## User Roles & Permissions

### Super Admin
- Full system access
- Can manage other admins
- System settings access
- Database management

### Admin
- User and pet management
- Transaction oversight
- Reports access
- Limited settings access

### Moderator
- Content moderation only
- Can flag/approve pets
- Basic user management
- No financial access

## Security Features

### Authentication
- Admin-only access with role verification
- Session management
- Two-factor authentication support

### Audit Logging
- All admin actions logged
- User modification history
- Transaction audit trail
- Settings change tracking

### Data Protection
- Sensitive data encryption
- Access control by role
- Data retention policies
- GDPR compliance features

## Performance Considerations

### Database Optimization
- Indexing for admin queries
- Pagination for large datasets
- Caching for dashboard stats
- Query optimization

### UI/UX Optimization
- Lazy loading for tables
- Progressive data loading
- Responsive design
- Keyboard shortcuts

## Integration Points

### Email System
- User notification emails
- Admin alert emails
- Report delivery via email

### Payment Integration
- Commission calculation
- Refund processing
- Financial reporting

### Monitoring & Alerting
- System health monitoring
- Error alerting
- Performance metrics
- Usage analytics

## Future Enhancements
- Advanced search and filtering
- Bulk operations for user/pet management
- Custom report builder
- API rate limiting and monitoring
- Advanced fraud detection
- Machine learning insights
- Mobile admin app support