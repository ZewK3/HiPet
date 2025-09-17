-- CLOUDFLARE D1 OPTIMIZED SCHEMA
-- Tối ưu cho giới hạn cột của Cloudflare D1 (max ~100 columns per table)

-- User table (core fields only)
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uuid TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    phone TEXT,
    role TEXT CHECK (role IN ('user', 'seller', 'buyer', 'admin', 'moderator', 'support', 'premium')) DEFAULT 'user',
    subscription_type TEXT CHECK (subscription_type IN ('free', 'basic', 'premium', 'enterprise')) DEFAULT 'free',
    subscription_expires_at DATETIME,
    balance INTEGER DEFAULT 0,
    escrow_balance INTEGER DEFAULT 0,
    location TEXT,
    address TEXT,
    bio TEXT,
    avatar_url TEXT,
    avatar_key TEXT,
    business_name TEXT,
    business_verified BOOLEAN DEFAULT 0,
    is_active BOOLEAN DEFAULT 1,
    is_verified BOOLEAN DEFAULT 0,
    email_verified BOOLEAN DEFAULT 0,
    phone_verified BOOLEAN DEFAULT 0,
    id_verified BOOLEAN DEFAULT 0,
    trust_score INTEGER DEFAULT 100,
    total_sales INTEGER DEFAULT 0,
    total_purchases INTEGER DEFAULT 0,
    rating REAL DEFAULT 5.0,
    review_count INTEGER DEFAULT 0,
    response_rate REAL DEFAULT 100.0,
    last_activity_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    referral_code TEXT UNIQUE,
    two_factor_enabled BOOLEAN DEFAULT 0,
    marketing_consent BOOLEAN DEFAULT 1,
    language_preference TEXT DEFAULT 'vi',
    timezone TEXT DEFAULT 'Asia/Ho_Chi_Minh',
    currency_preference TEXT DEFAULT 'VND',
    is_deleted BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    version INTEGER DEFAULT 1
);

-- Simplified pets table (essential columns only)
CREATE TABLE pets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uuid TEXT UNIQUE NOT NULL,
    seller_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    breed TEXT,
    gender TEXT CHECK (gender IN ('male', 'female', 'unknown')) DEFAULT 'unknown',
    age INTEGER DEFAULT 0,
    age_unit TEXT CHECK (age_unit IN ('months', 'years')) DEFAULT 'months',
    size_category TEXT CHECK (size_category IN ('small', 'medium', 'large', 'giant')) DEFAULT 'medium',
    description TEXT,
    price INTEGER NOT NULL DEFAULT 0,
    currency TEXT DEFAULT 'VND',
    negotiable BOOLEAN DEFAULT 1,
    status TEXT CHECK (status IN ('available', 'pending', 'sold', 'reserved')) DEFAULT 'available',
    location TEXT,
    city TEXT,
    vaccination_status TEXT CHECK (vaccination_status IN ('up_to_date', 'partial', 'none', 'unknown')) DEFAULT 'unknown',
    health_certificate BOOLEAN DEFAULT 0,
    category TEXT CHECK (category IN ('dog', 'cat', 'bird', 'fish', 'reptile', 'small_animal', 'other')) DEFAULT 'other',
    -- Note: Images are stored in pet_images table for better management
    tags TEXT, -- JSON array of tags for searchability
    views INTEGER DEFAULT 0,
    favorites INTEGER DEFAULT 0,
    featured BOOLEAN DEFAULT 0,
    is_deleted BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    version INTEGER DEFAULT 1,
    FOREIGN KEY (seller_id) REFERENCES users(id)
);

-- Pet images table
CREATE TABLE pet_images (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uuid TEXT UNIQUE NOT NULL,
    pet_id INTEGER NOT NULL,
    image_url TEXT NOT NULL,
    image_key TEXT NOT NULL,
    is_primary BOOLEAN DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    alt_text TEXT,
    file_size INTEGER,
    image_type TEXT,
    width INTEGER,
    height INTEGER,
    is_deleted BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    version INTEGER DEFAULT 1,
    FOREIGN KEY (pet_id) REFERENCES pets(id) ON DELETE CASCADE
);

-- Pet marketing and promotion details (simplified)
CREATE TABLE pet_marketing (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pet_id INTEGER NOT NULL,
    is_featured BOOLEAN DEFAULT 0,
    featured_until DATETIME,
    is_urgent BOOLEAN DEFAULT 0,
    urgent_until DATETIME,
    discount_percentage INTEGER DEFAULT 0,
    discount_until DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (pet_id) REFERENCES pets(id) ON DELETE CASCADE
);

-- Pet pricing and financial details (simplified)
CREATE TABLE pet_pricing (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pet_id INTEGER NOT NULL,
    original_price INTEGER,
    negotiable BOOLEAN DEFAULT 1,
    minimum_price INTEGER,
    sold_price INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (pet_id) REFERENCES pets(id) ON DELETE CASCADE
);

-- Transactions table for pet sales
CREATE TABLE transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uuid TEXT UNIQUE NOT NULL,
    buyer_id INTEGER NOT NULL,
    seller_id INTEGER NOT NULL,
    pet_id INTEGER NOT NULL,
    amount INTEGER NOT NULL,
    currency TEXT DEFAULT 'VND',
    fee_amount INTEGER DEFAULT 0,
    net_amount INTEGER NOT NULL,
    payment_method TEXT CHECK (payment_method IN ('card', 'bank_transfer', 'crypto', 'wallet', 'cash', 'other')) DEFAULT 'wallet',
    payment_provider TEXT,
    transaction_id TEXT,
    status TEXT CHECK (status IN ('pending', 'completed', 'failed', 'cancelled', 'refunded', 'disputed')) DEFAULT 'pending',
    escrow_status TEXT CHECK (escrow_status IN ('none', 'held', 'released', 'refunded')) DEFAULT 'none',
    refund_amount INTEGER,
    refund_reason TEXT,
    dispute_id INTEGER,
    notes TEXT,
    metadata TEXT, -- JSON for additional data
    processed_at DATETIME,
    is_deleted BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    version INTEGER DEFAULT 1,
    FOREIGN KEY (buyer_id) REFERENCES users(id),
    FOREIGN KEY (seller_id) REFERENCES users(id),
    FOREIGN KEY (pet_id) REFERENCES pets(id)
);

-- Conversations table for messaging and support
CREATE TABLE conversations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uuid TEXT UNIQUE NOT NULL,
    pet_id INTEGER,
    user1_id INTEGER NOT NULL, -- buyer or support user
    user2_id INTEGER, -- seller or support agent
    type TEXT CHECK (type IN ('chat', 'inquiry', 'support')) DEFAULT 'chat',
    subject TEXT, -- for support tickets
    status TEXT CHECK (status IN ('active', 'open', 'in_progress', 'waiting_customer', 'resolved', 'closed', 'archived', 'blocked', 'deleted')) DEFAULT 'active',
    priority TEXT CHECK (priority IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
    last_message_at DATETIME,
    last_message_preview TEXT,
    unread_count_user1 INTEGER DEFAULT 0,
    unread_count_user2 INTEGER DEFAULT 0,
    assigned_agent_id INTEGER, -- for support tickets
    first_response_at DATETIME,
    resolved_at DATETIME,
    satisfaction_rating INTEGER CHECK (satisfaction_rating BETWEEN 1 AND 5),
    satisfaction_comment TEXT,
    internal_notes TEXT,
    is_deleted BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    version INTEGER DEFAULT 1,
    FOREIGN KEY (pet_id) REFERENCES pets(id),
    FOREIGN KEY (user1_id) REFERENCES users(id),
    FOREIGN KEY (user2_id) REFERENCES users(id),
    FOREIGN KEY (assigned_agent_id) REFERENCES users(id)
);

-- Messages table
CREATE TABLE messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uuid TEXT UNIQUE NOT NULL,
    conversation_id INTEGER NOT NULL,
    sender_id INTEGER NOT NULL,
    recipient_id INTEGER NOT NULL,
    pet_id INTEGER,
    message_type TEXT CHECK (message_type IN ('text', 'image', 'file', 'offer', 'system', 'auto')) DEFAULT 'text',
    content TEXT NOT NULL,
    metadata TEXT, -- JSON for additional data
    attachments TEXT, -- JSON array of file URLs
    is_read BOOLEAN DEFAULT 0,
    read_at DATETIME,
    is_deleted BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    version INTEGER DEFAULT 1,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    FOREIGN KEY (sender_id) REFERENCES users(id),
    FOREIGN KEY (recipient_id) REFERENCES users(id),
    FOREIGN KEY (pet_id) REFERENCES pets(id)
);

-- Favorites table
CREATE TABLE favorites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    pet_id INTEGER NOT NULL,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (pet_id) REFERENCES pets(id) ON DELETE CASCADE,
    UNIQUE(user_id, pet_id)
);

-- Wallet transactions table
CREATE TABLE wallet_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uuid TEXT UNIQUE NOT NULL,
    user_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    amount INTEGER NOT NULL,
    balance_before INTEGER NOT NULL,
    balance_after INTEGER NOT NULL,
    description TEXT,
    payment_method TEXT,
    reference_id TEXT,
    status TEXT DEFAULT 'completed',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    processed_at DATETIME,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Subscriptions table
CREATE TABLE subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uuid TEXT UNIQUE NOT NULL,
    user_id INTEGER NOT NULL,
    plan_name TEXT NOT NULL,
    status TEXT CHECK (status IN ('active', 'cancelled', 'expired', 'paused', 'pending')) DEFAULT 'active',
    billing_cycle TEXT CHECK (billing_cycle IN ('monthly', 'quarterly', 'yearly')) DEFAULT 'monthly',
    price INTEGER NOT NULL,
    currency TEXT DEFAULT 'VND',
    features TEXT, -- JSON array of features
    starts_at DATETIME NOT NULL,
    ends_at DATETIME NOT NULL,
    auto_renew BOOLEAN DEFAULT 1,
    payment_method TEXT,
    is_deleted BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    version INTEGER DEFAULT 1,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- System settings table
CREATE TABLE system_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Audit logs table
CREATE TABLE audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uuid TEXT UNIQUE NOT NULL,
    user_id INTEGER,
    action TEXT NOT NULL,
    table_name TEXT NOT NULL,
    record_id INTEGER NOT NULL,
    old_values TEXT, -- JSON
    new_values TEXT, -- JSON
    ip_address TEXT,
    user_agent TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Marketing and Advertisement Tables

-- Advertisers table
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
    credit_limit INTEGER DEFAULT 0,
    current_balance INTEGER DEFAULT 0,
    total_spent INTEGER DEFAULT 0,
    status TEXT CHECK (status IN ('active', 'suspended', 'pending')) DEFAULT 'pending',
    is_deleted BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    version INTEGER DEFAULT 1
);

-- Campaigns table
CREATE TABLE campaigns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uuid TEXT UNIQUE NOT NULL,
    advertiser_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    objective TEXT CHECK (objective IN ('awareness', 'traffic', 'conversions', 'engagement')) DEFAULT 'traffic',
    budget INTEGER,
    daily_budget INTEGER,
    spent INTEGER DEFAULT 0,
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

-- Advertisements table
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
    budget INTEGER,
    spent INTEGER DEFAULT 0,
    impressions INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    conversions INTEGER DEFAULT 0,
    ctr REAL DEFAULT 0, -- Click-through rate
    cpc REAL DEFAULT 0, -- Cost per click
    status TEXT CHECK (status IN ('draft', 'active', 'paused', 'completed', 'expired')) DEFAULT 'draft',
    start_date DATETIME,
    end_date DATETIME,
    is_deleted BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    version INTEGER DEFAULT 1,
    FOREIGN KEY (advertiser_id) REFERENCES advertisers(id),
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id)
);

-- Ad impressions tracking
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
    revenue INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (advertisement_id) REFERENCES advertisements(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Support System Tables

-- Knowledge base articles
CREATE TABLE kb_articles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uuid TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    summary TEXT,
    category TEXT NOT NULL,
    subcategory TEXT,
    tags TEXT, -- JSON array
    author_id INTEGER NOT NULL,
    status TEXT CHECK (status IN ('draft', 'published', 'archived')) DEFAULT 'draft',
    featured BOOLEAN DEFAULT 0,
    view_count INTEGER DEFAULT 0,
    helpful_count INTEGER DEFAULT 0,
    not_helpful_count INTEGER DEFAULT 0,
    last_reviewed_at DATETIME,
    published_at DATETIME,
    is_deleted BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    version INTEGER DEFAULT 1,
    FOREIGN KEY (author_id) REFERENCES users(id)
);

-- Live chat sessions
CREATE TABLE chat_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uuid TEXT UNIQUE NOT NULL,
    user_id INTEGER,
    agent_id INTEGER,
    status TEXT CHECK (status IN ('waiting', 'active', 'ended')) DEFAULT 'waiting',
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    ended_at DATETIME,
    rating INTEGER CHECK (rating BETWEEN 1 AND 5),
    feedback TEXT,
    queue_time INTEGER DEFAULT 0, -- seconds
    response_time INTEGER DEFAULT 0, -- average response time in seconds
    is_deleted BOOLEAN DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (agent_id) REFERENCES users(id)
);

-- Chat messages (separate from regular messages)
CREATE TABLE chat_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL,
    sender_id INTEGER NOT NULL,
    sender_type TEXT CHECK (sender_type IN ('customer', 'agent', 'system')) NOT NULL,
    message TEXT NOT NULL,
    message_type TEXT CHECK (message_type IN ('text', 'file', 'system')) DEFAULT 'text',
    attachment_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES chat_sessions(id),
    FOREIGN KEY (sender_id) REFERENCES users(id)
);

-- Support agents/staff
CREATE TABLE support_agents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER UNIQUE NOT NULL,
    agent_code TEXT UNIQUE NOT NULL, -- e.g., SUP001
    department TEXT CHECK (department IN ('general', 'technical', 'billing', 'escalation')) DEFAULT 'general',
    skill_level TEXT CHECK (skill_level IN ('junior', 'senior', 'lead', 'manager')) DEFAULT 'junior',
    languages TEXT, -- JSON array of supported languages
    max_concurrent_chats INTEGER DEFAULT 3,
    max_concurrent_tickets INTEGER DEFAULT 10,
    is_online BOOLEAN DEFAULT 0,
    auto_assign_chats BOOLEAN DEFAULT 1,
    auto_assign_tickets BOOLEAN DEFAULT 1,
    last_activity_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    total_tickets_resolved INTEGER DEFAULT 0,
    total_chats_handled INTEGER DEFAULT 0,
    avg_response_time REAL DEFAULT 0, -- in minutes
    customer_satisfaction_rating REAL DEFAULT 5.0,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- INDEXES for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_uuid ON users(uuid);
CREATE INDEX idx_users_deleted ON users(is_deleted);
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_active ON users(is_active, is_deleted);

CREATE INDEX idx_pets_seller ON pets(seller_id);
CREATE INDEX idx_pets_status ON pets(status);
CREATE INDEX idx_pets_category ON pets(category);
CREATE INDEX idx_pets_type ON pets(type);
CREATE INDEX idx_pets_location ON pets(location);
CREATE INDEX idx_pets_price ON pets(price);
CREATE INDEX idx_pets_created ON pets(created_at);
CREATE INDEX idx_pets_uuid ON pets(uuid);
CREATE INDEX idx_pets_deleted ON pets(is_deleted);
CREATE INDEX idx_pets_size_category ON pets(size_category);

CREATE INDEX idx_pet_images_pet ON pet_images(pet_id);
CREATE INDEX idx_pet_images_primary ON pet_images(is_primary);

CREATE INDEX idx_conversations_pet ON conversations(pet_id);
CREATE INDEX idx_conversations_user1 ON conversations(user1_id);
CREATE INDEX idx_conversations_user2 ON conversations(user2_id);
CREATE INDEX idx_conversations_users ON conversations(user1_id, user2_id);
CREATE INDEX idx_conversations_type ON conversations(type);
CREATE INDEX idx_conversations_status ON conversations(status);

CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_created ON messages(created_at);

CREATE INDEX idx_transactions_buyer ON transactions(buyer_id);
CREATE INDEX idx_transactions_seller ON transactions(seller_id);
CREATE INDEX idx_transactions_pet ON transactions(pet_id);
CREATE INDEX idx_transactions_status ON transactions(status);

CREATE INDEX idx_favorites_user ON favorites(user_id);
CREATE INDEX idx_favorites_pet ON favorites(pet_id);

CREATE INDEX idx_wallet_transactions_user ON wallet_transactions(user_id);
CREATE INDEX idx_wallet_transactions_created ON wallet_transactions(created_at);

-- Marketing indexes
CREATE INDEX idx_advertisers_email ON advertisers(email);
CREATE INDEX idx_advertisers_status ON advertisers(status, is_deleted);
CREATE INDEX idx_advertisers_created ON advertisers(created_at);

CREATE INDEX idx_campaigns_advertiser ON campaigns(advertiser_id);
CREATE INDEX idx_campaigns_status ON campaigns(status, is_deleted);
CREATE INDEX idx_campaigns_dates ON campaigns(start_date, end_date);

CREATE INDEX idx_advertisements_advertiser ON advertisements(advertiser_id);
CREATE INDEX idx_advertisements_campaign ON advertisements(campaign_id);
CREATE INDEX idx_advertisements_status ON advertisements(status, is_deleted);
CREATE INDEX idx_advertisements_placement ON advertisements(placement);
CREATE INDEX idx_advertisements_dates ON advertisements(start_date, end_date);

CREATE INDEX idx_ad_impressions_ad ON ad_impressions(advertisement_id);
CREATE INDEX idx_ad_impressions_user ON ad_impressions(user_id);
CREATE INDEX idx_ad_impressions_time ON ad_impressions(impression_time);
CREATE INDEX idx_ad_impressions_click ON ad_impressions(is_click, click_time);

-- Support indexes
CREATE INDEX idx_kb_articles_category ON kb_articles(category, subcategory);
CREATE INDEX idx_kb_articles_author ON kb_articles(author_id);
CREATE INDEX idx_kb_articles_status ON kb_articles(status, is_deleted);
CREATE INDEX idx_kb_articles_featured ON kb_articles(featured);

CREATE INDEX idx_chat_sessions_user ON chat_sessions(user_id);
CREATE INDEX idx_chat_sessions_agent ON chat_sessions(agent_id);
CREATE INDEX idx_chat_sessions_status ON chat_sessions(status);
CREATE INDEX idx_chat_sessions_started ON chat_sessions(started_at);

CREATE INDEX idx_chat_messages_session ON chat_messages(session_id);
CREATE INDEX idx_chat_messages_sender ON chat_messages(sender_id);
CREATE INDEX idx_chat_messages_created ON chat_messages(created_at);

CREATE INDEX idx_support_agents_user ON support_agents(user_id);
CREATE INDEX idx_support_agents_department ON support_agents(department);
CREATE INDEX idx_support_agents_online ON support_agents(is_online, is_active);

-- Insert default system settings
INSERT INTO system_settings (key, value, description) VALUES
('site_name', 'Z&L PetMart', 'Tên trang web'),
('maintenance_mode', '0', 'Chế độ bảo trì (0=off, 1=on)'),
('registration_enabled', '1', 'Cho phép đăng ký (0=off, 1=on)'),
('min_pet_price', '50000', 'Giá tối thiểu cho thú cưng (VND)'),
('max_pet_price', '100000000', 'Giá tối đa cho thú cưng (VND)'),
('commission_rate', '0.05', 'Tỷ lệ hoa hồng (5%)'),
('min_withdrawal', '100000', 'Số tiền rút tối thiểu (VND)'),
('max_images_per_pet', '5', 'Số ảnh tối đa mỗi thú cưng'),
('featured_listing_price', '50000', 'Giá tin nổi bật (VND)'),
('urgent_listing_price', '30000', 'Giá tin gấp (VND)'),
('marketing_enabled', '1', 'Kích hoạt hệ thống quảng cáo'),
('support_enabled', '1', 'Kích hoạt hệ thống hỗ trợ'),
('auto_assign_support', '1', 'Tự động phân công support'),
('max_ads_per_page', '3', 'Số quảng cáo tối đa mỗi trang');

-- Insert default admin user for kb_articles
INSERT INTO users (
    uuid, name, email, password, role, is_active, is_verified, 
    email_verified, created_at, updated_at
) VALUES (
    lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-' || '4' || substr(hex(randomblob(2)), 2) || '-' || 
          substr('AB89', abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)), 2) || '-' || hex(randomblob(6))),
    'System Admin', 'admin@zlpetmart.vn', 'hashed_password_here', 'admin', 1, 1, 1, 
    datetime('now'), datetime('now')
);

-- Insert sample categories for support KB
INSERT INTO kb_articles (uuid, title, content, summary, category, subcategory, tags, author_id, status, featured) VALUES
(lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-' || '4' || substr(hex(randomblob(2)), 2) || '-' || 
       substr('AB89', abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)), 2) || '-' || hex(randomblob(6))),
'Hướng dẫn đăng bán thú cưng', 
'Bước 1: Đăng nhập tài khoản\nBước 2: Chọn "Đăng tin bán"\nBước 3: Điền thông tin thú cưng\nBước 4: Tải ảnh thú cưng\nBước 5: Xác nhận và đăng tin',
'Hướng dẫn chi tiết cách đăng tin bán thú cưng',
'selling', 'posting', '["hướng dẫn", "đăng tin", "bán pet"]', 1, 'published', 1),

(lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-' || '4' || substr(hex(randomblob(2)), 2) || '-' || 
       substr('AB89', abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)), 2) || '-' || hex(randomblob(6))),
'Chính sách thanh toán', 
'Z&L PetMart hỗ trợ các hình thức thanh toán:\n1. Chuyển khoản ngân hàng\n2. Ví điện tử\n3. Thanh toán khi nhận hàng\n\nPhí giao dịch: 2% cho mỗi giao dịch thành công',
'Thông tin về các hình thức thanh toán được hỗ trợ',
'payment', 'methods', '["thanh toán", "phí", "chuyển khoản"]', 1, 'published', 1),

(lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-' || '4' || substr(hex(randomblob(2)), 2) || '-' || 
       substr('AB89', abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)), 2) || '-' || hex(randomblob(6))),
'Quy định về hình ảnh thú cưng', 
'1. Ảnh phải rõ nét, không mờ\n2. Không chỉnh sửa quá mức\n3. Tối đa 5 ảnh mỗi tin\n4. Kích thước tối thiểu 300x300px\n5. Định dạng JPG, PNG được hỗ trợ',
'Quy định về chất lượng và số lượng ảnh',
'selling', 'images', '["ảnh", "quy định", "chất lượng"]', 1, 'published', 0);

-- TRIGGERS for updated_at
CREATE TRIGGER update_users_timestamp 
    AFTER UPDATE ON users 
    BEGIN 
        UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

CREATE TRIGGER update_pets_timestamp 
    AFTER UPDATE ON pets 
    BEGIN 
        UPDATE pets SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

CREATE TRIGGER update_pet_images_timestamp 
    AFTER UPDATE ON pet_images 
    BEGIN 
        UPDATE pet_images SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

CREATE TRIGGER update_conversations_timestamp 
    AFTER UPDATE ON conversations 
    BEGIN 
        UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

CREATE TRIGGER update_messages_timestamp 
    AFTER UPDATE ON messages 
    BEGIN 
        UPDATE messages SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

CREATE TRIGGER update_transactions_timestamp 
    AFTER UPDATE ON transactions 
    BEGIN 
        UPDATE transactions SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

CREATE TRIGGER update_subscriptions_timestamp 
    AFTER UPDATE ON subscriptions 
    BEGIN 
        UPDATE subscriptions SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

-- Marketing/Support triggers for updated_at
CREATE TRIGGER update_advertisers_timestamp 
    AFTER UPDATE ON advertisers 
    BEGIN 
        UPDATE advertisers SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

CREATE TRIGGER update_campaigns_timestamp 
    AFTER UPDATE ON campaigns 
    BEGIN 
        UPDATE campaigns SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

CREATE TRIGGER update_advertisements_timestamp 
    AFTER UPDATE ON advertisements 
    BEGIN 
        UPDATE advertisements SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

CREATE TRIGGER update_kb_articles_timestamp 
    AFTER UPDATE ON kb_articles 
    BEGIN 
        UPDATE kb_articles SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

CREATE TRIGGER update_support_agents_timestamp 
    AFTER UPDATE ON support_agents 
    BEGIN 
        UPDATE support_agents SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

-- AUTO-INCREMENT optimizations for Cloudflare D1
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA cache_size = 1000;
PRAGMA temp_store = memory;