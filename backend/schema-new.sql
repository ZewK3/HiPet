-- HiPet Database Schema for Cloudflare D1 - Enterprise & Professional Version
-- Designed for scalable pet marketplace with advanced features
-- Features: Audit trails, soft deletes, versioning, advanced security, analytics

-- Enable foreign key constraints
PRAGMA foreign_keys = ON;

-- Users table - Complete user management with enterprise features
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uuid TEXT UNIQUE NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))), -- UUID v4
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    phone TEXT,
    role TEXT DEFAULT 'user' CHECK (role IN ('user', 'seller', 'buyer', 'admin', 'moderator', 'support', 'premium')),
    subscription_type TEXT DEFAULT 'free' CHECK (subscription_type IN ('free', 'basic', 'premium', 'enterprise')),
    subscription_expires_at DATETIME,
    balance INTEGER DEFAULT 0, -- Balance in VND (smallest unit)
    escrow_balance INTEGER DEFAULT 0, -- Money in escrow for ongoing transactions
    location TEXT,
    address TEXT,
    bio TEXT,
    avatar_url TEXT,
    avatar_key TEXT, -- R2 object key for avatar
    cover_image_url TEXT,
    cover_image_key TEXT,
    business_name TEXT, -- For business accounts
    business_license TEXT, -- Business license number
    tax_id TEXT, -- Tax identification number
    bank_account_name TEXT,
    bank_account_number TEXT,
    bank_name TEXT,
    is_active BOOLEAN DEFAULT 1,
    is_verified BOOLEAN DEFAULT 0,
    is_banned BOOLEAN DEFAULT 0,
    ban_reason TEXT,
    ban_expires_at DATETIME,
    email_verified BOOLEAN DEFAULT 0,
    phone_verified BOOLEAN DEFAULT 0,
    id_verified BOOLEAN DEFAULT 0,
    business_verified BOOLEAN DEFAULT 0,
    is_premium BOOLEAN DEFAULT 0,
    premium_expires_at DATETIME,
    trust_score REAL DEFAULT 50.0, -- Trust score 0-100
    reputation_points INTEGER DEFAULT 0,
    total_sales INTEGER DEFAULT 0,
    total_purchases INTEGER DEFAULT 0,
    successful_transactions INTEGER DEFAULT 0,
    cancelled_transactions INTEGER DEFAULT 0,
    rating REAL DEFAULT 0.0, -- Average rating 0-5
    review_count INTEGER DEFAULT 0,
    response_rate REAL DEFAULT 0.0, -- Percentage of messages responded to
    response_time INTEGER, -- Average response time in minutes
    last_seen_at DATETIME,
    last_login_at DATETIME,
    last_activity_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    ip_address TEXT, -- Last known IP
    device_info TEXT, -- Last known device/browser info
    referral_code TEXT UNIQUE, -- User's referral code
    referred_by TEXT, -- Who referred this user
    two_factor_enabled BOOLEAN DEFAULT 0,
    two_factor_secret TEXT,
    login_attempts INTEGER DEFAULT 0,
    locked_until DATETIME,
    password_changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    terms_accepted_at DATETIME,
    privacy_accepted_at DATETIME,
    marketing_consent BOOLEAN DEFAULT 0,
    notification_preferences TEXT, -- JSON string
    language_preference TEXT DEFAULT 'vi',
    timezone TEXT DEFAULT 'Asia/Ho_Chi_Minh',
    currency_preference TEXT DEFAULT 'VND',
    -- Soft delete
    is_deleted BOOLEAN DEFAULT 0,
    deleted_at DATETIME,
    deleted_by INTEGER,
    delete_reason TEXT,
    -- Audit fields
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    version INTEGER DEFAULT 1,
    FOREIGN KEY (deleted_by) REFERENCES users(id),
    FOREIGN KEY (referred_by) REFERENCES users(referral_code)
);

-- Pets table - Advanced pet listing with comprehensive features
CREATE TABLE pets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uuid TEXT UNIQUE NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))), -- UUID v4
    sku TEXT UNIQUE, -- Stock keeping unit for inventory
    name TEXT NOT NULL,
    slug TEXT UNIQUE, -- URL-friendly name
    type TEXT NOT NULL CHECK (type IN ('dog', 'cat', 'bird', 'fish', 'rabbit', 'hamster', 'reptile', 'other')),
    category_id INTEGER,
    breed_id INTEGER,
    breed TEXT, -- Fallback for custom breeds
    age INTEGER NOT NULL, -- Age in months
    age_unit TEXT DEFAULT 'months' CHECK (age_unit IN ('days', 'weeks', 'months', 'years')),
    birth_date DATE, -- Exact birth date if known
    price INTEGER NOT NULL, -- Current price in VND
    original_price INTEGER, -- Original listing price
    cost_price INTEGER, -- Acquisition cost for sellers
    currency TEXT DEFAULT 'VND',
    price_negotiable BOOLEAN DEFAULT 1,
    min_price INTEGER, -- Minimum acceptable price
    gender TEXT CHECK (gender IN ('male', 'female', 'unknown')),
    weight REAL, -- Weight in kg
    height REAL, -- Height in cm
    length REAL, -- Length in cm
    color TEXT,
    markings TEXT, -- Special markings or patterns
    description TEXT NOT NULL,
    short_description TEXT, -- Brief summary
    care_instructions TEXT,
    feeding_schedule TEXT,
    special_needs TEXT,
    location TEXT NOT NULL,
    exact_location TEXT, -- More precise location
    pickup_available BOOLEAN DEFAULT 1,
    delivery_available BOOLEAN DEFAULT 0,
    shipping_available BOOLEAN DEFAULT 0,
    delivery_radius INTEGER, -- Delivery radius in km
    delivery_fee INTEGER, -- Delivery fee in VND
    health_status TEXT DEFAULT 'healthy',
    health_certificate_url TEXT,
    health_certificate_key TEXT,
    vaccination_status TEXT DEFAULT 'unknown',
    vaccination_record_url TEXT,
    vaccination_record_key TEXT,
    last_vet_visit DATE,
    next_vet_visit DATE,
    microchip_id TEXT,
    microchip_registered BOOLEAN DEFAULT 0,
    papers_available BOOLEAN DEFAULT 0, -- Has pedigree papers
    papers_url TEXT,
    papers_key TEXT,
    registration_number TEXT, -- Official registration number
    neutered BOOLEAN DEFAULT 0,
    spayed BOOLEAN DEFAULT 0, -- For females
    house_trained BOOLEAN DEFAULT 0,
    litter_trained BOOLEAN DEFAULT 0,
    crate_trained BOOLEAN DEFAULT 0,
    good_with_kids BOOLEAN DEFAULT 0,
    good_with_dogs BOOLEAN DEFAULT 0,
    good_with_cats BOOLEAN DEFAULT 0,
    good_with_other_pets BOOLEAN DEFAULT 0,
    energy_level TEXT CHECK (energy_level IN ('low', 'medium', 'high', 'very_high')),
    exercise_needs TEXT CHECK (exercise_needs IN ('minimal', 'low', 'moderate', 'high', 'very_high')),
    grooming_needs TEXT CHECK (grooming_needs IN ('minimal', 'low', 'moderate', 'high', 'professional')),
    noise_level TEXT CHECK (noise_level IN ('quiet', 'moderate', 'vocal', 'very_vocal')),
    size TEXT CHECK (size IN ('tiny', 'small', 'medium', 'large', 'giant')),
    temperament TEXT, -- Comma-separated traits
    training_level TEXT CHECK (training_level IN ('none', 'basic', 'intermediate', 'advanced', 'professional')),
    socialization_level TEXT CHECK (socialization_level IN ('poor', 'fair', 'good', 'excellent')),
    reason_for_selling TEXT,
    urgent_sale BOOLEAN DEFAULT 0,
    urgent_reason TEXT,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'pending_review', 'active', 'sold', 'reserved', 'expired', 'paused', 'rejected', 'deleted')),
    approval_status TEXT DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected', 'under_review')),
    rejection_reason TEXT,
    seller_id INTEGER NOT NULL,
    seller_type TEXT DEFAULT 'individual' CHECK (seller_type IN ('individual', 'breeder', 'rescue', 'pet_store', 'shelter')),
    -- SEO and Marketing
    meta_title TEXT,
    meta_description TEXT,
    keywords TEXT, -- Comma-separated keywords
    tags TEXT, -- JSON array of tags
    -- Statistics
    view_count INTEGER DEFAULT 0,
    unique_view_count INTEGER DEFAULT 0,
    favorite_count INTEGER DEFAULT 0,
    share_count INTEGER DEFAULT 0,
    inquiry_count INTEGER DEFAULT 0,
    phone_reveal_count INTEGER DEFAULT 0,
    -- Featured listings
    is_featured BOOLEAN DEFAULT 0,
    featured_until DATETIME,
    is_sponsored BOOLEAN DEFAULT 0,
    sponsored_until DATETIME,
    is_urgent BOOLEAN DEFAULT 0,
    urgent_until DATETIME,
    boost_score INTEGER DEFAULT 0, -- Algorithmic boost score
    quality_score REAL DEFAULT 0.0, -- Listing quality score 0-100
    -- Pricing and promotions
    discount_percentage INTEGER DEFAULT 0,
    discount_amount INTEGER DEFAULT 0,
    discount_until DATETIME,
    promotion_code TEXT,
    bulk_discount_available BOOLEAN DEFAULT 0,
    bulk_discount_quantity INTEGER,
    bulk_discount_percentage INTEGER,
    -- Availability
    available_from DATE DEFAULT CURRENT_DATE,
    available_until DATE,
    adoption_fee_included BOOLEAN DEFAULT 0,
    adoption_fee_amount INTEGER,
    deposit_required BOOLEAN DEFAULT 0,
    deposit_amount INTEGER,
    deposit_refundable BOOLEAN DEFAULT 1,
    -- Legal and compliance
    age_restriction INTEGER, -- Minimum buyer age
    requires_license BOOLEAN DEFAULT 0,
    license_type TEXT,
    export_allowed BOOLEAN DEFAULT 1,
    import_restrictions TEXT,
    -- Timing
    listing_duration_days INTEGER DEFAULT 30,
    auto_relist BOOLEAN DEFAULT 0,
    expires_at DATETIME,
    sold_at DATETIME,
    sold_price INTEGER,
    reserved_at DATETIME,
    reserved_until DATETIME,
    reserved_by INTEGER,
    -- Admin fields
    admin_notes TEXT,
    moderation_notes TEXT,
    content_warnings TEXT,
    reported_count INTEGER DEFAULT 0,
    last_moderated_at DATETIME,
    moderated_by INTEGER,
    -- Analytics tracking
    source TEXT, -- Where the listing came from
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT,
    conversion_value INTEGER, -- Estimated conversion value
    -- Soft delete and audit
    is_deleted BOOLEAN DEFAULT 0,
    deleted_at DATETIME,
    deleted_by INTEGER,
    delete_reason TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    published_at DATETIME,
    version INTEGER DEFAULT 1,
    -- Foreign keys
    FOREIGN KEY (seller_id) REFERENCES users(id),
    FOREIGN KEY (category_id) REFERENCES categories(id),
    FOREIGN KEY (breed_id) REFERENCES breeds(id),
    FOREIGN KEY (reserved_by) REFERENCES users(id),
    FOREIGN KEY (moderated_by) REFERENCES users(id),
    FOREIGN KEY (deleted_by) REFERENCES users(id)
);

-- Pet images table - Advanced image management with metadata
CREATE TABLE pet_images (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uuid TEXT UNIQUE NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))), -- UUID v4
    pet_id INTEGER NOT NULL,
    image_url TEXT NOT NULL,
    image_key TEXT NOT NULL, -- R2 object key
    thumbnail_url TEXT, -- Optimized thumbnail
    thumbnail_key TEXT,
    medium_url TEXT, -- Medium size image
    medium_key TEXT,
    large_url TEXT, -- Large size image
    large_key TEXT,
    original_filename TEXT,
    file_size INTEGER, -- File size in bytes
    mime_type TEXT,
    width INTEGER,
    height INTEGER,
    aspect_ratio REAL,
    dominant_color TEXT, -- Hex color code
    alt_text TEXT, -- Alternative text for accessibility
    caption TEXT,
    description TEXT,
    image_type TEXT CHECK (image_type IN ('main', 'gallery', 'certificate', 'document', 'medical', 'environment')),
    is_primary BOOLEAN DEFAULT 0,
    is_approved BOOLEAN DEFAULT 1,
    is_public BOOLEAN DEFAULT 1,
    sort_order INTEGER DEFAULT 0,
    display_order INTEGER DEFAULT 0,
    -- Image analysis
    has_faces BOOLEAN DEFAULT 0,
    face_count INTEGER DEFAULT 0,
    content_rating TEXT DEFAULT 'safe' CHECK (content_rating IN ('safe', 'questionable', 'inappropriate')),
    auto_generated BOOLEAN DEFAULT 0,
    generated_from TEXT, -- Source for auto-generated images
    -- EXIF data
    camera_make TEXT,
    camera_model TEXT,
    taken_at DATETIME,
    gps_latitude REAL,
    gps_longitude REAL,
    orientation INTEGER,
    -- Moderation
    moderation_status TEXT DEFAULT 'pending' CHECK (moderation_status IN ('pending', 'approved', 'rejected', 'flagged')),
    moderation_score REAL, -- AI moderation confidence score
    moderation_labels TEXT, -- JSON array of detected labels
    flagged_reason TEXT,
    moderated_by INTEGER,
    moderated_at DATETIME,
    -- Performance tracking
    view_count INTEGER DEFAULT 0,
    click_count INTEGER DEFAULT 0,
    download_count INTEGER DEFAULT 0,
    conversion_rate REAL DEFAULT 0.0,
    -- Soft delete and audit
    is_deleted BOOLEAN DEFAULT 0,
    deleted_at DATETIME,
    deleted_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    version INTEGER DEFAULT 1,
    FOREIGN KEY (pet_id) REFERENCES pets(id) ON DELETE CASCADE,
    FOREIGN KEY (moderated_by) REFERENCES users(id),
    FOREIGN KEY (deleted_by) REFERENCES users(id)
);

-- Categories table - Pet categories and breeds
CREATE TABLE categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uuid TEXT UNIQUE NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))), -- UUID v4
    parent_id INTEGER, -- For hierarchical categories
    type TEXT NOT NULL, -- pet type
    name TEXT NOT NULL, -- display name
    slug TEXT UNIQUE NOT NULL, -- URL-friendly name
    icon TEXT, -- icon class
    image_url TEXT, -- Category image
    image_key TEXT,
    description TEXT,
    meta_title TEXT,
    meta_description TEXT,
    keywords TEXT,
    is_active BOOLEAN DEFAULT 1,
    is_featured BOOLEAN DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    level INTEGER DEFAULT 0, -- Category level in hierarchy
    path TEXT, -- Full path like "/dogs/large-breeds"
    pet_count INTEGER DEFAULT 0, -- Cached count
    -- Soft delete and audit
    is_deleted BOOLEAN DEFAULT 0,
    deleted_at DATETIME,
    deleted_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    version INTEGER DEFAULT 1,
    FOREIGN KEY (parent_id) REFERENCES categories(id),
    FOREIGN KEY (deleted_by) REFERENCES users(id)
);

-- User sessions table - Track user sessions and security
CREATE TABLE user_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uuid TEXT UNIQUE NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))), -- UUID v4
    user_id INTEGER NOT NULL,
    session_token TEXT UNIQUE NOT NULL,
    refresh_token TEXT UNIQUE,
    device_id TEXT,
    device_name TEXT,
    device_type TEXT CHECK (device_type IN ('web', 'mobile', 'tablet', 'desktop', 'api')),
    browser_name TEXT,
    browser_version TEXT,
    os_name TEXT,
    os_version TEXT,
    ip_address TEXT,
    location_country TEXT,
    location_city TEXT,
    user_agent TEXT,
    is_active BOOLEAN DEFAULT 1,
    is_trusted_device BOOLEAN DEFAULT 0,
    last_activity_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    ended_at DATETIME,
    logout_reason TEXT, -- 'user_logout', 'timeout', 'security', 'admin'
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Audit logs table - Comprehensive audit trail
CREATE TABLE audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uuid TEXT UNIQUE NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))), -- UUID v4
    user_id INTEGER,
    session_id INTEGER,
    action TEXT NOT NULL, -- 'create', 'update', 'delete', 'login', 'logout', 'view', etc.
    entity_type TEXT NOT NULL, -- 'user', 'pet', 'order', 'transaction', etc.
    entity_id INTEGER,
    entity_uuid TEXT,
    old_values TEXT, -- JSON of old values
    new_values TEXT, -- JSON of new values
    changes TEXT, -- JSON of what changed
    ip_address TEXT,
    user_agent TEXT,
    request_id TEXT, -- For tracing requests
    correlation_id TEXT, -- For tracing related actions
    severity TEXT DEFAULT 'info' CHECK (severity IN ('debug', 'info', 'warning', 'error', 'critical')),
    category TEXT, -- 'auth', 'data', 'security', 'performance', etc.
    source TEXT, -- 'web', 'api', 'admin', 'system', etc.
    metadata TEXT, -- Additional JSON metadata
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (session_id) REFERENCES user_sessions(id)
);

-- User preferences table - Detailed user preferences
CREATE TABLE user_preferences (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL UNIQUE,
    -- Notification preferences
    email_notifications BOOLEAN DEFAULT 1,
    sms_notifications BOOLEAN DEFAULT 0,
    push_notifications BOOLEAN DEFAULT 1,
    marketing_emails BOOLEAN DEFAULT 0,
    newsletter_subscription BOOLEAN DEFAULT 0,
    -- Specific notification types
    notify_new_messages BOOLEAN DEFAULT 1,
    notify_order_updates BOOLEAN DEFAULT 1,
    notify_payment_updates BOOLEAN DEFAULT 1,
    notify_pet_inquiries BOOLEAN DEFAULT 1,
    notify_price_drops BOOLEAN DEFAULT 0,
    notify_new_pets BOOLEAN DEFAULT 0,
    notify_reviews BOOLEAN DEFAULT 1,
    -- Privacy preferences
    show_phone_number BOOLEAN DEFAULT 0,
    show_email_address BOOLEAN DEFAULT 0,
    show_location BOOLEAN DEFAULT 1,
    show_last_seen BOOLEAN DEFAULT 1,
    allow_contact_from_buyers BOOLEAN DEFAULT 1,
    allow_contact_from_sellers BOOLEAN DEFAULT 1,
    -- Display preferences
    items_per_page INTEGER DEFAULT 20,
    default_sort_order TEXT DEFAULT 'newest',
    show_sold_pets BOOLEAN DEFAULT 0,
    preferred_currency TEXT DEFAULT 'VND',
    preferred_language TEXT DEFAULT 'vi',
    preferred_timezone TEXT DEFAULT 'Asia/Ho_Chi_Minh',
    -- Search preferences
    default_search_radius INTEGER DEFAULT 50, -- km
    save_search_history BOOLEAN DEFAULT 1,
    max_saved_searches INTEGER DEFAULT 10,
    -- Seller preferences
    auto_respond_enabled BOOLEAN DEFAULT 0,
    auto_respond_message TEXT,
    vacation_mode BOOLEAN DEFAULT 0,
    vacation_message TEXT,
    vacation_starts_at DATETIME,
    vacation_ends_at DATETIME,
    -- Buyer preferences
    max_budget INTEGER,
    preferred_pet_types TEXT, -- JSON array
    preferred_breeds TEXT, -- JSON array
    preferred_locations TEXT, -- JSON array
    -- Created and updated timestamps
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Breeds table - Comprehensive breed information
CREATE TABLE breeds (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uuid TEXT UNIQUE NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))), -- UUID v4
    category_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    scientific_name TEXT,
    common_names TEXT, -- JSON array of alternative names
    description TEXT,
    history TEXT,
    characteristics TEXT,
    typical_size TEXT,
    size_range_min REAL, -- Min size in cm
    size_range_max REAL, -- Max size in cm
    typical_weight TEXT,
    weight_range_min REAL, -- Min weight in kg
    weight_range_max REAL, -- Max weight in kg
    lifespan TEXT,
    lifespan_min INTEGER, -- Min lifespan in years
    lifespan_max INTEGER, -- Max lifespan in years
    temperament TEXT,
    energy_level TEXT,
    exercise_needs TEXT,
    grooming_needs TEXT,
    training_difficulty TEXT,
    good_with_children BOOLEAN,
    good_with_other_pets BOOLEAN,
    apartment_suitable BOOLEAN,
    climate_tolerance TEXT,
    health_concerns TEXT, -- JSON array of common health issues
    care_instructions TEXT,
    feeding_guidelines TEXT,
    image_url TEXT,
    image_key TEXT,
    origin_country TEXT,
    breed_group TEXT,
    recognition_status TEXT, -- Official breed recognition
    popularity_rank INTEGER,
    average_price_min INTEGER,
    average_price_max INTEGER,
    is_active BOOLEAN DEFAULT 1,
    is_rare BOOLEAN DEFAULT 0,
    requires_license BOOLEAN DEFAULT 0,
    pet_count INTEGER DEFAULT 0, -- Cached count
    -- SEO
    meta_title TEXT,
    meta_description TEXT,
    keywords TEXT,
    -- Soft delete and audit
    is_deleted BOOLEAN DEFAULT 0,
    deleted_at DATETIME,
    deleted_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    version INTEGER DEFAULT 1,
    FOREIGN KEY (category_id) REFERENCES categories(id),
    FOREIGN KEY (deleted_by) REFERENCES users(id)
);

-- Subscription plans table - Flexible subscription management
CREATE TABLE subscription_plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uuid TEXT UNIQUE NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))), -- UUID v4
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    features TEXT, -- JSON array of features
    price_monthly INTEGER NOT NULL, -- Price in VND
    price_yearly INTEGER, -- Yearly price (with discount)
    price_currency TEXT DEFAULT 'VND',
    max_listings INTEGER DEFAULT -1, -- -1 for unlimited
    max_images_per_listing INTEGER DEFAULT 10,
    max_featured_listings INTEGER DEFAULT 0,
    max_urgent_listings INTEGER DEFAULT 0,
    analytics_access BOOLEAN DEFAULT 0,
    priority_support BOOLEAN DEFAULT 0,
    verified_badge BOOLEAN DEFAULT 0,
    custom_branding BOOLEAN DEFAULT 0,
    api_access BOOLEAN DEFAULT 0,
    bulk_operations BOOLEAN DEFAULT 0,
    advanced_search BOOLEAN DEFAULT 0,
    export_data BOOLEAN DEFAULT 0,
    is_active BOOLEAN DEFAULT 1,
    is_popular BOOLEAN DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    trial_days INTEGER DEFAULT 0,
    setup_fee INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- User subscriptions table - Track user subscriptions
CREATE TABLE user_subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uuid TEXT UNIQUE NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))), -- UUID v4
    user_id INTEGER NOT NULL,
    plan_id INTEGER NOT NULL,
    status TEXT DEFAULT 'active' CHECK (status IN ('trial', 'active', 'cancelled', 'expired', 'suspended', 'pending')),
    billing_cycle TEXT DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'yearly', 'lifetime')),
    amount_paid INTEGER NOT NULL,
    currency TEXT DEFAULT 'VND',
    payment_method TEXT,
    external_subscription_id TEXT, -- Payment provider subscription ID
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME NOT NULL,
    cancelled_at DATETIME,
    cancellation_reason TEXT,
    trial_ends_at DATETIME,
    next_billing_date DATETIME,
    auto_renew BOOLEAN DEFAULT 1,
    -- Usage tracking
    listings_used INTEGER DEFAULT 0,
    images_used INTEGER DEFAULT 0,
    featured_listings_used INTEGER DEFAULT 0,
    urgent_listings_used INTEGER DEFAULT 0,
    -- Audit
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (plan_id) REFERENCES subscription_plans(id)
);

-- Conversations table - Advanced chat system
CREATE TABLE conversations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uuid TEXT UNIQUE NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))), -- UUID v4
    participant1_id INTEGER NOT NULL,
    participant2_id INTEGER NOT NULL,
    pet_id INTEGER, -- Optional: conversation about specific pet
    order_id INTEGER, -- Optional: conversation about specific order
    type TEXT DEFAULT 'private' CHECK (type IN ('private', 'group', 'support', 'system')),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived', 'blocked', 'deleted')),
    title TEXT, -- Optional conversation title
    subject TEXT, -- Subject line for the conversation
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    is_encrypted BOOLEAN DEFAULT 0,
    encryption_key TEXT,
    -- Message counters
    message_count INTEGER DEFAULT 0,
    unread_count_p1 INTEGER DEFAULT 0, -- Unread for participant 1
    unread_count_p2 INTEGER DEFAULT 0, -- Unread for participant 2
    -- Last message info
    last_message_id INTEGER,
    last_message_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_message_preview TEXT,
    last_sender_id INTEGER,
    -- Participant settings
    p1_muted BOOLEAN DEFAULT 0,
    p2_muted BOOLEAN DEFAULT 0,
    p1_archived BOOLEAN DEFAULT 0,
    p2_archived BOOLEAN DEFAULT 0,
    p1_blocked BOOLEAN DEFAULT 0,
    p2_blocked BOOLEAN DEFAULT 0,
    p1_deleted BOOLEAN DEFAULT 0,
    p2_deleted BOOLEAN DEFAULT 0,
    -- Auto-response
    auto_response_enabled BOOLEAN DEFAULT 0,
    auto_response_message TEXT,
    -- Business features
    is_business_inquiry BOOLEAN DEFAULT 0,
    inquiry_stage TEXT, -- 'initial', 'interested', 'negotiating', 'closed'
    estimated_value INTEGER, -- Potential transaction value
    follow_up_needed BOOLEAN DEFAULT 0,
    follow_up_date DATETIME,
    assigned_to INTEGER, -- For business accounts with multiple agents
    -- Analytics
    response_rate_p1 REAL DEFAULT 0.0,
    response_rate_p2 REAL DEFAULT 0.0,
    avg_response_time_p1 INTEGER, -- In minutes
    avg_response_time_p2 INTEGER, -- In minutes
    conversation_rating INTEGER, -- 1-5 rating
    conversation_feedback TEXT,
    -- Audit and timestamps
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    archived_at DATETIME,
    deleted_at DATETIME,
    FOREIGN KEY (participant1_id) REFERENCES users(id),
    FOREIGN KEY (participant2_id) REFERENCES users(id),
    FOREIGN KEY (pet_id) REFERENCES pets(id),
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (last_sender_id) REFERENCES users(id),
    FOREIGN KEY (assigned_to) REFERENCES users(id),
    UNIQUE(participant1_id, participant2_id, pet_id)
);

-- Messages table - Enhanced messaging with rich features
CREATE TABLE messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uuid TEXT UNIQUE NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))), -- UUID v4
    conversation_id INTEGER NOT NULL,
    sender_id INTEGER NOT NULL,
    receiver_id INTEGER, -- For direct reference
    message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'video', 'audio', 'file', 'location', 'contact', 'sticker', 'gif', 'system', 'template', 'quick_reply')),
    content TEXT NOT NULL,
    formatted_content TEXT, -- HTML formatted content
    plain_content TEXT, -- Plain text version
    -- Attachments
    attachment_url TEXT,
    attachment_key TEXT, -- R2 key for attachments
    attachment_filename TEXT,
    attachment_filesize INTEGER,
    attachment_mimetype TEXT,
    thumbnail_url TEXT,
    thumbnail_key TEXT,
    -- Rich content
    metadata TEXT, -- JSON metadata for rich messages
    embed_data TEXT, -- JSON data for embeds (links, videos, etc.)
    quick_replies TEXT, -- JSON array of quick reply options
    template_id INTEGER, -- Reference to message template
    -- Message status
    status TEXT DEFAULT 'sent' CHECK (status IN ('draft', 'sending', 'sent', 'delivered', 'read', 'failed', 'deleted')),
    is_read BOOLEAN DEFAULT 0,
    is_delivered BOOLEAN DEFAULT 0,
    is_deleted BOOLEAN DEFAULT 0,
    is_edited BOOLEAN DEFAULT 0,
    is_pinned BOOLEAN DEFAULT 0,
    is_important BOOLEAN DEFAULT 0,
    is_encrypted BOOLEAN DEFAULT 0,
    -- Reactions and interactions
    reactions TEXT, -- JSON object of emoji reactions
    reaction_count INTEGER DEFAULT 0,
    reply_count INTEGER DEFAULT 0,
    share_count INTEGER DEFAULT 0,
    -- Threading
    reply_to_id INTEGER, -- For replying to specific messages
    thread_id INTEGER, -- For grouping related messages
    is_thread_starter BOOLEAN DEFAULT 0,
    -- Scheduling
    scheduled_at DATETIME, -- For scheduled messages
    expires_at DATETIME, -- For self-destructing messages
    -- Business features
    is_automated BOOLEAN DEFAULT 0,
    automation_rule_id INTEGER,
    lead_score INTEGER, -- For lead scoring
    conversion_value INTEGER,
    -- Moderation
    flagged BOOLEAN DEFAULT 0,
    flagged_reason TEXT,
    moderation_status TEXT DEFAULT 'approved' CHECK (moderation_status IN ('pending', 'approved', 'rejected', 'flagged')),
    moderated_by INTEGER,
    moderated_at DATETIME,
    -- Analytics
    open_rate REAL DEFAULT 0.0,
    click_rate REAL DEFAULT 0.0,
    response_time INTEGER, -- Time to respond in minutes
    engagement_score REAL DEFAULT 0.0,
    -- Audit timestamps
    sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    delivered_at DATETIME,
    read_at DATETIME,
    edited_at DATETIME,
    deleted_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    FOREIGN KEY (sender_id) REFERENCES users(id),
    FOREIGN KEY (receiver_id) REFERENCES users(id),
    FOREIGN KEY (reply_to_id) REFERENCES messages(id),
    FOREIGN KEY (moderated_by) REFERENCES users(id)
);

-- Transactions table - Financial transactions
CREATE TABLE transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('deposit', 'withdraw', 'purchase', 'sale', 'refund', 'fee', 'commission')),
    amount INTEGER NOT NULL, -- Amount in VND
    balance_before INTEGER NOT NULL,
    balance_after INTEGER NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
    payment_method TEXT, -- bank_transfer, momo, zalopay, etc.
    reference_id TEXT, -- External payment reference
    pet_id INTEGER, -- If transaction is related to a pet
    order_id TEXT, -- Internal order reference
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    processed_at DATETIME,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (pet_id) REFERENCES pets(id)
);

-- Orders table - Purchase orders
CREATE TABLE orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_number TEXT UNIQUE NOT NULL, -- Human readable order number
    buyer_id INTEGER NOT NULL,
    seller_id INTEGER NOT NULL,
    pet_id INTEGER NOT NULL,
    quantity INTEGER DEFAULT 1,
    unit_price INTEGER NOT NULL,
    total_amount INTEGER NOT NULL,
    commission_amount INTEGER DEFAULT 0,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'paid', 'delivered', 'completed', 'cancelled', 'refunded')),
    payment_method TEXT,
    payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
    delivery_method TEXT CHECK (delivery_method IN ('pickup', 'delivery', 'shipping')),
    delivery_address TEXT,
    delivery_notes TEXT,
    tracking_number TEXT,
    buyer_notes TEXT,
    seller_notes TEXT,
    admin_notes TEXT,
    confirmed_at DATETIME,
    paid_at DATETIME,
    delivered_at DATETIME,
    completed_at DATETIME,
    cancelled_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (buyer_id) REFERENCES users(id),
    FOREIGN KEY (seller_id) REFERENCES users(id),
    FOREIGN KEY (pet_id) REFERENCES pets(id)
);

-- Favorites table - User's favorite pets
CREATE TABLE favorites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    pet_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (pet_id) REFERENCES pets(id),
    UNIQUE(user_id, pet_id)
);

-- Reviews table - User reviews and ratings
CREATE TABLE reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reviewer_id INTEGER NOT NULL,
    reviewed_id INTEGER NOT NULL, -- User being reviewed
    order_id INTEGER, -- Optional: review related to specific order
    pet_id INTEGER, -- Optional: review related to specific pet
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title TEXT,
    content TEXT,
    is_verified BOOLEAN DEFAULT 0, -- Verified purchase
    is_anonymous BOOLEAN DEFAULT 0,
    helpful_count INTEGER DEFAULT 0,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'hidden', 'deleted')),
    admin_notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (reviewer_id) REFERENCES users(id),
    FOREIGN KEY (reviewed_id) REFERENCES users(id),
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (pet_id) REFERENCES pets(id),
    UNIQUE(reviewer_id, reviewed_id, order_id)
);

-- Notifications table - User notifications
CREATE TABLE notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('message', 'order', 'payment', 'review', 'system', 'promotion')),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    action_url TEXT,
    is_read BOOLEAN DEFAULT 0,
    is_deleted BOOLEAN DEFAULT 0,
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    expires_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Support tickets table - Customer support
CREATE TABLE support_tickets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ticket_number TEXT UNIQUE NOT NULL,
    user_id INTEGER, -- Null for guest tickets
    guest_name TEXT, -- For non-registered users
    guest_email TEXT, -- For non-registered users
    subject TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('account', 'payment', 'order', 'technical', 'other')),
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'waiting', 'resolved', 'closed')),
    assigned_to INTEGER, -- Support agent
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    rating_comment TEXT,
    resolution_notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    closed_at DATETIME,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (assigned_to) REFERENCES users(id)
);

-- Support messages table - Ticket conversation
CREATE TABLE support_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ticket_id INTEGER NOT NULL,
    sender_id INTEGER, -- Null for guest messages
    sender_type TEXT NOT NULL CHECK (sender_type IN ('user', 'guest', 'support', 'system')),
    message TEXT NOT NULL,
    is_internal BOOLEAN DEFAULT 0, -- Internal support notes
    attachment_url TEXT,
    attachment_key TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ticket_id) REFERENCES support_tickets(id) ON DELETE CASCADE,
    FOREIGN KEY (sender_id) REFERENCES users(id)
);

-- Advertisements table - Promoted listings
CREATE TABLE advertisements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    pet_id INTEGER, -- Optional: ad for specific pet
    type TEXT NOT NULL CHECK (type IN ('banner', 'featured', 'boost', 'sponsored')),
    title TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    image_key TEXT,
    target_url TEXT,
    budget INTEGER NOT NULL, -- Total budget in VND
    spent_amount INTEGER DEFAULT 0,
    cost_per_click INTEGER, -- CPC in VND
    cost_per_impression INTEGER, -- CPM in VND
    target_audience TEXT, -- JSON string with targeting criteria
    impressions INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'paused', 'completed', 'cancelled')),
    starts_at DATETIME NOT NULL,
    ends_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (pet_id) REFERENCES pets(id)
);

-- Ad impressions table - Track ad performance
CREATE TABLE ad_impressions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ad_id INTEGER NOT NULL,
    user_id INTEGER, -- Optional: logged in user
    ip_address TEXT,
    user_agent TEXT,
    page_url TEXT,
    clicked BOOLEAN DEFAULT 0,
    clicked_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ad_id) REFERENCES advertisements(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Activity logs table - User activity tracking
CREATE TABLE activity_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    action TEXT NOT NULL,
    entity_type TEXT, -- pets, users, orders, etc.
    entity_id INTEGER,
    ip_address TEXT,
    user_agent TEXT,
    metadata TEXT, -- JSON string with additional data
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- System settings table - Application configuration
CREATE TABLE system_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT UNIQUE NOT NULL,
    value TEXT NOT NULL,
    description TEXT,
    type TEXT DEFAULT 'string' CHECK (type IN ('string', 'number', 'boolean', 'json')),
    is_public BOOLEAN DEFAULT 0, -- Can be accessed by frontend
    updated_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (updated_by) REFERENCES users(id)
);

-- Enhanced indexes for professional performance

-- User indexes
CREATE INDEX idx_users_uuid ON users(uuid);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_subscription ON users(subscription_type, subscription_expires_at);
CREATE INDEX idx_users_location ON users(location);
CREATE INDEX idx_users_trust_score ON users(trust_score DESC);
CREATE INDEX idx_users_rating ON users(rating DESC, review_count DESC);
CREATE INDEX idx_users_activity ON users(last_activity_at DESC);
CREATE INDEX idx_users_referral ON users(referral_code);
CREATE INDEX idx_users_soft_delete ON users(is_deleted, deleted_at);

-- Pet indexes (enhanced)
CREATE INDEX idx_pets_uuid ON pets(uuid);
CREATE INDEX idx_pets_seller_id ON pets(seller_id, status, created_at DESC);
CREATE INDEX idx_pets_type ON pets(type, status);
CREATE INDEX idx_pets_breed ON pets(breed_id, type);
CREATE INDEX idx_pets_category ON pets(category_id, status);
CREATE INDEX idx_pets_status ON pets(status, created_at DESC);
CREATE INDEX idx_pets_location ON pets(location, status);
CREATE INDEX idx_pets_price ON pets(price, status);
CREATE INDEX idx_pets_age ON pets(age, age_unit, status);
CREATE INDEX idx_pets_gender ON pets(gender, status);
CREATE INDEX idx_pets_size ON pets(size, status);
CREATE INDEX idx_pets_health ON pets(health_status, vaccination_status);
CREATE INDEX idx_pets_features ON pets(is_featured, is_sponsored, is_urgent, created_at DESC);
CREATE INDEX idx_pets_quality ON pets(quality_score DESC, boost_score DESC);
CREATE INDEX idx_pets_expires ON pets(expires_at, status);
CREATE INDEX idx_pets_search ON pets(name, breed, description, status);
CREATE INDEX idx_pets_stats ON pets(view_count DESC, favorite_count DESC);
CREATE INDEX idx_pets_soft_delete ON pets(is_deleted, deleted_at);
CREATE INDEX idx_pets_approval ON pets(approval_status, status);

-- Pet images indexes (enhanced)
CREATE INDEX idx_pet_images_uuid ON pet_images(uuid);
CREATE INDEX idx_pet_images_pet_id ON pet_images(pet_id, sort_order);
CREATE INDEX idx_pet_images_primary ON pet_images(pet_id, is_primary);
CREATE INDEX idx_pet_images_type ON pet_images(image_type, is_approved);
CREATE INDEX idx_pet_images_moderation ON pet_images(moderation_status, created_at);
CREATE INDEX idx_pet_images_soft_delete ON pet_images(is_deleted, deleted_at);

-- Session indexes
CREATE INDEX idx_sessions_user ON user_sessions(user_id, is_active);
CREATE INDEX idx_sessions_token ON user_sessions(session_token);
CREATE INDEX idx_sessions_device ON user_sessions(device_id, user_id);
CREATE INDEX idx_sessions_expires ON user_sessions(expires_at, is_active);
CREATE INDEX idx_sessions_activity ON user_sessions(last_activity_at DESC);

-- Audit log indexes
CREATE INDEX idx_audit_user ON audit_logs(user_id, created_at DESC);
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id, created_at DESC);
CREATE INDEX idx_audit_action ON audit_logs(action, created_at DESC);
CREATE INDEX idx_audit_session ON audit_logs(session_id, created_at DESC);
CREATE INDEX idx_audit_severity ON audit_logs(severity, created_at DESC);

-- Category and breed indexes
CREATE INDEX idx_categories_parent ON categories(parent_id, sort_order);
CREATE INDEX idx_categories_slug ON categories(slug);
CREATE INDEX idx_categories_active ON categories(is_active, sort_order);
CREATE INDEX idx_breeds_category ON breeds(category_id, is_active, name);
CREATE INDEX idx_breeds_slug ON breeds(slug);
CREATE INDEX idx_breeds_popularity ON breeds(popularity_rank);

-- Subscription indexes
CREATE INDEX idx_subscriptions_user ON user_subscriptions(user_id, status, expires_at);
CREATE INDEX idx_subscriptions_plan ON user_subscriptions(plan_id, status);
CREATE INDEX idx_subscriptions_billing ON user_subscriptions(next_billing_date, auto_renew);
CREATE INDEX idx_subscription_plans_active ON subscription_plans(is_active, sort_order);

-- Message indexes (enhanced)
CREATE INDEX idx_conversations_participants ON conversations(participant1_id, participant2_id, status);
CREATE INDEX idx_conversations_pet ON conversations(pet_id, status);
CREATE INDEX idx_conversations_order ON conversations(order_id, status);
CREATE INDEX idx_conversations_activity ON conversations(last_message_at DESC, status);
CREATE INDEX idx_conversations_business ON conversations(is_business_inquiry, inquiry_stage);

CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at DESC);
CREATE INDEX idx_messages_sender ON messages(sender_id, created_at DESC);
CREATE INDEX idx_messages_receiver ON messages(receiver_id, is_read, created_at DESC);
CREATE INDEX idx_messages_type ON messages(message_type, status);
CREATE INDEX idx_messages_thread ON messages(thread_id, created_at);
CREATE INDEX idx_messages_scheduled ON messages(scheduled_at, status);
CREATE INDEX idx_messages_moderation ON messages(moderation_status, flagged);

-- Transaction indexes (enhanced)
CREATE INDEX idx_transactions_user_id ON transactions(user_id, created_at DESC);
CREATE INDEX idx_transactions_type ON transactions(type, status, created_at DESC);
CREATE INDEX idx_transactions_pet ON transactions(pet_id, type);
CREATE INDEX idx_transactions_order ON transactions(order_id, status);
CREATE INDEX idx_transactions_amount ON transactions(amount DESC, created_at DESC);
CREATE INDEX idx_transactions_status ON transactions(status, processed_at);

-- Order indexes (enhanced)
CREATE INDEX idx_orders_buyer ON orders(buyer_id, status, created_at DESC);
CREATE INDEX idx_orders_seller ON orders(seller_id, status, created_at DESC);
CREATE INDEX idx_orders_pet ON orders(pet_id, status);
CREATE INDEX idx_orders_status ON orders(status, created_at DESC);
CREATE INDEX idx_orders_number ON orders(order_number);
CREATE INDEX idx_orders_payment ON orders(payment_status, paid_at);
CREATE INDEX idx_orders_delivery ON orders(delivery_method, status);

-- Favorite indexes
CREATE INDEX idx_favorites_user ON favorites(user_id, created_at DESC);
CREATE INDEX idx_favorites_pet ON favorites(pet_id, created_at DESC);

-- Review indexes (enhanced)
CREATE INDEX idx_reviews_reviewed ON reviews(reviewed_id, status, rating);
CREATE INDEX idx_reviews_reviewer ON reviews(reviewer_id, created_at DESC);
CREATE INDEX idx_reviews_rating ON reviews(rating, status);
CREATE INDEX idx_reviews_order ON reviews(order_id, status);
CREATE INDEX idx_reviews_pet ON reviews(pet_id, status);
CREATE INDEX idx_reviews_verified ON reviews(is_verified, rating);

-- Notification indexes (enhanced)
CREATE INDEX idx_notifications_user ON notifications(user_id, is_read, priority, created_at DESC);
CREATE INDEX idx_notifications_type ON notifications(type, is_read, created_at DESC);
CREATE INDEX idx_notifications_expires ON notifications(expires_at, is_deleted);

-- Support ticket indexes
CREATE INDEX idx_support_tickets_user ON support_tickets(user_id, status);
CREATE INDEX idx_support_tickets_status ON support_tickets(status, priority, created_at DESC);
CREATE INDEX idx_support_tickets_assigned ON support_tickets(assigned_to, status);
CREATE INDEX idx_support_tickets_number ON support_tickets(ticket_number);

-- Advertisement indexes
CREATE INDEX idx_ads_user ON advertisements(user_id, status);
CREATE INDEX idx_ads_pet ON advertisements(pet_id, status);
CREATE INDEX idx_ads_type ON advertisements(type, status);
CREATE INDEX idx_ads_active ON advertisements(status, starts_at, ends_at);
CREATE INDEX idx_ads_performance ON advertisements(impressions DESC, clicks DESC);

-- Analytics indexes
CREATE INDEX idx_page_views_user ON page_views(user_id, created_at DESC);
CREATE INDEX idx_page_views_session ON page_views(session_id, created_at);
CREATE INDEX idx_page_views_page ON page_views(page_url, created_at DESC);
CREATE INDEX idx_page_views_referrer ON page_views(referrer_domain, created_at DESC);
CREATE INDEX idx_page_views_utm ON page_views(utm_source, utm_medium, utm_campaign, created_at DESC);

CREATE INDEX idx_events_user ON events(user_id, created_at DESC);
CREATE INDEX idx_events_session ON events(session_id, created_at);
CREATE INDEX idx_events_name ON events(event_name, event_category, created_at DESC);
CREATE INDEX idx_events_pet ON events(pet_id, event_name);

CREATE INDEX idx_search_queries_user ON search_queries(user_id, created_at DESC);
CREATE INDEX idx_search_queries_text ON search_queries(normalized_query, results_count);
CREATE INDEX idx_search_queries_conversion ON search_queries(conversion, conversion_value);

-- System indexes
CREATE INDEX idx_activity_logs_user ON activity_logs(user_id, created_at DESC);
CREATE INDEX idx_activity_logs_entity ON activity_logs(entity_type, entity_id, created_at DESC);
CREATE INDEX idx_activity_logs_action ON activity_logs(action, created_at DESC);

CREATE INDEX idx_system_settings_key ON system_settings(key);
CREATE INDEX idx_system_settings_public ON system_settings(is_public);

CREATE INDEX idx_system_metrics_name ON system_metrics(metric_name, created_at DESC);
CREATE INDEX idx_system_metrics_category ON system_metrics(category, created_at DESC);

CREATE INDEX idx_feature_flags_name ON feature_flags(name, is_active);
CREATE INDEX idx_user_feature_flags_user ON user_feature_flags(user_id, is_enabled);

-- Advanced database triggers for automation

-- Trigger: Auto-update updated_at timestamp for users
CREATE TRIGGER tr_users_updated_at 
    AFTER UPDATE ON users
    FOR EACH ROW
BEGIN
    UPDATE users SET 
        updated_at = CURRENT_TIMESTAMP,
        version = version + 1
    WHERE id = NEW.id;
END;

-- Trigger: Auto-update updated_at timestamp for pets
CREATE TRIGGER tr_pets_updated_at 
    AFTER UPDATE ON pets
    FOR EACH ROW
BEGIN
    UPDATE pets SET 
        updated_at = CURRENT_TIMESTAMP,
        version = version + 1
    WHERE id = NEW.id;
END;

-- Trigger: Auto-generate pet slug from name
CREATE TRIGGER tr_pets_generate_slug 
    AFTER INSERT ON pets
    FOR EACH ROW
    WHEN NEW.slug IS NULL
BEGIN
    UPDATE pets SET 
        slug = LOWER(REPLACE(REPLACE(REPLACE(NEW.name, ' ', '-'), 'đ', 'd'), 'Đ', 'D')) || '-' || NEW.id
    WHERE id = NEW.id;
END;

-- Trigger: Update conversation last_message info when new message is added
CREATE TRIGGER tr_messages_update_conversation 
    AFTER INSERT ON messages
    FOR EACH ROW
BEGIN
    UPDATE conversations SET 
        last_message_id = NEW.id,
        last_message_at = NEW.created_at,
        last_message_preview = SUBSTR(NEW.content, 1, 100),
        last_sender_id = NEW.sender_id,
        message_count = message_count + 1,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.conversation_id;
    
    -- Update unread count for the receiver
    UPDATE conversations SET 
        unread_count_p1 = CASE WHEN participant1_id != NEW.sender_id THEN unread_count_p1 + 1 ELSE unread_count_p1 END,
        unread_count_p2 = CASE WHEN participant2_id != NEW.sender_id THEN unread_count_p2 + 1 ELSE unread_count_p2 END
    WHERE id = NEW.conversation_id;
END;

-- Trigger: Reset unread count when message is read
CREATE TRIGGER tr_messages_mark_read 
    AFTER UPDATE OF is_read ON messages
    FOR EACH ROW
    WHEN NEW.is_read = 1 AND OLD.is_read = 0
BEGIN
    UPDATE conversations SET 
        unread_count_p1 = CASE 
            WHEN participant1_id = NEW.receiver_id THEN 
                (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = NEW.conversation_id AND m.receiver_id = NEW.receiver_id AND m.is_read = 0 AND m.id != NEW.id)
            ELSE unread_count_p1 END,
        unread_count_p2 = CASE 
            WHEN participant2_id = NEW.receiver_id THEN 
                (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = NEW.conversation_id AND m.receiver_id = NEW.receiver_id AND m.is_read = 0 AND m.id != NEW.id)
            ELSE unread_count_p2 END
    WHERE id = NEW.conversation_id;
END;

-- Trigger: Update pet view count
CREATE TRIGGER tr_increment_pet_views 
    AFTER INSERT ON page_views
    FOR EACH ROW
    WHEN NEW.page_url LIKE '%/pet/%'
BEGIN
    UPDATE pets SET 
        view_count = view_count + 1,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = CAST(SUBSTR(NEW.page_url, INSTR(NEW.page_url, '/pet/') + 5) AS INTEGER);
END;

-- Trigger: Update user rating when new review is added
CREATE TRIGGER tr_update_user_rating 
    AFTER INSERT ON reviews
    FOR EACH ROW
BEGIN
    UPDATE users SET 
        rating = (SELECT AVG(rating) FROM reviews WHERE reviewed_id = NEW.reviewed_id AND status = 'active'),
        review_count = (SELECT COUNT(*) FROM reviews WHERE reviewed_id = NEW.reviewed_id AND status = 'active'),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.reviewed_id;
END;

-- Trigger: Update pet favorite count
CREATE TRIGGER tr_increment_pet_favorites 
    AFTER INSERT ON favorites
    FOR EACH ROW
BEGIN
    UPDATE pets SET 
        favorite_count = favorite_count + 1,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.pet_id;
END;

CREATE TRIGGER tr_decrement_pet_favorites 
    AFTER DELETE ON favorites
    FOR EACH ROW
BEGIN
    UPDATE pets SET 
        favorite_count = favorite_count - 1,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = OLD.pet_id;
END;

-- Trigger: Update category pet count
CREATE TRIGGER tr_increment_category_count 
    AFTER INSERT ON pets
    FOR EACH ROW
    WHEN NEW.category_id IS NOT NULL
BEGIN
    UPDATE categories SET pet_count = pet_count + 1 WHERE id = NEW.category_id;
END;

CREATE TRIGGER tr_decrement_category_count 
    AFTER UPDATE OF status ON pets
    FOR EACH ROW
    WHEN OLD.status != 'deleted' AND NEW.status = 'deleted' AND NEW.category_id IS NOT NULL
BEGIN
    UPDATE categories SET pet_count = pet_count - 1 WHERE id = NEW.category_id;
END;

-- Trigger: Auto-generate referral code for new users
CREATE TRIGGER tr_generate_referral_code 
    AFTER INSERT ON users
    FOR EACH ROW
    WHEN NEW.referral_code IS NULL
BEGIN
    UPDATE users SET 
        referral_code = UPPER(SUBSTR(NEW.name, 1, 3) || SUBSTR(NEW.uuid, 1, 5))
    WHERE id = NEW.id;
END;

-- Trigger: Audit log for important data changes
CREATE TRIGGER tr_audit_user_changes 
    AFTER UPDATE ON users
    FOR EACH ROW
    WHEN OLD.email != NEW.email OR OLD.phone != NEW.phone OR OLD.is_active != NEW.is_active
BEGIN
    INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_values, new_values, changes)
    VALUES (
        NEW.id,
        'update',
        'user',
        NEW.id,
        json_object('email', OLD.email, 'phone', OLD.phone, 'is_active', OLD.is_active),
        json_object('email', NEW.email, 'phone', NEW.phone, 'is_active', NEW.is_active),
        json_object('changed_fields', json_array('email', 'phone', 'is_active'))
    );
END;

-- Professional data validation and constraints

-- Enhanced default values for system settings
INSERT OR IGNORE INTO system_settings (key, value, description, type, is_public) VALUES
('site_name', 'HiPet', 'Site name', 'string', 1),
('commission_rate', '5', 'Commission rate in percentage', 'number', 0),
('max_images_per_pet', '10', 'Maximum images per pet listing', 'number', 1),
('listing_duration_days', '30', 'Default listing duration in days', 'number', 1),
('featured_price', '50000', 'Price for featured listing in VND', 'number', 1),
('boost_price', '20000', 'Price for boost listing in VND', 'number', 1),
('min_withdrawal_amount', '100000', 'Minimum withdrawal amount in VND', 'number', 1),
('max_withdrawal_amount', '10000000', 'Maximum withdrawal amount in VND', 'number', 1),
('support_email', 'support@hipet.com', 'Support email address', 'string', 1),
('support_phone', '1900-1234', 'Support phone number', 'string', 1),
-- Professional settings
('max_login_attempts', '5', 'Maximum login attempts before lock', 'number', 0),
('session_timeout_minutes', '1440', 'Session timeout in minutes (24 hours)', 'number', 0),
('password_min_length', '8', 'Minimum password length', 'number', 1),
('file_upload_max_size', '10485760', 'Maximum file upload size in bytes (10MB)', 'number', 1),
('image_upload_max_size', '5242880', 'Maximum image upload size in bytes (5MB)', 'number', 1),
('auto_approve_listings', '0', 'Auto-approve new listings', 'boolean', 0),
('require_phone_verification', '1', 'Require phone verification for sellers', 'boolean', 1),
('enable_escrow', '1', 'Enable escrow for transactions', 'boolean', 1),
('maintenance_mode', '0', 'Enable maintenance mode', 'boolean', 0),
('analytics_enabled', '1', 'Enable analytics tracking', 'boolean', 1),
('chat_enabled', '1', 'Enable chat system', 'boolean', 1),
('reviews_enabled', '1', 'Enable review system', 'boolean', 1),
('notifications_enabled', '1', 'Enable notifications', 'boolean', 1),
('search_suggestions_enabled', '1', 'Enable search suggestions', 'boolean', 1),
('image_optimization_enabled', '1', 'Enable automatic image optimization', 'boolean', 1),
('backup_retention_days', '90', 'Data backup retention in days', 'number', 0),
('gdpr_compliance_enabled', '1', 'Enable GDPR compliance features', 'boolean', 0),
('audit_log_retention_days', '365', 'Audit log retention in days', 'number', 0),
('rate_limit_requests_per_minute', '60', 'API rate limit per minute', 'number', 0);

-- Insert default subscription plans
INSERT OR IGNORE INTO subscription_plans (name, slug, description, features, price_monthly, price_yearly, max_listings, max_images_per_listing, max_featured_listings, analytics_access, priority_support, verified_badge, sort_order) VALUES
('Free', 'free', 'Dành cho người dùng cá nhân', '["Đăng tối đa 3 tin", "Tối đa 5 ảnh mỗi tin", "Hỗ trợ cơ bản", "Tìm kiếm cơ bản"]', 0, 0, 3, 5, 0, 0, 0, 0, 1),
('Basic', 'basic', 'Dành cho người bán thường xuyên', '["Đăng tối đa 20 tin", "Tối đa 10 ảnh mỗi tin", "1 tin nổi bật/tháng", "Thống kê cơ bản", "Hỗ trợ ưu tiên"]', 99000, 990000, 20, 10, 1, 1, 1, 1, 2),
('Premium', 'premium', 'Dành cho người bán chuyên nghiệp', '["Đăng không giới hạn", "Tối đa 15 ảnh mỗi tin", "5 tin nổi bật/tháng", "Thống kê chi tiết", "Hỗ trợ 24/7", "Tùy chỉnh giao diện", "API access"]', 299000, 2990000, -1, 15, 5, 1, 1, 1, 3),
('Enterprise', 'enterprise', 'Dành cho doanh nghiệp', '["Tất cả tính năng Premium", "Quản lý nhiều tài khoản", "Báo cáo tùy chỉnh", "Tích hợp API", "Hỗ trợ dedicated", "SLA 99.9%"]', 999000, 9990000, -1, 20, 20, 1, 1, 1, 4);

-- Insert enhanced categories with proper slugs
INSERT OR IGNORE INTO categories (type, name, slug, icon, description, sort_order) VALUES
('dog', 'Chó', 'cho', 'fas fa-dog', 'Chó cảnh và chó giống', 1),
('cat', 'Mèo', 'meo', 'fas fa-cat', 'Mèo cảnh và mèo giống', 2),
('bird', 'Chim', 'chim', 'fas fa-dove', 'Chim cảnh và chim kiểng', 3),
('fish', 'Cá', 'ca', 'fas fa-fish', 'Cá cảnh và cá kiểng', 4),
('rabbit', 'Thỏ', 'tho', 'fas fa-rabbit', 'Thỏ cảnh và thỏ giống', 5),
('hamster', 'Chuột hamster', 'chuot-hamster', 'fas fa-mouse', 'Chuột hamster và các loại gặm nhấm', 6),
('reptile', 'Bò sát', 'bo-sat', 'fas fa-dragon', 'Rùa, thằn lằn, rắn cảnh', 7),
('other', 'Khác', 'khac', 'fas fa-paw', 'Các loại thú cưng khác', 8);

-- Insert some popular dog breeds
INSERT OR IGNORE INTO breeds (category_id, name, slug, description, typical_size, typical_weight, lifespan, temperament, is_active) VALUES
(1, 'Golden Retriever', 'golden-retriever', 'Giống chó thân thiện, thông minh và dễ huấn luyện', 'Lớn', '25-35 kg', '10-12 năm', 'Thân thiện, năng động, thông minh', 1),
(1, 'Husky Siberia', 'husky-siberia', 'Giống chó có nguồn gốc từ Siberia, thích hợp khí hậu lạnh', 'Lớn', '20-27 kg', '12-15 năm', 'Năng động, độc lập, thông minh', 1),
(1, 'Poodle', 'poodle', 'Giống chó thông minh, dễ huấn luyện với bộ lông xoăn đặc trưng', 'Trung bình', '15-25 kg', '12-15 năm', 'Thông minh, năng động, trung thành', 1),
(1, 'Phốc Sóc', 'phoc-soc', 'Giống chó nhỏ, lông dài và mịn, rất phổ biến tại Việt Nam', 'Nhỏ', '1.5-3 kg', '12-16 năm', 'Năng động, thông minh, trung thành', 1);

-- Insert some popular cat breeds
INSERT OR IGNORE INTO breeds (category_id, name, slug, description, typical_size, typical_weight, lifespan, temperament, is_active) VALUES
(2, 'Mèo Ba Tư', 'meo-ba-tu', 'Giống mèo có bộ lông dài và khuôn mặt tròn đặc trưng', 'Trung bình', '3.5-5.5 kg', '12-17 năm', 'Hiền lành, yên tĩnh, trung thành', 1),
(2, 'Mèo Anh Lông Ngắn', 'meo-anh-long-ngan', 'Giống mèo có thân hình chắc khỏe và bộ lông ngắn', 'Trung bình', '3-7 kg', '14-20 năm', 'Hiền lành, độc lập, dễ chăm sóc', 1),
(2, 'Mèo Munchkin', 'meo-munchkin', 'Giống mèo có chân ngắn đặc trưng, rất đáng yêu', 'Nhỏ', '2.7-4 kg', '12-15 năm', 'Năng động, thân thiện, vui tươi', 1),
(2, 'Mèo Tai Cụp Scotland', 'meo-tai-cup-scotland', 'Giống mèo có đôi tai cụp xuống đặc trưng', 'Trung bình', '3-6 kg', '11-14 năm', 'Hiền lành, thân thiện, dễ gần', 1);

-- Professional database views for analytics and reporting

-- View: Active pets with seller information
CREATE VIEW vw_active_pets AS
SELECT 
    p.*,
    u.name as seller_name,
    u.email as seller_email,
    u.phone as seller_phone,
    u.rating as seller_rating,
    u.trust_score as seller_trust_score,
    u.is_verified as seller_verified,
    c.name as category_name,
    b.name as breed_name,
    (SELECT image_url FROM pet_images pi WHERE pi.pet_id = p.id AND pi.is_primary = 1 LIMIT 1) as primary_image_url,
    (SELECT COUNT(*) FROM pet_images pi WHERE pi.pet_id = p.id) as image_count
FROM pets p
LEFT JOIN users u ON p.seller_id = u.id
LEFT JOIN categories c ON p.category_id = c.id
LEFT JOIN breeds b ON p.breed_id = b.id
WHERE p.status = 'active' AND p.is_deleted = 0 AND u.is_active = 1;

-- View: User statistics and performance
CREATE VIEW vw_user_stats AS
SELECT 
    u.id,
    u.uuid,
    u.name,
    u.email,
    u.role,
    u.subscription_type,
    u.trust_score,
    u.rating,
    u.review_count,
    u.total_sales,
    u.total_purchases,
    u.successful_transactions,
    u.cancelled_transactions,
    u.response_rate,
    u.response_time,
    (SELECT COUNT(*) FROM pets p WHERE p.seller_id = u.id AND p.status = 'active') as active_listings,
    (SELECT COUNT(*) FROM pets p WHERE p.seller_id = u.id AND p.status = 'sold') as sold_listings,
    (SELECT COUNT(*) FROM conversations c WHERE c.participant1_id = u.id OR c.participant2_id = u.id) as conversation_count,
    (SELECT COUNT(*) FROM orders o WHERE o.buyer_id = u.id OR o.seller_id = u.id) as total_orders,
    (SELECT SUM(o.total_amount) FROM orders o WHERE o.seller_id = u.id AND o.status = 'completed') as total_revenue,
    (SELECT AVG(r.rating) FROM reviews r WHERE r.reviewed_id = u.id AND r.status = 'active') as avg_rating,
    u.created_at,
    u.last_activity_at
FROM users u
WHERE u.is_deleted = 0;

-- View: Pet analytics and performance
CREATE VIEW vw_pet_analytics AS
SELECT 
    p.id,
    p.uuid,
    p.name,
    p.type,
    p.category_id,
    p.breed_id,
    p.price,
    p.status,
    p.view_count,
    p.unique_view_count,
    p.favorite_count,
    p.inquiry_count,
    p.quality_score,
    p.is_featured,
    p.is_sponsored,
    CAST((julianday('now') - julianday(p.created_at)) AS INTEGER) as days_listed,
    CASE 
        WHEN p.status = 'sold' THEN CAST((julianday(p.sold_at) - julianday(p.created_at)) AS INTEGER)
        ELSE NULL 
    END as days_to_sell,
    (p.view_count * 1.0 / NULLIF(CAST((julianday('now') - julianday(p.created_at)) AS INTEGER), 0)) as views_per_day,
    (p.inquiry_count * 100.0 / NULLIF(p.view_count, 0)) as inquiry_rate,
    (SELECT COUNT(*) FROM messages m JOIN conversations c ON m.conversation_id = c.id WHERE c.pet_id = p.id) as message_count,
    u.name as seller_name,
    u.trust_score as seller_trust_score,
    p.created_at,
    p.updated_at
FROM pets p
LEFT JOIN users u ON p.seller_id = u.id
WHERE p.is_deleted = 0;

-- View: Order analytics
CREATE VIEW vw_order_analytics AS
SELECT 
    o.*,
    buyer.name as buyer_name,
    buyer.email as buyer_email,
    seller.name as seller_name,
    seller.email as seller_email,
    p.name as pet_name,
    p.type as pet_type,
    p.breed as pet_breed,
    CAST((julianday(o.completed_at) - julianday(o.created_at)) AS INTEGER) as processing_days,
    CASE 
        WHEN o.status = 'completed' THEN 1 
        ELSE 0 
    END as is_successful
FROM orders o
LEFT JOIN users buyer ON o.buyer_id = buyer.id
LEFT JOIN users seller ON o.seller_id = seller.id
LEFT JOIN pets p ON o.pet_id = p.id;

-- View: Conversation analytics
CREATE VIEW vw_conversation_analytics AS
SELECT 
    c.*,
    p1.name as participant1_name,
    p2.name as participant2_name,
    pet.name as pet_name,
    pet.price as pet_price,
    c.message_count,
    CASE 
        WHEN c.message_count > 0 THEN 
            CAST((julianday(c.last_message_at) - julianday(c.created_at)) AS REAL) * 24 * 60 
        ELSE 0 
    END as conversation_duration_minutes,
    (c.message_count * 1.0 / NULLIF(CAST((julianday(c.last_message_at) - julianday(c.created_at)) AS REAL) + 1, 0)) as messages_per_day
FROM conversations c
LEFT JOIN users p1 ON c.participant1_id = p1.id
LEFT JOIN users p2 ON c.participant2_id = p2.id
LEFT JOIN pets pet ON c.pet_id = pet.id
WHERE c.status = 'active';

-- View: Revenue analytics
CREATE VIEW vw_revenue_analytics AS
SELECT 
    DATE(t.created_at) as transaction_date,
    t.type,
    COUNT(*) as transaction_count,
    SUM(t.amount) as total_amount,
    AVG(t.amount) as avg_amount,
    SUM(CASE WHEN t.type = 'sale' THEN t.amount ELSE 0 END) as sales_revenue,
    SUM(CASE WHEN t.type = 'commission' THEN t.amount ELSE 0 END) as commission_revenue,
    COUNT(DISTINCT t.user_id) as unique_users
FROM transactions t
WHERE t.status = 'completed'
GROUP BY DATE(t.created_at), t.type;

-- View: Popular breeds and categories
CREATE VIEW vw_category_breed_stats AS
SELECT 
    c.id as category_id,
    c.name as category_name,
    c.type as category_type,
    b.id as breed_id,
    b.name as breed_name,
    COUNT(p.id) as pet_count,
    AVG(p.price) as avg_price,
    MIN(p.price) as min_price,
    MAX(p.price) as max_price,
    AVG(p.view_count) as avg_views,
    SUM(p.view_count) as total_views,
    COUNT(CASE WHEN p.status = 'sold' THEN 1 END) as sold_count,
    (COUNT(CASE WHEN p.status = 'sold' THEN 1 END) * 100.0 / NULLIF(COUNT(p.id), 0)) as sell_rate
FROM categories c
LEFT JOIN breeds b ON c.id = b.category_id
LEFT JOIN pets p ON (p.category_id = c.id AND (p.breed_id = b.id OR b.id IS NULL))
WHERE p.is_deleted = 0 OR p.id IS NULL
GROUP BY c.id, c.name, c.type, b.id, b.name;

-- View: Search analytics
CREATE VIEW vw_search_analytics AS
SELECT 
    DATE(sq.created_at) as search_date,
    sq.normalized_query,
    COUNT(*) as search_count,
    AVG(sq.results_count) as avg_results,
    SUM(sq.results_clicked) as total_clicks,
    (SUM(sq.results_clicked) * 100.0 / NULLIF(SUM(sq.results_count), 0)) as click_through_rate,
    COUNT(CASE WHEN sq.conversion = 1 THEN 1 END) as conversions,
    (COUNT(CASE WHEN sq.conversion = 1 THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0)) as conversion_rate
FROM search_queries sq
GROUP BY DATE(sq.created_at), sq.normalized_query
HAVING COUNT(*) >= 5; -- Only show queries with 5+ searches

-- Professional completion message
-- HiPet Professional Database Schema v2.0
-- Features: UUID support, soft deletes, audit trails, analytics, subscriptions, 
-- advanced messaging, comprehensive indexing, automated triggers, business intelligence
-- Total tables: 30+ with professional-grade features
-- Optimized for: Scalability, Performance, Analytics, Security, Compliance

-- Insert default system settings
INSERT INTO system_settings (key, value, description, type, is_public) VALUES
('site_name', 'HiPet', 'Site name', 'string', 1),
('commission_rate', '5', 'Commission rate in percentage', 'number', 0),
('max_images_per_pet', '10', 'Maximum images per pet listing', 'number', 1),
('listing_duration_days', '30', 'Default listing duration in days', 'number', 1),
('featured_price', '50000', 'Price for featured listing in VND', 'number', 1),
('boost_price', '20000', 'Price for boost listing in VND', 'number', 1),
('min_withdrawal_amount', '100000', 'Minimum withdrawal amount in VND', 'number', 1),
('max_withdrawal_amount', '10000000', 'Maximum withdrawal amount in VND', 'number', 1),
('support_email', 'support@hipet.com', 'Support email address', 'string', 1),
('support_phone', '1900-1234', 'Support phone number', 'string', 1);

-- Insert default categories
INSERT INTO categories (type, name, icon, description, sort_order) VALUES
('dog', 'Chó', 'fas fa-dog', 'Chó cảnh và chó giống', 1),
('cat', 'Mèo', 'fas fa-cat', 'Mèo cảnh và mèo giống', 2),
('bird', 'Chim', 'fas fa-dove', 'Chim cảnh và chim kiểng', 3),
('fish', 'Cá', 'fas fa-fish', 'Cá cảnh và cá kiểng', 4),
('rabbit', 'Thỏ', 'fas fa-rabbit', 'Thỏ cảnh và thỏ giống', 5),
('hamster', 'Chuột hamster', 'fas fa-mouse', 'Chuột hamster và các loại gặm nhấm', 6),
('reptile', 'Bò sát', 'fas fa-dragon', 'Rùa, thằn lằn, rắn cảnh', 7),
('other', 'Khác', 'fas fa-paw', 'Các loại thú cưng khác', 8);

-- Analytics tables for professional reporting

-- Page views table - Track all page views and user behavior
CREATE TABLE page_views (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uuid TEXT UNIQUE NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))), -- UUID v4
    user_id INTEGER, -- NULL for anonymous users
    session_id TEXT,
    page_url TEXT NOT NULL,
    page_title TEXT,
    referrer_url TEXT,
    referrer_domain TEXT,
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT,
    utm_term TEXT,
    utm_content TEXT,
    -- Device and browser info
    device_type TEXT, -- mobile, tablet, desktop
    browser_name TEXT,
    browser_version TEXT,
    os_name TEXT,
    os_version TEXT,
    screen_resolution TEXT,
    viewport_size TEXT,
    -- Geographic info
    ip_address TEXT,
    country_code TEXT,
    country_name TEXT,
    region TEXT,
    city TEXT,
    timezone TEXT,
    -- Engagement metrics
    time_on_page INTEGER, -- seconds
    scroll_depth INTEGER, -- percentage
    bounce BOOLEAN DEFAULT 0,
    exit_page BOOLEAN DEFAULT 0,
    conversion BOOLEAN DEFAULT 0,
    conversion_value INTEGER,
    -- A/B testing
    experiment_id TEXT,
    variant TEXT,
    -- Timestamps
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Events table - Track specific user actions and events
CREATE TABLE events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uuid TEXT UNIQUE NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))), -- UUID v4
    user_id INTEGER,
    session_id TEXT,
    event_name TEXT NOT NULL, -- 'pet_viewed', 'search_performed', 'contact_seller', etc.
    event_category TEXT, -- 'engagement', 'commerce', 'navigation', etc.
    event_action TEXT,
    event_label TEXT,
    event_value REAL,
    -- Related entities
    pet_id INTEGER,
    order_id INTEGER,
    conversation_id INTEGER,
    -- Event properties (JSON)
    properties TEXT,
    -- Context
    page_url TEXT,
    referrer_url TEXT,
    user_agent TEXT,
    ip_address TEXT,
    -- Timestamps
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (pet_id) REFERENCES pets(id),
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (conversation_id) REFERENCES conversations(id)
);

-- Search queries table - Track search behavior
CREATE TABLE search_queries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uuid TEXT UNIQUE NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))), -- UUID v4
    user_id INTEGER,
    session_id TEXT,
    query_text TEXT NOT NULL,
    normalized_query TEXT, -- Cleaned/normalized version
    -- Filters applied
    category_filter TEXT,
    breed_filter TEXT,
    location_filter TEXT,
    price_min_filter INTEGER,
    price_max_filter INTEGER,
    age_filter TEXT,
    gender_filter TEXT,
    -- Search results
    results_count INTEGER DEFAULT 0,
    results_clicked INTEGER DEFAULT 0,
    first_click_position INTEGER,
    -- Search context
    search_type TEXT DEFAULT 'general', -- 'general', 'autocomplete', 'voice', 'image'
    source_page TEXT,
    -- Performance
    response_time_ms INTEGER,
    -- Success metrics
    conversion BOOLEAN DEFAULT 0,
    conversion_value INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- User behavior patterns table - ML/AI insights
CREATE TABLE user_behavior_patterns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    pattern_type TEXT NOT NULL, -- 'browsing', 'purchasing', 'messaging', etc.
    pattern_data TEXT NOT NULL, -- JSON data
    confidence_score REAL DEFAULT 0.0,
    last_seen_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE(user_id, pattern_type)
);

-- Business intelligence reports table
CREATE TABLE bi_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uuid TEXT UNIQUE NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))), -- UUID v4
    name TEXT NOT NULL,
    description TEXT,
    report_type TEXT NOT NULL, -- 'daily', 'weekly', 'monthly', 'quarterly', 'custom'
    category TEXT, -- 'sales', 'traffic', 'users', 'engagement', etc.
    sql_query TEXT, -- The SQL query to generate the report
    parameters TEXT, -- JSON parameters for the query
    data TEXT, -- JSON report data
    chart_config TEXT, -- JSON chart configuration
    created_by INTEGER,
    is_public BOOLEAN DEFAULT 0,
    is_automated BOOLEAN DEFAULT 0,
    schedule_cron TEXT, -- Cron expression for automated reports
    last_generated_at DATETIME,
    next_generation_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Data exports table - Track data exports for compliance
CREATE TABLE data_exports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uuid TEXT UNIQUE NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))), -- UUID v4
    user_id INTEGER,
    requested_by INTEGER NOT NULL, -- Who requested the export
    export_type TEXT NOT NULL, -- 'user_data', 'analytics', 'transactions', etc.
    export_format TEXT DEFAULT 'json', -- 'json', 'csv', 'xlsx', 'pdf'
    filters TEXT, -- JSON export filters
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'expired')),
    file_url TEXT,
    file_key TEXT, -- R2 key
    file_size INTEGER,
    expires_at DATETIME, -- When the export file expires
    download_count INTEGER DEFAULT 0,
    last_downloaded_at DATETIME,
    error_message TEXT,
    processing_started_at DATETIME,
    processing_completed_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (requested_by) REFERENCES users(id)
);

-- System health metrics table
CREATE TABLE system_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    metric_name TEXT NOT NULL,
    metric_value REAL NOT NULL,
    metric_unit TEXT,
    metric_type TEXT DEFAULT 'gauge', -- 'gauge', 'counter', 'histogram'
    category TEXT, -- 'performance', 'business', 'technical', etc.
    tags TEXT, -- JSON tags for filtering
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Feature flags table - For A/B testing and feature rollouts
CREATE TABLE feature_flags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uuid TEXT UNIQUE NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))), -- UUID v4
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    flag_type TEXT DEFAULT 'boolean' CHECK (flag_type IN ('boolean', 'string', 'number', 'json')),
    default_value TEXT NOT NULL,
    is_active BOOLEAN DEFAULT 1,
    rollout_percentage INTEGER DEFAULT 0, -- 0-100
    target_audience TEXT, -- JSON criteria for targeting
    environment TEXT DEFAULT 'production', -- 'development', 'staging', 'production'
    created_by INTEGER,
    updated_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id),
    FOREIGN KEY (updated_by) REFERENCES users(id)
);

-- User feature flags table - Track which features are enabled for each user
CREATE TABLE user_feature_flags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    feature_flag_id INTEGER NOT NULL,
    is_enabled BOOLEAN DEFAULT 1,
    override_value TEXT, -- Override the default value
    assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (feature_flag_id) REFERENCES feature_flags(id),
    UNIQUE(user_id, feature_flag_id)
);

-- Enhanced indexes for professional performance