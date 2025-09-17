# HiPet Marketing Portal Documentation

## Overview
HiPet Marketing Portal là hệ thống quản lý quảng cáo và marketing cho nền tảng thú cưng HiPet. Portal này cho phép team marketing quản lý các chiến dịch quảng cáo, phân tích hiệu suất và quản lý nhà quảng cáo.

## Portal Structure

### URL: `D:\Web\HiPet\frontend\portal\marketing\index.html`

## Core Features

### 1. Dashboard
- **Mục đích**: Tổng quan về hiệu suất marketing
- **Thống kê chính**:
  - Số lượng chiến dịch đang chạy
  - Doanh thu quảng cáo
  - Click-through rates (CTR)
  - Conversion rates
  - Top performing ads

### 2. Chiến dịch quảng cáo (Campaigns)
- **Quản lý chiến dịch**: Tạo, chỉnh sửa, tạm dừng, xóa campaigns
- **Loại campaigns**:
  - Banner ads trên homepage
  - Sponsored pet listings
  - Email marketing campaigns
  - Social media promotions
- **Targeting**: Theo địa điểm, độ tuổi, sở thích thú cưng

### 3. Vị trí quảng cáo (Ad Spaces)
- **Homepage banners**: Header, sidebar, footer banners
- **Search results**: Sponsored listings in search
- **Pet detail pages**: Related ads
- **Category pages**: Category-specific ads

### 4. Nhà quảng cáo (Advertisers)
- **Quản lý khách hàng**: Pet stores, veterinarians, pet food brands
- **Billing management**: Invoicing, payment tracking
- **Performance reports**: ROI cho từng advertiser

### 5. Phân tích (Analytics)
- **Traffic analysis**: Page views, user behavior
- **Ad performance**: Impressions, clicks, conversions
- **Revenue tracking**: Ad spend, commission earned
- **Audience insights**: Demographics, interests

### 6. Thanh toán (Billing)
- **Invoice generation**: Automated billing for advertisers
- **Payment processing**: Integration with payment gateways
- **Revenue reports**: Monthly/quarterly financial reports

## Database Tables (Cần tạo)

### `advertisements`
```sql
CREATE TABLE advertisements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uuid TEXT UNIQUE NOT NULL,
    advertiser_id INTEGER NOT NULL,
    campaign_id INTEGER,
    title TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    destination_url TEXT,
    ad_type TEXT CHECK (ad_type IN ('banner', 'sponsored_listing', 'native', 'video')) DEFAULT 'banner',
    placement TEXT CHECK (placement IN ('homepage_header', 'homepage_sidebar', 'search_results', 'pet_detail', 'category_page')) NOT NULL,
    target_audience TEXT, -- JSON string with targeting rules
    budget DECIMAL(10,2),
    spent DECIMAL(10,2) DEFAULT 0,
    impressions INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    conversions INTEGER DEFAULT 0,
    ctr DECIMAL(5,4) DEFAULT 0, -- Click-through rate
    cpc DECIMAL(8,2) DEFAULT 0, -- Cost per click
    status TEXT CHECK (status IN ('draft', 'active', 'paused', 'completed', 'expired')) DEFAULT 'draft',
    start_date DATETIME,
    end_date DATETIME,
    is_deleted BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    version INTEGER DEFAULT 1,
    FOREIGN KEY (advertiser_id) REFERENCES advertisers(id)
);
```

### `advertisers`
```sql
CREATE TABLE advertisers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uuid TEXT UNIQUE NOT NULL,
    company_name TEXT NOT NULL,
    contact_person TEXT,
    email TEXT NOT NULL,
    phone TEXT,
    address TEXT,
    website TEXT,
    business_type TEXT, -- pet_store, veterinary, food_brand, etc.
    payment_method TEXT CHECK (payment_method IN ('bank_transfer', 'credit_card', 'paypal')) DEFAULT 'bank_transfer',
    credit_limit DECIMAL(12,2) DEFAULT 0,
    current_balance DECIMAL(12,2) DEFAULT 0,
    total_spent DECIMAL(12,2) DEFAULT 0,
    status TEXT CHECK (status IN ('active', 'suspended', 'pending')) DEFAULT 'pending',
    is_deleted BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    version INTEGER DEFAULT 1
);
```

### `campaigns`
```sql
CREATE TABLE campaigns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uuid TEXT UNIQUE NOT NULL,
    advertiser_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    objective TEXT CHECK (objective IN ('awareness', 'traffic', 'conversions', 'engagement')) DEFAULT 'traffic',
    budget DECIMAL(10,2),
    daily_budget DECIMAL(8,2),
    spent DECIMAL(10,2) DEFAULT 0,
    target_audience TEXT, -- JSON string
    start_date DATETIME,
    end_date DATETIME,
    status TEXT CHECK (status IN ('draft', 'active', 'paused', 'completed')) DEFAULT 'draft',
    is_deleted BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    version INTEGER DEFAULT 1,
    FOREIGN KEY (advertiser_id) REFERENCES advertisers(id)
);
```

### `ad_impressions`
```sql
CREATE TABLE ad_impressions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    advertisement_id INTEGER NOT NULL,
    user_id INTEGER, -- null for anonymous users
    ip_address TEXT,
    user_agent TEXT,
    page_url TEXT,
    impression_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_click BOOLEAN DEFAULT 0,
    click_time DATETIME,
    conversion_action TEXT, -- 'view_pet', 'contact_seller', 'purchase'
    conversion_time DATETIME,
    revenue DECIMAL(8,2) DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (advertisement_id) REFERENCES advertisements(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

## Worker.js Endpoints (Cần implement)

### Advertisement Management
```javascript
// GET /api/admin/advertisements - List all ads
// POST /api/admin/advertisements - Create new ad
// PUT /api/admin/advertisements/{id} - Update ad
// DELETE /api/admin/advertisements/{id} - Delete ad
// GET /api/admin/advertisements/{id}/stats - Get ad performance stats
```

### Campaign Management
```javascript
// GET /api/admin/campaigns - List campaigns
// POST /api/admin/campaigns - Create campaign
// PUT /api/admin/campaigns/{id} - Update campaign
// DELETE /api/admin/campaigns/{id} - Delete campaign
// POST /api/admin/campaigns/{id}/start - Start campaign
// POST /api/admin/campaigns/{id}/pause - Pause campaign
```

### Advertiser Management
```javascript
// GET /api/admin/advertisers - List advertisers
// POST /api/admin/advertisers - Create advertiser
// PUT /api/admin/advertisers/{id} - Update advertiser
// GET /api/admin/advertisers/{id}/performance - Performance report
```

### Analytics Endpoints
```javascript
// GET /api/admin/analytics/overview - Dashboard stats
// GET /api/admin/analytics/campaigns - Campaign performance
// GET /api/admin/analytics/revenue - Revenue reports
// GET /api/admin/analytics/audience - Audience insights
```

### Public Ad Serving
```javascript
// GET /api/ads/serve - Serve ads based on placement and targeting
// POST /api/ads/impression - Track ad impression
// POST /api/ads/click - Track ad click
// POST /api/ads/conversion - Track conversion
```

## CSS Styling
- **File**: `D:\Web\HiPet\frontend\portal\assets\css\marketing.css`
- **Theme**: Professional marketing dashboard với brand colors
- **Components**: Charts, tables, forms, cards, modals

## JavaScript Functionality
- **Charts**: Chart.js integration cho analytics
- **AJAX**: API calls để load/update data
- **Real-time updates**: Dashboard metrics
- **Form validation**: Campaign creation/editing

## User Roles & Permissions

### Marketing Manager
- Full access to all marketing features
- Can create/edit/delete campaigns
- View all analytics and reports
- Manage advertiser relationships

### Marketing Executive
- Can create/edit campaigns
- View analytics for assigned campaigns
- Limited advertiser management

### Marketing Analyst
- Read-only access to analytics
- Can generate reports
- No campaign editing rights

## Integration Points

### Frontend Integration
- Ad serving on main site
- Tracking scripts on all pages
- Analytics integration

### Backend Integration
- User behavior tracking
- Purchase conversion tracking
- Email marketing integration

## Security Considerations
- Role-based access control
- Audit logging for all marketing actions
- Secure API endpoints
- Data privacy compliance

## Performance Optimization
- Ad serving CDN integration
- Caching strategies for analytics
- Async loading for tracking scripts
- Database indexing for analytics queries

## Reporting Features
- Daily/weekly/monthly performance reports
- ROI analysis for advertisers
- Campaign comparison reports
- Audience demographic reports
- Revenue and billing reports

## Future Enhancements
- A/B testing framework
- Advanced targeting algorithms
- Automated bidding system
- Integration with social media platforms
- Mobile app advertising support