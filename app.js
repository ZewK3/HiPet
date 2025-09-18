// Global state
let currentUser = null;
let pets = [];
let currentChat = null;

// API Configuration
const API_BASE = 'https://api.zewk.fun'; // Replace with your Cloudflare Worker URL

// ==============================================
// SYSTEM STATUS CHECK
// ==============================================

// Check maintenance mode on page load
async function checkMaintenanceMode() {
    // Skip check if we're already on maintenance page
    if (window.location.pathname.includes('maintenance.html')) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/api/system/status`);
        const data = await response.json();

        if (data.success && data.data.maintenance_mode) {
            // Redirect to maintenance page
            window.location.href = '/maintenance.html';
            return false; // Stop normal page loading
        }
        
        return true; // Normal operation
    } catch (error) {
        console.error('Error checking maintenance mode:', error);
        return true; // Continue normal operation if check fails
    }
}

// Check maintenance mode when page loads
document.addEventListener('DOMContentLoaded', async function() {
    const isOperational = await checkMaintenanceMode();
    if (!isOperational) {
        return; // Stop execution if in maintenance mode
    }
    
    // Continue with normal app initialization
    initializeApp();
});

// Function to initialize the main app
function initializeApp() {
    // Your existing initialization code will go here
    console.log('App initialized in normal mode');
    
    // Initialize existing functions
    if (typeof initializePage === 'function') {
        initializePage();
    }
}

// ==============================================
// Vietnam Provinces Data
// ==============================================

const vietnamProvinces = [
    "An Giang", "Bà Rịa – Vũng Tàu", "Bắc Giang", "Bắc Kạn", "Bạc Liêu",
    "Bắc Ninh", "Bến Tre", "Bình Định", "Bình Dương", "Bình Phước",
    "Bình Thuận", "Cà Mau", "Cao Bằng", "Đắk Lắk", "Đắk Nông",
    "Điện Biên", "Đồng Nai", "Đồng Tháp", "Gia Lai", "Hà Giang",
    "Hà Nam", "Hà Tĩnh", "Hải Dương", "Hậu Giang", "Hòa Bình",
    "Hưng Yên", "Khánh Hòa", "Kiên Giang", "Kon Tum", "Lai Châu",
    "Lâm Đồng", "Lạng Sơn", "Lào Cai", "Long An", "Nam Định",
    "Nghệ An", "Ninh Bình", "Ninh Thuận", "Phú Thọ", "Quảng Bình",
    "Quảng Nam", "Quảng Ngãi", "Quảng Ninh", "Quảng Trị", "Sóc Trăng",
    "Sơn La", "Tây Ninh", "Thái Bình", "Thái Nguyên", "Thanh Hóa",
    "Thừa Thiên Huế", "Tiền Giang", "Trà Vinh", "Tuyên Quang", "Vĩnh Long",
    "Vĩnh Phúc", "Yên Bái",
    // Thành phố trực thuộc trung ương
    "Hà Nội", "Thành phố Hồ Chí Minh", "Hải Phòng", "Đà Nẵng", "Cần Thơ"
];

// API Cache System
class APICache {
    constructor() {
        this.cache = new Map();
        this.cacheExpiry = new Map();
        this.pendingRequests = new Map(); // Prevent duplicate requests
        this.defaultTTL = 5 * 60 * 1000; // 5 minutes default cache
        this.imageTTL = 30 * 60 * 1000; // 30 minutes for images
        this.userTTL = 10 * 60 * 1000; // 10 minutes for user data
    }

    set(key, data, ttl = null) {
        const expiryTime = Date.now() + (ttl || this.defaultTTL);
        this.cache.set(key, data);
        this.cacheExpiry.set(key, expiryTime);
    }

    get(key) {
        if (!this.cache.has(key)) {
            return null;
        }

        const expiryTime = this.cacheExpiry.get(key);
        if (Date.now() > expiryTime) {
            this.cache.delete(key);
            this.cacheExpiry.delete(key);
            return null;
        }

        return this.cache.get(key);
    }

    // Enhanced method for API requests with deduplication
    async getOrFetch(key, fetchFunction, ttl = null) {
        // Check cache first
        const cached = this.get(key);
        if (cached !== null) {
            return cached;
        }

        // Check if request is already pending
        if (this.pendingRequests.has(key)) {
            return this.pendingRequests.get(key);
        }

        // Create new request and cache the promise
        const requestPromise = fetchFunction()
            .then(data => {
                this.set(key, data, ttl);
                this.pendingRequests.delete(key);
                return data;
            })
            .catch(error => {
                this.pendingRequests.delete(key);
                throw error;
            });

        this.pendingRequests.set(key, requestPromise);
        return requestPromise;
    }

    // Cache for pet data with specific TTL
    cachePet(petId, petData) {
        this.set(`pet-${petId}`, petData, this.defaultTTL);
    }

    getPet(petId) {
        return this.get(`pet-${petId}`);
    }

    // Cache for user data
    cacheUser(userId, userData) {
        this.set(`user-${userId}`, userData, this.userTTL);
    }

    getUser(userId) {
        return this.get(`user-${userId}`);
    }

    // Cache for image URLs to prevent repeated failed loads
    cacheImageStatus(imageUrl, isValid) {
        this.set(`image-${imageUrl}`, isValid, this.imageTTL);
    }

    getImageStatus(imageUrl) {
        return this.get(`image-${imageUrl}`);
    }

    clear() {
        this.cache.clear();
        this.cacheExpiry.clear();
        this.pendingRequests.clear();
    }

    delete(key) {
        this.cache.delete(key);
        this.cacheExpiry.delete(key);
        this.pendingRequests.delete(key);
    }

    // Clean expired entries
    cleanup() {
        const now = Date.now();
        for (const [key, expiryTime] of this.cacheExpiry.entries()) {
            if (now > expiryTime) {
                this.cache.delete(key);
                this.cacheExpiry.delete(key);
            }
        }
    }
}

// Initialize API cache
const apiCache = new APICache();

// Image cache for pet images and avatars
const imageCache = new Map();
const defaultPetIcon = '<i class="fas fa-paw"></i>';

// Clean up cache every 10 minutes
setInterval(() => {
    apiCache.cleanup();
    // Clear image cache if it gets too large
    if (imageCache.size > 100) {
        imageCache.clear();
    }
}, 10 * 60 * 1000);

// Create optimized pet image element with caching
function createOptimizedPetImage(pet) {
    const imageKey = `pet-${pet.id}-image`;
    
    // Check if we have a cached result for this pet's image
    if (imageCache.has(imageKey)) {
        return imageCache.get(imageKey);
    }
    
    let imageHTML;
    
    // Check for image URL in multiple possible properties
    const imageUrl = getPrimaryImage(pet);
    
    if (imageUrl && imageUrl.trim()) {
        // Check if we've already validated this image URL
        const imageStatus = apiCache.getImageStatus(imageUrl);
        
        if (imageStatus === false) {
            // We know this image fails, show icon directly
            imageHTML = createFallbackIcon(pet.type);
        } else {
            // Pet has an image - create img element with fallback
            imageHTML = `
                <img src="${imageUrl}" alt="${pet.name}" 
                     style="width: 100%; height: 100%; object-fit: cover;"
                     onload="apiCache.cacheImageStatus('${imageUrl}', true)"
                     onerror="apiCache.cacheImageStatus('${imageUrl}', false); this.style.display='none'; this.nextElementSibling.style.display='block';">
                <div style="display: none;">
                    ${createFallbackIcon(pet.type)}
                </div>`;
        }
    } else {
        // No image - show icon directly
        imageHTML = createFallbackIcon(pet.type);
    }
    
    // Cache the result
    imageCache.set(imageKey, imageHTML);
    return imageHTML;
}

// Helper functions for pet modal
function getHealthStatusLabel(status) {
    const labels = {
        'healthy': 'Khỏe mạnh',
        'sick': 'Đang bệnh',
        'recovering': 'Đang hồi phục',
        'unknown': 'Chưa rõ'
    };
    return labels[status] || 'Chưa cập nhật';
}

function generateStars(rating) {
    const fullStars = Math.floor(rating);
    const hasHalf = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalf ? 1 : 0);
    
    let stars = '';
    for (let i = 0; i < fullStars; i++) {
        stars += '<i class="fas fa-star"></i>';
    }
    if (hasHalf) {
        stars += '<i class="fas fa-star-half-alt"></i>';
    }
    for (let i = 0; i < emptyStars; i++) {
        stars += '<i class="far fa-star"></i>';
    }
    return stars;
}

function formatJoinDate(dateString) {
    if (!dateString) return 'Chưa rõ';
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 30) return `${diffDays} ngày`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} tháng`;
    return `${Math.floor(diffDays / 365)} năm`;
}

function formatPostDate(dateString) {
    if (!dateString) return 'Chưa rõ';
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Hôm nay';
    if (diffDays === 1) return 'Hôm qua';
    if (diffDays < 7) return `${diffDays} ngày trước`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} tuần trước`;
    return `${Math.floor(diffDays / 30)} tháng trước`;
}

function contactSeller(sellerId) {
    console.log('Contacting seller:', sellerId);
    // Implementation for contacting seller
    showNotification('Tính năng nhắn tin đang được phát triển', 'info');
}

function reportPet(petId) {
    console.log('Reporting pet:', petId);
    // Implementation for reporting pet
    showNotification('Tính năng báo cáo đang được phát triển', 'info');
}

function openImageFullscreen() {
    console.log('Opening image in fullscreen');
    // Implementation for fullscreen image view
    showNotification('Tính năng xem toàn màn hình đang được phát triển', 'info');
}

// Helper function to create fallback pet image
function createFallbackPetImage(petType) {
    return `
        <div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 3rem; background: linear-gradient(45deg, #f8bbd9, #ffc0cb); color: white;">
            <i class="fas fa-${getTypeIcon(petType)}"></i>
        </div>`;
}

// Helper function for user avatar with fallback
function createUserAvatar(user, size = '40px') {
    if (user && (user.avatar_url || user.avatar)) {
        return `
            <img src="${user.avatar_url || user.avatar}" alt="${user.name || 'User'}" 
                 style="width: ${size}; height: ${size}; border-radius: 50%; object-fit: cover;"
                 onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
            <div style="display: none; width: ${size}; height: ${size}; border-radius: 50%; background: linear-gradient(45deg, #f8bbd9, #ffc0cb); align-items: center; justify-content: center; color: white;">
                <i class="fas fa-user"></i>
            </div>`;
    } else {
        return `
            <div style="width: ${size}; height: ${size}; border-radius: 50%; background: linear-gradient(45deg, #f8bbd9, #ffc0cb); display: flex; align-items: center; justify-content: center; color: white;">
                <i class="fas fa-user"></i>
            </div>`;
    }
}

// Global Error Handler
window.addEventListener('error', function(e) {
    console.error('Global error caught:', e.error);
    console.error('Error details:', {
        message: e.message,
        filename: e.filename,
        lineno: e.lineno,
        colno: e.colno
    });
});

window.addEventListener('unhandledrejection', function(e) {
    console.error('Unhandled promise rejection:', e.reason);
});

// Handle browser extension conflicts
if (typeof chrome !== 'undefined' && chrome.runtime) {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        // Ignore extension messages to prevent console errors
        return true;
    });
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    // Initialize notification manager first
    notificationManager = new NotificationManager();
    
    initializeApp();
    setupEventListeners();
    setupAdditionalListeners();
    checkAuthState();
    fetchPets();
    initializeMobileHeader();
    initializeUserDropdown();
    initializeNavHover();
    setupImageUploadLimit();
});

// Initialize app
function initializeApp() {
    console.log('HiPet App initialized');
    console.log('API Base URL:', API_BASE);
    
    // Check if user is logged in
    const savedUser = localStorage.getItem('currentUser');
    const authToken = localStorage.getItem('authToken');
    
    if (savedUser && authToken) {
        currentUser = JSON.parse(savedUser);
        updateUIForLoggedInUser();
        // Verify token and get fresh user data
        verifyToken(authToken);
    }
    
    // Initialize smooth scrolling
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const href = this.getAttribute('href');
            // Skip if href is just "#" or empty
            if (!href || href === '#') {
                return;
            }
            
            e.preventDefault();
            const target = document.querySelector(href);
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth'
                });
            }
        });
    });
}

// Setup event listeners
function setupEventListeners() {
    // Login form - check if exists
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    // Search filter toggle
    const filterBtn = document.getElementById('search-filter-btn');
    const filtersPanel = document.getElementById('search-filters-panel');
    
    if (filterBtn && filtersPanel) {
        filterBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            filtersPanel.classList.toggle('show');
        });
        
        // Close filters when clicking outside
        document.addEventListener('click', (e) => {
            if (!filtersPanel.contains(e.target) && !filterBtn.contains(e.target)) {
                filtersPanel.classList.remove('show');
            }
        });
    }
    
    // Mobile menu toggle
    const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
    if (mobileMenuToggle) {
        mobileMenuToggle.addEventListener('click', toggleMobileMenu);
    }
    
    // Register form - check if exists
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }
    
    // Global search input
    const globalSearchInput = document.getElementById('global-search-input');
    if (globalSearchInput) {
        // Only trigger search on Enter key, not on every input
        globalSearchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault(); // Prevent form submission
                const query = globalSearchInput.value.trim();
                if (query.length >= 2) {
                    handleGlobalSearchSuggestions();
                } else {
                    // Hide suggestions if query is too short
                    const suggestions = document.getElementById('global-search-suggestions');
                    if (suggestions) {
                        suggestions.style.display = 'none';
                    }
                }
            }
        });
        globalSearchInput.addEventListener('focus', handleGlobalSearchSuggestions);
        
        // Hide suggestions when input loses focus (with delay for clicks)
        globalSearchInput.addEventListener('blur', () => {
            setTimeout(() => {
                const suggestions = document.getElementById('global-search-suggestions');
                if (suggestions) {
                    suggestions.style.display = 'none';
                }
            }, 200);
        });
    }
    
    // Global search button
    const globalSearchBtn = document.getElementById('global-search-btn');
    if (globalSearchBtn) {
        globalSearchBtn.addEventListener('click', () => {
            const query = globalSearchInput.value.trim();
            if (query.length >= 2) {
                handleGlobalSearchSuggestions();
            }
        });
    }
}

// Mobile menu toggle function
function toggleMobileMenu() {
    const mobileToggle = document.getElementById('mobile-menu-toggle');
    const headerCenter = document.querySelector('.header-center');
    
    if (mobileToggle && headerCenter) {
        mobileToggle.classList.toggle('active');
        headerCenter.classList.toggle('mobile-open');
        
        // Animate hamburger lines
        const lines = mobileToggle.querySelectorAll('.hamburger-line');
        if (mobileToggle.classList.contains('active')) {
            lines[0].style.transform = 'rotate(45deg) translate(5px, 5px)';
            lines[1].style.opacity = '0';
            lines[2].style.transform = 'rotate(-45deg) translate(7px, -6px)';
        } else {
            lines[0].style.transform = 'none';
            lines[1].style.opacity = '1';
            lines[2].style.transform = 'none';
        }
    }
}

// Additional setup for remaining event listeners
function setupAdditionalListeners() {
    // Pet form - check if exists
    const petForm = document.getElementById('pet-form');
    if (petForm) {
        petForm.addEventListener('submit', handleAddPet);
    }
    
    // Profile edit form - check if exists
    const profileEditForm = document.getElementById('profile-edit-form');
    if (profileEditForm) {
        profileEditForm.addEventListener('submit', (e) => {
            e.preventDefault();
            saveProfileChanges();
        });
    }
    
    // Image upload preview handled by setupImageUploadLimit()
    // Remove duplicate event listener to prevent double preview
    
    // Avatar upload - check if exists
    const avatarInput = document.getElementById('avatar-input');
    if (avatarInput) {
        avatarInput.addEventListener('change', handleAvatarChange);
    }
    
    // Chat input - check if exists
    const chatInput = document.getElementById('chat-input');
    if (chatInput) {
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                sendChatMessage();
            }
        });
    }
    
    // Chat send button
    const chatSendBtn = document.getElementById('chat-send-btn');
    if (chatSendBtn) {
        chatSendBtn.addEventListener('click', sendChatMessage);
    }
    
    // Deposit form
    const depositForm = document.getElementById('deposit-form');
    if (depositForm) {
        depositForm.addEventListener('submit', (e) => {
            e.preventDefault();
            processDeposit();
        });
    }
    
    // Withdraw form
    const withdrawForm = document.getElementById('withdraw-form');
    if (withdrawForm) {
        withdrawForm.addEventListener('submit', (e) => {
            e.preventDefault();
            processWithdraw();
        });
    }
    
    // Window click to close modals
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.style.display = 'none';
        }
    });
}

// Authentication functions
function checkAuthState() {
    const token = localStorage.getItem('authToken');
    if (token) {
        // Verify token with backend
        verifyToken(token);
    }
}

async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    try {
        const response = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            currentUser = data.user;
            localStorage.setItem('authToken', data.token);
            localStorage.setItem('currentUser', JSON.stringify(data.user));
            
            updateUIForLoggedInUser();
            closeModal('login-modal');
            showNotification('Đăng nhập thành công!', 'success');
        } else {
            showNotification(data.message || 'Đăng nhập thất bại', 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        showNotification('Có lỗi xảy ra khi đăng nhập', 'error');
    }
}

async function handleRegister(e) {
    e.preventDefault();
    
    const name = document.getElementById('register-name').value.trim();
    const email = document.getElementById('register-email').value.trim();
    const password = document.getElementById('register-password').value;
    const phone = document.getElementById('register-phone').value.trim();
    
    // Client-side validation
    if (!name || !email || !password) {
        showNotification('Vui lòng điền đầy đủ thông tin bắt buộc', 'error');
        return;
    }
    
    if (password.length < 6) {
        showNotification('Mật khẩu phải có ít nhất 6 ký tự', 'error');
        return;
    }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showNotification('Email không đúng định dạng', 'error');
        return;
    }
    
    console.log('Sending registration request:', { name, email, phone, passwordLength: password.length });
    
    try {
        const response = await fetch(`${API_BASE}/api/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name, email, password, phone })
        });
        
        console.log('Registration response status:', response.status);
        console.log('Registration response headers:', Object.fromEntries(response.headers.entries()));
        
        let data;
        try {
            data = await response.json();
            console.log('Registration response data:', data);
        } catch (parseError) {
            console.error('Failed to parse response JSON:', parseError);
            showNotification('Phản hồi từ server không hợp lệ', 'error');
            return;
        }
        
        if (response.ok) {
            showNotification('Đăng ký thành công! Vui lòng đăng nhập.', 'success');
            closeModal('register-modal');
            showLoginModal();
        } else {
            // Show detailed error message
            const errorMsg = data.message || `Đăng ký thất bại (${response.status})`;
            const errorDetails = data.details ? ` - ${data.details}` : '';
            const errorCode = data.error ? ` [${data.error}]` : '';
            
            showNotification(errorMsg + errorDetails + errorCode, 'error');
            console.error('Registration failed:', {
                status: response.status,
                message: data.message,
                error: data.error,
                details: data.details
            });
        }
    } catch (error) {
        console.error('Register error:', error);
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            showNotification('Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng.', 'error');
        } else {
            showNotification('Có lỗi xảy ra khi đăng ký: ' + error.message, 'error');
        }
    }
}

function logout() {
    currentUser = null;
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    updateUIForLoggedOutUser();
    showNotification('Đã đăng xuất thành công', 'success');
}

function updateUIForLoggedInUser() {
    // Update auth section visibility
    const authSection = document.getElementById('auth-buttons');
    const userSection = document.getElementById('user-menu');
    const notificationCenter = document.getElementById('notification-center');
    
    if (authSection) authSection.style.display = 'none';
    if (userSection) userSection.style.display = 'flex';
    if (notificationCenter) notificationCenter.style.display = 'flex';
    
    // Update username display
    const usernameElement = document.getElementById('username');
    if (usernameElement) {
        usernameElement.textContent = currentUser?.name || 'User';
    }
    
    // Update avatar display
    const userAvatar = document.querySelector('.user-avatar');
    if (userAvatar && currentUser?.avatar_url) {
        userAvatar.src = currentUser.avatar_url;
    }
    
    // Update other UI elements if they exist
    const sellFormContainer = document.getElementById('sell-form-container');
    const authRequired = document.getElementById('auth-required');
    
    if (sellFormContainer) sellFormContainer.style.display = 'block';
    if (authRequired) authRequired.style.display = 'none';
    
    updateWalletDisplay();
    updateMobileUserSection();
    
    // Load user-specific data
    loadConversations();
    updateUserBalance();
}

function updateUIForLoggedOutUser() {
    // Update auth section visibility
    const authSection = document.getElementById('auth-buttons');
    const userSection = document.getElementById('user-menu');
    const notificationCenter = document.getElementById('notification-center');
    
    if (authSection) authSection.style.display = 'flex';
    if (userSection) userSection.style.display = 'none';
    if (notificationCenter) notificationCenter.style.display = 'none';
    
    // Update other UI elements if they exist
    const sellFormContainer = document.getElementById('sell-form-container');
    const authRequired = document.getElementById('auth-required');
    
    if (sellFormContainer) sellFormContainer.style.display = 'none';
    if (authRequired) authRequired.style.display = 'block';
    
    updateMobileUserSection();
}

// Pet functions
async function fetchPets() {
    try {
        showLoading(true);
        
        // Try to get from cache first
        const cacheKey = 'pets_all';
        let petsData = apiCache.get(cacheKey);
        
        if (!petsData) {
            console.log('Fetching pets from:', `${API_BASE}/api/pets`);
            const response = await fetch(`${API_BASE}/api/pets`);
            
            console.log('Response status:', response.status);
            
            if (response.ok) {
                const data = await response.json();
                console.log('Pets data received:', data);
                petsData = data.pets || data || [];
                
                // Cache for 5 minutes
                apiCache.set(cacheKey, petsData);
                
                showNotification(`Đã tải ${petsData.length} thú cưng`, 'success');
            } else {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
        } else {
            console.log('Using cached pets data');
            showNotification(`Hiển thị ${petsData.length} thú cưng (từ cache)`, 'info');
        }

        pets = petsData;
        window.allPets = petsData; // Keep for backward compatibility
        
        if (petsData.length > 0) {
            displayPets(petsData);
        } else {
            showEmptyPetsState();
        }
    } catch (error) {
        console.error('Fetch pets error:', error);
        showNotification('Không thể tải danh sách thú cưng từ server', 'error');
        showPetsError();
    } finally {
        showLoading(false);
    }
}

// Fetch featured pets
async function fetchFeaturedPets(limit = 10) {
    try {
        const cacheKey = `pets_featured_${limit}`;
        let featuredPets = apiCache.get(cacheKey);
        
        if (!featuredPets) {
            const response = await fetch(`${API_BASE}/api/pets/featured?limit=${limit}`, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                // If featured endpoint fails, fallback to regular pets
                console.warn(`Featured pets endpoint failed (${response.status}), falling back to regular pets`);
                const fallbackResponse = await fetch(`${API_BASE}/api/pets?limit=${limit}`, {
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
                
                if (fallbackResponse.ok) {
                    const fallbackData = await fallbackResponse.json();
                    featuredPets = fallbackData.pets || [];
                } else {
                    featuredPets = [];
                }
            } else {
                const data = await response.json();
                featuredPets = data.pets || [];
            }
            
            // Cache for 10 minutes (featured pets change less frequently)
            apiCache.set(cacheKey, featuredPets, 10 * 60 * 1000);
        }

        return featuredPets;
    } catch (error) {
        console.error('Error fetching featured pets:', error);
        // Return empty array instead of throwing error
        return [];
    }
}

// Fetch recent pets
async function fetchRecentPets(limit = 10) {
    try {
        const cacheKey = `pets_recent_${limit}`;
        let recentPets = apiCache.get(cacheKey);
        
        if (!recentPets) {
            const response = await fetch(`${API_BASE}/api/pets/recent?limit=${limit}`, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            recentPets = data.pets || [];
            
            // Cache for 5 minutes
            apiCache.set(cacheKey, recentPets);
        }

        return recentPets;
    } catch (error) {
        console.error('Error fetching recent pets:', error);
        return [];
    }
}

// Show empty state when no pets available
function showEmptyPetsState() {
    const petList = document.getElementById('pet-list');
    if (petList) {
        petList.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">
                    <i class="fas fa-paw"></i>
                </div>
                <h3>Chưa có thú cưng nào</h3>
                <p>Hiện tại chưa có thú cưng nào được đăng bán. Hãy quay lại sau nhé!</p>
                <button class="btn btn-primary" onclick="showModal('sell-pet-modal')">
                    <i class="fas fa-plus"></i> Đăng bán thú cưng
                </button>
            </div>
        `;
    }
}

// Show error state when API fails
function showPetsError() {
    const petList = document.getElementById('pet-list');
    if (petList) {
        petList.innerHTML = `
            <div class="error-state">
                <div class="error-icon">
                    <i class="fas fa-exclamation-triangle"></i>
                </div>
                <h3>Không thể tải dữ liệu</h3>
                <p>Có lỗi xảy ra khi tải danh sách thú cưng. Vui lòng thử lại.</p>
                <button class="btn btn-primary" onclick="fetchPets()">
                    <i class="fas fa-refresh"></i> Thử lại
                </button>
            </div>
        `;
    }
}

function displayPets(petsToShow) {
    const petList = document.getElementById('pet-list');
    petList.innerHTML = '';
    
    petsToShow.forEach(pet => {
        const petItem = createPetItem(pet);
        petList.appendChild(petItem);
    });
}

function createPetItem(pet) {
    const petDiv = document.createElement('div');
    petDiv.className = 'pet-item';
    petDiv.setAttribute('data-pet-id', pet.id);
    
    // Add click handler for pet details
    petDiv.style.cursor = 'pointer';
    petDiv.addEventListener('click', (e) => {
        console.log('Pet item clicked:', pet.id, pet.name); // Debug log
        // Don't trigger if clicking on buttons
        if (e.target.closest('button')) {
            console.log('Button clicked, ignoring pet details'); // Debug log
            return;
        }
        console.log('Calling showPetDetails for:', pet.id); // Debug log
        showPetDetails(pet.id);
    });
    
    // Create optimized image element with proper fallback
    const imageElement = createOptimizedPetImage(pet);
    
    petDiv.innerHTML = `
        <div class="pet-image">
            ${imageElement}
            <div class="pet-overlay">
                <button class="favorite-btn" onclick="event.stopPropagation(); toggleFavorite(${pet.id})" title="Yêu thích">
                    <i class="fas fa-heart"></i>
                </button>
                <div class="pet-badges">
                    ${pet.is_featured ? '<span class="badge featured">⭐ Nổi bật</span>' : ''}
                    ${pet.is_urgent ? '<span class="badge urgent">🔥 Gấp</span>' : ''}
                </div>
                <div class="pet-stats">
                    <div class="stat-item">
                        <i class="fas fa-eye"></i>
                        <span>${pet.view_count || 0}</span>
                    </div>
                    <div class="stat-item">
                        <i class="fas fa-heart"></i>
                        <span>${pet.favorite_count || 0}</span>
                    </div>
                </div>
            </div>
        </div>
        <div class="pet-info">
            <div class="pet-header-section">
                <div class="pet-title-row">
                    <h3 class="pet-name" title="${pet.name}">${pet.name}</h3>
                    <div class="pet-status-badge ${pet.is_featured ? 'featured' : ''} ${pet.is_urgent ? 'urgent' : ''}">
                        ${pet.is_featured ? '<i class="fas fa-star"></i>' : ''}
                        ${pet.is_urgent ? '<i class="fas fa-bolt"></i>' : ''}
                    </div>
                </div>
                <div class="pet-price-section">
                    <div class="price-main">${formatPrice(pet.price)}</div>
                    ${pet.original_price && pet.original_price > pet.price ? 
                        `<div class="price-original">${formatPrice(pet.original_price)}</div>
                         <div class="discount-tag">-${Math.round((1 - pet.price / pet.original_price) * 100)}%</div>` : ''
                    }
                </div>
            </div>
            
            <div class="pet-details-section">
                <div class="pet-attributes">
                    <div class="attribute-item">
                        <i class="fas fa-paw attribute-icon"></i>
                        <span class="attribute-value">${getCategoryLabel(pet.category)}</span>
                    </div>
                    <div class="attribute-item">
                        <i class="fas fa-birthday-cake attribute-icon"></i>
                        <span class="attribute-value">${formatAge(pet.age)}</span>
                    </div>
                    <div class="attribute-item">
                        <i class="fas fa-venus-mars attribute-icon"></i>
                        <span class="attribute-value">${pet.gender === 'male' ? 'Đực' : pet.gender === 'female' ? 'Cái' : 'Chưa rõ'}</span>
                    </div>
                </div>
            </div>
            
            <div class="pet-summary-section">
                <div class="pet-description">
                    ${pet.description ? pet.description.substring(0, 80) + (pet.description.length > 80 ? '...' : '') : 'Chưa có mô tả chi tiết'}
                </div>
                </div>
                <div class="pet-meta-row">
                    <div class="pet-seller">
                        <i class="fas fa-user"></i> 
                        <span>${pet.seller || pet.seller_name || 'Chưa cập nhật'}</span>
                    </div>
                    <div class="pet-location">
                        <i class="fas fa-map-marker-alt"></i> 
                        <span>${pet.location || 'Việt Nam'}</span>
                    </div>
                </div>
            </div>
            <div class="pet-actions-row">
                <button class="btn-action btn-buy" onclick="event.stopPropagation(); buyPet(${pet.id})">
                    <i class="fas fa-shopping-bag"></i> 
                    <span>Mua ngay</span>
                </button>
                <button class="btn-action btn-cart" onclick="event.stopPropagation(); addToCart(${pet.id})">
                    <i class="fas fa-cart-plus"></i>
                    <span>Giỏ hàng</span>
                </button>
                <button class="btn btn-outline btn-message" onclick="event.stopPropagation(); contactSeller(${pet.id})" title="Nhắn tin">
                    <i class="fas fa-comment"></i>
                </button>
            </div>
        </div>
    `;
    return petDiv;
}

async function handleAddPet(e) {
    e.preventDefault();
    
    if (!currentUser) {
        showLoginModal();
        return;
    }
    
    const formData = new FormData(e.target);
    const petImages = document.getElementById('pet-images');
    
    const petData = {
        // Basic Information - Required fields from simplified schema
        name: formData.get('name'),
        type: formData.get('type'),
        breed: formData.get('breed'),
        age: parseInt(formData.get('age')) || 0,
        age_unit: formData.get('age_unit') || 'months',
        gender: formData.get('gender') || 'unknown',
        category: formData.get('category') || 'other',
        
        // Health Information
        vaccination_status: formData.get('vaccination_status') || 'unknown',
        health_certificate: formData.get('health_certificate') === '1',
        
        // Price & Location
        price: parseInt(formData.get('price')),
        currency: formData.get('currency') || 'VND',
        location: formData.get('location'),
        city: formData.get('city'),
        
        // Description
        description: formData.get('description')
    };
    
    // Validate required fields
    if (!petData.name || !petData.type || !petData.price) {
        showNotification('Vui lòng điền đầy đủ thông tin bắt buộc (Tên, Loại, Giá)', 'error');
        return;
    }
    
    try {
        showLoading(true);
        showNotification('Đang tạo tin đăng với hình ảnh...', 'info');
        
        // Create FormData with all pet data and images
        const submitFormData = new FormData();
        
        // Add pet data to FormData
        Object.keys(petData).forEach(key => {
            if (petData[key] !== null && petData[key] !== undefined && petData[key] !== '') {
                submitFormData.append(key, petData[key]);
            }
        });
        
        // Add image files to FormData
        if (petImages && petImages.files.length > 0) {
            for (let i = 0; i < petImages.files.length && i < 5; i++) {
                submitFormData.append('images', petImages.files[i]);
            }
        }
        
        const response = await fetch(`${API_BASE}/api/pets`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                // Don't set Content-Type for FormData - browser will set it automatically
            },
            body: submitFormData
        });
        
        if (response.ok) {
            const result = await response.json();
            showNotification('✅ Đăng tin thành công!', 'success');
            e.target.reset();
            document.getElementById('image-preview').innerHTML = '';
            
            // Close modal and refresh
            closeModal('sell-pet-modal');
            fetchPets();
            
            // Show success details
            setTimeout(() => {
                showNotification(`🎉 Tin "${petData.name}" đã được đăng thành công!`, 'success');
            }, 1000);
        } else {
            console.error('Pet creation failed:', response.status, response.statusText);
            const errorData = await response.json();
            console.error('Error details:', errorData);
            showNotification(errorData.message || `Không thể đăng tin (${response.status})`, 'error');
        }
    } catch (error) {
        console.error('Add pet error:', error);
        showNotification('Có lỗi xảy ra khi đăng tin. Vui lòng thử lại.', 'error');
    } finally {
        showLoading(false);
    }
}

// Filter functions
function filterPets() {
    const typeFilterElement = document.getElementById('type-filter');
    const priceFilterElement = document.getElementById('price-filter');
    
    const typeFilter = typeFilterElement ? typeFilterElement.value : '';
    const priceFilter = priceFilterElement ? priceFilterElement.value : '';
    
    if (!Array.isArray(pets)) {
        console.warn('Pets array not available');
        return;
    }
    
    let filteredPets = pets;
    
    if (typeFilter) {
        filteredPets = filteredPets.filter(pet => pet.type === typeFilter);
    }
    
    if (priceFilter) {
        const [min, max] = priceFilter.split('-').map(Number);
        filteredPets = filteredPets.filter(pet => 
            pet.price >= min && pet.price <= max
        );
    }
    
    displayPets(filteredPets);
}

// Wallet functions
function updateWalletDisplay() {
    const balance = currentUser?.balance || 0;
    const balanceElement = document.getElementById('balance');
    const modalBalanceElement = document.getElementById('modal-balance');
    
    if (balanceElement) {
        balanceElement.textContent = formatPrice(balance);
    }
    if (modalBalanceElement) {
        modalBalanceElement.textContent = formatPrice(balance);
    }
}

function showWallet() {
    showModal('wallet-modal');
    loadTransactionHistory();
}

async function loadTransactionHistory() {
    try {
        const response = await fetch(`${API_BASE}/api/wallet/transactions`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            // Ensure we have an array of transactions
            const transactions = Array.isArray(data) ? data : (data.transactions || []);
            displayTransactions(transactions);
        } else {
            throw new Error('Failed to load transactions');
        }
    } catch (error) {
        console.error('Load transactions error:', error);
        // Show sample transactions
        displayTransactions([
            { type: 'deposit', amount: 1000000, date: '2025-01-01', description: 'Nạp tiền' },
            { type: 'purchase', amount: -500000, date: '2025-01-02', description: 'Mua thú cưng' }
        ]);
    }
}

function displayTransactions(transactions) {
    const transactionList = document.getElementById('transaction-list');
    transactionList.innerHTML = '';
    
    // Ensure transactions is an array
    if (!Array.isArray(transactions)) {
        console.warn('Transactions is not an array:', transactions);
        transactions = [];
    }
    
    if (transactions.length === 0) {
        transactionList.innerHTML = '<div class="no-transactions">Chưa có giao dịch nào</div>';
        return;
    }
    
    transactions.forEach(transaction => {
        const transactionDiv = document.createElement('div');
        transactionDiv.className = 'transaction-item';
        transactionDiv.innerHTML = `
            <div>
                <div class="transaction-description">${transaction.description}</div>
                <small class="transaction-date">${new Date(transaction.date).toLocaleDateString('vi-VN')}</small>
            </div>
            <div class="transaction-amount ${transaction.amount > 0 ? 'positive' : 'negative'}">
                ${transaction.amount > 0 ? '+' : ''}${formatPrice(Math.abs(transaction.amount))}
            </div>
        `;
        transactionList.appendChild(transactionDiv);
    });
}

// Chat functions
function toggleChat() {
    const chatWidget = document.getElementById('chat-widget');
    chatWidget.style.display = chatWidget.style.display === 'none' ? 'flex' : 'none';
    
    if (chatWidget.style.display === 'flex') {
        loadChatMessages();
    }
}

// Modal functions
function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'flex';
        
        // Special handling for sell-pet-modal
        if (modalId === 'sell-pet-modal') {
            populateLocationSelect();
        }
    } else {
        console.warn(`Modal ${modalId} not found`);
    }
}

// Populate location select with Vietnam provinces
function populateLocationSelect() {
    const locationSelect = document.getElementById('pet-location');
    if (!locationSelect) return;
    
    // Clear existing options except the first one
    locationSelect.innerHTML = '<option value="">-- Chọn tỉnh/thành phố --</option>';
    
    // Add provinces as options
    vietnamProvinces.forEach(province => {
        const option = document.createElement('option');
        option.value = province;
        option.textContent = province;
        locationSelect.appendChild(option);
    });
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    } else {
        console.warn(`Modal ${modalId} not found`);
    }
}

function showLoginModal() {
    showModal('login-modal');
}

function showRegisterModal() {
    showModal('register-modal');
}

function switchToRegister() {
    closeModal('login-modal');
    showRegisterModal();
}

function switchToLogin() {
    closeModal('register-modal');
    showLoginModal();
}

// Utility functions
function getTypeIcon(type) {
    const icons = {
        dog: 'dog',
        cat: 'cat',
        bird: 'dove',
        fish: 'fish',
        rabbit: 'rabbit-fast'
    };
    return icons[type] || 'paw';
}

function createFallbackIcon(petType) {
    const iconClass = getTypeIcon(petType);
    
    // Create SVG-based fallback images for different pet types
    const svgImages = {
        dog: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200" viewBox="0 0 300 200"><defs><linearGradient id="dogGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:%23ffb6c1;stop-opacity:1"/><stop offset="100%" style="stop-color:%23f8bbd9;stop-opacity:1"/></linearGradient></defs><rect width="300" height="200" fill="url(%23dogGrad)" rx="8"/><text x="150" y="60" text-anchor="middle" font-family="Arial" font-size="48" fill="white">🐕</text><text x="150" y="120" text-anchor="middle" font-family="Arial" font-size="16" font-weight="bold" fill="white">Chó cưng</text><text x="150" y="140" text-anchor="middle" font-family="Arial" font-size="12" fill="white">Đang tải hình ảnh...</text></svg>',
        cat: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200" viewBox="0 0 300 200"><defs><linearGradient id="catGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:%23ffc0cb;stop-opacity:1"/><stop offset="100%" style="stop-color:%23ffb6c1;stop-opacity:1"/></linearGradient></defs><rect width="300" height="200" fill="url(%23catGrad)" rx="8"/><text x="150" y="60" text-anchor="middle" font-family="Arial" font-size="48" fill="white">🐱</text><text x="150" y="120" text-anchor="middle" font-family="Arial" font-size="16" font-weight="bold" fill="white">Mèo cưng</text><text x="150" y="140" text-anchor="middle" font-family="Arial" font-size="12" fill="white">Đang tải hình ảnh...</text></svg>',
        bird: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200" viewBox="0 0 300 200"><defs><linearGradient id="birdGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:%23fce4ec;stop-opacity:1"/><stop offset="100%" style="stop-color:%23f8bbd9;stop-opacity:1"/></linearGradient></defs><rect width="300" height="200" fill="url(%23birdGrad)" rx="8"/><text x="150" y="60" text-anchor="middle" font-family="Arial" font-size="48" fill="white">🐦</text><text x="150" y="120" text-anchor="middle" font-family="Arial" font-size="16" font-weight="bold" fill="white">Chim cưng</text><text x="150" y="140" text-anchor="middle" font-family="Arial" font-size="12" fill="white">Đang tải hình ảnh...</text></svg>'
    };
    
    const fallbackImageUrl = svgImages[petType] || svgImages.dog;
    
    return `
        <img src="${fallbackImageUrl}" alt="${petType} placeholder" 
             style="width: 100%; height: 100%; object-fit: cover; border-radius: 8px;">
    `;
}

function getTypeLabel(type) {
    const labels = {
        dog: 'Chó',
        cat: 'Mèo',
        bird: 'Chim',
        fish: 'Cá',
        rabbit: 'Thỏ'
    };
    return labels[type] || type;
}

function getCategoryLabel(category) {
    const labels = {
        dog: 'Chó',
        cat: 'Mèo', 
        bird: 'Chim',
        fish: 'Cá',
        reptile: 'Bò sát',
        small_animal: 'Động vật nhỏ',
        other: 'Khác'
    };
    return labels[category] || category;
}

function formatPrice(price) {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(price);
}

function formatAge(ageInMonths) {
    if (!ageInMonths || ageInMonths < 0) return '0 Tháng';
    
    const years = Math.floor(ageInMonths / 12);
    const months = ageInMonths % 12;
    
    if (years === 0) {
        return `${months} Tháng`;
    } else if (months === 0) {
        return `${years} Năm`;
    } else {
        return `${years} Năm ${months} Tháng`;
    }
}

// Helper function to get primary image from pet images array
function getPrimaryImage(pet) {
    // First try to get primary image from images array
    if (pet.images && pet.images.length > 0) {
        const primaryImage = pet.images.find(img => img.is_primary === 1 || img.is_primary === true);
        if (primaryImage) return primaryImage.url || primaryImage.image_url;
        // If no primary, use first image
        return pet.images[0].url || pet.images[0].image_url;
    }
    // Fallback to old primary_image field for backward compatibility
    return pet.primary_image || pet.image || pet.imageUrl || null;
}

function showLoading(show) {
    const loading = document.getElementById('loading');
    if (loading) {
        loading.style.display = show ? 'block' : 'none';
    } else {
        console.warn('Loading element not found');
    }
}

function showNotification(message, type = 'info') {
    // Use the new notification manager if available
    if (notificationManager) {
        switch(type) {
            case 'success':
                notificationManager.success(message);
                break;
            case 'error':
                notificationManager.error(message);
                break;
            case 'warning':
                notificationManager.warning(message);
                break;
            default:
                notificationManager.info(message);
        }
    } else {
        // Fallback to console if notification manager not ready
        console.log(`${type.toUpperCase()}: ${message}`);
    }
}

function scrollToSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
        section.scrollIntoView({ behavior: 'smooth' });
    }
}

function handleImagePreview(e) {
    const files = e.target.files;
    const preview = document.getElementById('image-preview');
    preview.innerHTML = '';
    
    Array.from(files).forEach(file => {
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = document.createElement('div');
                img.className = 'preview-image';
                img.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
                preview.appendChild(img);
            };
            reader.readAsDataURL(file);
        }
    });
}

// Pet interaction functions
function contactSeller(petId, sellerName, sellerPhone) {
    if (!currentUser) {
        showLoginModal();
        return;
    }
    
    // Show contact modal with seller info
    showContactSellerModal(petId, sellerName, sellerPhone);
}

function showContactSellerModal(petId, sellerName, sellerPhone) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'flex';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 400px;">
            <span class="close" onclick="this.parentElement.parentElement.remove()">&times;</span>
            <h3><i class="fas fa-comments"></i> Liên hệ người bán</h3>
            <div style="margin: 20px 0;">
                <div style="display: flex; align-items: center; margin-bottom: 15px;">
                    <i class="fas fa-user" style="margin-right: 10px; color: #ec4899;"></i>
                    <span><strong>Tên:</strong> ${sellerName}</span>
                </div>
                <div style="display: flex; align-items: center; margin-bottom: 20px;">
                    <i class="fas fa-phone" style="margin-right: 10px; color: #ec4899;"></i>
                    <span><strong>SĐT:</strong> ${sellerPhone}</span>
                </div>
                <div style="display: flex; gap: 10px;">
                    <button class="btn btn-primary" onclick="window.open('tel:${sellerPhone}', '_self')">
                        <i class="fas fa-phone"></i> Gọi ngay
                    </button>
                    <button class="btn btn-outline" onclick="window.open('sms:${sellerPhone}', '_self')">
                        <i class="fas fa-sms"></i> Nhắn tin
                    </button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

function addToFavorites(petId) {
    if (!currentUser) {
        showLoginModal();
        return;
    }
    
    showNotification('Đã thêm vào danh sách yêu thích!', 'success');
}

function buyPet(petId) {
    if (!currentUser) {
        showLoginModal();
        return;
    }
    
    // Get pet from current pets array or fetch from API  
    let pet = pets.find(p => p.id === petId);
    if (!pet && window.allPets) {
        pet = window.allPets.find(p => p.id === petId);
    }
    
    if (!pet) {
        showNotification('Không tìm thấy thông tin thú cưng!', 'error');
        return;
    }
    
    // Show confirmation dialog
    const confirmed = confirm(`Bạn có chắc muốn mua ${pet.name} với giá ${formatPrice(pet.price)}?`);
    if (confirmed) {
        showNotification(`Đang xử lý đơn hàng cho ${pet.name}...`, 'info');
        // Here you would integrate with payment system
        setTimeout(() => {
            showNotification('Đặt hàng thành công! Người bán sẽ liên hệ với bạn sớm.', 'success');
        }, 2000);
    }
}

function addToCart(petId) {
    if (!currentUser) {
        showLoginModal();
        return;
    }
    
    // Get pet from current pets array or fetch from API  
    let pet = pets.find(p => p.id === petId);
    if (!pet && window.allPets) {
        pet = window.allPets.find(p => p.id === petId);
    }
    
    if (!pet) {
        showNotification('Không tìm thấy thông tin thú cưng!', 'error');
        return;
    }
    
    // Add to cart (would store in localStorage or send to server)
    let cart = JSON.parse(localStorage.getItem('petCart') || '[]');
    const existingItem = cart.find(item => item.id === petId);
    
    if (existingItem) {
        showNotification(`${pet.name} đã có trong giỏ hàng!`, 'warning');
    } else {
        cart.push({
            id: pet.id,
            name: pet.name,
            price: pet.price,
            image: getPrimaryImage(pet),
            addedAt: new Date().toISOString()
        });
        localStorage.setItem('petCart', JSON.stringify(cart));
        showNotification(`Đã thêm ${pet.name} vào giỏ hàng!`, 'success');
    }
}

function viewPetDetails(petId) {
    // Get pet from current pets array or fetch from API  
    let pet = pets.find(p => p.id === petId);
    if (!pet && window.allPets) {
        pet = window.allPets.find(p => p.id === petId);
    }
    
    if (!pet) {
        showNotification('Không tìm thấy thông tin thú cưng!', 'error');
        return;
    }
    
    // Create and show pet details modal
    const modal = document.createElement('div');
    modal.id = 'pet-details-modal';
    modal.className = 'modal show pet-modal-overlay';
    modal.innerHTML = `
        <div class="modal-dialog modal-lg">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Chi tiết thú cưng</h5>
                    <button type="button" class="close" onclick="closeModal('pet-details-modal')">
                        <span>&times;</span>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="pet-details-container">
                        <div class="pet-details-image">
                            <img src="${getPrimaryImage(pet)}" alt="${pet.name}" class="img-fluid">
                            ${pet.verified ? '<div class="verified-badge"><i class="fas fa-check"></i> Đã xác minh</div>' : ''}
                        </div>
                        <div class="pet-details-info">
                            <h3>${pet.name}</h3>
                            <div class="pet-price">${pet.price} VNĐ</div>
                            <div class="pet-info-grid">
                                <div class="info-item">
                                    <label>Giống:</label>
                                    <span>${pet.breed || 'Chưa rõ'}</span>
                                </div>
                                <div class="info-item">
                                    <label>Tuổi:</label>
                                    <span>${formatAge(pet.age)}</span>
                                </div>
                                <div class="info-item">
                                    <label>Giới tính:</label>
                                    <span>${pet.gender === 'male' ? 'Đực' : pet.gender === 'female' ? 'Cái' : 'Chưa rõ'}</span>
                                </div>
                                <div class="info-item">
                                    <label>Màu sắc:</label>
                                    <span>${pet.color || 'Chưa rõ'}</span>
                                </div>
                                <div class="info-item">
                                    <label>Cân nặng:</label>
                                    <span>${pet.weight ? pet.weight + ' kg' : 'Chưa rõ'}</span>
                                </div>
                                <div class="info-item">
                                    <label>Tình trạng sức khỏe:</label>
                                    <span>${pet.health_status || pet.health || 'Khỏe mạnh'}</span>
                                </div>
                                <div class="info-item">
                                    <label>Tình trạng tiêm chủng:</label>
                                    <span>${pet.vaccination_status ? (pet.vaccination_status === 'fully_vaccinated' ? 'Đã tiêm đầy đủ' : 
                                          pet.vaccination_status === 'partially_vaccinated' ? 'Tiêm một phần' : 
                                          pet.vaccination_status === 'not_vaccinated' ? 'Chưa tiêm' : 'Không rõ') : 'Chưa rõ'}</span>
                                </div>
                                <div class="info-item">
                                    <label>Giấy tờ:</label>
                                    <span>${pet.papers_available ? 'Có' : 'Không'}</span>
                                </div>
                                <div class="info-item">
                                    <label>Người bán:</label>
                                    <span>${pet.seller}</span>
                                </div>
                                <div class="info-item">
                                    <label>Địa điểm:</label>
                                    <span>${pet.location || 'TP. Hồ Chí Minh'}</span>
                                </div>
                            </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-buy" onclick="buyPet(${pet.id})">
                        <i class="fas fa-shopping-bag"></i> Mua ngay
                    </button>
                    <button type="button" class="btn btn-cart" onclick="addToCart(${pet.id})">
                        <i class="fas fa-cart-plus"></i> Thêm vào giỏ
                    </button>
                    <button type="button" class="btn btn-success" onclick="contactSeller(${pet.id}, '${pet.seller}', '${pet.phone || '0123456789'}')">
                        <i class="fas fa-phone"></i> Liên hệ người bán
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    showModal('pet-details-modal');
    
    // Remove modal when closed
    modal.addEventListener('hidden.bs.modal', () => {
        modal.remove();
    });
}

function showProfile() {
    console.log('showProfile called, currentUser:', currentUser);
    
    if (!currentUser) {
        showLoginModal();
        return;
    }
    
    showModal('profile-modal');
    console.log('Profile modal opened, displaying user data...');
    
    // Display current user data immediately, then load fresh data
    displayUserProfile(currentUser);
    loadUserProfile();
}

function showMyPets() {
    if (!currentUser) {
        showLoginModal();
        return;
    }
    // Mở modal đăng bán thú cưng
    showModal('sell-pet-modal');
}

async function loadUserProfile() {
    try {
        // Use caching for user profile data
        const cacheKey = `user-profile-${currentUser.id}`;
        const userData = await apiCache.getOrFetch(cacheKey, async () => {
            const response = await fetch(`${API_BASE}/api/users/${currentUser.id}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                }
            });
            
            if (response.ok) {
                return await response.json();
            } else {
                throw new Error('Failed to fetch user profile');
            }
        }, apiCache.userTTL);
        
        console.log('User profile data:', userData);
        
        // Merge with current user data, preserving avatar_url if not in API response
        const mergedUser = { 
            ...currentUser, 
            ...userData,
            // Ensure avatar_url is preserved if API doesn't return it
            avatar_url: userData.avatar_url || currentUser.avatar_url
        };
            
        displayUserProfile(mergedUser);
        
        // Cập nhật currentUser với dữ liệu mới nhất
        currentUser = mergedUser;
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        
    } catch (error) {
        console.error('Load profile error:', error);
        displayUserProfile(currentUser);
    }
}

function displayUserProfile(user) {
    console.log('Displaying user profile:', user);
    
    // Update avatar in profile modal
    const avatar = document.getElementById('current-avatar');
    if (avatar) {
        const avatarUrl = user.avatar_url || user.avatar || '/frontend/images/default-avatar.svg';
        avatar.src = avatarUrl;
        
        // Make avatar clickable for upload
        avatar.style.cursor = 'pointer';
        avatar.title = 'Click để thay đổi ảnh đại diện';
        
        // Remove existing click handler if any
        avatar.removeEventListener('click', triggerAvatarUpload);
        // Add click handler
        avatar.addEventListener('click', triggerAvatarUpload);
    }
    
    // Update all other avatar elements throughout the app
    const allAvatars = document.querySelectorAll('.user-avatar, .mobile-user-avatar');
    allAvatars.forEach(el => {
        if (el.tagName === 'IMG') {
            el.src = user.avatar_url || user.avatar || '/frontend/images/default-avatar.svg';
        }
    });
    
    // Update display info
    const displayName = document.getElementById('profile-display-name');
    const displayEmail = document.getElementById('profile-display-email');
    const displayPhone = document.getElementById('profile-display-phone');
    const displayLocation = document.getElementById('profile-display-location');
    
    if (displayName) displayName.textContent = user.name || 'Chưa cập nhật';
    if (displayEmail) displayEmail.innerHTML = `<i class="fas fa-envelope"></i> ${user.email || 'Chưa cập nhật'}`;
    if (displayPhone) displayPhone.innerHTML = `<i class="fas fa-phone"></i> ${user.phone || 'Chưa cập nhật'}`;
    if (displayLocation) displayLocation.innerHTML = `<i class="fas fa-map-marker-alt"></i> ${user.location || 'Chưa cập nhật'}`;
    
    // Update stats
    const balance = document.getElementById('profile-balance');
    const sales = document.getElementById('profile-sales');
    const rating = document.getElementById('profile-rating');
    
    if (balance) balance.textContent = formatPrice(user.balance || 0);
    if (sales) sales.textContent = user.total_sales || 0;
    if (rating) rating.textContent = `${user.rating || 0}/5`;
}

async function loadMyPets() {
    try {
        // Use caching for user pets data
        const cacheKey = `user-pets-${currentUser.id}`;
        const userData = await apiCache.getOrFetch(cacheKey, async () => {
            const response = await fetch(`${API_BASE}/api/users/${currentUser.id}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                }
            });
            
            if (response.ok) {
                return await response.json();
            } else {
                throw new Error('Failed to fetch user pets');
            }
        }, apiCache.userTTL);
        
        console.log('User data with pets:', userData);
        // Lấy pets từ userData
        const myPets = userData.pets || [];
        displayMyPets(myPets);
        
    } catch (error) {
        console.error('Load my pets error:', error);
        // Show sample data
        displayMyPets([]);
    }
}

function displayMyPets(pets) {
    const petsContainer = document.getElementById('my-pets-list');
    if (petsContainer) {
        if (pets.length === 0) {
            petsContainer.innerHTML = '<p class="no-data">Bạn chưa đăng tin nào</p>';
            return;
        }
        
        petsContainer.innerHTML = pets.map(pet => `
            <div class="my-pet-item">
                <div class="pet-image-container">
                    ${getPrimaryImage(pet) ? 
                        `<img src="${getPrimaryImage(pet)}" alt="${pet.name}" 
                              onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                         <div style="display: none;" class="pet-placeholder">
                            <i class="fas fa-${getTypeIcon(pet.type)}"></i>
                         </div>` :
                        `<div class="pet-placeholder">
                            <i class="fas fa-${getTypeIcon(pet.type)}"></i>
                         </div>`
                    }
                </div>
                <div class="pet-info">
                    <h4>${pet.name}</h4>
                    <div class="pet-details-mini">
                        <span class="pet-type">${getTypeLabel(pet.type)}</span>
                        <span class="pet-age">${formatAge(pet.age || 0)}</span>
                    </div>
                    <p class="pet-price">${formatPrice(pet.price)}</p>
                    <span class="status ${pet.status}">${getStatusText(pet.status)}</span>
                    <small class="pet-date">Đăng: ${formatDate(pet.created_at)}</small>
                </div>
                <div class="pet-actions">
                    <button class="btn btn-sm btn-primary" onclick="editPet(${pet.id})" title="Chỉnh sửa">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deletePet(${pet.id})" title="Xóa">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
    }
}

function getStatusText(status) {
    const statusMap = {
        'available': 'Đang bán',
        'sold': 'Đã bán',
        'pending': 'Chờ duyệt',
        'reserved': 'Đã đặt cọc',
        'deleted': 'Đã xóa',
        'hidden': 'Đã ẩn'
    };
    return statusMap[status] || status;
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    } catch (error) {
        return 'N/A';
    }
}

function editPet(petId) {
    showNotification('Chức năng chỉnh sửa đang phát triển', 'info');
}

function enableProfileEdit() {
    document.getElementById('profile-view-mode').style.display = 'none';
    document.getElementById('profile-edit-mode').style.display = 'block';
    
    // Populate edit form with current data
    const editName = document.getElementById('edit-name');
    const editEmail = document.getElementById('edit-email');
    const editPhone = document.getElementById('edit-phone');
    const editLocation = document.getElementById('edit-location');
    
    if (editName) editName.value = currentUser.name || '';
    if (editEmail) editEmail.value = currentUser.email || '';
    if (editPhone) editPhone.value = currentUser.phone || '';
    if (editLocation) editLocation.value = currentUser.location || '';
}

function cancelProfileEdit() {
    document.getElementById('profile-edit-mode').style.display = 'none';
    document.getElementById('profile-view-mode').style.display = 'block';
    
    // Reset form
    const form = document.getElementById('profile-edit-form');
    if (form) form.reset();
    
    // Reset avatar preview
    const avatarPreview = document.getElementById('avatar-preview');
    if (avatarPreview) {
        avatarPreview.src = currentUser.avatar || '/frontend/images/default-avatar.svg';
    }
}

async function saveProfileChanges() {
    const editName = document.getElementById('edit-name');
    const editEmail = document.getElementById('edit-email');
    const editPhone = document.getElementById('edit-phone');
    const editLocation = document.getElementById('edit-location');
    const editBio = document.getElementById('edit-bio');
    
    try {
        showNotification('Đang cập nhật thông tin...', 'info');
        
        // Upload avatar first if there's a pending file
        let avatarUrl = null;
        if (window.pendingAvatarFile) {
            avatarUrl = await uploadAvatar();
            if (!avatarUrl) {
                return; // Upload failed, stop here
            }
        }
        
        // Prepare user data
        const userData = {
            name: editName?.value || '',
            phone: editPhone?.value || '',
            location: editLocation?.value || '',
            bio: editBio?.value || '',
            // Add other fields that might be in the form
            address: document.getElementById('edit-address')?.value || '',
            business_name: document.getElementById('edit-business-name')?.value || ''
        };
        
        // Update user profile
        const response = await fetch(`${API_BASE}/api/users/${currentUser.id}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(userData)
        });
        
        if (response.ok) {
            const result = await response.json();
            
            // Update current user data
            currentUser = { ...currentUser, ...result.user };
            if (avatarUrl) {
                currentUser.avatar_url = avatarUrl;
            }
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            
            // Update UI
            displayUserProfile(currentUser);
            
            // Hide edit mode
            document.getElementById('profile-edit-mode').style.display = 'none';
            document.getElementById('profile-view-mode').style.display = 'block';
            
            showNotification('Cập nhật thông tin thành công!', 'success');
        } else {
            throw new Error('Update failed');
        }
    } catch (error) {
        console.error('Save profile error:', error);
        showNotification('Có lỗi khi cập nhật thông tin', 'error');
    }
}

function changeAvatar() {
    const avatarInput = document.getElementById('avatar-input');
    if (avatarInput) {
        avatarInput.click();
    }
}

function toggleEditMode() {
    enableProfileEdit();
}

function deletePet(petId) {
    if (confirm('Bạn có chắc muốn xóa tin đăng này?')) {
        showNotification('Chức năng xóa đang phát triển', 'info');
    }
}

function showMyPets() {
    if (!currentUser) {
        showLoginModal();
        return;
    }
    // Mở modal đăng bán thú cưng
    showModal('sell-pet-modal');
}

function showSettings() {
    if (!currentUser) {
        showLoginModal();
        return;
    }
    showNotification('Chức năng cài đặt đang phát triển', 'info');
}

function showDepositForm() {
    showNotification('Chức năng nạp tiền đang phát triển', 'info');
}

function showWithdrawForm() {
    showNotification('Chức năng rút tiền đang phát triển', 'info');
}

async function verifyToken(token) {
    try {
        // Use caching for auth verification
        const cacheKey = `auth-verify-${token}`;
        const result = await apiCache.getOrFetch(cacheKey, async () => {
            const response = await fetch(`${API_BASE}/api/auth/verify`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                return { success: true, user: data.user };
            } else {
                return { success: false };
            }
        }, apiCache.userTTL);
        
        if (result.success) {
            currentUser = result.user;
            localStorage.setItem('currentUser', JSON.stringify(result.user));
            updateUIForLoggedInUser();
        } else {
            logout();
        }
    } catch (error) {
        console.error('Token verification error:', error);
        logout();
    }
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
    
    .notification-content {
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }
    
    .pet-description {
        color: #666;
        font-size: 0.9rem;
        margin-bottom: 1rem;
        line-height: 1.4;
    }
    
    .pet-seller {
        display: flex;
        justify-content: space-between;
        margin-bottom: 1rem;
        color: #888;
        font-size: 0.8rem;
    }
`;
document.head.appendChild(style);

// Global Search Functionality
class GlobalSearch {
    constructor() {
        this.searchInput = document.getElementById('global-search-input');
        this.searchBtn = document.getElementById('global-search-btn');
        this.suggestionsContainer = document.getElementById('global-search-suggestions');
        this.searchResults = [];
        this.debounceTimer = null;
        this.lastQuery = '';
        this.cache = new Map();
        this.cacheExpiry = 5 * 60 * 1000; // 5 minutes
        
        // Only initialize if elements exist
        if (this.searchInput && this.searchBtn) {
            this.init();
        }
    }

    init() {
        this.bindEvents();
    }

    bindEvents() {
        if (this.searchInput) {
            // Use debounced input for suggestions
            this.searchInput.addEventListener('input', (e) => {
                this.debounceSearch(e.target.value);
            });
            
            this.searchInput.addEventListener('focus', () => {
                if (this.searchInput.value.length >= 2) {
                    this.showSuggestions();
                }
            });
            
            this.searchInput.addEventListener('blur', () => setTimeout(() => this.hideSuggestions(), 200));
            
            // Only call API on Enter key
            this.searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.performSearch();
                }
            });
        }
        
        if (this.searchBtn) {
            this.searchBtn.addEventListener('click', () => this.performSearch());
        }
    }

    debounceSearch(query) {
        // Clear previous timer
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }

        // Don't search if query is same as last one
        if (query === this.lastQuery) {
            return;
        }

        // Set new timer with 500ms delay
        this.debounceTimer = setTimeout(() => {
            this.handleSearch(query);
        }, 500);
    }

    async handleSearch(query) {
        if (query.length < 2) {
            this.hideSuggestions();
            return;
        }

        // Check cache first
        const cacheKey = query.toLowerCase();
        const cached = this.cache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
            this.renderSuggestions(cached.data);
            this.showSuggestions();
            return;
        }

        try {
            const response = await fetch(`${API_BASE}/api/search/suggestions?q=${encodeURIComponent(query)}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                }
            });

            if (response.ok) {
                const suggestions = await response.json();
                
                // Cache the results
                this.cache.set(cacheKey, {
                    data: suggestions,
                    timestamp: Date.now()
                });
                
                // Clean up old cache entries (keep only 50 entries)
                if (this.cache.size > 50) {
                    const firstKey = this.cache.keys().next().value;
                    this.cache.delete(firstKey);
                }
                
                this.renderSuggestions(suggestions);
                this.showSuggestions();
                this.lastQuery = query;
            }
        } catch (error) {
            console.error('Search error:', error);
        }
    }

    renderSuggestions(suggestions) {
        if (!this.suggestionsContainer) {
            console.warn('Suggestions container not found');
            return;
        }
        
        this.suggestionsContainer.innerHTML = suggestions.map(suggestion => `
            <div class="suggestion-item" onclick="globalSearch.selectSuggestion('${suggestion.type}', '${suggestion.id}', '${suggestion.title}')">
                <div class="suggestion-icon ${suggestion.type}">
                    <i class="fas ${this.getIconForType(suggestion.type)}"></i>
                </div>
                <div class="suggestion-content">
                    <div class="suggestion-title">${suggestion.title}</div>
                    <div class="suggestion-subtitle">${suggestion.subtitle}</div>
                </div>
                ${suggestion.category ? `<span class="suggestion-category">${suggestion.category}</span>` : ''}
            </div>
        `).join('');
    }

    getIconForType(type) {
        const icons = {
            'pet': 'fa-paw',
            'user': 'fa-user',
            'category': 'fa-tag'
        };
        return icons[type] || 'fa-search';
    }

    selectSuggestion(type, id, title) {
        this.searchInput.value = title;
        this.hideSuggestions();
        
        // Navigate based on type
        switch(type) {
            case 'pet':
                this.viewPet(id);
                break;
            case 'user':
                this.viewUserProfile(id);
                break;
            case 'category':
                this.filterByCategory(id);
                break;
        }
    }

    async performSearch() {
        const query = this.searchInput.value.trim();
        if (!query) return;

        try {
            showNotification('Đang tìm kiếm...', 'info');
            
            // Use current pets data or fetch from API if needed
            let petsData = window.allPets || pets;
            if (!petsData || petsData.length === 0) {
                await fetchPets(); // Fetch fresh data if not available
                petsData = window.allPets || pets || [];
            }
            
            const results = petsData.filter(pet => 
                pet.name.toLowerCase().includes(query.toLowerCase()) ||
                (pet.breed && pet.breed.toLowerCase().includes(query.toLowerCase())) ||
                (pet.seller && pet.seller.toLowerCase().includes(query.toLowerCase())) ||
                (pet.seller_name && pet.seller_name.toLowerCase().includes(query.toLowerCase()))
            );

            // Create search response format
            const searchResults = {
                pets: results,
                total: results.length
            };

            this.displaySearchResults(searchResults);
            this.hideSuggestions();
            showNotification(`Tìm thấy ${results.length} kết quả`, 'success');
        } catch (error) {
            console.error('Search error:', error);
            showNotification('Lỗi tìm kiếm', 'error');
        }
    }

    displaySearchResults(results) {
        // Clear current pets and show search results
        const petList = document.getElementById('pet-list');
        petList.innerHTML = '';

        if (results.pets && results.pets.length > 0) {
            results.pets.forEach(pet => {
                const petElement = createPetElement(pet);
                petList.appendChild(petElement);
            });
            
            // Scroll to pets section
            document.getElementById('pets').scrollIntoView({ behavior: 'smooth' });
            showNotification(`Tìm thấy ${results.pets.length} kết quả`, 'success');
        } else {
            petList.innerHTML = '<p class="text-center">Không tìm thấy kết quả nào</p>';
            showNotification('Không tìm thấy kết quả', 'warning');
        }
    }

    showSuggestions() {
        if (this.suggestionsContainer) {
            this.suggestionsContainer.style.display = 'block';
        }
    }

    hideSuggestions() {
        if (this.suggestionsContainer) {
            this.suggestionsContainer.style.display = 'none';
        }
    }

    viewPet(petId) {
        // Implementation for viewing specific pet
        const pet = pets.find(p => p.id === petId);
        if (pet) {
            showPetModal(pet);
        }
    }

    viewUserProfile(userId) {
        // Implementation for viewing user profile
        console.log('Viewing user profile:', userId);
    }

    filterByCategory(category) {
        // Implementation for filtering by category
        const typeFilter = document.getElementById('type-filter');
        if (typeFilter) {
            typeFilter.value = category;
        }
        filterPets();
    }
}

// User Rating System
class UserRatingSystem {
    constructor() {
        this.ratings = [];
        this.init();
    }

    init() {
        this.loadTopSellers();
    }

    async loadTopSellers() {
        try {
            const response = await fetch(`${API_BASE}/api/users/top-sellers`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                const topSellers = data.sellers || [];
                this.renderTopSellers(topSellers);
            } else {
                console.warn('Top sellers endpoint returned error:', response.status);
                this.renderTopSellers([]); // Render empty state
            }
        } catch (error) {
            console.error('Error loading top sellers:', error);
            this.renderTopSellers([]); // Render empty state
        }
    }

    renderTopSellers(sellers) {
        const container = document.getElementById('top-sellers-list');
        if (!container) return;

        if (!sellers || sellers.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-users"></i>
                    <p>Chưa có người bán nào</p>
                </div>
            `;
            return;
        }

        container.innerHTML = sellers.map(seller => `
            <div class="seller-item" onclick="userRating.viewSellerProfile('${seller.id}')">
                ${createUserAvatar(seller, '48px')}
                <div class="seller-info">
                    <div class="seller-name">${seller.name}</div>
                    <div class="seller-rating">
                        <div class="stars">${this.renderStars(seller.rating || 5)}</div>
                        <span class="rating-score">${(seller.rating || 5).toFixed(1)}</span>
                    </div>
                    <div class="seller-stats">${seller.total_sales || 0} giao dịch • ${seller.active_listings || 0} tin đăng</div>
                    ${seller.trust_score > 90 ? '<span class="trust-badge">Uy tín</span>' : ''}
                </div>
            </div>
        `).join('');
    }

    renderStars(rating) {
        let stars = '';
        for (let i = 1; i <= 5; i++) {
            if (i <= rating) {
                stars += '<i class="fas fa-star"></i>';
            } else if (i - 0.5 <= rating) {
                stars += '<i class="fas fa-star-half-alt"></i>';
            } else {
                stars += '<i class="far fa-star"></i>';
            }
        }
        return stars;
    }

    async rateUser(userId, rating, comment = '') {
        try {
            const response = await fetch(`${API_BASE}/api/users/${userId}/rate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                },
                body: JSON.stringify({ rating, comment })
            });

            if (response.ok) {
                showNotification('Đánh giá đã được gửi', 'success');
                return true;
            } else {
                throw new Error('Failed to submit rating');
            }
        } catch (error) {
            console.error('Error submitting rating:', error);
            showNotification('Lỗi khi gửi đánh giá', 'error');
            return false;
        }
    }

    showRatingModal(userId, userName) {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.id = 'rating-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Đánh giá người bán: ${userName}</h3>
                    <span class="close" onclick="closeModal('rating-modal')">&times;</span>
                </div>
                <form id="rating-form">
                    <div class="form-group">
                        <label>Đánh giá chất lượng:</label>
                        <div class="rating-input" id="rating-stars">
                            ${[1,2,3,4,5].map(i => `<i class="far fa-star" data-rating="${i}"></i>`).join('')}
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="rating-comment">Nhận xét (tùy chọn):</label>
                        <textarea id="rating-comment" rows="3" placeholder="Chia sẻ trải nghiệm của bạn..."></textarea>
                    </div>
                    <div class="form-actions">
                        <button type="button" class="btn btn-outline" onclick="closeModal('rating-modal')">Hủy</button>
                        <button type="submit" class="btn btn-primary">Gửi đánh giá</button>
                    </div>
                </form>
            </div>
        `;
        document.body.appendChild(modal);

        // Rating stars interaction
        const stars = modal.querySelectorAll('#rating-stars i');
        let selectedRating = 0;

        stars.forEach((star, index) => {
            star.addEventListener('mouseenter', () => {
                stars.forEach((s, i) => {
                    s.className = i <= index ? 'fas fa-star' : 'far fa-star';
                });
            });

            star.addEventListener('mouseleave', () => {
                stars.forEach((s, i) => {
                    s.className = i < selectedRating ? 'fas fa-star' : 'far fa-star';
                });
            });

            star.addEventListener('click', () => {
                selectedRating = index + 1;
                stars.forEach((s, i) => {
                    s.className = i < selectedRating ? 'fas fa-star' : 'far fa-star';
                });
            });
        });

        // Form submission
        modal.querySelector('#rating-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            if (selectedRating === 0) {
                showNotification('Vui lòng chọn số sao đánh giá', 'warning');
                return;
            }

            const comment = modal.querySelector('#rating-comment').value;
            const success = await this.rateUser(userId, selectedRating, comment);
            
            if (success) {
                closeModal('rating-modal');
                modal.remove();
            }
        });

        modal.style.display = 'block';
    }

    viewSellerProfile(sellerId) {
        // Implementation for viewing seller profile with ratings
        console.log('Viewing seller profile:', sellerId);
    }

    getUserTrustScore(user) {
        // Calculate trust score based on various factors
        let score = 0;
        
        if (user.verified) score += 20;
        if (user.emailVerified) score += 10;
        if (user.phoneVerified) score += 10;
        if (user.idVerified) score += 15;
        
        // Rating contribution (max 35 points)
        if (user.rating >= 4.5) score += 35;
        else if (user.rating >= 4.0) score += 30;
        else if (user.rating >= 3.5) score += 25;
        else if (user.rating >= 3.0) score += 20;
        else if (user.rating >= 2.5) score += 15;
        
        // Transaction history (max 10 points)
        if (user.totalSales >= 50) score += 10;
        else if (user.totalSales >= 20) score += 8;
        else if (user.totalSales >= 10) score += 6;
        else if (user.totalSales >= 5) score += 4;
        
        return Math.min(score, 100);
    }

    getTrustBadgeClass(score) {
        if (score >= 90) return 'premium';
        if (score >= 75) return 'verified';
        if (score >= 60) return 'trusted';
        return 'basic';
    }

    getTrustBadgeText(score) {
        if (score >= 90) return 'Siêu uy tín';
        if (score >= 75) return 'Rất uy tín';
        if (score >= 60) return 'Uy tín';
        return 'Mới tham gia';
    }
}

// Enhanced Advertisement System
class AdvertisementSystem {
    constructor() {
        this.ads = [];
        this.currentFloatingAd = null;
        this.viewedAds = new Set();
        this.adPreferences = this.loadAdPreferences();
        this.init();
    }

    async init() {
        await this.loadAds();
        this.setupFloatingAd();
        this.setupAdControls();
    }

    loadAdPreferences() {
        const saved = localStorage.getItem('adPreferences');
        return saved ? JSON.parse(saved) : {
            showFloatingAds: true,
            adFrequency: 'normal',
            categories: []
        };
    }

    saveAdPreferences() {
        localStorage.setItem('adPreferences', JSON.stringify(this.adPreferences));
    }

    async loadAds() {
        try {
            const response = await fetch(`${API_BASE}/api/ads/active`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.ads = Array.isArray(data) ? data : (data.ads || []);
                this.displayAds();
                this.createAdAnalytics();
            } else {
                console.warn('Failed to load ads from server, status:', response.status);
                this.loadFallbackAds();
            }
        } catch (error) {
            console.error('Error loading ads:', error);
            this.loadFallbackAds();
        }
    }

    loadFallbackAds() {
        // Enhanced fallback ads with better design
        this.ads = [
            {
                id: 'fallback-1',
                type: 'banner',
                position: 'header',
                title: 'HiPet Premium',
                description: 'Nâng cấp tài khoản để trải nghiệm tối ưu',
                imageUrl: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="100" viewBox="0 0 400 100"><defs><linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" style="stop-color:%23f8bbd9;stop-opacity:1"/><stop offset="100%" style="stop-color:%23ffc0cb;stop-opacity:1"/></linearGradient></defs><rect width="400" height="100" fill="url(%23grad)"/><text x="200" y="35" text-anchor="middle" font-family="Arial" font-size="16" font-weight="bold" fill="white">HiPet Premium</text><text x="200" y="55" text-anchor="middle" font-family="Arial" font-size="12" fill="white">Nâng cấp tài khoản để trải nghiệm tối ưu</text><text x="200" y="75" text-anchor="middle" font-family="Arial" font-size="10" fill="white">Đăng ký ngay →</text></svg>',
                targetUrl: '#premium',
                ctaText: 'Nâng cấp ngay',
                category: 'premium'
            },
            {
                id: 'fallback-2',
                type: 'banner',
                position: 'sidebar',
                title: 'Cửa hàng thú cưng uy tín',
                description: 'Khám phá những cửa hàng thú cưng đáng tin cậy',
                imageUrl: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200" viewBox="0 0 300 200"><defs><linearGradient id="grad2" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:%23fce4ec;stop-opacity:1"/><stop offset="100%" style="stop-color:%23f8bbd9;stop-opacity:1"/></linearGradient></defs><rect width="300" height="200" fill="url(%23grad2)"/><text x="150" y="80" text-anchor="middle" font-family="Arial" font-size="14" font-weight="bold" fill="%23333">🏪 Cửa hàng uy tín</text><text x="150" y="100" text-anchor="middle" font-family="Arial" font-size="11" fill="%23666">Khám phá các cửa hàng</text><text x="150" y="115" text-anchor="middle" font-family="Arial" font-size="11" fill="%23666">thú cưng đáng tin cậy</text><rect x="100" y="140" width="100" height="30" rx="15" fill="%23f8bbd9"/><text x="150" y="158" text-anchor="middle" font-family="Arial" font-size="10" fill="white">Xem ngay</text></svg>',
                targetUrl: '#stores',
                ctaText: 'Khám phá',
                category: 'stores'
            }
        ];
        this.displayAds();
    }
    displayAds() {
        // Enhanced ad display with better targeting and analytics
        if (!this.ads || !Array.isArray(this.ads)) {
            console.warn('No ads available to display');
            return;
        }
        
        this.ads.forEach(ad => {
            if (!ad || !ad.position) {
                console.warn('Invalid ad data:', ad);
                return;
            }
            
            // Check if user has ad preferences for this category
            if (this.adPreferences.categories.length > 0 && 
                ad.category && 
                !this.adPreferences.categories.includes(ad.category)) {
                return; // Skip ads not in user preferences
            }
            
            const container = document.querySelector(`[data-ad-position="${ad.position}"]`);
            if (container) {
                this.renderAdvancedAd(container, ad);
            }
        });
    }

    renderAdvancedAd(container, ad) {
        if (!container || !ad) {
            console.warn('Invalid container or ad data');
            return;
        }
        
        container.innerHTML = '';
        container.className = `ad-container ${ad.type || 'banner'} ${ad.category || 'general'}`;
        
        // Create modern ad wrapper
        const adWrapper = document.createElement('div');
        adWrapper.className = 'modern-ad-wrapper';
        adWrapper.innerHTML = `
            <div class="ad-content">
                ${this.createAdContent(ad)}
            </div>
            <div class="ad-controls">
                <button class="ad-control-btn close-ad" onclick="adSystem.hideAd('${ad.id}')" title="Ẩn quảng cáo">
                    <i class="fas fa-times"></i>
                </button>
                <button class="ad-control-btn ad-info" onclick="adSystem.showAdInfo('${ad.id}')" title="Thông tin quảng cáo">
                    <i class="fas fa-info-circle"></i>
                </button>
            </div>
            <div class="ad-label">Quảng cáo</div>
        `;
        
        container.appendChild(adWrapper);
        this.trackImpression(ad.id);
    }

    createAdContent(ad) {
        switch (ad.type) {
            case 'image':
            case 'banner':
                return `
                    <div class="ad-image-content" onclick="adSystem.trackClick('${ad.id}')">
                        <img src="${ad.imageUrl || ad.image}" alt="${ad.title || 'Advertisement'}" 
                             class="ad-image" loading="lazy">
                        ${ad.title || ad.description ? `
                            <div class="ad-overlay">
                                ${ad.title ? `<h4 class="ad-title">${ad.title}</h4>` : ''}
                                ${ad.description ? `<p class="ad-description">${ad.description}</p>` : ''}
                                ${ad.ctaText ? `<button class="ad-cta-button">${ad.ctaText}</button>` : ''}
                            </div>
                        ` : ''}
                    </div>
                `;
            
            case 'video':
                return `
                    <div class="ad-video-content" onclick="adSystem.trackClick('${ad.id}')">
                        <video class="ad-video" autoplay muted loop>
                            <source src="${ad.videoUrl}" type="video/mp4">
                        </video>
                        <div class="ad-overlay">
                            ${ad.title ? `<h4 class="ad-title">${ad.title}</h4>` : ''}
                            ${ad.description ? `<p class="ad-description">${ad.description}</p>` : ''}
                            ${ad.ctaText ? `<button class="ad-cta-button">${ad.ctaText}</button>` : ''}
                        </div>
                    </div>
                `;
            
            case 'native':
                return `
                    <div class="ad-native-content" onclick="adSystem.trackClick('${ad.id}')">
                        <div class="ad-native-header">
                            <img src="${ad.brandLogo || ''}" alt="${ad.brandName || 'Brand'}" class="ad-brand-logo">
                            <span class="ad-brand-name">${ad.brandName || 'Sponsored'}</span>
                        </div>
                        <div class="ad-native-body">
                            <h4 class="ad-title">${ad.title}</h4>
                            <p class="ad-description">${ad.description}</p>
                            ${ad.ctaText ? `<button class="ad-cta-button">${ad.ctaText}</button>` : ''}
                        </div>
                    </div>
                `;
            
            default:
                return `
                    <div class="ad-default-content">
                        <h4 class="ad-title">${ad.title || 'Advertisement'}</h4>
                        <p class="ad-description">${ad.description || 'Sponsored content'}</p>
                    </div>
                `;
        }
    }

    setupFloatingAd() {
        if (!this.adPreferences.showFloatingAds) return;
        
        // Show floating ad based on frequency preference
        const delay = this.adPreferences.adFrequency === 'low' ? 60000 : 
                     this.adPreferences.adFrequency === 'high' ? 15000 : 30000;
        
        setTimeout(() => {
            this.showFloatingAd();
        }, delay);
    }

    showFloatingAd() {
        if (!this.ads || !Array.isArray(this.ads)) return;
        
        const floatingAds = this.ads.filter(ad => 
            ad && ad.position === 'floating' && !this.viewedAds.has(ad.id)
        );
        
        if (floatingAds.length === 0) return;

        const ad = floatingAds[Math.floor(Math.random() * floatingAds.length)];
        this.createFloatingAdElement(ad);
        this.viewedAds.add(ad.id);
    }

    createFloatingAdElement(ad) {
        // Remove existing floating ad
        const existing = document.getElementById('floating-ad-dynamic');
        if (existing) existing.remove();

        const floatingAd = document.createElement('div');
        floatingAd.id = 'floating-ad-dynamic';
        floatingAd.className = 'floating-ad-modern';
        floatingAd.innerHTML = `
            <div class="floating-ad-content">
                ${this.createAdContent(ad)}
            </div>
            <button class="floating-ad-close" onclick="adSystem.hideFloatingAd()">
                <i class="fas fa-times"></i>
            </button>
        `;

        document.body.appendChild(floatingAd);
        
        // Show with animation
        setTimeout(() => floatingAd.classList.add('show'), 100);
        
        // Auto hide after 10 seconds
        setTimeout(() => this.hideFloatingAd(), 10000);
    }

    hideFloatingAd() {
        const floatingAd = document.getElementById('floating-ad-dynamic');
        if (floatingAd) {
            floatingAd.classList.remove('show');
            setTimeout(() => floatingAd.remove(), 300);
        }
    }

    hideAd(adId) {
        const adElements = document.querySelectorAll(`[data-ad-id="${adId}"]`);
        adElements.forEach(el => {
            el.style.display = 'none';
            this.trackAdAction(adId, 'hide');
        });
    }

    showAdInfo(adId) {
        const ad = this.ads.find(a => a.id === adId);
        if (!ad) return;

        // Create ad info modal
        const modal = document.createElement('div');
        modal.className = 'ad-info-modal';
        modal.innerHTML = `
            <div class="ad-info-content">
                <h3>Thông tin quảng cáo</h3>
                <p><strong>Nhà quảng cáo:</strong> ${ad.advertiser || 'Không rõ'}</p>
                <p><strong>Danh mục:</strong> ${ad.category || 'Tổng quát'}</p>
                <p><strong>Mô tả:</strong> ${ad.description || ad.title}</p>
                <div class="ad-preferences">
                    <label>
                        <input type="checkbox" ${this.adPreferences.showFloatingAds ? 'checked' : ''} 
                               onchange="adSystem.toggleFloatingAds(this.checked)">
                        Hiển thị quảng cáo nổi
                    </label>
                </div>
                <button onclick="this.parentElement.parentElement.remove()">Đóng</button>
            </div>
        `;
        document.body.appendChild(modal);
    }

    toggleFloatingAds(enabled) {
        this.adPreferences.showFloatingAds = enabled;
        this.saveAdPreferences();
    }

    setupAdControls() {
        // Add ad preference controls to settings
        const settingsContainer = document.querySelector('.user-preferences');
        if (settingsContainer) {
            const adControls = document.createElement('div');
            adControls.className = 'ad-preferences-section';
            adControls.innerHTML = `
                <h4>Tùy chọn quảng cáo</h4>
                <label>
                    <input type="checkbox" ${this.adPreferences.showFloatingAds ? 'checked' : ''} 
                           onchange="adSystem.toggleFloatingAds(this.checked)">
                    Hiển thị quảng cáo nổi
                </label>
                <label>
                    <select onchange="adSystem.setAdFrequency(this.value)">
                        <option value="low" ${this.adPreferences.adFrequency === 'low' ? 'selected' : ''}>Ít</option>
                        <option value="normal" ${this.adPreferences.adFrequency === 'normal' ? 'selected' : ''}>Bình thường</option>
                        <option value="high" ${this.adPreferences.adFrequency === 'high' ? 'selected' : ''}>Nhiều</option>
                    </select>
                    Tần suất quảng cáo
                </label>
            `;
            settingsContainer.appendChild(adControls);
        }
    }

    setAdFrequency(frequency) {
        this.adPreferences.adFrequency = frequency;
        this.saveAdPreferences();
    }

    createAdAnalytics() {
        // Simple analytics for ad performance
        this.analytics = {
            impressions: 0,
            clicks: 0,
            hidden: 0
        };
    }

    async trackImpression(adId) {
        this.analytics.impressions++;
        try {
            await fetch(`${API_BASE}/api/ads/${adId}/impression`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
                    'Content-Type': 'application/json'
                }
            });
        } catch (error) {
            console.error('Error tracking impression:', error);
        }
    }

    async trackClick(adId) {
        this.analytics.clicks++;
        try {
            await fetch(`${API_BASE}/api/ads/${adId}/click`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
                    'Content-Type': 'application/json'
                }
            });
        } catch (error) {
            console.error('Error tracking click:', error);
        }
    }

    async trackAdAction(adId, action) {
        try {
            await fetch(`${API_BASE}/api/ads/${adId}/action`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ action })
            });
        } catch (error) {
            console.error('Error tracking ad action:', error);
        }
    }
}

// Support Chat Functions (Updated for new design)
function openSupportChat() {
    const popup = document.getElementById('support-chat-popup');
    const guestForm = document.getElementById('guest-form');
    const chatInputSection = document.getElementById('chat-input-section');
    const quickActions = document.getElementById('quick-actions');
    
    if (currentUser) {
        // User is logged in - show chat input and quick actions
        guestForm.style.display = 'none';
        chatInputSection.style.display = 'block';
        quickActions.style.display = 'grid';
    } else {
        // Guest user - show name input first
        guestForm.style.display = 'block';
        chatInputSection.style.display = 'none';
        quickActions.style.display = 'none';
    }
    
    popup.style.display = 'flex';
    popup.classList.remove('minimized');
    
    // Focus appropriate input
    setTimeout(() => {
        const messageInput = document.getElementById('support-message-input');
        const guestNameInput = document.getElementById('guest-name');
        
        if (currentUser && messageInput) {
            messageInput.focus();
        } else if (!currentUser && guestNameInput) {
            guestNameInput.focus();
        }
    }, 100);
}

function closeSupportChat() {
    const popup = document.getElementById('support-chat-popup');
    popup.style.display = 'none';
}

function minimizeChat() {
    const popup = document.getElementById('support-chat-popup');
    
    if (popup.classList.contains('minimized')) {
        popup.classList.remove('minimized');
    } else {
        popup.classList.add('minimized');
    }
}

function startGuestChat() {
    const nameInput = document.getElementById('guest-name');
    const name = nameInput.value.trim();
    
    if (!name) {
        nameInput.style.borderColor = '#dc3545';
        nameInput.placeholder = 'Vui lòng nhập tên của bạn';
        setTimeout(() => {
            nameInput.style.borderColor = '';
            nameInput.placeholder = 'Tên của bạn';
        }, 3000);
        return;
    }
    
    if (name.length < 2) {
        nameInput.style.borderColor = '#dc3545';
        nameInput.placeholder = 'Tên phải có ít nhất 2 ký tự';
        setTimeout(() => {
            nameInput.style.borderColor = '';
            nameInput.placeholder = 'Tên của bạn';
        }, 3000);
        return;
    }
    
    // Hide guest form and show chat input + quick actions
    const guestForm = document.getElementById('guest-form');
    const chatInputSection = document.getElementById('chat-input-section');
    const quickActions = document.getElementById('quick-actions');
    
    guestForm.style.display = 'none';
    chatInputSection.style.display = 'block';
    quickActions.style.display = 'grid';
    
    // Add welcome message
    addSupportMessage(`Xin chào ${name}! 👋 Chúng tôi có thể hỗ trợ gì cho bạn?`, 'bot');
    
    // Focus on message input
    setTimeout(() => {
        const messageInput = document.getElementById('support-message-input');
        if (messageInput) messageInput.focus();
    }, 100);
}

function sendSupportMessage() {
    const input = document.getElementById('support-message-input');
    const message = input.value.trim();
    
    if (!message) return;
    
    // Add user message
    addSupportMessage(message, 'user');
    input.value = '';
    
    // Hide quick actions after first message
    const quickActions = document.getElementById('quick-actions');
    if (quickActions) quickActions.style.display = 'none';
    
    // Show typing indicator
    showTypingIndicator();
    
    // Simulate bot response
    setTimeout(() => {
        hideTypingIndicator();
        const response = getBotResponse(message);
        addSupportMessage(response, 'bot');
    }, 1500 + Math.random() * 2000);
}

function quickMessage(message) {
    const input = document.getElementById('support-message-input');
    if (input) {
        input.value = message;
        sendSupportMessage();
    }
}

function addSupportMessage(text, sender) {
    const messagesContainer = document.getElementById('support-chat-messages');
    
    // Create message group if it's a new conversation group
    let messageGroup = messagesContainer.querySelector('.message-group:last-child');
    if (!messageGroup) {
        messageGroup = document.createElement('div');
        messageGroup.className = 'message-group';
        messagesContainer.appendChild(messageGroup);
    }
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}-message`;
    
    const now = new Date();
    const timeString = now.toLocaleTimeString('vi-VN', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
    
    messageDiv.innerHTML = `
        <div class="message-bubble">
            <p>${text}</p>
        </div>
        <span class="message-time">${timeString}</span>
    `;
    
    messageGroup.appendChild(messageDiv);
    scrollChatToBottom();
}

function showTypingIndicator() {
    const messagesContainer = document.getElementById('support-chat-messages');
    
    // Create typing message group
    const typingGroup = document.createElement('div');
    typingGroup.className = 'message-group';
    typingGroup.id = 'typing-indicator';
    
    const typingDiv = document.createElement('div');
    typingDiv.className = 'message bot-message';
    
    typingDiv.innerHTML = `
        <div class="message-bubble">
            <div class="typing-dots">
                <span></span>
                <span></span>
                <span></span>
            </div>
        </div>
    `;
    
    typingGroup.appendChild(typingDiv);
    messagesContainer.appendChild(typingGroup);
    scrollChatToBottom();
}

function hideTypingIndicator() {
    const typingIndicator = document.getElementById('typing-indicator');
    if (typingIndicator) {
        typingIndicator.remove();
    }
}

function scrollChatToBottom() {
    const messagesContainer = document.getElementById('support-chat-messages');
    setTimeout(() => {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }, 100);
}

function getBotResponse(userMessage) {
    const lowerMessage = userMessage.toLowerCase();
    
    if (lowerMessage.includes('tài khoản') || lowerMessage.includes('đăng nhập')) {
        return '🔐 Tôi hiểu bạn cần hỗ trợ về tài khoản. Bạn gặp vấn đề gì cụ thể? Quên mật khẩu, không đăng nhập được, hay cần đổi thông tin?';
    } else if (lowerMessage.includes('giao dịch') || lowerMessage.includes('thanh toán')) {
        return '💳 Về vấn đề giao dịch, tôi có thể hỗ trợ bạn kiểm tra lịch sử, hoàn tiền, hoặc các vấn đề thanh toán. Bạn có thể mô tả chi tiết hơn không?';
    } else if (lowerMessage.includes('đăng tin') || lowerMessage.includes('thú cưng')) {
        return '🐾 Để đăng tin bán thú cưng hiệu quả, bạn cần: 1) Ảnh chất lượng cao, 2) Mô tả chi tiết, 3) Giá cả hợp lý. Bạn cần hỗ trợ phần nào cụ thể?';
    } else if (lowerMessage.includes('lỗi') || lowerMessage.includes('không')) {
        return '🔧 Tôi sẽ giúp bạn khắc phục lỗi kỹ thuật. Vui lòng mô tả lỗi bạn gặp: không tải được trang, lỗi thanh toán, hay lỗi upload ảnh?';
    } else {
        return '🤝 Cảm ơn bạn đã liên hệ! Tôi đã ghi nhận câu hỏi của bạn. Đội ngũ hỗ trợ sẽ phản hồi trong thời gian sớm nhất. Bạn có câu hỏi gì khác không?';
    }
}

function attachFile() {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*,.pdf,.doc,.docx';
    fileInput.style.display = 'none';
    
    fileInput.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
            addSupportMessage(`📎 Đã đính kèm file: ${file.name}`, 'user');
            showNotification('File đã được đính kèm', 'success');
        }
    };
    
    document.body.appendChild(fileInput);
    fileInput.click();
    document.body.removeChild(fileInput);
}

function rateChatSupport(rating) {
    const stars = document.querySelectorAll('#chat-rating .rating-stars i');
    stars.forEach((star, index) => {
        if (index < rating) {
            star.className = 'fas fa-star active';
        } else {
            star.className = 'far fa-star';
        }
    });
    
    setTimeout(() => {
        document.getElementById('chat-rating').style.display = 'none';
        showNotification('Cảm ơn bạn đã đánh giá! 🌟', 'success');
    }, 1500);
}

// Global functions for ad controls
function closeFloatingAd() {
    const floatingContainer = document.getElementById('floating-ad');
    if (floatingContainer) {
        floatingContainer.classList.remove('show');
    }
}

// Enhanced pet creation with rating display
function createPetElement(pet) {
    const petDiv = document.createElement('div');
    petDiv.className = 'pet-item';
    
    // Calculate seller trust score
    const trustScore = userRating.getUserTrustScore(pet.seller);
    const trustBadgeClass = userRating.getTrustBadgeClass(trustScore);
    const trustBadgeText = userRating.getTrustBadgeText(trustScore);
    
    petDiv.innerHTML = `
        <div class="pet-image">
            <img src="${getPrimaryImage(pet)}" alt="${pet.name}" loading="lazy">
            <div class="pet-price">${formatPrice(pet.price)}</div>
        </div>
        <div class="pet-info">
            <h3 class="pet-name">${pet.name}</h3>
            <div class="pet-details">
                <span><i class="fas fa-birthday-cake"></i> ${formatAge(pet.age)}</span>
                <span><i class="fas fa-venus-mars"></i> ${pet.gender === 'male' ? 'Đực' : 'Cái'}</span>
                <span><i class="fas fa-map-marker-alt"></i> ${pet.location}</span>
            </div>
            <div class="pet-rating">
                <div class="seller-trust-score">
                    <span class="trust-score ${trustBadgeClass}">${trustScore}</span>
                    <span class="verified-seller">${trustBadgeText}</span>
                </div>
                <div class="user-rating">
                    <div class="rating-stars">
                        ${userRating.renderStars(pet.seller.rating || 0)}
                    </div>
                    <span class="rating-count">(${pet.seller.reviewCount || 0})</span>
                </div>
            </div>
            <div class="verification-badges">
                ${pet.seller.emailVerified ? '<span class="verification-badge email"><i class="fas fa-envelope"></i> Email</span>' : ''}
                ${pet.seller.phoneVerified ? '<span class="verification-badge phone"><i class="fas fa-phone"></i> Phone</span>' : ''}
                ${pet.seller.idVerified ? '<span class="verification-badge id"><i class="fas fa-id-card"></i> CMND</span>' : ''}
                ${pet.seller.premium ? '<span class="verification-badge premium"><i class="fas fa-crown"></i> Premium</span>' : ''}
            </div>
        </div>
        <div class="pet-actions">
            <button class="btn btn-outline" onclick="contactSeller('${pet.sellerId}')">
                <i class="fas fa-comment"></i> Liên hệ
            </button>
            <button class="btn btn-primary" onclick="showPetModal('${pet.id}')">
                <i class="fas fa-heart"></i> Quan tâm
            </button>
        </div>
    `;
    
    return petDiv;
}

// Initialize new systems
let globalSearch, userRating, adSystem;

document.addEventListener('DOMContentLoaded', () => {
    // globalSearch = new GlobalSearch(); // Disabled - using standalone functions instead
    userRating = new UserRatingSystem();
    adSystem = new AdvertisementSystem();
    
    // Initialize mobile menu toggle
    initializeMobileMenu();
});

// Mobile Menu Functions
function initializeMobileMenu() {
    const mobileToggle = document.getElementById('mobile-menu-toggle');
    const mainNav = document.getElementById('main-nav');
    
    if (mobileToggle && mainNav) {
        mobileToggle.addEventListener('click', () => {
            mobileToggle.classList.toggle('active');
            mainNav.classList.toggle('active');
        });
        
        // Close menu when clicking on nav links
        const navLinks = mainNav.querySelectorAll('a');
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                mobileToggle.classList.remove('active');
                mainNav.classList.remove('active');
            });
        });
        
        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!mobileToggle.contains(e.target) && !mainNav.contains(e.target)) {
                mobileToggle.classList.remove('active');
                mainNav.classList.remove('active');
            }
        });
    }
}

// Support Chat Functions
let supportChat = {
    isLoggedIn: false,
    guestName: '',
    ticketId: null,
    isMinimized: false,
    
    open: function() {
        const modal = document.getElementById('support-chat-modal');
        const guestInfo = document.getElementById('guest-info');
        const chatInput = document.getElementById('chat-input');
        const suggestions = document.getElementById('chat-suggestions');
        
        if (currentUser) {
            this.isLoggedIn = true;
            guestInfo.style.display = 'none';
            chatInput.style.display = 'block';
            suggestions.style.display = 'flex';
            this.createTicket();
        } else {
            this.isLoggedIn = false;
            guestInfo.style.display = 'block';
            chatInput.style.display = 'none';
            suggestions.style.display = 'none';
        }
        
        modal.style.display = 'block';
        this.scrollToBottom();
    },
    
    close: function() {
        const modal = document.getElementById('support-chat-modal');
        modal.style.display = 'none';
        
        // Show rating if chat was active
        if (this.ticketId) {
            this.showRating();
        }
    },
    
    minimize: function() {
        const modal = document.getElementById('support-chat-modal');
        if (this.isMinimized) {
            modal.style.transform = 'scale(1)';
            modal.style.opacity = '1';
            this.isMinimized = false;
        } else {
            modal.style.transform = 'scale(0.1)';
            modal.style.opacity = '0.3';
            this.isMinimized = true;
        }
    },
    
    startGuestChat: function() {
        const nameInput = document.getElementById('guest-name');
        const name = nameInput.value.trim();
        
        if (!name) {
            this.showInputError(nameInput, 'Vui lòng nhập tên của bạn');
            return;
        }
        
        if (name.length < 2) {
            this.showInputError(nameInput, 'Tên phải có ít nhất 2 ký tự');
            return;
        }
        
        this.guestName = name;
        const guestInfo = document.getElementById('guest-info');
        const chatInput = document.getElementById('chat-input');
        const suggestions = document.getElementById('chat-suggestions');
        
        guestInfo.style.display = 'none';
        chatInput.style.display = 'block';
        suggestions.style.display = 'flex';
        
        // Add welcome message
        this.addMessage(`Xin chào ${name}! 👋 Tôi có thể giúp gì cho bạn?`, 'bot');
        this.createGuestTicket();
    },
    
    sendMessage: function(message = null) {
        const input = document.getElementById('support-message-input');
        const messageText = message || input.value.trim();
        
        if (!messageText) return;
        
        this.addMessage(messageText, 'user');
        if (!message) input.value = '';
        
        // Hide suggestions after first message
        document.getElementById('chat-suggestions').style.display = 'none';
        
        // Send to backend
        this.sendToSupport(messageText);
        
        // Show typing indicator
        this.showTypingIndicator();
        
        // Simulate bot response
        setTimeout(() => {
            this.hideTypingIndicator();
            const response = this.getBotResponse(messageText);
            this.addMessage(response, 'bot');
        }, 1500 + Math.random() * 2000);
    },
    
    quickMessage: function(message) {
        this.sendMessage(message);
    },
    
    getBotResponse: function(userMessage) {
        const lowerMessage = userMessage.toLowerCase();
        
        if (lowerMessage.includes('tài khoản') || lowerMessage.includes('đăng nhập')) {
            return '🔐 Tôi hiểu bạn cần hỗ trợ về tài khoản. Bạn gặp vấn đề gì cụ thể? Quên mật khẩu, không đăng nhập được, hay cần đổi thông tin?';
        } else if (lowerMessage.includes('giao dịch') || lowerMessage.includes('thanh toán')) {
            return '💳 Về vấn đề giao dịch, tôi có thể hỗ trợ bạn kiểm tra lịch sử, hoàn tiền, hoặc các vấn đề thanh toán. Bạn có thể mô tả chi tiết hơn không?';
        } else if (lowerMessage.includes('đăng tin') || lowerMessage.includes('thú cưng')) {
            return '🐾 Để đăng tin bán thú cưng hiệu quả, bạn cần: 1) Ảnh chất lượng cao, 2) Mô tả chi tiết, 3) Giá cả hợp lý. Bạn cần hỗ trợ phần nào cụ thể?';
        } else if (lowerMessage.includes('lỗi') || lowerMessage.includes('không')) {
            return '🔧 Tôi sẽ giúp bạn khắc phục lỗi kỹ thuật. Vui lòng mô tả lỗi bạn gặp: không tải được trang, lỗi thanh toán, hay lỗi upload ảnh?';
        } else {
            const responses = [
                '✨ Cảm ơn bạn đã liên hệ. Tôi đã ghi nhận thông tin và sẽ hỗ trợ bạn ngay.',
                '🤝 Để tôi tìm hiểu thêm về vấn đề này. Bạn có thể cung cấp thêm chi tiết không?',
                '📝 Tôi đã ghi nhận yêu cầu của bạn. Bộ phận chuyên môn sẽ phản hồi trong vòng 15 phút.',
                '💡 Bạn có thể cung cấp thêm thông tin cụ thể để chúng tôi hỗ trợ hiệu quả hơn không?'
            ];
            return responses[Math.floor(Math.random() * responses.length)];
        }
    },
    
    showInputError: function(input, message) {
        input.style.borderColor = '#dc3545';
        input.placeholder = message;
        input.style.borderWidth = '2px';
        
        setTimeout(() => {
            input.style.borderColor = '#e9ecef';
            input.placeholder = 'Tên của bạn';
            input.style.borderWidth = '2px';
        }, 3000);
    },
    
    showTypingIndicator: function() {
        const messagesContainer = document.getElementById('support-chat-messages');
        const typingDiv = document.createElement('div');
        typingDiv.className = 'message bot-message typing-indicator';
        typingDiv.id = 'typing-indicator';
        
        typingDiv.innerHTML = `
            <div class="message-avatar">
                <img src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=32&h=32&fit=crop&crop=face" alt="Bot">
            </div>
            <div class="message-content">
                <div class="typing-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            </div>
        `;
        
        messagesContainer.appendChild(typingDiv);
        this.scrollToBottom();
    },
    
    hideTypingIndicator: function() {
        const typingIndicator = document.getElementById('typing-indicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    },
    
    addMessage: function(text, sender) {
        const messagesContainer = document.getElementById('support-chat-messages');
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;
        
        const now = new Date();
        const timeString = now.toLocaleTimeString('vi-VN', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        
        const avatarUrl = sender === 'bot' 
            ? 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=32&h=32&fit=crop&crop=face'
            : currentUser?.avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=32&h=32&fit=crop&crop=face';
        
        messageDiv.innerHTML = `
            <div class="message-avatar">
                <img src="${avatarUrl}" alt="${sender}">
            </div>
            <div class="message-content">
                <p>${text}</p>
            </div>
            <div class="message-time">${timeString}</div>
        `;
        
        messagesContainer.appendChild(messageDiv);
        this.scrollToBottom();
    },
    
    scrollToBottom: function() {
        const messagesContainer = document.getElementById('support-chat-messages');
        setTimeout(() => {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }, 100);
    },
    
    showRating: function() {
        const ratingDiv = document.getElementById('chat-rating');
        if (ratingDiv) {
            ratingDiv.style.display = 'flex';
        }
    },
    
    rateSupport: function(rating) {
        const stars = document.querySelectorAll('#chat-rating .rating-stars i');
        stars.forEach((star, index) => {
            if (index < rating) {
                star.className = 'fas fa-star active';
            } else {
                star.className = 'far fa-star';
            }
        });
        
        // Send rating to backend
        this.sendRating(rating);
        
        setTimeout(() => {
            document.getElementById('chat-rating').style.display = 'none';
            showNotification('Cảm ơn bạn đã đánh giá! 🌟', 'success');
        }, 1500);
    },
    
    async sendRating(rating) {
        if (!this.ticketId) return;
        
        try {
            const endpoint = this.isLoggedIn ? 
                `/api/support/tickets/${this.ticketId}/rating` : 
                `/api/support/guest-tickets/${this.ticketId}/rating`;
                
            await fetch(`${API_BASE}${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(this.isLoggedIn && {
                        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                    })
                },
                body: JSON.stringify({ rating })
            });
        } catch (error) {
            console.error('Error sending rating:', error);
        }
    },
    
    attachFile: function() {
        // Create file input
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*,.pdf,.doc,.docx';
        fileInput.style.display = 'none';
        
        fileInput.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                if (file.size > 5 * 1024 * 1024) { // 5MB limit
                    showNotification('File không được vượt quá 5MB', 'error');
                    return;
                }
                
                this.addMessage(`📎 Đã đính kèm: ${file.name}`, 'user');
                this.addMessage('✅ Tôi đã nhận được file của bạn. Cảm ơn!', 'bot');
            }
        };
        
        document.body.appendChild(fileInput);
        fileInput.click();
        document.body.removeChild(fileInput);
    },
    
    async createTicket() {
        try {
            const response = await fetch(`${API_BASE}/api/support/tickets`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                },
                body: JSON.stringify({
                    type: 'chat',
                    subject: 'Hỗ trợ khách hàng',
                    message: 'Bắt đầu chat hỗ trợ'
                })
            });
            
            if (response.ok) {
                const ticket = await response.json();
                this.ticketId = ticket.id;
                this.addMessage('Tôi có thể giúp gì cho bạn hôm nay?', 'bot');
            }
        } catch (error) {
            console.error('Error creating ticket:', error);
            this.addMessage('Có lỗi khi tạo ticket hỗ trợ. Vui lòng thử lại.', 'bot');
        }
    },
    
    async createGuestTicket() {
        try {
            const response = await fetch(`${API_BASE}/api/support/guest-tickets`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    guest_name: this.guestName,
                    type: 'chat',
                    subject: 'Hỗ trợ khách hàng (Guest)',
                    message: 'Bắt đầu chat hỗ trợ từ khách'
                })
            });
            
            if (response.ok) {
                const ticket = await response.json();
                this.ticketId = ticket.id;
            }
        } catch (error) {
            console.error('Error creating guest ticket:', error);
        }
    },
    
    async sendToSupport(message) {
        try {
            const endpoint = this.isLoggedIn ? 
                `/api/support/tickets/${this.ticketId}/messages` : 
                `/api/support/guest-tickets/${this.ticketId}/messages`;
                
            const response = await fetch(`${API_BASE}${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(this.isLoggedIn && {
                        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                    })
                },
                body: JSON.stringify({
                    message: message,
                    sender: this.isLoggedIn ? 'user' : 'guest',
                    ...(this.guestName && { guest_name: this.guestName })
                })
            });
            
            if (!response.ok) {
                throw new Error('Failed to send message');
            }
        } catch (error) {
            console.error('Error sending message:', error);
            this.addMessage('Có lỗi khi gửi tin nhắn. Vui lòng thử lại.', 'bot');
        }
    }
};

// Global functions for support chat (Removed duplicate)

function closeSupportChat() {
    const popup = document.getElementById('support-chat-popup');
    popup.style.display = 'none';
}

function minimizeChat() {
    const popup = document.getElementById('support-chat-popup');
    
    if (popup.classList.contains('minimized')) {
        popup.classList.remove('minimized');
    } else {
        popup.classList.add('minimized');
    }
}

function sendSupportMessage() {
    const input = document.getElementById('support-message-input');
    const message = input.value.trim();
    
    if (!message) return;
    
    // Add user message
    addSupportMessage(message, 'user');
    input.value = '';
    
    // Hide suggestions after first message
    const suggestions = document.getElementById('chat-suggestions');
    if (suggestions) suggestions.style.display = 'none';
    
    // Show typing indicator
    showTypingIndicator();
    
    // Simulate bot response
    setTimeout(() => {
        hideTypingIndicator();
        const response = getBotResponse(message);
        addSupportMessage(response, 'bot');
    }, 1500 + Math.random() * 2000);
}

function quickMessage(message) {
    const input = document.getElementById('support-message-input');
    if (input) {
        input.value = message;
        sendSupportMessage();
    }
}

function attachFile() {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*,.pdf,.doc,.docx';
    fileInput.style.display = 'none';
    
    fileInput.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
            addSupportMessage(`📎 Đã đính kèm file: ${file.name}`, 'user');
            showNotification('File đã được đính kèm', 'success');
        }
    };
    
    document.body.appendChild(fileInput);
    fileInput.click();
    document.body.removeChild(fileInput);
}

function rateChatSupport(rating) {
    const stars = document.querySelectorAll('#chat-rating .rating-stars i');
    stars.forEach((star, index) => {
        if (index < rating) {
            star.className = 'fas fa-star active';
        } else {
            star.className = 'far fa-star';
        }
    });
    
    setTimeout(() => {
        document.getElementById('chat-rating').style.display = 'none';
        showNotification('Cảm ơn bạn đã đánh giá! 🌟', 'success');
    }, 1500);
}

// Enhanced contact seller function with rating option
// Function to show rating modal after transaction
function promptForRating(sellerId, sellerName) {
    setTimeout(() => {
        if (confirm(`Bạn đã hoàn thành giao dịch với ${sellerName}. Bạn có muốn đánh giá người bán này không?`)) {
            userRating.showRatingModal(sellerId, sellerName);
        }
    }, 2000);
}

// Mobile Header Functions
function initializeMobileHeader() {
    const mobileSearch = document.getElementById('mobile-search-input');
    const mobileSearchBtn = document.querySelector('.mobile-search-btn');
    
    if (mobileSearch) {
        mobileSearch.addEventListener('input', (e) => {
            if (window.globalSearch) {
                window.globalSearch.handleSearch(e.target.value);
            }
        });
        
        mobileSearch.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                if (window.globalSearch) {
                    window.globalSearch.performSearch();
                }
            }
        });
    }
    
    if (mobileSearchBtn) {
        mobileSearchBtn.addEventListener('click', () => {
            if (window.globalSearch) {
                window.globalSearch.performSearch();
            }
        });
    }
    
    updateMobileUserSection();
}

function initializeUserDropdown() {
    // Desktop user dropdown
    const userSection = document.querySelector('.user-section');
    if (userSection) {
        userSection.addEventListener('click', (e) => {
            e.stopPropagation();
            userSection.classList.toggle('active');
        });
    }
    
    // Close dropdowns when clicking outside
    document.addEventListener('click', (e) => {
        if (userSection && !userSection.contains(e.target)) {
            userSection.classList.remove('active');
        }
        
        const mobileUserSection = document.getElementById('mobile-user-section');
        if (mobileUserSection && !mobileUserSection.contains(e.target)) {
            mobileUserSection.classList.remove('active');
        }
    });
}

function initializeNavHover() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        const navText = item.querySelector('.nav-text');
        if (navText) {
            // Initially show nav text on desktop
            item.classList.add('nav-text-visible');
            
            // On smaller screens, hide text by default
            if (window.innerWidth < 1200) {
                item.classList.remove('nav-text-visible');
            }
        }
    });
    
    // Adjust on window resize
    window.addEventListener('resize', () => {
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            if (window.innerWidth < 1200) {
                item.classList.remove('nav-text-visible');
            } else {
                item.classList.add('nav-text-visible');
            }
        });
    });
}

function updateMobileUserSection() {
    const mobileUserSection = document.getElementById('mobile-user-section');
    if (!mobileUserSection) return;
    
    if (currentUser) {
        mobileUserSection.innerHTML = `
            <div class="mobile-user-profile" onclick="toggleMobileUserDropdown(event)">
                <img src="${currentUser.avatar_url || currentUser.avatar || '/frontend/images/default-avatar.svg'}" 
                     alt="Avatar" class="mobile-user-avatar">
                <span class="mobile-user-name">${currentUser.name}</span>
                <i class="fas fa-chevron-down" style="color: rgba(255,255,255,0.7); font-size: 10px;"></i>
            </div>
            <div class="mobile-user-dropdown">
                <div class="mobile-dropdown-item" onclick="showProfile()">
                    <i class="fas fa-user"></i>
                    <span>Hồ sơ</span>
                </div>
                <div class="mobile-dropdown-item" onclick="showMyPets()">
                    <i class="fas fa-plus-circle"></i>
                    <span>Đăng bán</span>
                </div>
                <div class="mobile-dropdown-item" onclick="showWallet()">
                    <i class="fas fa-wallet"></i>
                    <span>Ví tiền</span>
                </div>
                <div class="mobile-dropdown-item" onclick="showSettings()">
                    <i class="fas fa-cog"></i>
                    <span>Cài đặt</span>
                </div>
                <div style="border-top: 1px solid #e5e7eb; margin: 4px 0;"></div>
                <div class="mobile-dropdown-item" onclick="logout()" style="color: #dc2626;">
                    <i class="fas fa-sign-out-alt"></i>
                    <span>Đăng xuất</span>
                </div>
            </div>
        `;
    } else {
        mobileUserSection.innerHTML = `
            <div style="display: flex; gap: 6px;">
                <button onclick="showLoginModal()" style="padding: 6px 10px; background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.3); border-radius: 12px; color: white; font-size: 11px; cursor: pointer;">
                    Đăng nhập
                </button>
                <button onclick="showRegisterModal()" style="padding: 6px 10px; background: rgba(255,255,255,0.9); border: none; border-radius: 12px; color: #f8bbd9; font-size: 11px; font-weight: 600; cursor: pointer;">
                    Đăng ký
                </button>
            </div>
        `;
    }
}

function toggleMobileUserDropdown(event) {
    event.stopPropagation();
    const mobileUserSection = document.getElementById('mobile-user-section');
    if (mobileUserSection) {
        mobileUserSection.classList.toggle('active');
    }
}

function setupImageUploadLimit() {
    const imageInput = document.getElementById('pet-images');
    if (imageInput) {
        // Remove existing event listener if any
        imageInput.removeEventListener('change', handleImagePreview);
        
        imageInput.addEventListener('change', function(e) {
            const files = Array.from(e.target.files);
            const maxSize = 2 * 1024 * 1024; // 2MB
            const validFiles = [];
            
            files.forEach(file => {
                if (file.size > maxSize) {
                    showNotification(`File ${file.name} vượt quá 2MB. Vui lòng chọn file nhỏ hơn.`, 'error');
                } else {
                    validFiles.push(file);
                }
            });
            
            // Create new FileList with valid files
            const dt = new DataTransfer();
            validFiles.forEach(file => dt.items.add(file));
            e.target.files = dt.files;
            
            // Handle preview directly here instead of calling handleImagePreview
            const preview = document.getElementById('image-preview');
            if (preview) {
                preview.innerHTML = '';
                
                validFiles.forEach(file => {
                    if (file.type.startsWith('image/')) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                            const img = document.createElement('div');
                            img.className = 'preview-image';
                            img.innerHTML = `<img src="${event.target.result}" alt="Preview">`;
                            preview.appendChild(img);
                        };
                        reader.readAsDataURL(file);
                    }
                });
            }
        });
    }
}

// Professional Sell Modal Functions
function switchSellTab(tabName) {
    // Hide all tab contents
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Remove active class from all tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected tab content
    document.getElementById(tabName + '-tab').classList.add('active');
    
    // Add active class to selected tab button
    event.target.classList.add('active');
    
    // Load content based on tab
    if (tabName === 'my-posts') {
        loadMyActivePosts();
    } else if (tabName === 'history') {
        loadPostHistory();
    }
}

function resetPetForm() {
    document.getElementById('pet-form').reset();
    document.getElementById('image-preview').innerHTML = '';
}

function loadMyActivePosts() {
    if (!currentUser) return;
    
    const container = document.getElementById('active-posts');
    container.innerHTML = '<div class="loading">Đang tải...</div>';
    
    // Get user's active pets from API
    fetch(`${API_BASE}/api/users/${currentUser.id}`, {
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
    })
    .then(response => response.json())
    .then(userData => {
        const pets = userData.pets || [];
        const activePets = pets.filter(pet => pet.status === 'available');
        
        if (activePets.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-paw" style="font-size: 3rem; color: #ddd; margin-bottom: 1rem;"></i>
                    <p>Chưa có tin đăng nào</p>
                    <button class="btn btn-primary" onclick="switchSellTab('new-post')">
                        <i class="fas fa-plus"></i> Đăng tin đầu tiên
                    </button>
                </div>
            `;
            return;
        }
        
        container.innerHTML = activePets.map(pet => `
            <div class="post-item active">
                <div class="post-image">
                    <img src="${getPrimaryImage(pet) || 'https://via.placeholder.com/80/ff69b4/ffffff?text=🐾'}" alt="Pet">
                    <span class="post-status active">Đang đăng</span>
                </div>
                <div class="post-info">
                    <h5>${pet.name}</h5>
                    <p class="post-price">${pet.price?.toLocaleString()} VNĐ</p>
                    <p class="post-stats">
                        <i class="fas fa-eye"></i> ${pet.view_count || 0} lượt xem • 
                        <i class="fas fa-calendar"></i> ${formatDate(pet.created_at)}
                    </p>
                </div>
                <div class="post-actions">
                    <button class="btn-action edit" onclick="editPet(${pet.id})" title="Chỉnh sửa">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-action pause" onclick="pausePet(${pet.id})" title="Tạm dừng">
                        <i class="fas fa-pause"></i>
                    </button>
                    <button class="btn-action delete" onclick="deletePet(${pet.id})" title="Xóa">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
        
        // Update header stats
        const header = document.querySelector('.posts-header h4');
        if (header) {
            header.innerHTML = `<i class="fas fa-list"></i> Tin đang đăng (${activePets.length})`;
        }
    })
    .catch(error => {
        console.error('Load active posts error:', error);
        container.innerHTML = `
            <div class="error-state">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Có lỗi khi tải danh sách tin đăng</p>
            </div>
        `;
    });
}

function loadPostHistory() {
    if (!currentUser) return;
    
    const container = document.getElementById('history-posts');
    container.innerHTML = '<div class="loading">Đang tải lịch sử...</div>';
    
    // Get user's post history from API
    fetch(`${API_BASE}/api/users/${currentUser.id}/history`, {
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
    })
    .then(response => response.json())
    .then(history => {
        if (history.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-history" style="font-size: 3rem; color: #ddd; margin-bottom: 1rem;"></i>
                    <p>Chưa có lịch sử nào</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = history.map(record => {
            let statusClass = 'active';
            let statusText = 'Đang đăng';
            let actionButton = '';
            
            if (record.action === 'sold' || record.new_status === 'sold') {
                statusClass = 'sold';
                statusText = 'Đã bán';
                actionButton = `<button class="btn-action repost" onclick="repostPet(${record.pet_id})">
                    <i class="fas fa-redo"></i> Đăng lại
                </button>`;
            } else if (record.action === 'expired' || record.new_status === 'expired') {
                statusClass = 'expired';
                statusText = 'Hết hạn';
                actionButton = `<button class="btn-action repost" onclick="renewPet(${record.pet_id})">
                    <i class="fas fa-redo"></i> Gia hạn
                </button>`;
            } else if (record.action === 'deleted' || record.new_status === 'deleted') {
                statusClass = 'deleted';
                statusText = 'Đã xóa';
                actionButton = `<button class="btn-action repost" onclick="repostPet(${record.pet_id})">
                    <i class="fas fa-redo"></i> Đăng lại
                </button>`;
            }
            
            return `
                <div class="post-item ${statusClass}">
                    <div class="post-image">
                        <img src="${record.pet_image_url || record.image_url || 'https://via.placeholder.com/80/ff69b4/ffffff?text=🐾'}" alt="Pet">
                        <span class="post-status ${statusClass}">${statusText}</span>
                    </div>
                    <div class="post-info">
                        <h5>${record.pet_name}</h5>
                        <p class="post-price">${record.original_price?.toLocaleString()} VNĐ</p>
                        <p class="post-stats">
                            <i class="fas fa-calendar"></i> ${formatDate(record.created_at)} • 
                            ${record.sale_price ? `Bán được ${record.sale_price.toLocaleString()} VNĐ` : record.notes}
                        </p>
                    </div>
                    <div class="post-actions">
                        ${actionButton}
                    </div>
                </div>
            `;
        }).join('');
    })
    .catch(error => {
        console.error('Load post history error:', error);
        container.innerHTML = `
            <div class="error-state">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Có lỗi khi tải lịch sử bài đăng</p>
            </div>
        `;
    });
}

// Professional Profile Modal Functions
function triggerAvatarUpload() {
    document.getElementById('avatar-input').click();
}

function handleAvatarChange(event) {
    const file = event.target.files[0];
    if (file) {
        if (file.size > 2 * 1024 * 1024) {
            showNotification('Kích thước ảnh không được vượt quá 2MB', 'error');
            return;
        }
        
        // Store file temporarily for upload when saving profile
        window.pendingAvatarFile = file;
        
        // Show preview
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById('current-avatar').src = e.target.result;
            showAvatarUploadButton();
            showNotification('Ảnh đã được chọn. Click "Cập nhật ảnh" để lưu!', 'info');
        };
        reader.readAsDataURL(file);
    }
}

function showAvatarUploadButton() {
    // Remove existing button if any
    const existingBtn = document.getElementById('avatar-upload-btn');
    if (existingBtn) {
        existingBtn.remove();
    }
    
    // Create upload button
    const uploadBtn = document.createElement('button');
    uploadBtn.id = 'avatar-upload-btn';
    uploadBtn.className = 'btn btn-primary';
    uploadBtn.innerHTML = '<i class="fas fa-upload"></i> Cập nhật ảnh';
    uploadBtn.style.cssText = `
        margin-top: 10px;
        width: 100%;
        animation: fadeIn 0.3s ease-in;
    `;
    
    uploadBtn.onclick = async () => {
        await uploadAvatarNow();
    };
    
    // Insert after avatar
    const avatarContainer = document.getElementById('current-avatar').parentElement;
    avatarContainer.appendChild(uploadBtn);
}

async function uploadAvatarNow() {
    if (!window.pendingAvatarFile) {
        showNotification('Không có ảnh nào được chọn', 'error');
        return;
    }
    
    const formData = new FormData();
    formData.append('avatar', window.pendingAvatarFile);
    
    try {
        showNotification('Đang tải ảnh lên...', 'info');
        
        const response = await fetch(`${API_BASE}/api/upload/avatar`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            },
            body: formData
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showNotification('Cập nhật avatar thành công!', 'success');
            
            // Update current user data
            currentUser.avatar_url = result.avatar_url;
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            
            // Update all avatar elements
            const avatarElements = document.querySelectorAll('#current-avatar, .user-avatar, #username-avatar');
            avatarElements.forEach(el => {
                if (el.tagName === 'IMG') {
                    el.src = result.avatar_url;
                }
            });
            
            // Remove upload button
            const uploadBtn = document.getElementById('avatar-upload-btn');
            if (uploadBtn) {
                uploadBtn.remove();
            }
            
            // Clear pending file
            window.pendingAvatarFile = null;
            
            // Update profile display
            displayUserProfile(currentUser);
        } else {
            showNotification(result.message || 'Lỗi cập nhật avatar', 'error');
        }
    } catch (error) {
        console.error('Avatar upload error:', error);
        showNotification('Lỗi kết nối', 'error');
    }
}

function cancelEdit() {
    // Hide edit mode and show view mode
    document.getElementById('profile-edit-mode').style.display = 'none';
    document.getElementById('profile-view-mode').style.display = 'block';
}

// CSS for post items
function addPostItemStyles() {
    const style = document.createElement('style');
    style.textContent = `
        .post-item {
            display: flex;
            align-items: center;
            gap: 15px;
            padding: 15px;
            background: white;
            border-radius: 12px;
            margin-bottom: 12px;
            border: 1px solid #e5e7eb;
            transition: all 0.3s ease;
        }
        
        .post-item:hover {
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            transform: translateY(-1px);
        }
        
        .post-image {
            position: relative;
            flex-shrink: 0;
        }
        
        .post-image img {
            width: 60px;
            height: 60px;
            border-radius: 8px;
            object-fit: cover;
        }
        
        .post-status {
            position: absolute;
            top: -5px;
            right: -5px;
            padding: 2px 6px;
            border-radius: 10px;
            font-size: 10px;
            font-weight: 500;
            color: white;
        }
        
        .post-status.active { background: #28a745; }
        .post-status.sold { background: #007bff; }
        .post-status.expired { background: #dc3545; }
        
        .post-info {
            flex: 1;
        }
        
        .post-info h5 {
            margin: 0 0 5px 0;
            font-size: 14px;
            color: #333;
        }
        
        .post-price {
            font-weight: 700;
            color: #e91e63;
            margin: 0 0 5px 0;
            font-size: 13px;
        }
        
        .post-stats, .post-date {
            font-size: 11px;
            color: #666;
            margin: 2px 0;
        }
        
        .post-actions {
            display: flex;
            gap: 5px;
        }
        
        .btn-action {
            padding: 6px 8px;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 11px;
            transition: all 0.3s ease;
        }
        
        .btn-action.edit { background: #17a2b8; color: white; }
        .btn-action.pause { background: #ffc107; color: white; }
        .btn-action.delete { background: #dc3545; color: white; }
        .btn-action.repost { background: #28a745; color: white; padding: 6px 12px; }
        
        .btn-action:hover {
            opacity: 0.8;
            transform: scale(1.05);
        }
    `;
    document.head.appendChild(style);
}

// Initialize post item styles
document.addEventListener('DOMContentLoaded', addPostItemStyles);

// Utility functions for sell modal
function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Hôm qua';
    if (diffDays < 7) return `${diffDays} ngày trước`;
    if (diffDays < 30) return `${Math.ceil(diffDays / 7)} tuần trước`;
    return date.toLocaleDateString('vi-VN');
}

// Pet management functions
function editPet(petId) {
    showNotification('Chức năng chỉnh sửa đang phát triển', 'info');
}

function pausePet(petId) {
    if (confirm('Bạn có muốn tạm dừng tin đăng này?')) {
        updatePetStatus(petId, 'paused');
    }
}

function deletePet(petId) {
    deletePetAPI(petId);
}

function repostPet(petId) {
    if (confirm('Bạn có muốn đăng lại tin này?')) {
        updatePetStatus(petId, 'available');
    }
}

function renewPet(petId) {
    if (confirm('Bạn có muốn gia hạn tin đăng này?')) {
        updatePetStatus(petId, 'available');
    }
}

// =============================================================================
// CHAT FUNCTIONALITY
// =============================================================================

async function loadConversations() {
    try {
        const response = await fetch(`${API_BASE}/api/chat/conversations`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });
        
        if (response.ok) {
            const conversations = await response.json();
            displayConversations(conversations);
        }
    } catch (error) {
        console.error('Load conversations error:', error);
    }
}

function displayConversations(conversations) {
    const conversationList = document.getElementById('conversation-list');
    if (!conversationList) return;
    
    conversationList.innerHTML = '';
    
    conversations.forEach(conversation => {
        const div = document.createElement('div');
        div.className = 'conversation-item';
        div.onclick = () => openChat(conversation.other_user_id, conversation.other_user_name);
        
        div.innerHTML = `
            <div class="conversation-avatar">
                <i class="fas fa-user"></i>
            </div>
            <div class="conversation-content">
                <div class="conversation-name">${conversation.other_user_name}</div>
                <div class="conversation-last-message">${conversation.last_message}</div>
                <div class="conversation-time">${formatTimeAgo(conversation.last_message_time)}</div>
            </div>
            ${conversation.unread_count > 0 ? `<div class="conversation-unread">${conversation.unread_count}</div>` : ''}
        `;
        
        conversationList.appendChild(div);
    });
}

async function openChat(userId, userName) {
    currentChat = { userId, userName };
    
    // Update chat header
    const chatHeader = document.querySelector('.chat-header h3');
    if (chatHeader) {
        chatHeader.textContent = userName;
    }
    
    // Load messages
    await loadChatMessages(userId);
    
    // Show chat modal
    showModal('chat-modal');
}

async function loadChatMessages(otherUserId) {
    try {
        const response = await fetch(`${API_BASE}/api/chat/messages?other_user_id=${otherUserId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });
        
        if (response.ok) {
            const messages = await response.json();
            displayChatMessages(messages);
        }
    } catch (error) {
        console.error('Load messages error:', error);
    }
}

function displayChatMessages(messages) {
    const messagesContainer = document.getElementById('chat-messages');
    if (!messagesContainer) return;
    
    messagesContainer.innerHTML = '';
    
    messages.forEach(message => {
        const div = document.createElement('div');
        div.className = `message ${message.sender_id === currentUser.id ? 'sent' : 'received'}`;
        
        div.innerHTML = `
            <div class="message-content">${message.message}</div>
            <div class="message-time">${formatTimeAgo(message.created_at)}</div>
        `;
        
        messagesContainer.appendChild(div);
    });
    
    // Scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

async function sendChatMessage() {
    const input = document.getElementById('chat-input');
    if (!input || !input.value.trim() || !currentChat) return;
    
    const message = input.value.trim();
    input.value = '';
    
    try {
        const response = await fetch(`${API_BASE}/api/chat/messages`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            },
            body: JSON.stringify({
                receiverId: currentChat.userId,
                message: message
            })
        });
        
        if (response.ok) {
            // Reload messages
            await loadChatMessages(currentChat.userId);
        }
    } catch (error) {
        console.error('Send message error:', error);
    }
}

// =============================================================================
// WALLET DEPOSIT/WITHDRAW FUNCTIONALITY
// =============================================================================

function showDepositModal() {
    showModal('deposit-modal');
}

function showWithdrawModal() {
    showModal('withdraw-modal');
}

async function processDeposit() {
    const amount = document.getElementById('deposit-amount').value;
    const method = document.getElementById('deposit-method').value;
    const reference = document.getElementById('deposit-reference').value;
    
    if (!amount || amount <= 0) {
        showNotification('Vui lòng nhập số tiền hợp lệ', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/api/wallet/deposit`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            },
            body: JSON.stringify({
                amount: parseInt(amount),
                method: method,
                reference: reference
            })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showNotification('Nạp tiền thành công', 'success');
            hideModal('deposit-modal');
            updateUserBalance(); // Refresh balance
            loadTransactionHistory(); // Refresh transactions
        } else {
            showNotification(result.message || 'Lỗi nạp tiền', 'error');
        }
    } catch (error) {
        console.error('Deposit error:', error);
        showNotification('Lỗi kết nối', 'error');
    }
}

async function processWithdraw() {
    const amount = document.getElementById('withdraw-amount').value;
    const bankAccount = document.getElementById('withdraw-bank').value;
    const method = document.getElementById('withdraw-method').value;
    
    if (!amount || amount <= 0) {
        showNotification('Vui lòng nhập số tiền hợp lệ', 'error');
        return;
    }
    
    if (!bankAccount) {
        showNotification('Vui lòng nhập thông tin tài khoản', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/api/wallet/withdraw`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            },
            body: JSON.stringify({
                amount: parseInt(amount),
                bankAccount: bankAccount,
                method: method
            })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showNotification('Yêu cầu rút tiền đã được gửi', 'success');
            hideModal('withdraw-modal');
            updateUserBalance(); // Refresh balance
            loadTransactionHistory(); // Refresh transactions
        } else {
            showNotification(result.message || 'Lỗi rút tiền', 'error');
        }
    } catch (error) {
        console.error('Withdraw error:', error);
        showNotification('Lỗi kết nối', 'error');
    }
}

// =============================================================================
// PET MANAGEMENT FUNCTIONALITY
// =============================================================================

async function deletePetAPI(petId) {
    if (!confirm('Bạn có chắc muốn xóa tin đăng này? Hành động này không thể hoàn tác.')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/api/pets/${petId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showNotification('Đã xóa tin đăng thành công', 'success');
            loadMyActivePosts(); // Reload list
        } else {
            showNotification(result.message || 'Lỗi xóa tin đăng', 'error');
        }
    } catch (error) {
        console.error('Delete pet error:', error);
        showNotification('Lỗi kết nối', 'error');
    }
}

async function updatePetStatus(petId, newStatus) {
    try {
        const response = await fetch(`${API_BASE}/api/pets/${petId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            },
            body: JSON.stringify({
                status: newStatus
            })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            const statusText = {
                'sold': 'đã bán',
                'paused': 'tạm dừng',
                'available': 'kích hoạt lại'
            };
            showNotification(`Đã ${statusText[newStatus]} tin đăng`, 'success');
            loadMyActivePosts(); // Reload list
        } else {
            showNotification(result.message || 'Lỗi cập nhật tin đăng', 'error');
        }
    } catch (error) {
        console.error('Update pet error:', error);
        showNotification('Lỗi kết nối', 'error');
    }
}

async function getSinglePet(petId) {
    try {
        const response = await fetch(`${API_BASE}/api/pets/${petId}`);
        
        if (response.ok) {
            const pet = await response.json();
            return pet;
        }
        return null;
    } catch (error) {
        console.error('Get pet error:', error);
        return null;
    }
}

// =============================================================================
// SUPPORT SYSTEM ENHANCED FUNCTIONALITY
// =============================================================================

async function loadSupportTicketMessages(ticketId, isGuest = false) {
    try {
        let url = `${API_BASE}/api/support/${isGuest ? 'guest-' : ''}tickets/${ticketId}/messages`;
        
        if (isGuest) {
            const guestEmail = localStorage.getItem('guestEmail');
            url += `?email=${encodeURIComponent(guestEmail)}`;
        }
        
        const response = await fetch(url, {
            headers: isGuest ? {} : {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });
        
        if (response.ok) {
            const messages = await response.json();
            displaySupportMessages(messages);
        }
    } catch (error) {
        console.error('Load support messages error:', error);
    }
}

function displaySupportMessages(messages) {
    const container = document.getElementById('support-messages');
    if (!container) return;
    
    container.innerHTML = '';
    
    messages.forEach(message => {
        const div = document.createElement('div');
        div.className = `support-message ${message.is_from_admin ? 'admin-message' : 'user-message'}`;
        
        div.innerHTML = `
            <div class="message-header">
                <strong>${message.sender_name || 'Bạn'}</strong>
                <span class="message-time">${formatTimeAgo(message.created_at)}</span>
            </div>
            <div class="message-content">${message.message}</div>
        `;
        
        container.appendChild(div);
    });
    
    container.scrollTop = container.scrollHeight;
}

async function rateSupportTicket(ticketId, rating, comment, isGuest = false) {
    try {
        const body = { rating, comment };
        if (isGuest) {
            body.guestEmail = localStorage.getItem('guestEmail');
        }
        
        const response = await fetch(`${API_BASE}/api/support/${isGuest ? 'guest-' : ''}tickets/${ticketId}/rating`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(isGuest ? {} : { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` })
            },
            body: JSON.stringify(body)
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showNotification('Cảm ơn bạn đã đánh giá!', 'success');
        } else {
            showNotification(result.message || 'Lỗi đánh giá', 'error');
        }
    } catch (error) {
        console.error('Rate ticket error:', error);
        showNotification('Lỗi kết nối', 'error');
    }
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

function formatTimeAgo(timestamp) {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInMs = now - time;
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    
    if (diffInMinutes < 1) return 'Vừa xong';
    if (diffInMinutes < 60) return `${diffInMinutes} phút trước`;
    if (diffInHours < 24) return `${diffInHours} giờ trước`;
    if (diffInDays < 7) return `${diffInDays} ngày trước`;
    
    return time.toLocaleDateString('vi-VN');
}

async function updateUserBalance() {
    if (!currentUser) return;
    
    try {
        const response = await fetch(`${API_BASE}/api/users/${currentUser.id}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });
        
        if (response.ok) {
            const userData = await response.json();
            currentUser.balance = userData.balance;
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            updateBalanceDisplay(userData.balance);
        }
    } catch (error) {
        console.error('Update balance error:', error);
    }
}

function updateBalanceDisplay(balance) {
    // Update balance in header
    const walletBalanceElements = document.querySelectorAll('.wallet-balance, #modal-balance');
    const formattedBalance = new Intl.NumberFormat('vi-VN').format(balance);
    
    walletBalanceElements.forEach(element => {
        if (element) {
            element.textContent = `${formattedBalance} VNĐ`;
        }
    });
    
    // Update balance in wallet modal if open
    const modalBalance = document.getElementById('modal-balance');
    if (modalBalance) {
        modalBalance.textContent = `${formattedBalance} VNĐ`;
    }
}

// ==============================================
// ENHANCED SEARCH FUNCTIONALITY
// ==============================================

// Global Search Functions
async function handleGlobalSearchSuggestions() {
    const input = document.getElementById('global-search-input');
    const suggestions = document.getElementById('global-search-suggestions');
    const query = input.value.trim().toLowerCase();
    
    if (query.length < 2) {
        suggestions.style.display = 'none';
        return;
    }
    
    // Show loading suggestions
    suggestions.innerHTML = '<div class="search-suggestion-item loading">🔍 Tìm kiếm từ server...</div>';
    suggestions.style.display = 'block';
    
    try {
        // Call API to search from server
        const serverResults = await searchFromServer(query);
        showGlobalSearchSuggestions(serverResults, query);
    } catch (error) {
        // Fallback to local data if API fails
        console.warn('Server search failed, using local data:', error);
        const localSuggestions = generateGlobalSuggestions(query);
        showGlobalSearchSuggestions(localSuggestions, query);
    }
}

async function searchFromServer(query) {
    const response = await fetch(`${API_BASE}/api/search?q=${encodeURIComponent(query)}&limit=10`);
    if (!response.ok) {
        throw new Error('Server search failed');
    }
    const data = await response.json();
    
    // Transform server data to suggestion format
    return data.results?.map(item => ({
        type: 'pet',
        text: item.name,
        subtext: `${item.breed || ''} - ${formatPrice(item.price)}`,
        category: item.type,
        data: item
    })) || [];
}

function generateGlobalSuggestions(query) {
    const suggestions = [];
    const addedNames = new Set();
    const addedBreeds = new Set();
    const addedSellers = new Set();
    
    // Get pets data (prioritize current data)
    let petsData = window.allPets || pets;
    
    // If no pets data available, return empty suggestions
    if (!petsData || petsData.length === 0) {
        return [];
    }
    
    if (petsData && petsData.length > 0) {
        petsData.forEach(pet => {
            // Pet name suggestions
            if (pet.name && pet.name.toLowerCase().includes(query) && !addedNames.has(pet.name)) {
                suggestions.push({
                    type: 'pet',
                    name: pet.name,
                    price: `${new Intl.NumberFormat('vi-VN').format(pet.price)} VNĐ`
                });
                addedNames.add(pet.name);
            }
            
            // Breed suggestions
            if (pet.breed && pet.breed.toLowerCase().includes(query) && !addedBreeds.has(pet.breed)) {
                const breedCount = petsData.filter(p => p.breed === pet.breed).length;
                suggestions.push({
                    type: 'breed',
                    name: pet.breed,
                    count: `${breedCount} kết quả`
                });
                addedBreeds.add(pet.breed);
            }
            
            // Seller suggestions
            if (pet.seller && pet.seller.toLowerCase().includes(query) && !addedSellers.has(pet.seller)) {
                suggestions.push({
                    type: 'seller',
                    name: pet.seller,
                    verified: pet.verified || false
                });
                addedSellers.add(pet.seller);
            }
        });
    }
    
    // If no suggestions found, add a helpful message
    if (suggestions.length === 0) {
        suggestions.push({
            type: 'info',
            name: `Không tìm thấy kết quả cho "${query}"`,
            count: 'Thử từ khóa khác'
        });
    }
    
    // Limit to maximum 8 suggestions and prioritize by type
    return suggestions
        .sort((a, b) => {
            const typeOrder = { pet: 1, breed: 2, seller: 3, info: 4 };
            return typeOrder[a.type] - typeOrder[b.type];
        })
        .slice(0, 8);
}

function showGlobalSearchSuggestions(suggestions, query) {
    const container = document.getElementById('global-search-suggestions');
    
    if (!container) {
        console.warn('Global search suggestions container not found');
        return;
    }
    
    if (!suggestions || suggestions.length === 0) {
        container.style.display = 'none';
        return;
    }
    
    container.innerHTML = suggestions.map(item => `
        <div class="search-suggestion-item" onclick="selectGlobalSuggestion('${item.type}', '${item.name}')">
            <i class="fas fa-${getIconForType(item.type)}"></i>
            <div class="suggestion-content">
                <span class="suggestion-title">${highlightQuery(item.name, query)}</span>
                <span class="suggestion-meta">${item.price || item.count || (item.verified ? 'Người bán đã xác thực' : '')}</span>
            </div>
            <span class="suggestion-type">${getSearchTypeLabel(item.type)}</span>
        </div>
    `).join('');
}

function getIconForType(type) {
    const icons = {
        'pet': 'paw',
        'breed': 'dog',
        'seller': 'user',
        'category': 'tags',
        'info': 'info-circle'
    };
    return icons[type] || 'search';
}

function getSearchTypeLabel(type) {
    const labels = {
        'pet': 'Thú cưng',
        'breed': 'Giống',
        'seller': 'Người bán',
        'category': 'Danh mục',
        'info': 'Thông tin'
    };
    return labels[type] || '';
}

function highlightQuery(text, query) {
    const regex = new RegExp(`(${query})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
}

function selectGlobalSuggestion(type, name) {
    const input = document.getElementById('global-search-input');
    const suggestions = document.getElementById('global-search-suggestions');
    
    if (!input) {
        console.warn('Global search input not found');
        return;
    }
    
    if (!suggestions) {
        console.warn('Global search suggestions not found');
        return;
    }
    
    input.value = name;
    suggestions.style.display = 'none';
    performGlobalSearch();
}

function performGlobalSearch() {
    const searchInput = document.getElementById('global-search-input');
    const typeFilter = document.getElementById('search-type-filter');
    const priceFilter = document.getElementById('search-price-filter');
    const locationFilter = document.getElementById('search-location-filter');
    
    if (!searchInput) {
        console.warn('Global search input not found');
        return;
    }
    
    const query = searchInput.value;
    const typeFilterValue = typeFilter ? typeFilter.value : '';
    const priceFilterValue = priceFilter ? priceFilter.value : '';
    const locationFilterValue = locationFilter ? locationFilter.value : '';
    
    console.log('Performing global search:', { 
        query, 
        typeFilter: typeFilterValue, 
        priceFilter: priceFilterValue, 
        locationFilter: locationFilterValue 
    });
    
    // Show notification for global search
    if (query) {
        notificationManager.info(
            `Đang tìm kiếm "${query}" từ server...`,
            'Tìm kiếm toàn cục',
            2000
        );
    }
    
    // Navigate to pets section with search parameters
    scrollToSection('pets');
    
    // Apply search to pets list
    if (query) {
        document.getElementById('pets-search-input').value = query;
        searchPets();
    }
    
    // Apply filters
    if (typeFilter) document.getElementById('type-filter').value = typeFilter;
    if (priceFilter) document.getElementById('price-filter').value = priceFilter;
    if (locationFilter) document.getElementById('location-filter').value = locationFilter;
    
    filterPets();
    
    // Hide global search suggestions
    document.getElementById('global-search-suggestions').style.display = 'none';
}

function toggleGlobalSearchFilters() {
    const panel = document.getElementById('search-filters-panel');
    const btn = document.getElementById('search-filter-btn');
    
    if (panel.classList.contains('show')) {
        panel.classList.remove('show');
        btn.classList.remove('active');
    } else {
        panel.classList.add('show');
        btn.classList.add('active');
    }
}

function resetGlobalFilters() {
    document.getElementById('search-type-filter').value = '';
    document.getElementById('search-price-filter').value = '';
    document.getElementById('search-location-filter').value = '';
    document.getElementById('global-search-input').value = '';
}

function applyGlobalFilters() {
    performGlobalSearch();
    toggleGlobalSearchFilters();
}

// Pet-specific Search Functions
function searchPets() {
    const query = document.getElementById('pets-search-input').value.toLowerCase();
    const clearBtn = document.getElementById('clear-pets-search');
    
    // Show/hide clear button
    clearBtn.style.display = query ? 'block' : 'none';
    
    if (query.length < 1) {
        // Show all pets
        showAllPets();
        return;
    }
    
    // Filter pets directly
    filterPetsByQuery(query);
}

function clearPetsSearch() {
    document.getElementById('pets-search-input').value = '';
    document.getElementById('clear-pets-search').style.display = 'none';
    showAllPets();
    
    // Show notification
    if (notificationManager) {
        notificationManager.success(
            'Đã xóa bộ lọc tìm kiếm và hiển thị tất cả thú cưng',
            'Tìm kiếm đã được xóa',
            2000
        );
    }
}

function filterPetsByQuery(query) {
    if (!pets || pets.length === 0) {
        return;
    }
    
    // Get matching pets from data
    const matchingPets = pets.filter(pet => {
        const name = (pet.name || '').toLowerCase();
        const breed = (pet.breed || '').toLowerCase();
        const description = (pet.description || '').toLowerCase();
        const seller = (pet.seller || '').toLowerCase();
        
        return name.includes(query) || 
               breed.includes(query) || 
               description.includes(query) || 
               seller.includes(query);
    });
    
    // Display filtered pets
    displayPets(matchingPets);
    
    // Show search results notification
    showSearchResults(matchingPets.length, query);
}

function showAllPets() {
    if (pets && pets.length > 0) {
        displayPets(pets);
    }
    hideSearchResults();
}

// Notification System
class NotificationManager {
    constructor() {
        this.notifications = new Map();
        this.nextId = 1;
        this.ensureContainer();
    }

    ensureContainer() {
        this.container = document.getElementById('notification-container');
        if (!this.container) {
            // Create container if it doesn't exist
            this.container = document.createElement('div');
            this.container.id = 'notification-container';
            this.container.className = 'notification-container';
            document.body.appendChild(this.container);
        }
    }

    show(message, type = 'info', title = '', duration = 5000) {
        this.ensureContainer(); // Ensure container exists before use
        
        const id = this.nextId++;
        const notification = this.createNotification(id, message, type, title);
        
        this.container.appendChild(notification);
        this.notifications.set(id, notification);
        
        // Trigger show animation
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);
        
        // Auto hide after duration
        if (duration > 0) {
            setTimeout(() => {
                this.hide(id);
            }, duration);
        }
        
        return id;
    }

    createNotification(id, message, type, title) {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.dataset.id = id;
        
        const icons = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle'
        };
        
        notification.innerHTML = `
            <div class="notification-icon">
                <i class="${icons[type] || icons.info}"></i>
            </div>
            <div class="notification-content">
                ${title ? `<div class="notification-title">${title}</div>` : ''}
                <div class="notification-message">${message}</div>
            </div>
            <button class="notification-close" onclick="notificationManager.hide(${id})">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        return notification;
    }

    hide(id) {
        const notification = this.notifications.get(id);
        if (notification) {
            notification.classList.add('hide');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
                this.notifications.delete(id);
            }, 300);
        }
    }

    clear() {
        this.notifications.forEach((notification, id) => {
            this.hide(id);
        });
    }

    // Convenience methods
    success(message, title = 'Thành công!', duration = 4000) {
        return this.show(message, 'success', title, duration);
    }

    error(message, title = 'Lỗi!', duration = 6000) {
        return this.show(message, 'error', title, duration);
    }

    warning(message, title = 'Cảnh báo!', duration = 5000) {
        return this.show(message, 'warning', title, duration);
    }

    info(message, title = '', duration = 4000) {
        return this.show(message, 'info', title, duration);
    }
}

// Global notification manager variable
let notificationManager;

function showSearchResults(count, query) {
    const petGrid = document.getElementById('pet-list');
    
    // Remove any existing search results message
    const existingMessage = petGrid.querySelector('.search-results-info');
    if (existingMessage) {
        existingMessage.remove();
    }
    
    if (count === 0) {
        // Show notification for no results
        notificationManager.warning(
            `Không có thú cưng nào phù hợp với từ khóa "${query}". Hãy thử tìm kiếm với từ khóa khác.`,
            'Không tìm thấy kết quả'
        );
        
        // Also show inline message in pet grid
        const noResultsDiv = document.createElement('div');
        noResultsDiv.className = 'search-results-info';
        noResultsDiv.innerHTML = `
            <i class="fas fa-search"></i>
            <span>Không tìm thấy thú cưng nào phù hợp với "${query}". 
            <button class="btn btn-sm btn-outline" onclick="clearPetsSearch()" style="margin-left: 8px;">
                <i class="fas fa-times"></i> Xóa tìm kiếm
            </button></span>
        `;
        petGrid.insertBefore(noResultsDiv, petGrid.firstChild);
    } else {
        // Show success notification
        notificationManager.success(
            `Tìm thấy ${count} thú cưng phù hợp với từ khóa "${query}"`,
            'Tìm kiếm thành công!',
            3000
        );
        
        // Also show inline info
        const resultsDiv = document.createElement('div');
        resultsDiv.className = 'search-results-info';
        resultsDiv.innerHTML = `
            <i class="fas fa-filter"></i>
            <span>Hiển thị <strong>${count}</strong> kết quả cho "${query}"</span>
        `;
        petGrid.insertBefore(resultsDiv, petGrid.firstChild);
    }
}

function hideSearchResults() {
    const resultsMessage = document.querySelector('.search-results-info');
    if (resultsMessage) {
        resultsMessage.remove();
    }
}

function resetAllFilters() {
    // Reset all filter selects
    document.getElementById('type-filter').value = '';
    document.getElementById('price-filter').value = '';
    document.getElementById('age-filter').value = '';
    document.getElementById('gender-filter').value = '';
    document.getElementById('location-filter').value = '';
    
    // Reset search
    document.getElementById('pets-search-input').value = '';
    document.getElementById('clear-pets-search').style.display = 'none';
    
    // Show all pets
    showAllPets();
    
    // Show notification
    if (notificationManager) {
        notificationManager.success('Đã đặt lại tất cả bộ lọc', 'Bộ lọc đã được xóa', 2000);
    }
}

// Enhanced filterPets function
function filterPets() {
    if (!pets || pets.length === 0) {
        return;
    }
    
    const typeFilter = document.getElementById('type-filter').value;
    const priceFilter = document.getElementById('price-filter').value;
    const ageFilter = document.getElementById('age-filter')?.value || '';
    const genderFilter = document.getElementById('gender-filter')?.value || '';
    const locationFilter = document.getElementById('location-filter')?.value || '';
    
    // Filter pets data directly
    const filteredPets = pets.filter(pet => {
        // Type filter
        if (typeFilter && pet.type !== typeFilter) {
            return false;
        }
        
        // Price filter
        if (priceFilter && !isPriceInRange(pet.price, priceFilter)) {
            return false;
        }
        
        // Age filter
        if (ageFilter && pet.age.toString() !== ageFilter) {
            return false;
        }
        
        // Gender filter
        if (genderFilter && pet.gender !== genderFilter) {
            return false;
        }
        
        // Location filter
        if (locationFilter && pet.location !== locationFilter) {
            return false;
        }
        
        return true;
    });
    
    // Display filtered pets
    displayPets(filteredPets);
    
    // Show filter results notification
    if (filteredPets.length === 0) {
        if (notificationManager) {
            notificationManager.warning(
                'Không tìm thấy thú cưng nào phù hợp với bộ lọc đã chọn',
                'Không có kết quả'
            );
        }
    } else if (filteredPets.length < pets.length) {
        if (notificationManager) {
            notificationManager.info(
                `Tìm thấy ${filteredPets.length} thú cưng phù hợp với bộ lọc`,
                'Bộ lọc đã áp dụng',
                3000
            );
        }
    }
}

function isPriceInRange(price, range) {
    if (!price || !range) return true;
    
    const numPrice = parseInt(price.replace(/[^\d]/g, ''));
    const [min, max] = range.split('-').map(p => parseInt(p));
    
    if (max === 999999999) {
        return numPrice >= min;
    }
    
    return numPrice >= min && numPrice <= max;
}

function isAgeInRange(age, range) {
    if (!age || !range) return true;
    
    // Extract age in months from age string
    const ageMonths = extractAgeInMonths(age);
    
    switch (range) {
        case 'baby': return ageMonths <= 3;
        case 'young': return ageMonths > 3 && ageMonths <= 12;
        case 'adult': return ageMonths > 12 && ageMonths <= 60;
        case 'senior': return ageMonths > 60;
        default: return true;
    }
}

function extractAgeInMonths(ageString) {
    // Extract number and unit from age string like "3 tháng", "2 năm"
    const match = ageString.match(/(\d+)\s*(tháng|năm)/);
    if (!match) return 0;
    
    const [, number, unit] = match;
    const months = parseInt(number);
    
    return unit === 'năm' ? months * 12 : months;
}

function updateFilterResults(count) {
    // Update results count display
    console.log(`Filtered results: ${count} pets found`);
}

// ==============================================
// ENHANCED CAROUSEL AND SPONSORED ADS SYSTEM
// ==============================================

class PetCarousel {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.track = this.container?.querySelector('#carousel-track');
        this.prevBtn = this.container?.querySelector('#carousel-prev');
        this.nextBtn = this.container?.querySelector('#carousel-next');
        this.indicatorsContainer = this.container?.querySelector('#carousel-indicators');
        this.loadingOverlay = this.container?.querySelector('#carousel-loading');
        
        this.currentIndex = 0;
        this.itemsPerView = 4;
        this.autoPlayInterval = 5000;
        this.autoPlayTimer = null;
        this.isPaused = false;
        this.isVisible = true;
        this.isLoaded = false; // Track loading state
        
        this.featuredPets = [];
        this.sponsoredAdIndex = 0;
        
        // Show loading screen
        this.showLoading();
        
        // Initialize asynchronously
        this.init().catch(console.error);
    }
    
    async init() {
        if (!this.container || !this.track) return;
        
        try {
            this.setupEventListeners();
            this.setupIntersectionObserver();
            this.setupTouchSupport();
            
            // Load featured pets first, then start autoplay
            await this.loadFeaturedPets();
            this.updateItemsPerView();
            
            // Only start autoplay after data is loaded and rendered
            setTimeout(() => {
                this.startAutoPlay();
            }, 1000); // Give time for rendering to complete
            
        } catch (error) {
            console.error('Carousel initialization failed:', error);
            // Hide loading even on error
            this.hideLoading();
        }
    }
    
    setupEventListeners() {
        // Navigation buttons
        this.prevBtn?.addEventListener('click', () => this.prev());
        this.nextBtn?.addEventListener('click', () => this.next());
        
        // Pause on hover
        this.container.addEventListener('mouseenter', () => this.pauseAutoPlay());
        this.container.addEventListener('mouseleave', () => this.resumeAutoPlay());
        
        // Responsive updates
        window.addEventListener('resize', () => this.updateItemsPerView());
        
        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (this.isVisible && !this.isPaused) {
                if (e.key === 'ArrowLeft') this.prev();
                if (e.key === 'ArrowRight') this.next();
            }
        });
    }
    
    setupIntersectionObserver() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                this.isVisible = entry.isIntersecting;
                if (entry.isIntersecting) {
                    this.resumeAutoPlay();
                } else {
                    this.pauseAutoPlay();
                }
            });
        }, { threshold: 0.3 });
        
        observer.observe(this.container);
    }
    
    setupTouchSupport() {
        let startX = 0;
        let currentX = 0;
        let isDragging = false;
        
        this.track.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            isDragging = true;
            this.pauseAutoPlay();
        });
        
        this.track.addEventListener('touchmove', (e) => {
            if (!isDragging) return;
            currentX = e.touches[0].clientX;
            e.preventDefault();
        });
        
        this.track.addEventListener('touchend', () => {
            if (!isDragging) return;
            isDragging = false;
            
            const deltaX = startX - currentX;
            const threshold = 50;
            
            if (deltaX > threshold) {
                this.next();
            } else if (deltaX < -threshold) {
                this.prev();
            }
            
            this.resumeAutoPlay();
        });
    }
    
    updateItemsPerView() {
        const width = window.innerWidth;
        if (width <= 480) {
            this.itemsPerView = 1.2;
        } else if (width <= 768) {
            this.itemsPerView = 2;
        } else if (width <= 1024) {
            this.itemsPerView = 3;
        } else {
            this.itemsPerView = 4;
        }
        this.updateCarousel();
    }
    
    async loadFeaturedPets() {
        const progressBar = document.getElementById('loading-progress-bar');
        
        try {
            // Progress: 10% - Starting to fetch data
            if (progressBar) progressBar.style.width = '10%';
            
            // Use the existing fetchFeaturedPets function to get real data
            // Progress: 50% - Fetching data
            if (progressBar) progressBar.style.width = '50%';
            
            this.featuredPets = await fetchFeaturedPets(8);
            
            // Progress: 70% - Data received
            if (progressBar) progressBar.style.width = '70%';
            
            // If no real data is available, use fallback sample data
            if (!this.featuredPets || this.featuredPets.length === 0) {
                console.warn('No featured pets data available, using fallback data');
                this.featuredPets = [
                    {
                        id: 1,
                        name: "Golden Retriever",
                        type: "dog",
                        breed: "Golden Retriever",
                        age: 3,
                        age_unit: "months",
                        price: 8500000,
                        image: "https://images.unsplash.com/photo-1552053831-71594a27632d?w=300&h=200&fit=crop",
                        seller_name: "Pet Store VN",
                        is_verified: true
                    },
                    {
                        id: 2,
                        name: "Mèo Ba Tư",
                        type: "cat",
                        breed: "Persian Cat",
                        age: 2,
                        age_unit: "months",
                        price: 5200000,
                        image: "https://images.unsplash.com/photo-1574158622682-e40e69881006?w=300&h=200&fit=crop",
                        seller_name: "Cat Lover",
                        is_verified: true
                    },
                    {
                        id: 3,
                        name: "Chó Shiba Inu",
                        type: "dog",
                        breed: "Shiba Inu",
                        age: 4,
                        age_unit: "months",
                        price: 12000000,
                        image: "https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=300&h=200&fit=crop",
                        seller_name: "Premium Pets",
                        is_verified: true
                    },
                    {
                        id: 4,
                        name: "Mèo Munchkin",
                        type: "cat",
                        breed: "Munchkin",
                        age: 2.5,
                        age_unit: "months",
                        price: 7800000,
                        image: "https://images.unsplash.com/photo-1513245543132-31f507417b26?w=300&h=200&fit=crop",
                        seller_name: "Cute Cats",
                        is_verified: false
                    }
                ];
            }
        } catch (error) {
            console.error('Error loading featured pets:', error);
            // Use fallback data if API call fails
            this.featuredPets = [
                {
                    id: 1,
                    name: "Golden Retriever",
                    type: "dog",
                    breed: "Golden Retriever",
                    age: 3,
                    age_unit: "months",
                    price: 8500000,
                    image: "https://images.unsplash.com/photo-1552053831-71594a27632d?w=300&h=200&fit=crop",
                    seller_name: "Pet Store VN",
                    is_verified: true
                },
                {
                    id: 2,
                    name: "Mèo Ba Tư",
                    type: "cat",
                    breed: "Persian Cat",
                    age: 2,
                    age_unit: "months",
                    price: 5200000,
                    image: "https://images.unsplash.com/photo-1574158622682-e40e69881006?w=300&h=200&fit=crop",
                    seller_name: "Cat Lover",
                    is_verified: true
                },
                {
                    id: 3,
                    name: "Chó Poodle",
                    type: "dog",
                    breed: "Poodle",
                    age: 6,
                    age_unit: "months",
                    price: 9500000,
                    image: "https://images.unsplash.com/photo-1616190409842-8d8c0010b78b?w=300&h=200&fit=crop",
                    seller_name: "Premium Pets",
                    is_verified: true
                }
            ];
        }
        
        // Progress: 90% - Rendering
        if (progressBar) progressBar.style.width = '90%';
        
        this.renderCarousel();
        this.createIndicators();
        
        // Progress: 100% - Complete
        if (progressBar) progressBar.style.width = '100%';
        
        // Mark as loaded and wait for DOM updates
        this.isLoaded = true;
        await new Promise(resolve => setTimeout(resolve, 100)); // Allow DOM to update
        
        // Hide loading screen
        this.hideLoading();
    }
    
    renderCarousel() {
        if (!this.track) return;
        
        this.track.innerHTML = '';
        
        // Create enough duplicates for smooth infinite scroll
        const totalItems = this.featuredPets.length;
        const itemsToRender = totalItems * 3; // Triple for smooth infinite scroll
        
        for (let i = 0; i < itemsToRender; i++) {
            const petIndex = i % totalItems;
            const pet = this.featuredPets[petIndex];
            const item = this.createCarouselItem(pet);
            this.track.appendChild(item);
        }
        
        // Set initial position (start from middle set)
        this.currentIndex = totalItems;
        this.updateCarousel();
    }
    
    createCarouselItem(pet) {
        const item = document.createElement('div');
        item.className = 'carousel-item';
        
        // Create optimized pet image
        const petImage = createOptimizedPetImage(pet);
        
        item.innerHTML = `
            <div class="carousel-pet-card" onclick="showPetDetails(${pet.id})">
                <div class="carousel-pet-image">
                    ${petImage}
                    ${pet.is_verified || pet.verified ? '<div class="verified-badge"><i class="fas fa-check-circle"></i></div>' : ''}
                    ${pet.is_featured ? '<div class="featured-badge"><i class="fas fa-star"></i></div>' : ''}
                </div>
                <div class="carousel-pet-info">
                    <h4 class="carousel-pet-name">${pet.name}</h4>
                    <div class="carousel-pet-details">
                        <span class="carousel-pet-tag">
                            <i class="fas fa-paw"></i>
                            ${pet.breed || getTypeLabel(pet.type)}
                        </span>
                        <span class="carousel-pet-tag">
                            <i class="fas fa-birthday-cake"></i>
                            ${formatAge(pet.age)}
                        </span>
                    </div>
                    <div class="carousel-pet-price">
                        ${formatPrice(pet.price)}
                    </div>
                    <div class="carousel-pet-seller">
                        <i class="fas fa-store"></i>
                        ${pet.seller_name || pet.seller || 'HiPet Store'}
                    </div>
                </div>
            </div>
        `;
        
        return item;
    }
    
    createIndicators() {
        if (!this.indicatorsContainer) return;
        
        this.indicatorsContainer.innerHTML = '';
        const totalSlides = Math.ceil(this.featuredPets.length / this.itemsPerView);
        
        for (let i = 0; i < totalSlides; i++) {
            const indicator = document.createElement('div');
            indicator.className = 'carousel-indicator';
            indicator.addEventListener('click', () => this.goToSlide(i));
            this.indicatorsContainer.appendChild(indicator);
        }
        
        this.updateIndicators();
    }
    
    updateCarousel() {
        if (!this.track) return;
        
        const itemWidth = 100 / this.itemsPerView;
        const translateX = -(this.currentIndex * itemWidth);
        
        this.track.style.transform = `translateX(${translateX}%)`;
        this.updateIndicators();
        this.updateNavigationButtons();
    }
    
    updateIndicators() {
        const indicators = this.indicatorsContainer?.querySelectorAll('.carousel-indicator');
        if (!indicators) return;
        
        indicators.forEach((indicator, index) => {
            const slideIndex = Math.floor((this.currentIndex % this.featuredPets.length) / this.itemsPerView);
            indicator.classList.toggle('active', index === slideIndex);
        });
    }
    
    updateNavigationButtons() {
        // Always enable buttons for infinite scroll
        if (this.prevBtn) this.prevBtn.disabled = false;
        if (this.nextBtn) this.nextBtn.disabled = false;
    }
    
    prev() {
        this.currentIndex--;
        
        // Handle infinite scroll wrap-around
        if (this.currentIndex < this.featuredPets.length) {
            this.currentIndex = this.featuredPets.length * 2 - 1;
            this.track.style.transition = 'none';
            this.updateCarousel();
            
            setTimeout(() => {
                this.track.style.transition = 'transform 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
                this.currentIndex--;
                this.updateCarousel();
            }, 50);
        } else {
            this.updateCarousel();
        }
    }
    
    next() {
        this.currentIndex++;
        
        // Handle infinite scroll wrap-around
        if (this.currentIndex >= this.featuredPets.length * 2) {
            this.currentIndex = this.featuredPets.length + 1;
            this.track.style.transition = 'none';
            this.updateCarousel();
            
            setTimeout(() => {
                this.track.style.transition = 'transform 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
                this.currentIndex++;
                this.updateCarousel();
            }, 50);
        } else {
            this.updateCarousel();
        }
    }
    
    goToSlide(slideIndex) {
        this.currentIndex = this.featuredPets.length + (slideIndex * this.itemsPerView);
        this.updateCarousel();
    }
    
    startAutoPlay() {
        if (this.autoPlayTimer) return;
        if (!this.isLoaded || !this.featuredPets.length) return;
        
        this.autoPlayTimer = setInterval(() => {
            if (!this.isPaused && this.isVisible && this.isLoaded) {
                this.next();
            }
        }, this.autoPlayInterval);
    }
    
    pauseAutoPlay() {
        this.isPaused = true;
    }
    
    resumeAutoPlay() {
        this.isPaused = false;
    }
    
    stopAutoPlay() {
        if (this.autoPlayTimer) {
            clearInterval(this.autoPlayTimer);
            this.autoPlayTimer = null;
        }
    }
    
    destroy() {
        this.stopAutoPlay();
        // Remove event listeners and clean up
    }
    
    // Loading screen management
    showLoading() {
        if (this.loadingOverlay) {
            this.loadingOverlay.classList.remove('hidden');
        }
    }
    
    hideLoading() {
        if (this.loadingOverlay) {
            // Add smooth transition before hiding
            setTimeout(() => {
                this.loadingOverlay.classList.add('hidden');
            }, 500); // Small delay for better UX
        }
    }
}

// Enhanced Sponsored Ads Manager
class SponsoredAdsManager {
    constructor() {
        this.adTemplates = [
            {
                icon: 'fas fa-heart',
                title: 'Chăm sóc thú cưng chuyên nghiệp',
                description: 'Dịch vụ grooming và chăm sóc sức khỏe toàn diện',
                cta: 'Đặt lịch ngay'
            },
            {
                icon: 'fas fa-shopping-cart',
                title: 'Thức ăn premium cho thú cưng',
                description: 'Dinh dưỡng cao cấp từ các thương hiệu uy tín',
                cta: 'Mua ngay'
            },
            {
                icon: 'fas fa-stethoscope',
                title: 'Khám sức khỏe định kỳ',
                description: 'Bảo vệ sức khỏe thú cưng với gói khám toàn diện',
                cta: 'Tìm hiểu thêm'
            },
            {
                icon: 'fas fa-home',
                title: 'Phụ kiện và đồ chơi',
                description: 'Bộ sưu tập phụ kiện đa dạng cho mọi loại thú cưng',
                cta: 'Xem ngay'
            },
            {
                icon: 'fas fa-graduation-cap',
                title: 'Lớp huấn luyện thú cưng',
                description: 'Huấn luyện chuyên nghiệp giúp thú cưng ngoan ngoãn',
                cta: 'Đăng ký'
            }
        ];
        
        this.currentAdIndex = 0;
        this.init();
    }
    
    init() {
        this.injectSponsoredAds();
        this.rotateBannerAds();
    }
    
    injectSponsoredAds() {
        const petGrid = document.getElementById('pet-list');
        if (!petGrid) return;
        
        // Observer to inject ads as content loads
        const observer = new MutationObserver(() => {
            this.insertSponsoredCards();
        });
        
        observer.observe(petGrid, { childList: true, subtree: true });
        
        // Initial injection
        setTimeout(() => this.insertSponsoredCards(), 1000);
    }
    
    insertSponsoredCards() {
        const petGrid = document.getElementById('pet-list');
        if (!petGrid) return;
        
        const petItems = petGrid.querySelectorAll('.pet-item:not(.sponsored-ad-card)');
        const adInterval = 7; // Insert ad every 7 pet items
        
        // Remove existing sponsored ads first
        petGrid.querySelectorAll('.sponsored-ad-card').forEach(ad => ad.remove());
        
        // Insert new sponsored ads
        petItems.forEach((item, index) => {
            if ((index + 1) % adInterval === 0) {
                const sponsoredAd = this.createSponsoredAdCard();
                item.insertAdjacentElement('afterend', sponsoredAd);
            }
        });
    }
    
    createSponsoredAdCard() {
        const adTemplate = this.adTemplates[this.currentAdIndex % this.adTemplates.length];
        this.currentAdIndex++;
        
        const adCard = document.createElement('div');
        adCard.className = 'pet-item sponsored-ad-card';
        adCard.setAttribute('data-sponsored', 'true');
        
        adCard.innerHTML = `
            <div class="sponsored-badge">Sponsored</div>
            <div class="sponsored-icon">
                <i class="${adTemplate.icon}"></i>
            </div>
            <h4 class="sponsored-title">${adTemplate.title}</h4>
            <p class="sponsored-description">${adTemplate.description}</p>
            <button class="sponsored-cta" onclick="handleSponsoredClick('${adTemplate.title}')">${adTemplate.cta}</button>
        `;
        
        // Add click tracking
        adCard.addEventListener('click', () => {
            this.trackAdClick(adTemplate.title);
        });
        
        return adCard;
    }
    
    rotateBannerAds() {
        const bannerAds = document.querySelectorAll('.premium-ad, .floating-ad');
        
        bannerAds.forEach(ad => {
            const content = ad.querySelector('.ad-text, .ad-info');
            if (content) {
                setInterval(() => {
                    this.updateBannerContent(content);
                }, 8000);
            }
        });
    }
    
    updateBannerContent(contentElement) {
        const adTemplate = this.adTemplates[Math.floor(Math.random() * this.adTemplates.length)];
        
        const title = contentElement.querySelector('h4');
        const description = contentElement.querySelector('p');
        
        if (title) title.textContent = `🎯 ${adTemplate.title}`;
        if (description) description.textContent = adTemplate.description;
        
        // Add fade effect
        contentElement.style.opacity = '0';
        setTimeout(() => {
            contentElement.style.opacity = '1';
        }, 300);
    }
    
    trackAdClick(adTitle) {
        console.log(`Sponsored ad clicked: ${adTitle}`);
        // Add analytics tracking here
        if (typeof gtag !== 'undefined') {
            gtag('event', 'sponsored_ad_click', {
                'ad_title': adTitle,
                'timestamp': new Date().toISOString()
            });
        }
    }
}

// Global functions for sponsored ad interactions
function handleSponsoredClick(title) {
    console.log(`Sponsored ad action: ${title}`);
    
    // Create modal or redirect based on ad type
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>🎯 ${title}</h3>
                <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
            </div>
            <div class="modal-body">
                <p>Cảm ơn bạn đã quan tâm đến dịch vụ của chúng tôi!</p>
                <p>Chúng tôi sẽ liên hệ với bạn trong thời gian sớm nhất.</p>
                <div style="text-align: center; margin-top: 20px;">
                    <button class="btn btn-primary" onclick="this.closest('.modal').remove()">Đóng</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Auto close after 3 seconds
    setTimeout(() => {
        if (modal.parentNode) {
            modal.remove();
        }
    }, 3000);
}

// Enhanced Pets Section Functions
let currentPage = 1;
let isLoading = false;
let totalPets = 0;
let activeFilters = {};
let searchTimeout = null;

// Set quick category filter
function setQuickFilter(filterType, value) {
    // Update filter and refresh pets
    if (filterType === 'type') {
        const typeFilter = document.getElementById('type-filter');
        if (typeFilter) {
            typeFilter.value = value;
        }
    }
    
    activeFilters[filterType] = value;
    filterPets();
}

// Toggle advanced filters panel
function toggleAdvancedFilters() {
    // Panel is now always visible, so this function does nothing
    return;
}

// Apply advanced filters
function applyAdvancedFilters() {
    filterPets();
    updateActiveFiltersDisplay();
}

// Update active filters display
function updateActiveFiltersDisplay() {
    const activeFiltersDiv = document.getElementById('active-filters');
    const activeFiltersList = document.querySelector('.active-filters-list');
    const countBadge = document.getElementById('active-filters-count');
    
    // Check if elements exist
    if (!activeFiltersDiv || !activeFiltersList || !countBadge) {
        return;
    }
    
    // Count active filters
    const filterCount = Object.keys(activeFilters).filter(key => activeFilters[key]).length;
    
    // Update filter count badge
    if (filterCount > 0) {
        countBadge.textContent = filterCount;
        countBadge.style.display = 'inline';
        activeFiltersDiv.style.display = 'block';
    } else {
        countBadge.style.display = 'none';
        activeFiltersDiv.style.display = 'none';
        return;
    }

    // Generate filter tags
    activeFiltersList.innerHTML = '';
    Object.entries(activeFilters).forEach(([key, value]) => {
        if (value) {
            const tag = document.createElement('div');
            tag.className = 'filter-tag';
            tag.innerHTML = `
                <span>${getFilterLabel(key, value)}</span>
                <button onclick="removeFilter('${key}')" title="Xóa bộ lọc">
                    <i class="fas fa-times"></i>
                </button>
            `;
            activeFiltersList.appendChild(tag);
        }
    });
}

// Remove specific filter
function removeFilter(filterKey) {
    activeFilters[filterKey] = '';
    document.getElementById(`${filterKey}-filter`).value = '';
    
    // Update category chips if removing type filter
    if (filterKey === 'type') {
        const chips = document.querySelectorAll('.category-chip');
        chips.forEach(chip => chip.classList.remove('active'));
        document.querySelector('.category-chip[data-type=""]').classList.add('active');
    }
    
    filterPets();
    updateActiveFiltersDisplay();
}

// Get filter label for display
function getFilterLabel(key, value) {
    const labels = {
        type: {
            dog: '🐕 Chó',
            cat: '🐱 Mèo',
            bird: '🐦 Chim',
            fish: '🐠 Cá',
            rabbit: '🐰 Thỏ',
            hamster: '🐹 Hamster',
            reptile: '🦎 Bò sát',
            other: '🐾 Khác'
        },
        gender: {
            male: '♂️ Đực',
            female: '♀️ Cái',
            unknown: '❓ Chưa xác định'
        },
        status: {
            available: '✅ Có sẵn',
            featured: '⭐ Nổi bật',
            urgent: '🔥 Cần bán gấp'
        }
    };

    if (labels[key] && labels[key][value]) {
        return labels[key][value];
    }

    // For price ranges and other values
    if (key === 'price' && value.includes('-')) {
        const [min, max] = value.split('-');
        return `💰 ${formatPriceRange(parseInt(min), parseInt(max))}`;
    }
    
    if (key === 'age' && value.includes('-')) {
        const [min, max] = value.split('-');
        return `🎂 ${min}-${max} tháng`;
    }

    return `${key}: ${value}`;
}

// Format price range for display
function formatPriceRange(min, max) {
    if (max >= 999999999) {
        return `Trên ${formatPrice(min)}`;
    }
    return `${formatPrice(min)} - ${formatPrice(max)}`;
}

// Enhanced search with debouncing
function searchPets() {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        const searchInput = document.getElementById('pets-search-input');
        const searchTerm = searchInput ? searchInput.value.trim() : '';
        
        // Update search suggestions
        if (searchTerm.length >= 2) {
            showSearchSuggestions(searchTerm);
        } else {
            hideSearchSuggestions();
        }
        
        // Update clear button
        const clearBtn = document.getElementById('clear-pets-search');
        if (clearBtn) {
            clearBtn.style.display = searchTerm ? 'flex' : 'none';
        }
        
        // Perform search
        activeFilters.search = searchTerm;
        filterPets();
    }, 300);
}

// Show search suggestions
function showSearchSuggestions(term) {
    const suggestions = document.getElementById('pets-search-suggestions');
    if (!suggestions) return;
    
    // Mock suggestions based on current pets
    const mockSuggestions = [
        'Golden Retriever',
        'Mèo Ba Tư',
        'Chó Phốc Sóc',
        'Mèo Anh Lông Ngắn'
    ].filter(suggestion => 
        suggestion.toLowerCase().includes(term.toLowerCase())
    );

    if (mockSuggestions.length > 0) {
        suggestions.innerHTML = mockSuggestions.map(suggestion => 
            `<div class="suggestion-item" onclick="selectSuggestion('${suggestion}')">
                <i class="fas fa-search"></i> ${suggestion}
            </div>`
        ).join('');
        suggestions.style.display = 'block';
    } else {
        hideSearchSuggestions();
    }
}

// Hide search suggestions
function hideSearchSuggestions() {
    const suggestions = document.getElementById('pets-search-suggestions');
    if (suggestions) {
        suggestions.style.display = 'none';
    }
}

// Select search suggestion
function selectSuggestion(suggestion) {
    const searchInput = document.getElementById('pets-search-input');
    if (searchInput) {
        searchInput.value = suggestion;
    }
    hideSearchSuggestions();
    searchPets();
}

// Clear pets search
function clearPetsSearch() {
    const searchInput = document.getElementById('pets-search-input');
    const clearSearch = document.getElementById('clear-pets-search');
    
    if (searchInput) {
        searchInput.value = '';
    }
    if (clearSearch) {
        clearSearch.style.display = 'none';
    }
    hideSearchSuggestions();
    
    activeFilters.search = '';
    filterPets();
}

// Enhanced sort function
function sortPets() {
    const sortValue = document.getElementById('sort-filter').value;
    
    let sortedPets = [...pets];
    
    switch (sortValue) {
        case 'newest':
            sortedPets.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            break;
        case 'oldest':
            sortedPets.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
            break;
        case 'price-low':
            sortedPets.sort((a, b) => a.price - b.price);
            break;
        case 'price-high':
            sortedPets.sort((a, b) => b.price - a.price);
            break;
        case 'popular':
            sortedPets.sort((a, b) => (b.view_count || 0) - (a.view_count || 0));
            break;
        case 'featured':
            sortedPets.sort((a, b) => {
                if (a.is_featured && !b.is_featured) return -1;
                if (!a.is_featured && b.is_featured) return 1;
                return new Date(b.created_at) - new Date(a.created_at);
            });
            break;
    }
    
    displayPets(sortedPets);
    updateResultsSummary(sortedPets.length);
}

// Enhanced filter function
function filterPets() {
    // Collect all filter values with null checks
    const typeFilter = document.getElementById('type-filter');
    const priceFilter = document.getElementById('price-filter');
    const ageFilter = document.getElementById('age-filter');
    const genderFilter = document.getElementById('gender-filter');
    const locationFilter = document.getElementById('location-filter');
    
    activeFilters.type = typeFilter ? typeFilter.value : '';
    activeFilters.price = priceFilter ? priceFilter.value : '';
    activeFilters.age = ageFilter ? ageFilter.value : '';
    activeFilters.gender = genderFilter ? genderFilter.value : '';
    activeFilters.location = locationFilter ? locationFilter.value : '';
    
    // Check if pets array exists
    if (!pets || !Array.isArray(pets)) {
        console.warn('Pets array not available for filtering');
        return;
    }
    
    let filteredPets = [...pets];
    
    // Apply filters
    Object.entries(activeFilters).forEach(([key, value]) => {
        if (value) {
            filteredPets = applyFilter(filteredPets, key, value);
        }
    });
    
    // Display results
    if (filteredPets.length === 0) {
        showEmptyState();
    } else {
        hideEmptyState();
        displayPets(filteredPets);
    }
    
    updateResultsSummary(filteredPets.length);
    updateActiveFiltersDisplay();
    updatePetsCount(filteredPets.length);
}

// Apply individual filter
function applyFilter(pets, filterKey, filterValue) {
    switch (filterKey) {
        case 'search':
            return pets.filter(pet => 
                pet.name.toLowerCase().includes(filterValue.toLowerCase()) ||
                (pet.breed && pet.breed.toLowerCase().includes(filterValue.toLowerCase())) ||
                (pet.description && pet.description.toLowerCase().includes(filterValue.toLowerCase()))
            );
            
        case 'type':
            return pets.filter(pet => pet.type === filterValue);
            
        case 'price':
            const [minPrice, maxPrice] = filterValue.split('-').map(Number);
            return pets.filter(pet => pet.price >= minPrice && pet.price <= maxPrice);
            
        case 'age':
            const [minAge, maxAge] = filterValue.split('-').map(Number);
            return pets.filter(pet => pet.age >= minAge && pet.age <= maxAge);
            
        case 'gender':
            return pets.filter(pet => pet.gender === filterValue);
            
        case 'location':
            return pets.filter(pet => pet.location && pet.location.includes(filterValue));
            
        default:
            return pets;
    }
}

// Update results summary
function updateResultsSummary(count) {
    document.getElementById('showing-count').textContent = count;
    document.getElementById('total-count').textContent = totalPets;
}

// Update pets count in header
function updatePetsCount(count) {
    document.getElementById('pets-count').textContent = `(${count})`;
}

// Show empty state
function showEmptyState() {
    document.getElementById('empty-state').style.display = 'block';
    document.getElementById('pet-list').style.display = 'none';
}

// Hide empty state
function hideEmptyState() {
    document.getElementById('empty-state').style.display = 'none';
    document.getElementById('pet-list').style.display = 'grid';
}

// Reset all filters
function resetAllFilters() {
    // Clear all select elements
    document.querySelectorAll('.filter-group select').forEach(select => {
        if (select) select.value = '';
    });
    
    // Clear search
    const searchInput = document.getElementById('pets-search-input');
    const clearSearch = document.getElementById('clear-pets-search');
    if (searchInput) searchInput.value = '';
    if (clearSearch) clearSearch.style.display = 'none';
    
    // Reset category chips
    document.querySelectorAll('.category-chip').forEach(chip => {
        if (chip) chip.classList.remove('active');
    });
    const defaultChip = document.querySelector('.category-chip[data-type=""]');
    if (defaultChip) defaultChip.classList.add('active');
    
    // Clear active filters
    activeFilters = {};
    
    // Refresh display (with safety checks)
    if (Array.isArray(pets)) {
        displayPets(pets);
        updateResultsSummary(pets.length);
        updatePetsCount(pets.length);
        hideEmptyState();
    }
    updateActiveFiltersDisplay();
}

// Refresh pets data
async function refreshPets() {
    // Clear cache
    apiCache.clear();
    
    // Reload pets
    await fetchPets();
    
    showNotification('Đã làm mới danh sách thú cưng', 'success');
}

// Load more pets (pagination)
function loadMorePets() {
    currentPage++;
    // Implementation for loading more pets with pagination
    // This would call the API with page parameter
}

// Initialize enhanced pets section
function initializeEnhancedPetsSection() {
    // Initialize pets count
    updatePetsCount(0);
    
    // Set up event listeners for outside clicks to close suggestions
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.pets-search-container')) {
            hideSearchSuggestions();
        }
    });
}

// Pet Detail Functions
async function showPetDetails(petId) {
    try {
        showLoading(true);
        
        // Try to get pet details from cache first, then API
        const pet = await apiCache.getOrFetch(
            `pet-details-${petId}`,
            async () => {
                const response = await fetch(`${API_BASE}/api/pets/${petId}`, {
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });

                if (!response.ok) {
                    if (response.status === 404) {
                        throw new Error('Không tìm thấy thú cưng');
                    }
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                return await response.json();
            },
            apiCache.defaultTTL
        );

        if (!pet || !pet.id) {
            throw new Error('Pet not found');
        }

        // Create and show pet details modal
        createPetDetailsModal(pet);
        
        // Update view count (don't wait for this)
        updatePetViewCount(petId).catch(console.error);
        
    } catch (error) {
        console.error('Error loading pet details:', error);
        showNotification('Không thể tải thông tin thú cưng', 'error');
    } finally {
        showLoading(false);
    }
}

function createPetDetailsModal(pet) {
    console.log('Creating pet details modal for:', pet.id, pet.name);
    console.log('Pet image data:', {
        primary_image: getPrimaryImage(pet),
        images: pet.images
    });
    
    // Remove existing modal if any
    const existingModal = document.getElementById('pet-details-modal');
    if (existingModal) {
        existingModal.remove();
    }

    const modal = document.createElement('div');
    modal.id = 'pet-details-modal';
    modal.className = 'modal show pet-modal-overlay';
    
    modal.innerHTML = `
        <div class="pet-modal-container">
            <div class="pet-modal-header">
                <div class="pet-modal-title">
                    <h1 class="pet-name">${pet.name}</h1>
                    <div class="pet-badges-container">
                        ${pet.is_featured ? '<span class="badge-pro featured">⭐ Nổi bật</span>' : ''}
                        ${pet.is_urgent ? '<span class="badge-pro urgent">🔥 Cần bán gấp</span>' : ''}
                        <span class="badge-pro status available">${getPetStatusLabel(pet.status) || 'Có sẵn'}</span>
                    </div>
                </div>
                <button class="modal-close-btn" onclick="closePetDetailsModal()" title="Đóng">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            
            <div class="pet-modal-body">
                <div class="pet-modal-layout">
                    <div class="pet-gallery-section">
                        <div class="main-image-container">
                            <div class="main-pet-image">
                                <img id="main-pet-image" src="${(() => {
                                    const imageUrl = getPrimaryImage(pet);
                                    if (imageUrl) {
                                        return imageUrl;
                                    }
                                    return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk5vIEltYWdlPC90ZXh0Pjwvc3ZnPg==';
                                })()}" 
                                     alt="${pet.name}" style="width: 100%; height: 100%; object-fit: cover;"
                                     onload="this.style.display='block'; this.nextElementSibling.style.display='none';"
                                     onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                                <div style="display: none; width: 100%; height: 100%; align-items: center; justify-content: center; background: #f8f9fa;">
                                    ${createFallbackIcon(pet.type)}
                                </div>
                            </div>
                            <div class="image-action-overlay">
                                <button class="action-btn favorite-btn ${pet.is_favorited ? 'favorited' : ''}" 
                                        onclick="toggleFavorite(${pet.id})" title="Yêu thích">
                                    <i class="fas fa-heart"></i>
                                </button>
                                <button class="action-btn share-btn" onclick="sharePet(${pet.id})" title="Chia sẻ">
                                    <i class="fas fa-share-alt"></i>
                                </button>
                            </div>
                        </div>
                        <div class="pet-thumbnails-gallery" id="pet-thumbnails"></div>
                    </div>
                    
                    <div class="pet-info-section">
                        <div class="price-section-pro">
                            <div class="price-main">
                                <span class="current-price">${formatPrice(pet.price)}</span>
                                ${pet.original_price && pet.original_price > pet.price ? 
                                    `<span class="original-price">${formatPrice(pet.original_price)}</span>
                                     <span class="discount-badge">-${Math.round((1 - pet.price / pet.original_price) * 100)}%</span>` : ''
                                }
                            </div>
                            <div class="price-note">Giá đã bao gồm các chi phí cơ bản</div>
                        </div>
                        
                        <div class="pet-quick-info">
                            <div class="info-card">
                                <div class="info-icon"><i class="fas fa-paw"></i></div>
                                <div class="info-content">
                                    <span class="info-label">Loại</span>
                                    <span class="info-value">${getCategoryLabel(pet.category)}</span>
                                </div>
                            </div>
                            <div class="info-card">
                                <div class="info-icon"><i class="fas fa-birthday-cake"></i></div>
                                <div class="info-content">
                                    <span class="info-label">Tuổi</span>
                                    <span class="info-value">${formatAge(pet.age)}</span>
                                </div>
                            </div>
                            <div class="info-card">
                                <div class="info-icon"><i class="fas fa-venus-mars"></i></div>
                                <div class="info-content">
                                    <span class="info-label">Giới tính</span>
                                    <span class="info-value">${pet.gender === 'male' ? '♂️ Đực' : pet.gender === 'female' ? '♀️ Cái' : '❓ Chưa rõ'}</span>
                                </div>
                            </div>
                            <div class="info-card">
                                <div class="info-icon"><i class="fas fa-map-marker-alt"></i></div>
                                <div class="info-content">
                                    <span class="info-label">Địa điểm</span>
                                    <span class="info-value">${pet.location || 'Việt Nam'}</span>
                                </div>
                            </div>
                        </div>
                        
                        <div class="pet-description-section">
                            <h3 class="section-title">
                                <i class="fas fa-file-alt"></i>
                                Mô tả chi tiết
                            </h3>
                            <div class="description-content">
                                ${pet.description || 'Chưa có mô tả chi tiết cho thú cưng này.'}
                            </div>
                        </div>
                        
                        <div class="seller-section">
                            <h3 class="section-title">
                                <i class="fas fa-user-circle"></i>
                                Thông tin người bán
                            </h3>
                            <div class="seller-card">
                                <div class="seller-avatar-container">
                                    ${createUserAvatar({
                                        avatar_url: pet.seller_avatar,
                                        name: pet.seller_name
                                    }, '64px')}
                                </div>
                                <div class="seller-info">
                                    <div class="seller-name">${pet.seller_name || 'Chưa cập nhật'}</div>
                                    <div class="seller-rating">
                                        <div class="rating-stars">
                                            ${generateStars(pet.seller_rating || 0)}
                                        </div>
                                        <span class="rating-text">${(pet.seller_rating || 0).toFixed(1)} / 5.0</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="pet-stats-section">
                            <div class="stats-grid">
                                <div class="stat-card">
                                    <i class="fas fa-eye"></i>
                                    <div class="stat-content">
                                        <span class="stat-number">${pet.view_count || 0}</span>
                                        <span class="stat-label">Lượt xem</span>
                                    </div>
                                </div>
                                <div class="stat-card">
                                    <i class="fas fa-heart"></i>
                                    <div class="stat-content">
                                        <span class="stat-number">${pet.favorite_count || 0}</span>
                                        <span class="stat-label">Yêu thích</span>
                                    </div>
                                </div>
                                <div class="stat-card">
                                    <i class="fas fa-share"></i>
                                    <div class="stat-content">
                                        <span class="stat-number">${pet.share_count || 0}</span>
                                        <span class="stat-label">Chia sẻ</span>
                                    </div>
                                </div>
                                <div class="stat-card">
                                    <i class="fas fa-calendar"></i>
                                    <div class="stat-content">
                                        <span class="stat-number">${formatPostDate(pet.created_at)}</span>
                                        <span class="stat-label">Đăng bán</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="pet-modal-footer">
                <div class="action-buttons-grid">
                    <button class="btn-primary-action buy-now-btn" onclick="buyPet(${pet.id})">
                        <i class="fas fa-shopping-bag"></i>
                        <span>Mua ngay</span>
                        <small>Thanh toán an toàn</small>
                    </button>
                    <button class="btn-secondary-action add-to-cart-btn" onclick="addToCart(${pet.id})">
                        <i class="fas fa-cart-plus"></i>
                        <span>Thêm vào giỏ</span>
                    </button>
                    <button class="btn-secondary-action contact-btn" onclick="contactSeller(${pet.seller_id || pet.user_id})">
                        <i class="fas fa-phone"></i>
                        <span>Liên hệ</span>
                    </button>
                    <button class="btn-secondary-action report-btn" onclick="reportPet(${pet.id})">
                        <i class="fas fa-flag"></i>
                        <span>Báo cáo</span>
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    console.log('Pet modal appended to body');
    
    // Load additional images if available
    loadPetImages(pet.id);
    
    // Prevent body scrolling and add modal class
    document.body.style.overflow = 'hidden';
    document.body.classList.add('modal-open');
    
    // Add click outside to close
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closePetDetailsModal();
        }
    });
}
async function loadPetImages(petId) {
    try {
        // First try to get images from cached pets_all data
        const cacheKey = 'pets_all';
        const cachedPets = apiCache.get(cacheKey);
        
        if (cachedPets) {
            const pet = cachedPets.find(p => p.id == petId);
            if (pet && pet.images && pet.images.length > 0) {
                console.log('Using cached pet images:', pet.images);
                
                if (pet.images.length > 1) {
                    const thumbnailsContainer = document.getElementById('pet-thumbnails');
                    thumbnailsContainer.innerHTML = pet.images.map((image, index) => `
                        <div class="thumbnail ${image.is_primary ? 'active' : ''}" 
                             onclick="changeMainImage('${image.url || image.image_url}', ${index})">
                            <img src="${image.url || image.image_url}" alt="Pet image ${index + 1}"
                                 onerror="this.parentElement.style.display='none'">
                        </div>
                    `).join('');
                }
                return;
            }
        }
        
        // Fallback: Use API call if not in cache
        const response = await fetch(`${API_BASE}/api/pets/${petId}/images`);
        if (response.ok) {
            const data = await response.json();
            const images = data.images || [];
            
            if (images.length > 1) {
                const thumbnailsContainer = document.getElementById('pet-thumbnails');
                thumbnailsContainer.innerHTML = images.map((image, index) => `
                    <div class="thumbnail ${index === 0 ? 'active' : ''}" 
                         onclick="changeMainImage('${image}', ${index})">
                        <img src="${image}" alt="Pet image ${index + 1}"
                             onerror="this.parentElement.style.display='none'">
                    </div>
                `).join('');
            }
        }
    } catch (error) {
        console.error('Error loading pet images:', error);
    }
}

function changeMainImage(imageUrl, index) {
    const mainImage = document.getElementById('main-pet-image');
    if (!mainImage) {
        console.error('Main pet image element not found');
        return;
    }
    
    // Validate imageUrl
    if (!imageUrl || typeof imageUrl !== 'string') {
        console.error('Invalid image URL provided:', imageUrl);
        return;
    }
    
    console.log('Changing main image to:', imageUrl);
    
    // Set the image source
    mainImage.src = imageUrl;
    
    // Update active thumbnail
    document.querySelectorAll('.thumbnail').forEach((thumb, i) => {
        thumb.classList.toggle('active', i === index);
    });
}

function closePetDetailsModal() {
    const modal = document.getElementById('pet-details-modal');
    if (modal) {
        modal.remove();
        document.body.style.overflow = '';
        document.body.classList.remove('modal-open');
    }
}

async function updatePetViewCount(petId) {
    try {
        await fetch(`${API_BASE}/api/pets/${petId}/view`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
    } catch (error) {
        console.error('Error updating view count:', error);
    }
}

// Toggle favorite status
async function toggleFavorite(petId) {
    if (!currentUser) {
        showLoginModal();
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/api/pets/${petId}/favorite`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            showNotification(data.message, 'success');
            
            // Update UI
            const favoriteBtn = document.querySelector(`[data-pet-id="${petId}"] .favorite-btn`);
            if (favoriteBtn) {
                favoriteBtn.classList.toggle('favorited');
            }
        } else {
            throw new Error('Failed to toggle favorite');
        }
    } catch (error) {
        console.error('Error toggling favorite:', error);
        showNotification('Có lỗi xảy ra khi thêm vào yêu thích', 'error');
    }
}

// Contact seller
function contactSeller(petId) {
    if (!currentUser) {
        showLoginModal();
        return;
    }
    
    // Implementation for opening chat/message interface
    showNotification('Tính năng nhắn tin đang được phát triển', 'info');
}

// Share pet
function sharePet(petId) {
    if (navigator.share) {
        navigator.share({
            title: 'Thú cưng đáng yêu trên HiPet',
            text: 'Xem thú cưng này trên HiPet',
            url: `${window.location.origin}/?pet=${petId}`
        });
    } else {
        // Fallback: copy link
        const link = `${window.location.origin}/?pet=${petId}`;
        navigator.clipboard.writeText(link).then(() => {
            showNotification('Đã sao chép liên kết', 'success');
        });
    }
}

// View seller profile
function viewSellerProfile(sellerId) {
    showNotification('Tính năng xem hồ sơ người bán đang được phát triển', 'info');
}

// Helper functions for pet details
function getPetStatusLabel(status) {
    const labels = {
        'available': '✅ Có sẵn',
        'pending': '⏳ Đang chờ',
        'sold': '✅ Đã bán',
        'reserved': '📝 Đã đặt cọc'
    };
    return labels[status] || status;
}

function getGenderLabel(gender) {
    const labels = {
        'male': '♂️ Đực',
        'female': '♀️ Cái',
        'unknown': '❓ Chưa xác định'
    };
    return labels[gender] || 'Chưa xác định';
}

function getHealthStatusLabel(status) {
    const labels = {
        'healthy': '💚 Khỏe mạnh',
        'sick': '💛 Đang điều trị',
        'recovering': '💙 Đang hồi phục',
        'unknown': '❓ Chưa kiểm tra'
    };
    return labels[status] || status;
}

function getVaccinationStatusLabel(status) {
    const labels = {
        'full': '✅ Đầy đủ',
        'partial': '⚠️ Một phần',
        'none': '❌ Chưa tiêm',
        'unknown': '❓ Chưa rõ'
    };
    return labels[status] || status;
}

function getTimeAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now - date;
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) return 'Hôm nay';
    if (diffInDays === 1) return 'Hôm qua';
    if (diffInDays < 7) return `${diffInDays} ngày trước`;
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} tuần trước`;
    return `${Math.floor(diffInDays / 30)} tháng trước`;
}

// Initialize carousel and ads when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Initialize carousel
    const carousel = new PetCarousel('featured-carousel');
    
    // Initialize sponsored ads
    const adsManager = new SponsoredAdsManager();
    
    // Initialize enhanced pets section
    initializeEnhancedPetsSection();
    
    // Store instances globally for potential cleanup
    window.petCarousel = carousel;
    window.sponsoredAdsManager = adsManager;
    
    // Handle URL parameters for direct pet viewing
    const urlParams = new URLSearchParams(window.location.search);
    const petId = urlParams.get('pet');
    if (petId) {
        setTimeout(() => showPetDetails(petId), 1000);
    }
    
    // Initialize Facebook-style header interactions
    initializeFacebookHeader();
});

// Facebook-style Header Interactions
function initializeFacebookHeader() {
    // Mobile menu toggle
    const mobileToggle = document.getElementById('mobile-menu-toggle');
    const mobileNav = document.getElementById('mobile-nav');
    
    if (mobileToggle && mobileNav) {
        mobileToggle.addEventListener('click', function(e) {
            e.stopPropagation();
            mobileToggle.classList.toggle('active');
            mobileNav.style.display = mobileNav.style.display === 'none' ? 'block' : 'none';
        });
    }
    
    // User dropdown interactions
    const userSection = document.querySelector('.user-section');
    const userDropdown = document.querySelector('.user-dropdown');
    
    if (userSection && userDropdown) {
        let dropdownTimeout;
        
        // Show dropdown on hover
        userSection.addEventListener('mouseenter', function() {
            clearTimeout(dropdownTimeout);
            userDropdown.style.opacity = '1';
            userDropdown.style.visibility = 'visible';
            userDropdown.style.transform = 'translateY(0)';
        });
        
        // Hide dropdown on leave with delay
        userSection.addEventListener('mouseleave', function() {
            dropdownTimeout = setTimeout(() => {
                userDropdown.style.opacity = '0';
                userDropdown.style.visibility = 'hidden';
                userDropdown.style.transform = 'translateY(-10px)';
            }, 300);
        });
        
        // Keep dropdown open when hovering over it
        userDropdown.addEventListener('mouseenter', function() {
            clearTimeout(dropdownTimeout);
        });
        
        userDropdown.addEventListener('mouseleave', function() {
            dropdownTimeout = setTimeout(() => {
                userDropdown.style.opacity = '0';
                userDropdown.style.visibility = 'hidden';
                userDropdown.style.transform = 'translateY(-10px)';
            }, 300);
        });
    }
    
    // Click anywhere to close mobile menu
    document.addEventListener('click', function(e) {
        if (mobileNav && mobileToggle) {
            if (!e.target.closest('#mobile-menu-toggle') && !e.target.closest('#mobile-nav')) {
                mobileNav.style.display = 'none';
                mobileToggle.classList.remove('active');
            }
        }
    });
    
    // Search focus effects
    const searchInput = document.getElementById('global-search-input');
    const searchGroup = document.querySelector('.search-input-group');
    
    if (searchInput && searchGroup) {
        searchInput.addEventListener('focus', function() {
            searchGroup.style.background = 'rgba(255, 255, 255, 0.25)';
            searchGroup.style.borderColor = 'rgba(255, 255, 255, 0.4)';
        });
        
        searchInput.addEventListener('blur', function() {
            searchGroup.style.background = 'rgba(255, 255, 255, 0.15)';
            searchGroup.style.borderColor = 'rgba(255, 255, 255, 0.2)';
        });
    }
    
    // Add smooth scrolling for navigation
    const navItems = document.querySelectorAll('.nav-icon-item, .mobile-nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', function(e) {
            // Add ripple effect
            const ripple = document.createElement('span');
            ripple.style.position = 'absolute';
            ripple.style.borderRadius = '50%';
            ripple.style.background = 'rgba(255, 255, 255, 0.3)';
            ripple.style.width = '50px';
            ripple.style.height = '50px';
            ripple.style.left = '50%';
            ripple.style.top = '50%';
            ripple.style.transform = 'translate(-50%, -50%) scale(0)';
            ripple.style.animation = 'ripple 0.6s linear';
            ripple.style.pointerEvents = 'none';
            
            this.style.position = 'relative';
            this.style.overflow = 'hidden';
            this.appendChild(ripple);
            
            setTimeout(() => {
                ripple.remove();
            }, 600);
        });
    });
    
    // Add ripple animation CSS if not exists
    if (!document.querySelector('#ripple-style')) {
        const style = document.createElement('style');
        style.id = 'ripple-style';
        style.textContent = `
            @keyframes ripple {
                to {
                    transform: translate(-50%, -50%) scale(2);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
    }
}

// ==============================================
// SYSTEM MONITORING & ERROR HANDLING
// ==============================================

// Global error handler for 404 and other errors
window.addEventListener('error', function(e) {
    console.error('Global error caught:', e.error);
    
    // Check if it's a network error that might indicate maintenance
    if (e.error && e.error.message && e.error.message.includes('fetch')) {
        setTimeout(() => {
            checkMaintenanceMode();
        }, 1000);
    }
});

// Handle unhandled promise rejections
window.addEventListener('unhandledrejection', function(e) {
    console.error('Unhandled promise rejection:', e.reason);
    
    // Check for API-related errors
    if (e.reason && e.reason.message && e.reason.message.includes('Failed to fetch')) {
        setTimeout(() => {
            checkMaintenanceMode();
        }, 1000);
    }
});

// Enhanced API error handling
function handleAPIError(error, endpoint) {
    console.error(`API Error at ${endpoint}:`, error);
    
    // Check for common error patterns
    if (error.message === 'Failed to fetch' || 
        error.message.includes('NetworkError') ||
        error.message.includes('ERR_NETWORK')) {
        
        // Might be maintenance mode or server down
        setTimeout(() => {
            checkMaintenanceMode();
        }, 1000);
        
        return {
            success: false,
            message: 'Không thể kết nối đến server. Vui lòng thử lại sau.',
            isNetworkError: true
        };
    }
    
    // Handle 404 responses
    if (error.status === 404) {
        // Redirect to 404 page for resource not found
        if (!window.location.pathname.includes('404.html')) {
            window.location.href = '/404.html';
        }
        return {
            success: false,
            message: 'Tài nguyên không tìm thấy',
            is404: true
        };
    }
    
    // Handle 500+ server errors
    if (error.status >= 500) {
        return {
            success: false,
            message: 'Có lỗi xảy ra trên server. Vui lòng thử lại sau.',
            isServerError: true
        };
    }
    
    return {
        success: false,
        message: error.message || 'Có lỗi xảy ra. Vui lòng thử lại.',
        originalError: error
    };
}

// Enhanced fetch with error handling
async function enhancedFetch(url, options = {}) {
    try {
        const response = await fetch(url, options);
        
        // Handle non-2xx responses
        if (!response.ok) {
            if (response.status === 404) {
                throw { status: 404, message: 'Resource not found' };
            } else if (response.status >= 500) {
                throw { status: response.status, message: 'Server error' };
            } else {
                const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
                throw { status: response.status, message: errorData.message || 'Request failed' };
            }
        }
        
        return response;
    } catch (error) {
        throw handleAPIError(error, url);
    }
}

// System health check (can be called periodically)
async function checkSystemHealth() {
    try {
        const response = await fetch(`${API_BASE}/api/health`);
        const data = await response.json();
        
        return {
            healthy: response.ok && data.status === 'healthy',
            timestamp: data.timestamp
        };
    } catch (error) {
        console.error('Health check failed:', error);
        return {
            healthy: false,
            error: error.message
        };
    }
}

// Periodic maintenance check (every 5 minutes)
setInterval(async () => {
    const health = await checkSystemHealth();
    if (!health.healthy) {
        console.warn('System health check failed, checking maintenance mode...');
        await checkMaintenanceMode();
    }
}, 5 * 60 * 1000);

// Page visibility change handler - check maintenance when user returns
document.addEventListener('visibilitychange', function() {
    if (!document.hidden) {
        // User returned to page, check maintenance status
        setTimeout(() => {
            checkMaintenanceMode();
        }, 1000);
    }
});

// Custom 404 handler for SPA routing
function handle404(path) {
    console.warn('404 - Page not found:', path);
    
    // Check if we're already on 404 page
    if (window.location.pathname.includes('404.html')) {
        return;
    }
    
    // Redirect to 404 page
    window.location.href = '/404.html';
}

// URL change detection for SPA
let currentPath = window.location.pathname;
function detectURLChange() {
    if (window.location.pathname !== currentPath) {
        currentPath = window.location.pathname;
        
        // Check if new path exists or should trigger 404
        // This would need to be customized based on your routing logic
        console.log('URL changed to:', currentPath);
    }
}

// Monitor URL changes
setInterval(detectURLChange, 1000);

// Add ripple effect to buttons
function addRippleEffect() {
    document.querySelectorAll('button, .btn').forEach(button => {
        button.addEventListener('click', function(e) {
            const ripple = document.createElement('div');
            ripple.style.position = 'absolute';
            ripple.style.borderRadius = '50%';
            ripple.style.background = 'rgba(255, 255, 255, 0.3)';
            ripple.style.transform = 'scale(0)';
            ripple.style.animation = 'ripple 0.6s linear';
            ripple.style.left = '50%';
            ripple.style.top = '50%';
            ripple.style.width = '40px';
            ripple.style.height = '40px';
            ripple.style.marginLeft = '-20px';
            ripple.style.marginTop = '-20px';
            
            this.style.position = 'relative';
            this.appendChild(ripple);
            
            setTimeout(() => {
                ripple.remove();
            }, 600);
        });
    });
}

// Toggle quick actions visibility
function toggleQuickActions() {
    const quickActions = document.getElementById('quick-actions');
    const toggleIcon = document.getElementById('quick-actions-icon');
    const toggle = document.querySelector('.quick-actions-toggle');
    
    if (quickActions && toggleIcon && toggle) {
        quickActions.classList.toggle('hidden');
        toggle.classList.toggle('collapsed');
        
        // Update icon
        if (quickActions.classList.contains('hidden')) {
            toggleIcon.className = 'fas fa-chevron-down';
        } else {
            toggleIcon.className = 'fas fa-chevron-up';
        }
    }
}

// Add ripple animation to CSS
const rippleStyle = document.createElement('style');
rippleStyle.textContent = `
    @keyframes ripple {
        to {
            transform: scale(2);
            opacity: 0;
        }
    }
`;
document.head.appendChild(rippleStyle);

// Initialize ripple effect
addRippleEffect();
