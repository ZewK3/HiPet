// HiPet Backend with D1 Database and R2 Storage - JavaScript Version
// This worker handles all API endpoints for the HiPet pet trading platform

// Global variables for this request
var DB;
var BUCKET;
var CACHE;
var JWT_SECRET;

// Declare globally available bindings for this request
function setupGlobals(env) {
    globalThis.DB = env.DB;
    globalThis.BUCKET = env.BUCKET;
    globalThis.CACHE = env.CACHE;
    globalThis.JWT_SECRET = env.JWT_SECRET || 'your-secret-key';
}

export default {
    async fetch(request, env, ctx) {
        return handleRequest(request, env, ctx);
    }
};

// ==============================================
// MAINTENANCE MODE MIDDLEWARE
// ==============================================

async function checkMaintenanceModeMiddleware() {
    try {
        if (!globalThis.DB) {
            console.error('Database not available for maintenance check');
            return null; // Allow request to continue if DB is not available
        }

        const maintenanceSetting = await globalThis.DB.prepare(`
            SELECT value FROM system_settings WHERE key = 'maintenance_mode'
        `).first();

        if (maintenanceSetting && maintenanceSetting.value === '1') {
            console.log('🛠️ Maintenance mode active - blocking API request');
            return new Response(JSON.stringify({
                success: false,
                message: 'Hệ thống đang bảo trì',
                error: 'MAINTENANCE_MODE_ACTIVE',
                maintenance_mode: true,
                timestamp: new Date().toISOString()
            }), {
                status: 503, // Service Unavailable
                headers: { 
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                }
            });
        }

        return null; // No maintenance mode, allow request to continue
    } catch (error) {
        console.error('Error checking maintenance mode:', error);
        return null; // Allow request to continue if check fails
    }
}

async function handleRequest(request, env, ctx) {
    // Validate environment variables
    console.log('Environment check:', {
        hasDB: !!env.DB,
        hasBUCKET: !!env.BUCKET,
        hasCACHE: !!env.CACHE,
        hasJWT_SECRET: !!env.JWT_SECRET
    });
    
    if (!env.DB) {
        console.error('Database not available in environment');
        return new Response(JSON.stringify({ 
            message: 'Cấu hình cơ sở dữ liệu không hợp lệ',
            error: 'DATABASE_NOT_CONFIGURED'
        }), {
            status: 500,
            headers: { 
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        });
    }
    
    // Make environment variables available globally for this request
    globalThis.DB = env.DB;
    globalThis.BUCKET = env.BUCKET;
    globalThis.CACHE = env.CACHE;
    globalThis.JWT_SECRET = env.JWT_SECRET || 'your-secret-key';
    
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // CORS headers
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    // Handle preflight requests
    if (method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        let response;

        // Check maintenance mode for all API endpoints (except system/status)
        if (path.startsWith('/api') && path !== '/api/system/status' && path !== '/api/health') {
            const maintenanceCheck = await checkMaintenanceModeMiddleware();
            if (maintenanceCheck) {
                return maintenanceCheck; // Return maintenance response
            }
        }

        // Route handling
        if (path.startsWith('/api/auth/')) {
            response = await handleAuth(request, path, method);
        } else if (path.startsWith('/api/admin/')) {
            response = await handleAdmin(request, path, method);
        } else if (path.startsWith('/api/support/')) {
            response = await handleSupport(request, path, method);
        } else if (path.startsWith('/api/pets')) {
            response = await handlePets(request, path, method);
        } else if (path.startsWith('/api/users')) {
            response = await handleUsers(request, path, method);
        } else if (path.startsWith('/api/wallet')) {
            response = await handleWallet(request, path, method);
        } else if (path.startsWith('/api/search')) {
            response = await handleSearch(request, path, method);
        } else if (path.startsWith('/api/ads')) {
            response = await handleAds(request, path, method);
        } else if (path.startsWith('/api/upload')) {
            response = await handleUpload(request, path, method);
        } else if (path === '/api/health') {
            response = new Response(JSON.stringify({ 
                status: 'healthy', 
                timestamp: new Date().toISOString() 
            }), {
                headers: { 'Content-Type': 'application/json' }
            });
        } else if (path === '/api/system/status') {
            response = await handleSystemStatus(request, path, method);
        } else {
            response = new Response(JSON.stringify({ 
                message: 'Endpoint not found',
                path: path 
            }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Add CORS headers to response
        Object.entries(corsHeaders).forEach(([key, value]) => {
            response.headers.set(key, value);
        });

        return response;
    } catch (error) {
        console.error('Worker error:', error);
        console.error('Error details:', {
            message: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : 'No stack trace',
            type: typeof error,
            request: {
                url: request.url,
                method: request.method,
                path: path
            }
        });
        
        const errorResponse = new Response(JSON.stringify({ 
            message: 'Có lỗi xảy ra khi đăng ký',
            error: 'INTERNAL_SERVER_ERROR',
            details: error instanceof Error ? error.message : 'Unknown error',
            path: path,
            method: request.method
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });

        // Add CORS headers to error response
        Object.entries(corsHeaders).forEach(([key, value]) => {
            errorResponse.headers.set(key, value);
        });

        return errorResponse;
    }
}

// Authentication endpoints
async function handleAuth(request, path, method) {
    if (path === '/api/auth/login' && method === 'POST') {
        return await handleLogin(request);
    } else if (path === '/api/auth/register' && method === 'POST') {
        return await handleRegister(request);
    } else if (path === '/api/auth/logout' && method === 'POST') {
        return await handleLogout(request);
    } else if (path === '/api/auth/verify' && method === 'GET') {
        return await handleVerifyToken(request);
    }

    return new Response(JSON.stringify({ message: 'Auth endpoint not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
    });
}

async function handleLogin(request) {
    try {
        const requestBody = await request.json();
        const { email, password } = requestBody;
        
        if (!email || !password) {
            return new Response(JSON.stringify({ 
                message: 'Email và mật khẩu là bắt buộc' 
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Get user from database
        const user = await globalThis.DB.prepare('SELECT * FROM users WHERE email = ? AND is_deleted = 0').bind(email).first();
        
        if (!user) {
            return new Response(JSON.stringify({ 
                message: 'Email hoặc mật khẩu không đúng' 
            }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Hash the input password and compare with stored hash
        const hashedPassword = await hashPassword(password);
        if (hashedPassword !== user.password) {
            return new Response(JSON.stringify({ 
                message: 'Email hoặc mật khẩu không đúng' 
            }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Update last activity
        await globalThis.DB.prepare('UPDATE users SET last_activity_at = datetime("now"), updated_at = datetime("now") WHERE id = ?')
            .bind(user.id).run();

        // Generate JWT token
        const token = await generateJWT({ 
            id: user.id, 
            email: user.email, 
            name: user.name 
        });

        // Return user data without password
        const { password: _, ...userWithoutPassword } = user;
        
        return new Response(JSON.stringify({
            message: 'Đăng nhập thành công',
            user: userWithoutPassword,
            token
        }), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Login error:', error);
        return new Response(JSON.stringify({ 
            message: 'Có lỗi xảy ra khi đăng nhập' 
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

async function handleRegister(request) {
    try {
        console.log('Registration request received');
        
        // Test database connection first
        try {
            await globalThis.DB.prepare('SELECT 1 as test').first();
            console.log('Database connection successful');
        } catch (dbError) {
            console.error('Database connection failed:', dbError);
            return new Response(JSON.stringify({ 
                message: 'Lỗi kết nối cơ sở dữ liệu',
                error: 'DATABASE_CONNECTION_FAILED',
                details: dbError instanceof Error ? dbError.message : 'Unknown database error'
            }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        
        // Check if users table exists
        try {
            await globalThis.DB.prepare('SELECT name FROM sqlite_master WHERE type="table" AND name="users"').first();
            console.log('Users table exists');
        } catch (tableError) {
            console.error('Users table check failed:', tableError);
            return new Response(JSON.stringify({ 
                message: 'Bảng users không tồn tại. Vui lòng khởi tạo database schema.',
                error: 'USERS_TABLE_NOT_FOUND',
                details: 'Run: wrangler d1 execute hipet-db --file=./schema-optimized.sql'
            }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        
        const requestBody = await request.json();
        
        console.log('Registration request body:', { 
            ...requestBody, 
            password: '[REDACTED]' 
        });
        
        const { name, email, password, phone } = requestBody;
        
        // Validate required fields
        if (!name || !email || !password) {
            console.log('Validation failed: missing required fields');
            return new Response(JSON.stringify({ 
                message: 'Tên, email và mật khẩu là bắt buộc',
                error: 'MISSING_REQUIRED_FIELDS'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            console.log('Validation failed: invalid email format');
            return new Response(JSON.stringify({ 
                message: 'Email không đúng định dạng',
                error: 'INVALID_EMAIL_FORMAT'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Validate password length
        if (password.length < 6) {
            console.log('Validation failed: password too short');
            return new Response(JSON.stringify({ 
                message: 'Mật khẩu phải có ít nhất 6 ký tự',
                error: 'PASSWORD_TOO_SHORT'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        console.log('Checking for existing user');
        
        // Check if user already exists
        const existingUser = await globalThis.DB.prepare('SELECT id FROM users WHERE email = ? AND is_deleted = 0').bind(email).first();
        
        if (existingUser) {
            console.log('User already exists with email:', email);
            return new Response(JSON.stringify({ 
                message: 'Email đã được sử dụng',
                error: 'EMAIL_ALREADY_EXISTS'
            }), {
                status: 409,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        console.log('Creating new user');
        
        // Hash password before storing
        const hashedPassword = await hashPassword(password);
        console.log('Password hashed successfully');
        
        // Insert new user with simplified query
        const userUuid = crypto.randomUUID();
        console.log('Generated UUID:', userUuid);
        
        const result = await globalThis.DB.prepare(`
            INSERT INTO users (
                uuid, name, email, password, phone, role, subscription_type, 
                balance, escrow_balance, is_active, trust_score, rating,
                marketing_consent, language_preference, timezone, currency_preference,
                created_at, updated_at, version
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'), 1)
        `).bind(
            userUuid, name, email, hashedPassword, phone || null, 'user', 'free',
            0, 0, 1, 100, 5.0,
            1, 'vi', 'Asia/Ho_Chi_Minh', 'VND'
        ).run();

        console.log('Database insert result:', result);

        if (!result.success) {
            console.error('Database insert failed:', result);
            throw new Error(`Database insert failed: ${JSON.stringify(result)}`);
        }

        console.log('User created successfully, retrieving user data');
        
        // Get the created user
        const user = await globalThis.DB.prepare('SELECT * FROM users WHERE id = ? AND is_deleted = 0').bind(result.meta.last_row_id).first();
        
        if (!user) {
            console.error('Failed to retrieve created user with ID:', result.meta.last_row_id);
            throw new Error('Failed to retrieve created user');
        }

        console.log('User retrieved successfully, generating JWT');

        // Generate JWT token
        const token = await generateJWT({ 
            id: user.id, 
            email: user.email, 
            name: user.name 
        });

        console.log('JWT generated successfully');

        // Return user data without password
        const { password: _, ...userWithoutPassword } = user;
        
        console.log('Registration completed successfully for user:', user.email);
        
        return new Response(JSON.stringify({
            message: 'Đăng ký thành công',
            user: userWithoutPassword,
            token
        }), {
            status: 201,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Register error:', error);
        
        // Return detailed error for debugging
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const errorStack = error instanceof Error ? error.stack : 'No stack trace';
        
        console.error('Full error details:', {
            message: errorMessage,
            stack: errorStack,
            type: typeof error,
            error: error
        });
        
        return new Response(JSON.stringify({ 
            message: 'Có lỗi xảy ra khi đăng ký',
            error: 'REGISTRATION_FAILED',
            details: errorMessage,
            debug: errorStack ? errorStack.substring(0, 500) : 'No stack trace available'
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

async function handleLogout(request) {
    // In a stateless JWT system, logout is handled client-side
    // You could implement token blacklisting here if needed
    return new Response(JSON.stringify({ message: 'Đăng xuất thành công' }), {
        headers: { 'Content-Type': 'application/json' }
    });
}

async function handleVerifyToken(request) {
    try {
        const user = await verifyJWTFromRequest(request);
        
        if (!user) {
            return new Response(JSON.stringify({ message: 'Token không hợp lệ' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Get updated user data
        const userData = await globalThis.DB.prepare('SELECT * FROM users WHERE id = ? AND is_deleted = 0').bind(user.id).first();
        
        if (!userData) {
            return new Response(JSON.stringify({ message: 'Người dùng không tồn tại' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Return user data without password
        const { password: _, ...userWithoutPassword } = userData;
        
        return new Response(JSON.stringify({
            message: 'Token hợp lệ',
            user: userWithoutPassword
        }), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Verify token error:', error);
        return new Response(JSON.stringify({ 
            message: 'Có lỗi xảy ra khi xác thực token' 
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// Pets endpoints
async function handlePets(request, path, method) {
    const segments = path.split('/').filter(Boolean);
    
    if (method === 'GET') {
        if (segments.length === 2) { // /api/pets
            return await getPets(request);
        } else if (segments.length === 3) { // /api/pets/{id}
            const petId = segments[2];
            return await getPetById(petId);
        } else if (segments.length === 4) {
            if (segments[2] === 'featured') { // /api/pets/featured
                return await getFeaturedPets(request);
            } else if (segments[2] === 'recent') { // /api/pets/recent
                return await getRecentPets(request);
            } else { // /api/pets/{id}/images
                const petId = segments[2];
                if (segments[3] === 'images') {
                    return await getPetImages(petId);
                }
            }
        }
    } else if (method === 'POST') {
        if (segments.length === 2) { // /api/pets
            return await createPet(request);
        } else if (segments.length === 4 && segments[3] === 'favorite') { // /api/pets/{id}/favorite
            const petId = segments[2];
            return await toggleFavorite(request, petId);
        }
    }

    return new Response(JSON.stringify({ message: 'Pets endpoint not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
    });
}

async function getPets(request) {
    try {
        const url = new URL(request.url);
        const page = parseInt(url.searchParams.get('page') || '1');
        const limit = parseInt(url.searchParams.get('limit') || '20');
        const category = url.searchParams.get('category');
        const type = url.searchParams.get('type');
        const minPrice = url.searchParams.get('minPrice');
        const maxPrice = url.searchParams.get('maxPrice');
        const location = url.searchParams.get('location');
        const breed = url.searchParams.get('breed');
        const age = url.searchParams.get('age');
        const gender = url.searchParams.get('gender');
        const search = url.searchParams.get('search');

        const offset = (page - 1) * limit;

        // Build query
        let query = `
            SELECT p.*, u.name as seller_name, u.rating as seller_rating
            FROM pets p 
            LEFT JOIN users u ON p.seller_id = u.id 
            WHERE p.status = 'available' AND p.is_deleted = 0 AND u.is_deleted = 0
        `;
        
        const params = [];
        
        if (category) {
            query += ' AND p.category = ?';
            params.push(category);
        }
        
        if (type) {
            query += ' AND p.type LIKE ?';
            params.push(`%${type}%`);
        }
        
        if (breed) {
            query += ' AND p.breed LIKE ?';
            params.push(`%${breed}%`);
        }
        
        if (minPrice) {
            query += ' AND p.price >= ?';
            params.push(parseFloat(minPrice));
        }
        
        if (maxPrice) {
            query += ' AND p.price <= ?';
            params.push(parseFloat(maxPrice));
        }
        
        if (location) {
            query += ' AND (p.location LIKE ? OR p.city LIKE ?)';
            params.push(`%${location}%`, `%${location}%`);
        }
        
        if (age) {
            query += ' AND p.age <= ?';
            params.push(parseInt(age));
        }
        
        if (gender) {
            query += ' AND p.gender = ?';
            params.push(gender);
        }
        
        if (search) {
            query += ' AND (p.name LIKE ? OR p.description LIKE ? OR p.breed LIKE ?)';
            params.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }
        
        query += ' ORDER BY p.created_at DESC LIMIT ? OFFSET ?';
        params.push(limit, offset);

        console.log('Executing pets query:', query);
        console.log('Query params:', params);

        const petsResult = await globalThis.DB.prepare(query).bind(...params).all();
        let pets = petsResult.results || [];

        // Get images for each pet from pet_images table
        for (let pet of pets) {
            const petImages = await globalThis.DB.prepare(`
                SELECT image_url as url, alt_text, is_primary, sort_order as display_order,
                       file_size, image_type, width, height
                FROM pet_images 
                WHERE pet_id = ? AND is_deleted = 0 
                ORDER BY is_primary DESC, sort_order ASC
            `).bind(pet.id).all();
            
            pet.images = petImages.results || [];
        }

        // Get total count for pagination
        let countQuery = `
            SELECT COUNT(*) as total 
            FROM pets p 
            LEFT JOIN users u ON p.seller_id = u.id 
            WHERE p.status = 'available' AND p.is_deleted = 0 AND u.is_deleted = 0
        `;
        
        const countParams = [];
        
        if (category) {
            countQuery += ' AND p.category = ?';
            countParams.push(category);
        }
        
        if (type) {
            countQuery += ' AND p.type LIKE ?';
            countParams.push(`%${type}%`);
        }
        
        if (breed) {
            countQuery += ' AND p.breed LIKE ?';
            countParams.push(`%${breed}%`);
        }
        
        if (minPrice) {
            countQuery += ' AND p.price >= ?';
            countParams.push(parseFloat(minPrice));
        }
        
        if (maxPrice) {
            countQuery += ' AND p.price <= ?';
            countParams.push(parseFloat(maxPrice));
        }
        
        if (location) {
            countQuery += ' AND (p.location LIKE ? OR p.city LIKE ?)';
            countParams.push(`%${location}%`, `%${location}%`);
        }
        
        if (age) {
            countQuery += ' AND p.age <= ?';
            countParams.push(parseInt(age));
        }
        
        if (gender) {
            countQuery += ' AND p.gender = ?';
            countParams.push(gender);
        }
        
        if (search) {
            countQuery += ' AND (p.name LIKE ? OR p.description LIKE ? OR p.breed LIKE ?)';
            countParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }

        const countResult = await globalThis.DB.prepare(countQuery).bind(...countParams).first();
        const total = countResult.total || 0;

        return new Response(JSON.stringify({
            pets,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        }), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Get pets error:', error);
        return new Response(JSON.stringify({ 
            message: 'Có lỗi xảy ra khi lấy danh sách thú cưng',
            error: error.message 
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

async function getPetById(petId) {
    try {
        const pet = await globalThis.DB.prepare(`
            SELECT p.*, u.name as seller_name, u.rating as seller_rating, u.phone as seller_phone
            FROM pets p 
            LEFT JOIN users u ON p.seller_id = u.id 
            WHERE p.id = ? AND p.is_deleted = 0 AND u.is_deleted = 0
        `).bind(petId).first();

        if (!pet) {
            return new Response(JSON.stringify({ 
                message: 'Không tìm thấy thú cưng' 
            }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Get images from pet_images table
        const petImages = await globalThis.DB.prepare(`
            SELECT image_url as url, alt_text, is_primary, sort_order as display_order,
                   file_size, image_type, width, height
            FROM pet_images 
            WHERE pet_id = ? AND is_deleted = 0 
            ORDER BY is_primary DESC, sort_order ASC
        `).bind(petId).all();

        pet.images = petImages.results || [];

        // Update view count
        await globalThis.DB.prepare('UPDATE pets SET views = views + 1, updated_at = datetime("now"), version = version + 1 WHERE id = ? AND is_deleted = 0').bind(petId).run();

        return new Response(JSON.stringify(pet), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Get pet by ID error:', error);
        return new Response(JSON.stringify({ 
            message: 'Có lỗi xảy ra khi lấy thông tin thú cưng' 
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

async function getPetImages(petId) {
    try {
        const images = await globalThis.DB.prepare(`
            SELECT image_url as url, alt_text, is_primary, sort_order as display_order,
                   file_size, image_type, width, height, image_key
            FROM pet_images 
            WHERE pet_id = ? AND is_deleted = 0 
            ORDER BY is_primary DESC, sort_order ASC
        `).bind(petId).all();

        return new Response(JSON.stringify({
            images: images.results || []
        }), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Get pet images error:', error);
        return new Response(JSON.stringify({ 
            message: 'Có lỗi xảy ra khi lấy hình ảnh thú cưng' 
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

async function toggleFavorite(request, petId) {
    try {
        const user = await verifyJWTFromRequest(request);
        if (!user) {
            return new Response(JSON.stringify({ message: 'Unauthorized' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Check if pet exists
        const pet = await globalThis.DB.prepare('SELECT * FROM pets WHERE id = ? AND is_deleted = 0').bind(petId).first();
        if (!pet) {
            return new Response(JSON.stringify({ message: 'Pet not found' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Check if already favorited
        const existingFavorite = await globalThis.DB.prepare(
            'SELECT * FROM favorites WHERE user_id = ? AND pet_id = ?'
        ).bind(user.id, petId).first();

        if (existingFavorite) {
            // Remove from favorites
            await globalThis.DB.prepare('DELETE FROM favorites WHERE user_id = ? AND pet_id = ?')
                .bind(user.id, petId).run();
            
            return new Response(JSON.stringify({ 
                message: 'Removed from favorites',
                favorited: false 
            }), {
                headers: { 'Content-Type': 'application/json' }
            });
        } else {
            // Add to favorites
            await globalThis.DB.prepare('INSERT INTO favorites (user_id, pet_id, created_at) VALUES (?, ?, datetime("now"))')
                .bind(user.id, petId).run();
            
            return new Response(JSON.stringify({ 
                message: 'Added to favorites',
                favorited: true 
            }), {
                headers: { 'Content-Type': 'application/json' }
            });
        }
    } catch (error) {
        console.error('Toggle favorite error:', error);
        return new Response(JSON.stringify({ 
            message: 'Error toggling favorite' 
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

async function getFeaturedPets(request) {
    try {
        const url = new URL(request.url);
        const limit = parseInt(url.searchParams.get('limit') || '6');

        const pets = await globalThis.DB.prepare(`
            SELECT p.*, u.name as seller_name, u.rating as seller_rating
            FROM pets p 
            LEFT JOIN users u ON p.seller_id = u.id 
            WHERE p.status = 'available' AND p.is_deleted = 0 AND u.is_deleted = 0
            ORDER BY p.views DESC, p.created_at DESC 
            LIMIT ?
        `).bind(limit).all();

        return new Response(JSON.stringify({
            pets: pets.results || []
        }), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Get featured pets error:', error);
        return new Response(JSON.stringify({ 
            message: 'Có lỗi xảy ra khi lấy thú cưng nổi bật',
            error: error.message 
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

async function getRecentPets(request) {
    try {
        const url = new URL(request.url);
        const limit = parseInt(url.searchParams.get('limit') || '6');

        const pets = await globalThis.DB.prepare(`
            SELECT p.*, u.name as seller_name, u.rating as seller_rating
            FROM pets p 
            LEFT JOIN users u ON p.seller_id = u.id 
            WHERE p.status = 'available' AND p.is_deleted = 0 AND u.is_deleted = 0
            ORDER BY p.created_at DESC 
            LIMIT ?
        `).bind(limit).all();

        return new Response(JSON.stringify({
            pets: pets.results || []
        }), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Get recent pets error:', error);
        return new Response(JSON.stringify({ 
            message: 'Có lỗi xảy ra khi lấy thú cưng mới nhất',
            error: error.message 
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// Helper function to upload a single image file
async function uploadImageFile(file, petId, user) {
    try {
        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            return { success: false, error: 'Chỉ chấp nhận file ảnh (JPEG, PNG, GIF, WebP)' };
        }

        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
            return { success: false, error: 'File quá lớn, tối đa 10MB' };
        }

        // Generate unique filename
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2);
        const extension = file.name.split('.').pop();
        const fileName = `pets/${petId || 'temp'}_${timestamp}_${random}.${extension}`;

        if (globalThis.BUCKET) {
            // Upload to R2
            await globalThis.BUCKET.put(fileName, file.stream(), {
                httpMetadata: {
                    contentType: file.type
                }
            });

            const imageUrl = `https://cdn.zewk.fun/${fileName}`;
            return {
                success: true,
                image_url: imageUrl,
                file_key: fileName
            };
        } else {
            // Fallback: base64
            const arrayBuffer = await file.arrayBuffer();
            const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
            const dataUrl = `data:${file.type};base64,${base64}`;

            return {
                success: true,
                image_url: dataUrl,
                file_key: null
            };
        }
    } catch (error) {
        console.error('Upload image file error:', error);
        return { success: false, error: 'Failed to upload image' };
    }
}

async function createPet(request) {
    try {
        const user = await verifyJWTFromRequest(request);
        if (!user) {
            return new Response(JSON.stringify({ message: 'Unauthorized' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Only support FormData - no JSON support
        const contentType = request.headers.get('content-type');
        if (!contentType || !contentType.includes('multipart/form-data')) {
            return new Response(JSON.stringify({ 
                message: 'Chỉ hỗ trợ FormData (multipart/form-data). Vui lòng gửi dữ liệu và hình ảnh cùng lúc.' 
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Handle FormData with files
        const formData = await request.formData();
        
        // Extract text fields
        const requestData = {
            name: formData.get('name'),
            type: formData.get('type'),
            breed: formData.get('breed'),
            gender: formData.get('gender'),
            age: formData.get('age'),
            age_unit: formData.get('age_unit'),
            description: formData.get('description'),
            price: formData.get('price'),
            currency: formData.get('currency'),
            location: formData.get('location'),
            city: formData.get('city'),
            vaccination_status: formData.get('vaccination_status'),
            health_certificate: formData.get('health_certificate'),
            category: formData.get('category'),
            tags: formData.get('tags'),
            size_category: formData.get('size_category'),
            negotiable: formData.get('negotiable')
        };

        // Handle image files
        const uploadedImages = [];
        const imageFiles = formData.getAll('images');
        for (let i = 0; i < imageFiles.length; i++) {
            const file = imageFiles[i];
            if (file && file instanceof File && file.size > 0) {
                // Upload each image
                const uploadResult = await uploadImageFile(file, 'temp', user);
                if (uploadResult.success) {
                    uploadedImages.push({
                        url: uploadResult.image_url,
                        key: uploadResult.file_key,
                        file_size: file.size,
                        image_type: file.type,
                        alt_text: file.name
                    });
                }
            }
        }

        const {
            name, type, breed, gender, age, age_unit, description, 
            price, currency, location, city, vaccination_status, 
            health_certificate, category, tags, size_category, negotiable
        } = requestData;

        // Validate required fields
        if (!name || !type || !price) {
            return new Response(JSON.stringify({ 
                message: 'Tên, loại và giá là bắt buộc' 
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Log parameters for debugging
        console.log('Creating pet with params:', {
            name, type, breed, gender, age, age_unit, description, 
            price, currency, location, city, vaccination_status, 
            health_certificate, category, tags, size_category, negotiable
        });

        // Generate UUID for pet
        const petUuid = crypto.randomUUID();

        // Ensure user.id exists
        if (!user.id) {
            throw new Error('User ID is undefined');
        }

        // Prepare bind parameters with explicit null handling
        const bindParams = [
            petUuid, 
            user.id, 
            name, 
            type, 
            breed || null, 
            gender || 'unknown',
            age || 0, 
            age_unit || 'months', 
            description || null, 
            price, 
            currency || 'VND', 
            'available', 
            location || null, 
            city || null,
            vaccination_status || 'unknown', 
            health_certificate ? 1 : 0,
            category || 'other', 
            tags || null, 
            size_category || 'medium',
            negotiable !== undefined ? (negotiable ? 1 : 0) : 1
        ];

        console.log('Bind parameters:', bindParams);

        // Insert new pet (without images field)
        const result = await globalThis.DB.prepare(`
            INSERT INTO pets (
                uuid, seller_id, name, type, breed, gender, age, age_unit,
                description, price, currency, status, location, city,
                vaccination_status, health_certificate, category,
                tags, size_category, negotiable,
                views, favorites, featured, created_at, updated_at, version
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, datetime('now'), datetime('now'), 1)
        `).bind(...bindParams).run();

        if (!result.success) {
            throw new Error('Failed to create pet');
        }

        const petId = result.meta.last_row_id;

        // Debug images data
        console.log('Images data received:', JSON.stringify(uploadedImages, null, 2));

        // Insert images into pet_images table if provided
        if (uploadedImages && Array.isArray(uploadedImages) && uploadedImages.length > 0) {
            console.log(`Processing ${uploadedImages.length} images for pet ${petId}`);
            for (let i = 0; i < uploadedImages.length; i++) {
                const image = uploadedImages[i];
                console.log(`Processing image ${i}:`, image);
                
                // Skip invalid images (empty objects or missing url)
                const imageUrl = image.url;
                if (!imageUrl || imageUrl.trim() === '') {
                    console.log(`Skipping invalid image at index ${i}:`, image);
                    continue;
                }
                
                // Update filename from temp to actual pet ID (since we only support FormData now)
                let finalImageUrl = imageUrl;
                let finalImageKey = image.key || '';
                
                if (finalImageKey.includes('temp_')) {
                    // Rename file to use actual pet ID
                    const newKey = finalImageKey.replace(/pets\/temp_/, `pets/${petId}_`);
                    if (globalThis.BUCKET && finalImageKey !== newKey) {
                        try {
                            // Copy to new key
                            const originalObject = await globalThis.BUCKET.get(finalImageKey);
                            if (originalObject) {
                                await globalThis.BUCKET.put(newKey, originalObject.body, {
                                    httpMetadata: originalObject.httpMetadata
                                });
                                // Delete old file
                                await globalThis.BUCKET.delete(finalImageKey);
                                finalImageKey = newKey;
                                finalImageUrl = `https://cdn.zewk.fun/${newKey}`;
                                console.log(`✅ Renamed file from ${finalImageKey} to ${newKey}`);
                            }
                        } catch (renameError) {
                            console.error('Failed to rename file:', renameError);
                        }
                    }
                }
                
                console.log(`Valid image found at index ${i}, URL: ${finalImageUrl}`);
                const imageUuid = crypto.randomUUID();
                
                await globalThis.DB.prepare(`
                    INSERT INTO pet_images (
                        uuid, pet_id, image_url, image_key, is_primary, sort_order,
                        alt_text, file_size, image_type, width, height,
                        created_at, updated_at, version
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'), 1)
                `).bind(
                    imageUuid, petId, finalImageUrl, 
                    finalImageKey, 
                    i === 0 ? 1 : 0, // First image is primary
                    i, // Sort order
                    image.alt_text || '', image.file_size || null,
                    image.image_type || null, null, null // width and height not available from upload
                ).run();
                
                console.log(`✅ Successfully inserted image ${i} for pet ${petId}`);
            }
            console.log(`✅ Finished processing all ${uploadedImages.length} images`);
        } else {
            console.log('No images provided or images array is empty');
        }

        // Get the created pet with images
        const pet = await globalThis.DB.prepare('SELECT * FROM pets WHERE id = ?').bind(petId).first();
        
        // Get images for the created pet
        const petImages = await globalThis.DB.prepare(`
            SELECT image_url as url, alt_text, is_primary, sort_order as display_order,
                   file_size, image_type, width, height
            FROM pet_images 
            WHERE pet_id = ? AND is_deleted = 0 
            ORDER BY is_primary DESC, sort_order ASC
        `).bind(petId).all();
        
        pet.images = petImages.results || [];

        return new Response(JSON.stringify({
            message: 'Thú cưng đã được tạo thành công',
            pet
        }), {
            status: 201,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Create pet error:', error);
        return new Response(JSON.stringify({ 
            message: 'Có lỗi xảy ra khi tạo thú cưng',
            error: error.message 
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// Users endpoints
async function handleUsers(request, path, method) {
    const segments = path.split('/').filter(Boolean);
    
    if (method === 'GET') {
        if (segments.length === 3 && segments[2] === 'top-sellers') { // /api/users/top-sellers
            return await getTopSellers(request);
        } else if (segments.length === 3) { // /api/users/{id}
            const userId = segments[2];
            return await getUserById(userId);
        }
    } else if (method === 'PUT') {
        if (segments.length === 3) { // /api/users/{id}
            const userId = segments[2];
            return await updateUser(request, userId);
        }
    } else if (method === 'POST') {
        if (segments.length === 4 && segments[3] === 'rate') { // /api/users/{id}/rate
            const userId = segments[2];
            return await rateUser(request, userId);
        }
    }

    return new Response(JSON.stringify({ message: 'Users endpoint not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
    });
}

async function getTopSellers(request) {
    try {
        const url = new URL(request.url);
        const limit = parseInt(url.searchParams.get('limit') || '10');

        const sellers = await globalThis.DB.prepare(`
            SELECT u.id, u.name, u.rating, u.review_count, u.total_sales, u.avatar_url,
                   COUNT(p.id) as active_listings
            FROM users u
            LEFT JOIN pets p ON u.id = p.seller_id AND p.status = 'available' AND p.is_deleted = 0
            WHERE u.is_deleted = 0 AND u.total_sales > 0
            GROUP BY u.id
            ORDER BY u.rating DESC, u.total_sales DESC
            LIMIT ?
        `).bind(limit).all();

        return new Response(JSON.stringify({
            sellers: sellers.results || []
        }), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Get top sellers error:', error);
        return new Response(JSON.stringify({ 
            message: 'Có lỗi xảy ra khi lấy top sellers',
            error: error.message 
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

async function getUserById(userId) {
    try {
        const user = await globalThis.DB.prepare('SELECT * FROM users WHERE id = ? AND is_deleted = 0').bind(userId).first();
        
        if (!user) {
            return new Response(JSON.stringify({ 
                message: 'Không tìm thấy người dùng' 
            }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Remove password from response
        const { password: _, ...userWithoutPassword } = user;
        
        return new Response(JSON.stringify(userWithoutPassword), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Get user by ID error:', error);
        return new Response(JSON.stringify({ 
            message: 'Có lỗi xảy ra khi lấy thông tin người dùng' 
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

async function updateUser(request, userId) {
    let requestBody = null;
    try {
        const user = await verifyJWTFromRequest(request);
        if (!user || user.id != userId) {
            return new Response(JSON.stringify({ message: 'Unauthorized' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        requestBody = await request.json();
        const {
            name, phone, location, address, bio, business_name,
            marketing_consent, language_preference, timezone, currency_preference
        } = requestBody;

        // Update user
        const result = await globalThis.DB.prepare(`
            UPDATE users SET 
                name = COALESCE(?, name),
                phone = COALESCE(?, phone),
                location = COALESCE(?, location),
                address = COALESCE(?, address),
                bio = COALESCE(?, bio),
                business_name = COALESCE(?, business_name),
                marketing_consent = COALESCE(?, marketing_consent),
                language_preference = COALESCE(?, language_preference),
                timezone = COALESCE(?, timezone),
                currency_preference = COALESCE(?, currency_preference),
                updated_at = datetime('now'),
                version = version + 1
            WHERE id = ? AND is_deleted = 0
        `).bind(
            name, phone, location, address, bio, business_name,
            marketing_consent, language_preference, timezone, currency_preference,
            userId
        ).run();

        if (!result.success) {
            throw new Error('Failed to update user');
        }

        // Get updated user
        const updatedUser = await globalThis.DB.prepare('SELECT * FROM users WHERE id = ? AND is_deleted = 0').bind(userId).first();
        const { password: _, ...userWithoutPassword } = updatedUser;

        return new Response(JSON.stringify({
            message: 'Cập nhật thông tin thành công',
            user: userWithoutPassword
        }), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Update user error:', error);
        console.error('Error details:', {
            message: error.message,
            stack: error.stack,
            userId: userId,
            requestBody: requestBody
        });
        return new Response(JSON.stringify({ 
            message: 'Có lỗi xảy ra khi cập nhật thông tin người dùng',
            error: error.message
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

async function rateUser(request, userId) {
    try {
        const user = await verifyJWTFromRequest(request);
        if (!user) {
            return new Response(JSON.stringify({ message: 'Unauthorized' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const requestBody = await request.json();
        const { rating, comment } = requestBody;

        // Validate rating
        if (!rating || rating < 1 || rating > 5) {
            return new Response(JSON.stringify({ 
                message: 'Đánh giá phải từ 1 đến 5 sao' 
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Check if target user exists
        const targetUser = await globalThis.DB.prepare('SELECT * FROM users WHERE id = ? AND is_deleted = 0').bind(userId).first();
        if (!targetUser) {
            return new Response(JSON.stringify({ 
                message: 'Không tìm thấy người dùng' 
            }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // For now, just return success (would need a reviews table for full implementation)
        return new Response(JSON.stringify({
            message: 'Đánh giá đã được gửi thành công'
        }), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Rate user error:', error);
        return new Response(JSON.stringify({ 
            message: 'Có lỗi xảy ra khi đánh giá người dùng' 
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// Ads endpoints
async function handleAds(request, path, method) {
    const segments = path.split('/').filter(Boolean);
    
    if (method === 'GET' && segments.length === 3 && segments[2] === 'active') {
        return await getActiveAds(request);
    } else if (method === 'POST' && segments.length === 4 && segments[3] === 'impression') {
        const adId = segments[2];
        return await recordAdImpression(request, adId);
    }

    return new Response(JSON.stringify({ message: 'Ads endpoint not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
    });
}

async function getActiveAds(request) {
    try {
        // For now, return empty array since ads table might not exist
        return new Response(JSON.stringify({
            ads: []
        }), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Get active ads error:', error);
        return new Response(JSON.stringify({ 
            message: 'Có lỗi xảy ra khi lấy quảng cáo',
            error: error.message 
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

async function recordAdImpression(request, adId) {
    try {
        // For now, just return success since ads table might not exist
        return new Response(JSON.stringify({
            message: 'Impression recorded'
        }), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Record ad impression error:', error);
        return new Response(JSON.stringify({ 
            message: 'Có lỗi xảy ra khi ghi nhận impression' 
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// Wallet endpoints
async function handleWallet(request, path, method) {
    const segments = path.split('/').filter(Boolean);
    
    if (method === 'GET') {
        if (segments.length === 3 && segments[2] === 'transactions') { // /api/wallet/transactions
            return await getWalletTransactions(request);
        } else if (segments.length === 3 && segments[2] === 'balance') { // /api/wallet/balance
            return await getWalletBalance(request);
        }
    } else if (method === 'POST') {
        if (segments.length === 3 && segments[2] === 'deposit') { // /api/wallet/deposit
            return await depositToWallet(request);
        } else if (segments.length === 3 && segments[2] === 'withdraw') { // /api/wallet/withdraw
            return await withdrawFromWallet(request);
        }
    }

    return new Response(JSON.stringify({ message: 'Wallet endpoint not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
    });
}

async function getWalletTransactions(request) {
    try {
        const user = await verifyJWTFromRequest(request);
        if (!user) {
            return new Response(JSON.stringify({ message: 'Unauthorized' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const url = new URL(request.url);
        const page = parseInt(url.searchParams.get('page') || '1');
        const limit = parseInt(url.searchParams.get('limit') || '20');
        const offset = (page - 1) * limit;

        // Get wallet transactions from database
        const transactions = await globalThis.DB.prepare(`
            SELECT * FROM wallet_transactions 
            WHERE user_id = ? 
            ORDER BY created_at DESC 
            LIMIT ? OFFSET ?
        `).bind(user.id, limit, offset).all();

        return new Response(JSON.stringify({
            transactions: transactions.results || [],
            pagination: {
                page,
                limit,
                total: transactions.results ? transactions.results.length : 0
            }
        }), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Get wallet transactions error:', error);
        return new Response(JSON.stringify({ 
            message: 'Có lỗi xảy ra khi lấy lịch sử giao dịch',
            transactions: [] // Return empty array for frontend compatibility
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

async function getWalletBalance(request) {
    try {
        const user = await verifyJWTFromRequest(request);
        if (!user) {
            return new Response(JSON.stringify({ message: 'Unauthorized' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Get user balance from database
        const userData = await globalThis.DB.prepare('SELECT balance, escrow_balance FROM users WHERE id = ? AND is_deleted = 0').bind(user.id).first();

        return new Response(JSON.stringify({
            balance: userData?.balance || 0,
            escrow_balance: userData?.escrow_balance || 0,
            total_balance: (userData?.balance || 0) + (userData?.escrow_balance || 0)
        }), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Get wallet balance error:', error);
        return new Response(JSON.stringify({ 
            message: 'Có lỗi xảy ra khi lấy số dư ví',
            balance: 0,
            escrow_balance: 0,
            total_balance: 0
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

async function depositToWallet(request) {
    try {
        const user = await verifyJWTFromRequest(request);
        if (!user) {
            return new Response(JSON.stringify({ message: 'Unauthorized' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const requestBody = await request.json();
        const { amount, payment_method } = requestBody;

        if (!amount || amount <= 0) {
            return new Response(JSON.stringify({ 
                message: 'Số tiền phải lớn hơn 0' 
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // For now, just return success message (payment integration would be added later)
        return new Response(JSON.stringify({
            message: 'Yêu cầu nạp tiền đã được gửi',
            amount: amount,
            payment_method: payment_method || 'bank_transfer'
        }), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Deposit to wallet error:', error);
        return new Response(JSON.stringify({ 
            message: 'Có lỗi xảy ra khi nạp tiền' 
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

async function withdrawFromWallet(request) {
    try {
        const user = await verifyJWTFromRequest(request);
        if (!user) {
            return new Response(JSON.stringify({ message: 'Unauthorized' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const requestBody = await request.json();
        const { amount, bank_account } = requestBody;

        if (!amount || amount <= 0) {
            return new Response(JSON.stringify({ 
                message: 'Số tiền phải lớn hơn 0' 
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Check user balance
        const userData = await globalThis.DB.prepare('SELECT balance FROM users WHERE id = ? AND is_deleted = 0').bind(user.id).first();
        
        if (!userData || userData.balance < amount) {
            return new Response(JSON.stringify({ 
                message: 'Số dư không đủ để rút tiền' 
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // For now, just return success message (actual withdrawal processing would be added later)
        return new Response(JSON.stringify({
            message: 'Yêu cầu rút tiền đã được gửi',
            amount: amount,
            bank_account: bank_account
        }), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Withdraw from wallet error:', error);
        return new Response(JSON.stringify({ 
            message: 'Có lỗi xảy ra khi rút tiền' 
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// Search endpoints  
async function handleSearch(request, path, method) {
    return new Response(JSON.stringify({ message: 'Search endpoints not implemented yet' }), {
        status: 501,
        headers: { 'Content-Type': 'application/json' }
    });
}

// Upload endpoints
async function handleUpload(request, path, method) {
    const segments = path.split('/').filter(Boolean);
    
    if (method === 'POST') {
        if (segments.length === 3 && segments[2] === 'avatar') { // /api/upload/avatar
            return await uploadAvatar(request);
        }
        // Removed /api/upload/image - use /api/pets with FormData instead
    }

    return new Response(JSON.stringify({ 
        message: 'Upload endpoint not found. Use /api/pets with FormData for pet images.' 
    }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
    });
}

async function uploadAvatar(request) {
    try {
        const user = await verifyJWTFromRequest(request);
        if (!user) {
            return new Response(JSON.stringify({ message: 'Unauthorized' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const formData = await request.formData();
        const file = formData.get('avatar');
        
        if (!file || !(file instanceof File)) {
            return new Response(JSON.stringify({ 
                message: 'Không tìm thấy file avatar' 
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            return new Response(JSON.stringify({ 
                message: 'Chỉ chấp nhận file ảnh (JPEG, PNG, GIF, WebP)' 
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            return new Response(JSON.stringify({ 
                message: 'File quá lớn, tối đa 5MB' 
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Generate unique filename
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2);
        const extension = file.name.split('.').pop();
        const fileName = `avatars/${user.id}_${timestamp}_${random}.${extension}`;

        try {
            // Upload to R2 if available
            if (globalThis.BUCKET) {
                await globalThis.BUCKET.put(fileName, file.stream(), {
                    httpMetadata: {
                        contentType: file.type
                    }
                });

                // Generate public URL (adjust domain based on your R2 setup)
                const avatarUrl = `https://cdn.zewk.fun/${fileName}`;

                // Update user avatar URL in database
                await globalThis.DB.prepare(`
                    UPDATE users SET 
                        avatar_url = ?,
                        avatar_key = ?,
                        updated_at = datetime('now'),
                        version = version + 1
                    WHERE id = ? AND is_deleted = 0
                `).bind(avatarUrl, fileName, user.id).run();

                return new Response(JSON.stringify({
                    message: 'Upload avatar thành công',
                    avatar_url: avatarUrl,
                    file_key: fileName
                }), {
                    headers: { 'Content-Type': 'application/json' }
                });
            } else {
                // Fallback: Return base64 data URL if R2 is not available
                const arrayBuffer = await file.arrayBuffer();
                const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
                const dataUrl = `data:${file.type};base64,${base64}`;

                // Update user avatar URL in database
                await globalThis.DB.prepare(`
                    UPDATE users SET 
                        avatar_url = ?,
                        updated_at = datetime('now'),
                        version = version + 1
                    WHERE id = ? AND is_deleted = 0
                `).bind(dataUrl, user.id).run();

                return new Response(JSON.stringify({
                    message: 'Upload avatar thành công (base64)',
                    avatar_url: dataUrl,
                    file_key: null
                }), {
                    headers: { 'Content-Type': 'application/json' }
                });
            }
        } catch (uploadError) {
            console.error('Upload error:', uploadError);
            throw new Error('Failed to upload file');
        }
    } catch (error) {
        console.error('Upload avatar error:', error);
        return new Response(JSON.stringify({ 
            message: 'Có lỗi xảy ra khi upload avatar',
            error: error.message 
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// Password utility functions
async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
}

// JWT utility functions
async function generateJWT(payload) {
    const header = {
        alg: 'HS256',
        typ: 'JWT'
    };

    const now = Math.floor(Date.now() / 1000);
    const jwtPayload = {
        ...payload,
        iat: now,
        exp: now + 7 * 24 * 60 * 60 // 7 days
    };

    const encodedHeader = btoa(JSON.stringify(header)).replace(/[+/]/g, char => char === '+' ? '-' : '_').replace(/=/g, '');
    const encodedPayload = btoa(JSON.stringify(jwtPayload)).replace(/[+/]/g, char => char === '+' ? '-' : '_').replace(/=/g, '');

    const signatureInput = `${encodedHeader}.${encodedPayload}`;
    
    const key = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(globalThis.JWT_SECRET),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    );

    const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signatureInput));
    const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature)))
        .replace(/[+/]/g, char => char === '+' ? '-' : '_')
        .replace(/=/g, '');

    return `${signatureInput}.${encodedSignature}`;
}

async function verifyJWT(token) {
    try {
        const [encodedHeader, encodedPayload, encodedSignature] = token.split('.');
        
        if (!encodedHeader || !encodedPayload || !encodedSignature) {
            return null;
        }

        const signatureInput = `${encodedHeader}.${encodedPayload}`;
        
        const key = await crypto.subtle.importKey(
            'raw',
            new TextEncoder().encode(globalThis.JWT_SECRET),
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['verify']
        );

        const signature = new Uint8Array(
            atob(encodedSignature.replace(/[-_]/g, char => char === '-' ? '+' : '/'))
                .split('')
                .map(char => char.charCodeAt(0))
        );

        const isValid = await crypto.subtle.verify(
            'HMAC',
            key,
            signature,
            new TextEncoder().encode(signatureInput)
        );

        if (!isValid) {
            return null;
        }

        const payload = JSON.parse(
            atob(encodedPayload.replace(/[-_]/g, char => char === '-' ? '+' : '/'))
        );

        // Check expiration
        if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
            return null;
        }

        return payload;
    } catch (error) {
        console.error('JWT verification error:', error);
        return null;
    }
}

async function verifyJWTFromRequest(request) {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }

    const token = authHeader.substring(7);
    return await verifyJWT(token);
}

// Admin endpoints handler
async function handleAdmin(request, path, method) {
    const segments = path.split('/').filter(Boolean);
    
    // Verify admin access
    const user = await verifyJWTFromRequest(request);
    if (!user || !['admin', 'moderator'].includes(user.role)) {
        return new Response(JSON.stringify({ message: 'Admin access required' }), {
            status: 403,
            headers: { 'Content-Type': 'application/json' }
        });
    }
    
    if (method === 'GET') {
        if (segments.length === 3 && segments[2] === 'dashboard') { // /api/admin/dashboard
            return await getAdminDashboard(request);
        } else if (segments.length === 3 && segments[2] === 'users') { // /api/admin/users
            return await getAdminUsers(request);
        } else if (segments.length === 3 && segments[2] === 'pets') { // /api/admin/pets
            return await getAdminPets(request);
        } else if (segments.length === 3 && segments[2] === 'transactions') { // /api/admin/transactions
            return await getAdminTransactions(request);
        }
    } else if (method === 'PUT') {
        if (segments.length === 5 && segments[2] === 'users' && segments[4] === 'status') { // /api/admin/users/{id}/status
            const userId = segments[3];
            return await updateUserStatus(request, userId);
        } else if (segments.length === 5 && segments[2] === 'pets' && segments[4] === 'status') { // /api/admin/pets/{id}/status
            const petId = segments[3];
            return await updatePetStatus(request, petId);
        }
    }

    return new Response(JSON.stringify({ message: 'Admin endpoint not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
    });
}

// Support endpoints handler
async function handleSupport(request, path, method) {
    const segments = path.split('/').filter(Boolean);
    
    // Verify support access
    const user = await verifyJWTFromRequest(request);
    if (!user || !['admin', 'support'].includes(user.role)) {
        return new Response(JSON.stringify({ message: 'Support access required' }), {
            status: 403,
            headers: { 'Content-Type': 'application/json' }
        });
    }
    
    if (method === 'GET') {
        if (segments.length === 3 && segments[2] === 'tickets') { // /api/support/tickets
            return await getSupportTickets(request);
        }
    } else if (method === 'POST') {
        if (segments.length === 3 && segments[2] === 'tickets') { // /api/support/tickets
            return await createSupportTicket(request);
        }
    }

    return new Response(JSON.stringify({ message: 'Support endpoint not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
    });
}

// Admin Dashboard
async function getAdminDashboard(request) {
    try {
        // Get user statistics
        const userStats = await globalThis.DB.prepare(`
            SELECT 
                COUNT(*) as total_users,
                SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active_users,
                SUM(CASE WHEN is_verified = 1 THEN 1 ELSE 0 END) as verified_users,
                AVG(trust_score) as avg_trust_score
            FROM users 
            WHERE is_deleted = 0
        `).first();

        // Get pet statistics
        const petStats = await globalThis.DB.prepare(`
            SELECT 
                COUNT(*) as total_pets,
                SUM(CASE WHEN status = 'available' THEN 1 ELSE 0 END) as available_pets,
                SUM(CASE WHEN status = 'sold' THEN 1 ELSE 0 END) as sold_pets,
                AVG(price) as avg_price
            FROM pets 
            WHERE is_deleted = 0
        `).first();

        // Get transaction statistics (today)
        const transactionStats = await globalThis.DB.prepare(`
            SELECT 
                COUNT(*) as total_transactions,
                SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END) as total_revenue
            FROM transactions 
            WHERE date(created_at) = date('now')
        `).first();

        return new Response(JSON.stringify({
            userStats,
            petStats,
            transactionStats,
            timestamp: new Date().toISOString()
        }), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Admin dashboard error:', error);
        return new Response(JSON.stringify({ 
            message: 'Error loading dashboard',
            error: error.message 
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// Get all users for admin
async function getAdminUsers(request) {
    try {
        const url = new URL(request.url);
        const page = parseInt(url.searchParams.get('page') || '1');
        const limit = parseInt(url.searchParams.get('limit') || '50');
        const search = url.searchParams.get('search');
        const role = url.searchParams.get('role');
        const status = url.searchParams.get('status');

        const offset = (page - 1) * limit;

        let query = `
            SELECT id, uuid, name, email, phone, role, subscription_type, 
                   balance, trust_score, rating, total_sales, total_purchases,
                   is_active, is_verified, created_at, last_activity_at
            FROM users 
            WHERE is_deleted = 0
        `;
        
        const params = [];
        
        if (search) {
            query += ' AND (name LIKE ? OR email LIKE ? OR phone LIKE ?)';
            params.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }
        
        if (role) {
            query += ' AND role = ?';
            params.push(role);
        }
        
        if (status === 'active') {
            query += ' AND is_active = 1';
        } else if (status === 'inactive') {
            query += ' AND is_active = 0';
        }
        
        query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
        params.push(limit, offset);

        const usersResult = await globalThis.DB.prepare(query).bind(...params).all();
        const users = usersResult.results || [];

        // Get total count
        let countQuery = 'SELECT COUNT(*) as total FROM users WHERE is_deleted = 0';
        const countParams = [];
        
        if (search) {
            countQuery += ' AND (name LIKE ? OR email LIKE ? OR phone LIKE ?)';
            countParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }
        
        if (role) {
            countQuery += ' AND role = ?';
            countParams.push(role);
        }

        const countResult = await globalThis.DB.prepare(countQuery).bind(...countParams).first();
        const total = countResult.total || 0;

        return new Response(JSON.stringify({
            users,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        }), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Get admin users error:', error);
        return new Response(JSON.stringify({ 
            message: 'Error loading users',
            error: error.message 
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// Get all pets for admin
async function getAdminPets(request) {
    try {
        const url = new URL(request.url);
        const page = parseInt(url.searchParams.get('page') || '1');
        const limit = parseInt(url.searchParams.get('limit') || '50');
        const status = url.searchParams.get('status');
        const search = url.searchParams.get('search');

        const offset = (page - 1) * limit;

        let query = `
            SELECT p.*, u.name as seller_name, u.email as seller_email
            FROM pets p 
            LEFT JOIN users u ON p.seller_id = u.id 
            WHERE p.is_deleted = 0
        `;
        
        const params = [];
        
        if (status) {
            query += ' AND p.status = ?';
            params.push(status);
        }
        
        if (search) {
            query += ' AND (p.name LIKE ? OR p.type LIKE ? OR u.name LIKE ?)';
            params.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }
        
        query += ' ORDER BY p.created_at DESC LIMIT ? OFFSET ?';
        params.push(limit, offset);

        const petsResult = await globalThis.DB.prepare(query).bind(...params).all();
        let pets = petsResult.results || [];

        // Get images for each pet from pet_images table
        for (let pet of pets) {
            const petImages = await globalThis.DB.prepare(`
                SELECT image_url as url, alt_text, is_primary, sort_order as display_order,
                       file_size, image_type, width, height
                FROM pet_images 
                WHERE pet_id = ? AND is_deleted = 0 
                ORDER BY is_primary DESC, sort_order ASC
            `).bind(pet.id).all();
            
            pet.images = petImages.results || [];
        }

        return new Response(JSON.stringify({ pets }), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Get admin pets error:', error);
        return new Response(JSON.stringify({ 
            message: 'Error loading pets',
            error: error.message 
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// Get all transactions for admin
async function getAdminTransactions(request) {
    try {
        const url = new URL(request.url);
        const page = parseInt(url.searchParams.get('page') || '1');
        const limit = parseInt(url.searchParams.get('limit') || '50');
        const status = url.searchParams.get('status');

        const offset = (page - 1) * limit;

        let query = `
            SELECT t.*, 
                   u1.name as buyer_name, u1.email as buyer_email,
                   u2.name as seller_name, u2.email as seller_email,
                   p.name as pet_name
            FROM transactions t
            LEFT JOIN users u1 ON t.buyer_id = u1.id
            LEFT JOIN users u2 ON t.seller_id = u2.id  
            LEFT JOIN pets p ON t.pet_id = p.id
            WHERE 1=1
        `;
        
        const params = [];
        
        if (status) {
            query += ' AND t.status = ?';
            params.push(status);
        }
        
        query += ' ORDER BY t.created_at DESC LIMIT ? OFFSET ?';
        params.push(limit, offset);

        const transactionsResult = await globalThis.DB.prepare(query).bind(...params).all();
        const transactions = transactionsResult.results || [];

        return new Response(JSON.stringify({ transactions }), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Get admin transactions error:', error);
        return new Response(JSON.stringify({ 
            message: 'Error loading transactions',
            error: error.message 
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// Update user status (admin)
async function updateUserStatus(request, userId) {
    try {
        const requestBody = await request.json();
        const { is_active, is_verified, trust_score } = requestBody;

        const updateFields = [];
        const params = [];

        if (is_active !== undefined) {
            updateFields.push('is_active = ?');
            params.push(is_active ? 1 : 0);
        }

        if (is_verified !== undefined) {
            updateFields.push('is_verified = ?');
            params.push(is_verified ? 1 : 0);
        }

        if (trust_score !== undefined) {
            updateFields.push('trust_score = ?');
            params.push(trust_score);
        }

        if (updateFields.length === 0) {
            return new Response(JSON.stringify({ 
                message: 'No valid fields to update' 
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        updateFields.push('updated_at = datetime("now")');
        updateFields.push('version = version + 1');
        params.push(userId);

        const query = `UPDATE users SET ${updateFields.join(', ')} WHERE id = ? AND is_deleted = 0`;
        
        const result = await globalThis.DB.prepare(query).bind(...params).run();

        if (!result.success || result.changes === 0) {
            return new Response(JSON.stringify({ 
                message: 'User not found or update failed' 
            }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        return new Response(JSON.stringify({
            message: 'User status updated successfully',
            userId
        }), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Update user status error:', error);
        return new Response(JSON.stringify({ 
            message: 'Error updating user status',
            error: error.message 
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// Update pet status (admin)
async function updatePetStatus(request, petId) {
    try {
        const requestBody = await request.json();
        const { status, featured } = requestBody;

        const updateFields = [];
        const params = [];

        if (status) {
            updateFields.push('status = ?');
            params.push(status);
        }

        if (featured !== undefined) {
            updateFields.push('featured = ?');
            params.push(featured ? 1 : 0);
        }

        if (updateFields.length === 0) {
            return new Response(JSON.stringify({ 
                message: 'No valid fields to update' 
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        updateFields.push('updated_at = datetime("now")');
        updateFields.push('version = version + 1');
        params.push(petId);

        const query = `UPDATE pets SET ${updateFields.join(', ')} WHERE id = ? AND is_deleted = 0`;
        
        const result = await globalThis.DB.prepare(query).bind(...params).run();

        if (!result.success || result.changes === 0) {
            return new Response(JSON.stringify({ 
                message: 'Pet not found or update failed' 
            }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        return new Response(JSON.stringify({
            message: 'Pet status updated successfully',
            petId
        }), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Update pet status error:', error);
        return new Response(JSON.stringify({ 
            message: 'Error updating pet status',
            error: error.message 
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// Basic support ticket functions (using conversations table temporarily)
async function getSupportTickets(request) {
    try {
        const url = new URL(request.url);
        const page = parseInt(url.searchParams.get('page') || '1');
        const limit = parseInt(url.searchParams.get('limit') || '20');
        const status = url.searchParams.get('status');

        const offset = (page - 1) * limit;

        let query = `
            SELECT c.*, u.name as user_name, u.email as user_email
            FROM conversations c
            LEFT JOIN users u ON c.user1_id = u.id
            WHERE c.type = 'support'
        `;
        
        const params = [];
        
        if (status) {
            query += ' AND c.status = ?';
            params.push(status);
        }
        
        query += ' ORDER BY c.created_at DESC LIMIT ? OFFSET ?';
        params.push(limit, offset);

        const ticketsResult = await globalThis.DB.prepare(query).bind(...params).all();
        const tickets = ticketsResult.results || [];

        return new Response(JSON.stringify({ tickets }), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Get support tickets error:', error);
        return new Response(JSON.stringify({ 
            message: 'Error loading tickets',
            error: error.message 
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// Create support ticket (using conversations table temporarily)
async function createSupportTicket(request) {
    try {
        const user = await verifyJWTFromRequest(request);
        if (!user) {
            return new Response(JSON.stringify({ message: 'Unauthorized' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const requestBody = await request.json();
        const { subject, description, priority = 'medium' } = requestBody;

        if (!subject || !description) {
            return new Response(JSON.stringify({ 
                message: 'Subject and description are required' 
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Create conversation as support ticket
        const result = await globalThis.DB.prepare(`
            INSERT INTO conversations (user1_id, type, status, subject, created_at)
            VALUES (?, 'support', 'open', ?, datetime('now'))
        `).bind(user.id, subject).run();

        if (!result.success) {
            throw new Error('Failed to create support ticket');
        }

        // Add initial message
        await globalThis.DB.prepare(`
            INSERT INTO messages (conversation_id, sender_id, content, created_at)
            VALUES (?, ?, ?, datetime('now'))
        `).bind(result.meta.last_row_id, user.id, description).run();

        return new Response(JSON.stringify({
            message: 'Support ticket created successfully',
            ticketId: result.meta.last_row_id
        }), {
            status: 201,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Create support ticket error:', error);
        return new Response(JSON.stringify({ 
            message: 'Error creating support ticket',
            error: error.message 
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// ==============================================
// SYSTEM STATUS HANDLERS
// ==============================================

async function handleSystemStatus(request, path, method) {
    if (method !== 'GET') {
        return new Response(JSON.stringify({ 
            message: 'Method not allowed' 
        }), {
            status: 405,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        // Debug logging
        console.log('SystemStatus - globalThis.DB exists:', !!globalThis.DB);
        
        if (!globalThis.DB) {
            throw new Error('Database not available');
        }

        // Get essential system settings
        const settings = await globalThis.DB.prepare(`
            SELECT key, value, description 
            FROM system_settings 
            WHERE key IN ('maintenance_mode', 'registration_enabled', 'site_name', 'support_enabled', 'marketing_enabled')
        `).all();

        const systemStatus = {};
        settings.results.forEach(setting => {
            systemStatus[setting.key] = setting.value;
        });

        // Convert string values to appropriate types
        systemStatus.maintenance_mode = systemStatus.maintenance_mode === '1';
        systemStatus.registration_enabled = systemStatus.registration_enabled === '1';
        systemStatus.support_enabled = systemStatus.support_enabled === '1';
        systemStatus.marketing_enabled = systemStatus.marketing_enabled === '1';

        return new Response(JSON.stringify({
            success: true,
            data: systemStatus,
            timestamp: new Date().toISOString()
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('System status error:', error);
        console.error('Error stack:', error.stack);
        console.error('globalThis.DB at error time:', !!globalThis.DB);
        return new Response(JSON.stringify({ 
            success: false,
            message: 'Error retrieving system status',
            error: error.message 
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}