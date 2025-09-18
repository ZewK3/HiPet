// HiPet Admin Dashboard JavaScript

// Global state
let currentAdmin = null;
let currentSection = 'dashboard';
let currentPage = 1;
let usersData = [];
let petsData = [];
let transactionsData = [];
let dashboardStats = {};

// API Configuration
const API_BASE = 'https://api.zewk.fun'; // Replace with your Cloudflare Worker URL

// =============================================================================
// ADMIN LOGIN FUNCTIONALITY (Merged from admin-login.js)
// =============================================================================

document.addEventListener('DOMContentLoaded', function() {
    const loginScreen = document.getElementById('admin-login-screen');
    const dashboard = document.getElementById('admin-dashboard');
    const loginForm = document.getElementById('admin-login-form');

    // Check if user is already logged in
    checkAdminAuth();

    // Handle login form submission
    if (loginForm) {
        loginForm.addEventListener('submit', handleAdminLogin);
    }

    // Setup other event listeners
    setupEventListeners();
    
    // Initialize admin panel only if authenticated
    if (checkAdminAuth()) {
        initializeAdmin();
    }

    async function handleAdminLogin(e) {
        e.preventDefault();
        
        const email = document.getElementById('admin-email').value;
        const password = document.getElementById('admin-password').value;
        const remember = document.getElementById('admin-remember').checked;
        
        const submitButton = loginForm.querySelector('.login-btn');
        const originalText = submitButton.innerHTML;
        
        // Show loading state
        submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang đăng nhập...';
        submitButton.disabled = true;

        try {
            const response = await fetch(`${API_BASE}/api/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email,
                    password,
                    role: 'admin'
                }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            console.log('Admin login response:', result);

            if (result.token && result.user) {
                if (result.user.role !== 'admin') {
                    throw new Error('Unauthorized: Not an admin user');
                }

                // Store auth data
                if (remember) {
                    localStorage.setItem('admin_token', result.token);
                    localStorage.setItem('admin_user', JSON.stringify(result.user));
                } else {
                    sessionStorage.setItem('admin_token', result.token);
                    sessionStorage.setItem('admin_user', JSON.stringify(result.user));
                }

                showSuccessMessage('Đăng nhập thành công!');
                setTimeout(() => {
                    showDashboard();
                    initializeAdmin();
                }, 1000);

            } else {
                throw new Error(result.message || 'Đăng nhập thất bại');
            }

        } catch (error) {
            console.error('Admin login error:', error);
            showErrorMessage(error.message || 'Có lỗi xảy ra khi đăng nhập');
        } finally {
            submitButton.innerHTML = originalText;
            submitButton.disabled = false;
        }
    }

    function showLoginScreen() {
        if (loginScreen) loginScreen.style.display = 'flex';
        if (dashboard) dashboard.style.display = 'none';
    }

    function showDashboard() {
        if (loginScreen) loginScreen.style.display = 'none';
        if (dashboard) dashboard.style.display = 'block';
    }

    function showSuccessMessage(message) {
        showMessage(message, 'success');
    }

    function showErrorMessage(message) {
        showMessage(message, 'error');
    }

    function showMessage(message, type) {
        const existingMessages = document.querySelectorAll('.login-message');
        existingMessages.forEach(msg => msg.remove());

        const messageDiv = document.createElement('div');
        messageDiv.className = `login-message ${type}`;
        messageDiv.innerHTML = `
            <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
            <span>${message}</span>
        `;

        messageDiv.style.cssText = `
            position: fixed; top: 20px; right: 20px; padding: 16px 20px; border-radius: 8px;
            color: white; font-weight: 500; z-index: 10000; display: flex; align-items: center;
            gap: 12px; min-width: 300px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            transform: translateX(400px); transition: transform 0.3s ease;
            background: ${type === 'success' ? '#27ae60' : '#e74c3c'};
        `;

        document.body.appendChild(messageDiv);
        setTimeout(() => messageDiv.style.transform = 'translateX(0)', 100);
        setTimeout(() => {
            messageDiv.style.transform = 'translateX(400px)';
            setTimeout(() => messageDiv.remove(), 300);
        }, 4000);
    }

    // Global logout function
    window.adminLogout = function() {
        clearAdminAuth();
        showLoginScreen();
        showSuccessMessage('Đã đăng xuất thành công');
    };
});

// Password toggle function
function togglePassword(inputId) {
    const input = document.getElementById(inputId);
    const toggle = input.parentNode.querySelector('.password-toggle i');
    
    if (input.type === 'password') {
        input.type = 'text';
        toggle.className = 'fas fa-eye-slash';
    } else {
        input.type = 'password';
        toggle.className = 'fas fa-eye';
    }
}

function clearAdminAuth() {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    sessionStorage.removeItem('admin_token');
    sessionStorage.removeItem('admin_user');
}

// =============================================================================
// ADMIN DASHBOARD FUNCTIONALITY
// =============================================================================

// Check admin authentication
function checkAdminAuth() {
    const adminToken = localStorage.getItem('admin_token') || sessionStorage.getItem('admin_token');
    const adminUser = localStorage.getItem('admin_user') || sessionStorage.getItem('admin_user');
    
    if (adminToken && adminUser) {
        try {
            const userData = JSON.parse(adminUser);
            if (userData.role === 'admin') {
                currentAdmin = userData;
                return true;
            }
        } catch (error) {
            console.error('Error parsing admin user data:', error);
            clearAdminAuth();
        }
    }
    
    return false;
}

// Helper function to get auth headers
function getAdminAuthHeaders() {
    const token = getAdminAuthToken();
    return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };
}

// Initialize admin panel
document.addEventListener('DOMContentLoaded', () => {
    // Don't call checkAdminAuth here since login screen will handle it
    setupEventListeners();
    initializeAdmin();
});

// Initialize admin panel
function initializeAdmin() {
    // Only initialize dashboard functions if user is authenticated
    if (checkAdminAuth()) {
        // Load initial data
        loadDashboardData();
        
        // Set active section
        showSection('dashboard');
    }
}

// Setup event listeners
function setupEventListeners() {
    // Sidebar menu items
    document.querySelectorAll('.menu-item').forEach(item => {
        item.addEventListener('click', () => {
            const section = item.getAttribute('data-section');
            showSection(section);
        });
    });
    
    // Forms
    document.getElementById('add-user-form').addEventListener('submit', handleAddUser);
    document.getElementById('edit-user-form').addEventListener('submit', handleEditUser);
    
    // Filters
    document.getElementById('user-search').addEventListener('input', filterUsers);
    document.getElementById('user-role-filter').addEventListener('change', filterUsers);
    document.getElementById('user-status-filter').addEventListener('change', filterUsers);
    
    document.getElementById('pet-search').addEventListener('input', filterPets);
    document.getElementById('pet-type-filter').addEventListener('change', filterPets);
    document.getElementById('pet-status-filter').addEventListener('change', filterPets);
    
    document.getElementById('transaction-search').addEventListener('input', filterTransactions);
    document.getElementById('transaction-type-filter').addEventListener('change', filterTransactions);
    document.getElementById('transaction-status-filter').addEventListener('change', filterTransactions);
    
    // Real-time updates every 30 seconds
    setInterval(loadDashboardData, 30000);
}

// Check admin authentication
function checkAdminAuth() {
    // Check both localStorage and sessionStorage for admin tokens
    const token = localStorage.getItem('admin_token') || sessionStorage.getItem('admin_token');
    const adminUser = localStorage.getItem('admin_user') || sessionStorage.getItem('admin_user');

    if (!token || !adminUser) {
        // Don't redirect - let the login screen handle this
        return false;
    }

    try {
        const userData = JSON.parse(adminUser);
        if (userData.role !== 'admin') {
            // Clear invalid auth data
            clearAdminAuth();
            return false;
        }

        currentAdmin = userData;
        updateAdminUI();
        return true;
    } catch (error) {
        console.error('Error parsing admin user data:', error);
        clearAdminAuth();
        return false;
    }
}

// Clear admin auth data
function clearAdminAuth() {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    sessionStorage.removeItem('admin_token');
    sessionStorage.removeItem('admin_user');
}

// Update admin UI
function updateAdminUI() {
    if (currentAdmin) {
        document.getElementById('admin-name').textContent = currentAdmin.full_name || 'Admin User';
    }
}

// Redirect to main site
function redirectToMain() {
    window.location.href = 'index.html';
}

// Show section
function showSection(sectionName) {
    // Update active menu item
    document.querySelectorAll('.menu-item').forEach(item => {
        item.classList.remove('active');
    });
    document.querySelector(`[data-section="${sectionName}"]`).classList.add('active');
    
    // Update active section
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    document.getElementById(sectionName).classList.add('active');
    
    currentSection = sectionName;
    
    // Load section data
    switch(sectionName) {
        case 'dashboard':
            loadDashboardData();
            break;
        case 'users':
            loadUsersData();
            break;
        case 'pets':
            loadPetsData();
            break;
        case 'transactions':
            loadTransactionsData();
            break;
        case 'reports':
            loadReportsData();
            break;
        case 'settings':
            loadSettingsData();
            break;
    }
}

// Load dashboard data
async function loadDashboardData() {
    showLoading();
    
    try {
        // Load stats
        const statsResponse = await fetch(`${API_BASE}/api/admin/stats`, {
            headers: getAdminAuthHeaders()
        });
        
        if (statsResponse.ok) {
            dashboardStats = await statsResponse.json();
            updateDashboardStats();
        }
        
        // Load recent activities
        const activitiesResponse = await fetch(`${API_BASE}/api/admin/activities`, {
            headers: getAdminAuthHeaders()
        });
        
        if (activitiesResponse.ok) {
            const activities = await activitiesResponse.json();
            updateRecentActivities(activities);
        }
        
        // Load recent pets
        const petsResponse = await fetch(`${API_BASE}/api/pets?limit=5&sort=created_at&order=desc`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (petsResponse.ok) {
            const pets = await petsResponse.json();
            updateRecentPets(pets.pets || []);
        }
        
    } catch (error) {
        console.error('Error loading dashboard:', error);
        showToast('Lỗi tải dữ liệu dashboard', 'error');
    } finally {
        hideLoading();
    }
}

// Update dashboard stats
function updateDashboardStats() {
    document.getElementById('total-users').textContent = dashboardStats.totalUsers || 0;
    document.getElementById('total-pets').textContent = dashboardStats.totalPets || 0;
    document.getElementById('total-transactions').textContent = dashboardStats.todayTransactions || 0;
    document.getElementById('total-revenue').textContent = formatCurrency(dashboardStats.totalRevenue || 0);
}

// Update recent activities
function updateRecentActivities(activities) {
    const container = document.getElementById('recent-activities');
    container.innerHTML = '';
    
    if (!activities.length) {
        container.innerHTML = '<p class="text-muted">Không có hoạt động nào gần đây</p>';
        return;
    }
    
    activities.forEach(activity => {
        const activityElement = document.createElement('div');
        activityElement.className = 'activity-item';
        activityElement.innerHTML = `
            <div class="activity-icon ${activity.type}">
                <i class="fas ${getActivityIcon(activity.type)}"></i>
            </div>
            <div class="activity-content">
                <p><strong>${activity.user_name}</strong> ${activity.description}</p>
                <div class="activity-time">${formatDateTime(activity.created_at)}</div>
            </div>
        `;
        container.appendChild(activityElement);
    });
}

// Update recent pets
function updateRecentPets(pets) {
    const container = document.getElementById('recent-pets');
    container.innerHTML = '';
    
    if (!pets.length) {
        container.innerHTML = '<p class="text-muted">Không có thú cưng nào mới</p>';
        return;
    }
    
    pets.forEach(pet => {
        const petElement = document.createElement('div');
        petElement.className = 'activity-item';
        petElement.innerHTML = `
            <div class="activity-icon pet">
                <i class="fas fa-paw"></i>
            </div>
            <div class="activity-content">
                <p><strong>${pet.name}</strong> - ${pet.type}</p>
                <p>${formatCurrency(pet.price)} - ${pet.location}</p>
                <div class="activity-time">${formatDateTime(pet.created_at)}</div>
            </div>
        `;
        container.appendChild(petElement);
    });
}

// Load users data
async function loadUsersData() {
    showLoading();
    
    try {
        const token = localStorage.getItem('authToken');
        const response = await fetch(`${API_BASE}/api/admin/users`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            const data = await response.json();
            usersData = data.users || [];
            renderUsersTable();
        } else {
            throw new Error('Failed to load users');
        }
    } catch (error) {
        console.error('Error loading users:', error);
        showToast('Lỗi tải danh sách người dùng', 'error');
    } finally {
        hideLoading();
    }
}

// Render users table
function renderUsersTable() {
    const tbody = document.getElementById('users-table-body');
    tbody.innerHTML = '';
    
    if (!usersData.length) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center">Không có dữ liệu</td></tr>';
        return;
    }
    
    usersData.forEach(user => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${user.id}</td>
            <td>
                <img src="${user.avatar_url || '/images/default-avatar.svg'}" 
                     alt="${user.full_name}" class="user-avatar">
            </td>
            <td>${user.full_name || 'N/A'}</td>
            <td>${user.email}</td>
            <td><span class="role-badge ${user.role}">${getRoleText(user.role)}</span></td>
            <td><span class="status-badge ${user.status || 'active'}">${getStatusText(user.status || 'active')}</span></td>
            <td>${formatDateTime(user.created_at)}</td>
            <td>
                <div class="action-buttons">
                    <button class="action-btn view" onclick="viewUser(${user.id})" title="Xem chi tiết">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="action-btn edit" onclick="editUser(${user.id})" title="Chỉnh sửa">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn delete" onclick="deleteUser(${user.id})" title="Xóa">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Filter users
function filterUsers() {
    const search = document.getElementById('user-search').value.toLowerCase();
    const roleFilter = document.getElementById('user-role-filter').value;
    const statusFilter = document.getElementById('user-status-filter').value;
    
    let filteredUsers = usersData;
    
    if (search) {
        filteredUsers = filteredUsers.filter(user => 
            user.full_name.toLowerCase().includes(search) ||
            user.email.toLowerCase().includes(search)
        );
    }
    
    if (roleFilter) {
        filteredUsers = filteredUsers.filter(user => user.role === roleFilter);
    }
    
    if (statusFilter) {
        filteredUsers = filteredUsers.filter(user => (user.status || 'active') === statusFilter);
    }
    
    renderFilteredUsers(filteredUsers);
}

// Render filtered users
function renderFilteredUsers(users) {
    const tbody = document.getElementById('users-table-body');
    tbody.innerHTML = '';
    
    if (!users.length) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center">Không tìm thấy kết quả</td></tr>';
        return;
    }
    
    users.forEach(user => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${user.id}</td>
            <td>
                <img src="${user.avatar_url || '/images/default-avatar.svg'}" 
                     alt="${user.full_name}" class="user-avatar">
            </td>
            <td>${user.full_name || 'N/A'}</td>
            <td>${user.email}</td>
            <td><span class="role-badge ${user.role}">${getRoleText(user.role)}</span></td>
            <td><span class="status-badge ${user.status || 'active'}">${getStatusText(user.status || 'active')}</span></td>
            <td>${formatDateTime(user.created_at)}</td>
            <td>
                <div class="action-buttons">
                    <button class="action-btn view" onclick="viewUser(${user.id})" title="Xem chi tiết">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="action-btn edit" onclick="editUser(${user.id})" title="Chỉnh sửa">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn delete" onclick="deleteUser(${user.id})" title="Xóa">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Load pets data
async function loadPetsData() {
    showLoading();
    
    try {
        const token = localStorage.getItem('authToken');
        const response = await fetch(`${API_BASE}/api/admin/pets`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            const data = await response.json();
            petsData = data.pets || [];
            renderPetsGrid();
        } else {
            throw new Error('Failed to load pets');
        }
    } catch (error) {
        console.error('Error loading pets:', error);
        showToast('Lỗi tải danh sách thú cưng', 'error');
    } finally {
        hideLoading();
    }
}

// Render pets grid
function renderPetsGrid() {
    const container = document.getElementById('pets-grid');
    container.innerHTML = '';
    
    if (!petsData.length) {
        container.innerHTML = '<p class="text-center">Không có dữ liệu thú cưng</p>';
        return;
    }
    
    petsData.forEach(pet => {
        const petCard = document.createElement('div');
        petCard.className = 'pet-admin-card';
        petCard.innerHTML = `
            <img src="${pet.image_url || '/images/default-pet.png'}" 
                 alt="${pet.name}" class="pet-admin-image">
            <div class="pet-admin-content">
                <div class="pet-admin-header">
                    <h4 class="pet-admin-title">${pet.name}</h4>
                    <span class="pet-admin-price">${formatCurrency(pet.price)}</span>
                </div>
                <div class="pet-admin-info">
                    <p><strong>Loại:</strong> ${getTypeText(pet.type)}</p>
                    <p><strong>Giống:</strong> ${pet.breed}</p>
                    <p><strong>Tuổi:</strong> ${pet.age} tháng</p>
                    <p><strong>Chủ:</strong> ${pet.owner_name}</p>
                    <p><strong>Địa điểm:</strong> ${pet.location}</p>
                    <p><strong>Trạng thái:</strong> <span class="status-badge ${pet.status}">${getStatusText(pet.status)}</span></p>
                </div>
                <div class="pet-admin-actions">
                    <button class="action-btn view" onclick="viewPet(${pet.id})" title="Xem chi tiết">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="action-btn edit" onclick="approvePet(${pet.id})" title="Duyệt">
                        <i class="fas fa-check"></i>
                    </button>
                    <button class="action-btn delete" onclick="rejectPet(${pet.id})" title="Từ chối">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
        `;
        container.appendChild(petCard);
    });
}

// Filter pets
function filterPets() {
    const search = document.getElementById('pet-search').value.toLowerCase();
    const typeFilter = document.getElementById('pet-type-filter').value;
    const statusFilter = document.getElementById('pet-status-filter').value;
    
    let filteredPets = petsData;
    
    if (search) {
        filteredPets = filteredPets.filter(pet => 
            pet.name.toLowerCase().includes(search) ||
            pet.breed.toLowerCase().includes(search) ||
            pet.owner_name.toLowerCase().includes(search)
        );
    }
    
    if (typeFilter) {
        filteredPets = filteredPets.filter(pet => pet.type === typeFilter);
    }
    
    if (statusFilter) {
        filteredPets = filteredPets.filter(pet => pet.status === statusFilter);
    }
    
    renderFilteredPets(filteredPets);
}

// Render filtered pets
function renderFilteredPets(pets) {
    const container = document.getElementById('pets-grid');
    container.innerHTML = '';
    
    if (!pets.length) {
        container.innerHTML = '<p class="text-center">Không tìm thấy kết quả</p>';
        return;
    }
    
    pets.forEach(pet => {
        const petCard = document.createElement('div');
        petCard.className = 'pet-admin-card';
        petCard.innerHTML = `
            <img src="${pet.image_url || '/images/default-pet.png'}" 
                 alt="${pet.name}" class="pet-admin-image">
            <div class="pet-admin-content">
                <div class="pet-admin-header">
                    <h4 class="pet-admin-title">${pet.name}</h4>
                    <span class="pet-admin-price">${formatCurrency(pet.price)}</span>
                </div>
                <div class="pet-admin-info">
                    <p><strong>Loại:</strong> ${getTypeText(pet.type)}</p>
                    <p><strong>Giống:</strong> ${pet.breed}</p>
                    <p><strong>Tuổi:</strong> ${pet.age} tháng</p>
                    <p><strong>Chủ:</strong> ${pet.owner_name}</p>
                    <p><strong>Địa điểm:</strong> ${pet.location}</p>
                    <p><strong>Trạng thái:</strong> <span class="status-badge ${pet.status}">${getStatusText(pet.status)}</span></p>
                </div>
                <div class="pet-admin-actions">
                    <button class="action-btn view" onclick="viewPet(${pet.id})" title="Xem chi tiết">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="action-btn edit" onclick="approvePet(${pet.id})" title="Duyệt">
                        <i class="fas fa-check"></i>
                    </button>
                    <button class="action-btn delete" onclick="rejectPet(${pet.id})" title="Từ chối">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
        `;
        container.appendChild(petCard);
    });
}

// Load transactions data
async function loadTransactionsData() {
    showLoading();
    
    try {
        const token = localStorage.getItem('authToken');
        const response = await fetch(`${API_BASE}/api/admin/transactions`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            const data = await response.json();
            transactionsData = data.transactions || [];
            renderTransactionsTable();
        } else {
            throw new Error('Failed to load transactions');
        }
    } catch (error) {
        console.error('Error loading transactions:', error);
        showToast('Lỗi tải danh sách giao dịch', 'error');
    } finally {
        hideLoading();
    }
}

// Render transactions table
function renderTransactionsTable() {
    const tbody = document.getElementById('transactions-table-body');
    tbody.innerHTML = '';
    
    if (!transactionsData.length) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center">Không có dữ liệu</td></tr>';
        return;
    }
    
    transactionsData.forEach(transaction => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${transaction.id}</td>
            <td>${transaction.user_name}</td>
            <td>${getTransactionTypeText(transaction.type)}</td>
            <td>${formatCurrency(transaction.amount)}</td>
            <td><span class="status-badge ${transaction.status}">${getStatusText(transaction.status)}</span></td>
            <td>${transaction.method || 'N/A'}</td>
            <td>${formatDateTime(transaction.created_at)}</td>
            <td>
                <div class="action-buttons">
                    <button class="action-btn view" onclick="viewTransaction(${transaction.id})" title="Xem chi tiết">
                        <i class="fas fa-eye"></i>
                    </button>
                    ${transaction.status === 'pending' ? `
                        <button class="action-btn edit" onclick="approveTransaction(${transaction.id})" title="Duyệt">
                            <i class="fas fa-check"></i>
                        </button>
                        <button class="action-btn delete" onclick="rejectTransaction(${transaction.id})" title="Từ chối">
                            <i class="fas fa-times"></i>
                        </button>
                    ` : ''}
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Filter transactions
function filterTransactions() {
    const search = document.getElementById('transaction-search').value.toLowerCase();
    const typeFilter = document.getElementById('transaction-type-filter').value;
    const statusFilter = document.getElementById('transaction-status-filter').value;
    const dateFrom = document.getElementById('transaction-date-from').value;
    const dateTo = document.getElementById('transaction-date-to').value;
    
    let filteredTransactions = transactionsData;
    
    if (search) {
        filteredTransactions = filteredTransactions.filter(transaction => 
            transaction.user_name.toLowerCase().includes(search) ||
            transaction.id.toString().includes(search)
        );
    }
    
    if (typeFilter) {
        filteredTransactions = filteredTransactions.filter(transaction => transaction.type === typeFilter);
    }
    
    if (statusFilter) {
        filteredTransactions = filteredTransactions.filter(transaction => transaction.status === statusFilter);
    }
    
    if (dateFrom) {
        filteredTransactions = filteredTransactions.filter(transaction => 
            new Date(transaction.created_at) >= new Date(dateFrom)
        );
    }
    
    if (dateTo) {
        filteredTransactions = filteredTransactions.filter(transaction => 
            new Date(transaction.created_at) <= new Date(dateTo)
        );
    }
    
    renderFilteredTransactions(filteredTransactions);
}

// Render filtered transactions
function renderFilteredTransactions(transactions) {
    const tbody = document.getElementById('transactions-table-body');
    tbody.innerHTML = '';
    
    if (!transactions.length) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center">Không tìm thấy kết quả</td></tr>';
        return;
    }
    
    transactions.forEach(transaction => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${transaction.id}</td>
            <td>${transaction.user_name}</td>
            <td>${getTransactionTypeText(transaction.type)}</td>
            <td>${formatCurrency(transaction.amount)}</td>
            <td><span class="status-badge ${transaction.status}">${getStatusText(transaction.status)}</span></td>
            <td>${transaction.method || 'N/A'}</td>
            <td>${formatDateTime(transaction.created_at)}</td>
            <td>
                <div class="action-buttons">
                    <button class="action-btn view" onclick="viewTransaction(${transaction.id})" title="Xem chi tiết">
                        <i class="fas fa-eye"></i>
                    </button>
                    ${transaction.status === 'pending' ? `
                        <button class="action-btn edit" onclick="approveTransaction(${transaction.id})" title="Duyệt">
                            <i class="fas fa-check"></i>
                        </button>
                        <button class="action-btn delete" onclick="rejectTransaction(${transaction.id})" title="Từ chối">
                            <i class="fas fa-times"></i>
                        </button>
                    ` : ''}
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Load reports data
function loadReportsData() {
    // Implementation for loading and rendering charts
    showToast('Chức năng báo cáo đang được phát triển', 'info');
}

// Load settings data
function loadSettingsData() {
    // Load current settings
    showToast('Trang cài đặt đã sẵn sàng', 'success');
}

// User management functions
function showAddUserModal() {
    document.getElementById('add-user-modal').style.display = 'block';
}

function editUser(userId) {
    const user = usersData.find(u => u.id === userId);
    if (!user) return;
    
    const form = document.getElementById('edit-user-form');
    form.userId.value = user.id;
    form.fullName.value = user.full_name || '';
    form.email.value = user.email;
    form.phone.value = user.phone || '';
    form.role.value = user.role;
    form.status.value = user.status || 'active';
    
    document.getElementById('edit-user-modal').style.display = 'block';
}

function deleteUser(userId) {
    if (!confirm('Bạn có chắc chắn muốn xóa người dùng này?')) return;
    
    const token = localStorage.getItem('authToken');
    
    fetch(`${API_BASE}/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(response => {
        if (response.ok) {
            showToast('Xóa người dùng thành công', 'success');
            loadUsersData();
        } else {
            throw new Error('Failed to delete user');
        }
    })
    .catch(error => {
        console.error('Error deleting user:', error);
        showToast('Lỗi xóa người dùng', 'error');
    });
}

function viewUser(userId) {
    const user = usersData.find(u => u.id === userId);
    if (!user) return;
    
    // Implementation for viewing user details
    showToast(`Xem chi tiết người dùng: ${user.full_name}`, 'info');
}

// Pet management functions
function viewPet(petId) {
    const pet = petsData.find(p => p.id === petId);
    if (!pet) return;
    
    // Implementation for viewing pet details
    document.getElementById('pet-detail-content').innerHTML = `
        <div class="pet-detail-grid">
            <div class="pet-detail-images">
                <img src="${pet.image_url || '/images/default-pet.png'}" alt="${pet.name}">
            </div>
            <div class="pet-detail-info">
                <h3>${pet.name}</h3>
                <p><strong>Loại:</strong> ${getTypeText(pet.type)}</p>
                <p><strong>Giống:</strong> ${pet.breed}</p>
                <p><strong>Tuổi:</strong> ${pet.age} tháng</p>
                <p><strong>Giới tính:</strong> ${pet.gender}</p>
                <p><strong>Giá:</strong> ${formatCurrency(pet.price)}</p>
                <p><strong>Chủ sở hữu:</strong> ${pet.owner_name}</p>
                <p><strong>Địa điểm:</strong> ${pet.location}</p>
                <p><strong>Mô tả:</strong> ${pet.description}</p>
                <p><strong>Tiêm vaccine:</strong> ${pet.vaccinated ? 'Có' : 'Không'}</p>
                <p><strong>Triệt sản:</strong> ${pet.neutered ? 'Có' : 'Không'}</p>
                <p><strong>Trạng thái:</strong> <span class="status-badge ${pet.status}">${getStatusText(pet.status)}</span></p>
                <p><strong>Ngày tạo:</strong> ${formatDateTime(pet.created_at)}</p>
            </div>
        </div>
    `;
    
    document.getElementById('pet-detail-modal').style.display = 'block';
}

function approvePet(petId) {
    if (!confirm('Bạn có chắc chắn muốn duyệt thú cưng này?')) return;
    
    const token = localStorage.getItem('authToken');
    
    fetch(`${API_BASE}/api/admin/pets/${petId}/approve`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(response => {
        if (response.ok) {
            showToast('Duyệt thú cưng thành công', 'success');
            loadPetsData();
        } else {
            throw new Error('Failed to approve pet');
        }
    })
    .catch(error => {
        console.error('Error approving pet:', error);
        showToast('Lỗi duyệt thú cưng', 'error');
    });
}

function rejectPet(petId) {
    if (!confirm('Bạn có chắc chắn muốn từ chối thú cưng này?')) return;
    
    const token = localStorage.getItem('authToken');
    
    fetch(`${API_BASE}/api/admin/pets/${petId}/reject`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(response => {
        if (response.ok) {
            showToast('Từ chối thú cưng thành công', 'success');
            loadPetsData();
        } else {
            throw new Error('Failed to reject pet');
        }
    })
    .catch(error => {
        console.error('Error rejecting pet:', error);
        showToast('Lỗi từ chối thú cưng', 'error');
    });
}

// Transaction management functions
function viewTransaction(transactionId) {
    const transaction = transactionsData.find(t => t.id === transactionId);
    if (!transaction) return;
    
    document.getElementById('transaction-detail-content').innerHTML = `
        <div class="transaction-detail">
            <h4>Chi tiết giao dịch #${transaction.id}</h4>
            <p><strong>Người dùng:</strong> ${transaction.user_name}</p>
            <p><strong>Loại:</strong> ${getTransactionTypeText(transaction.type)}</p>
            <p><strong>Số tiền:</strong> ${formatCurrency(transaction.amount)}</p>
            <p><strong>Phương thức:</strong> ${transaction.method || 'N/A'}</p>
            <p><strong>Trạng thái:</strong> <span class="status-badge ${transaction.status}">${getStatusText(transaction.status)}</span></p>
            <p><strong>Mô tả:</strong> ${transaction.description || 'N/A'}</p>
            <p><strong>Ngày tạo:</strong> ${formatDateTime(transaction.created_at)}</p>
            ${transaction.updated_at ? `<p><strong>Ngày cập nhật:</strong> ${formatDateTime(transaction.updated_at)}</p>` : ''}
        </div>
    `;
    
    document.getElementById('transaction-detail-modal').style.display = 'block';
}

function approveTransaction(transactionId) {
    if (!confirm('Bạn có chắc chắn muốn duyệt giao dịch này?')) return;
    
    const token = localStorage.getItem('authToken');
    
    fetch(`${API_BASE}/api/admin/transactions/${transactionId}/approve`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(response => {
        if (response.ok) {
            showToast('Duyệt giao dịch thành công', 'success');
            loadTransactionsData();
        } else {
            throw new Error('Failed to approve transaction');
        }
    })
    .catch(error => {
        console.error('Error approving transaction:', error);
        showToast('Lỗi duyệt giao dịch', 'error');
    });
}

function rejectTransaction(transactionId) {
    if (!confirm('Bạn có chắc chắn muốn từ chối giao dịch này?')) return;
    
    const token = localStorage.getItem('authToken');
    
    fetch(`${API_BASE}/api/admin/transactions/${transactionId}/reject`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(response => {
        if (response.ok) {
            showToast('Từ chối giao dịch thành công', 'success');
            loadTransactionsData();
        } else {
            throw new Error('Failed to reject transaction');
        }
    })
    .catch(error => {
        console.error('Error rejecting transaction:', error);
        showToast('Lỗi từ chối giao dịch', 'error');
    });
}

// Form handlers
function handleAddUser(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const userData = {
        fullName: formData.get('fullName'),
        email: formData.get('email'),
        phone: formData.get('phone'),
        role: formData.get('role'),
        password: formData.get('password')
    };
    
    const token = localStorage.getItem('authToken');
    
    fetch(`${API_BASE}/api/admin/users`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(userData)
    })
    .then(response => {
        if (response.ok) {
            showToast('Thêm người dùng thành công', 'success');
            closeModal('add-user-modal');
            loadUsersData();
            e.target.reset();
        } else {
            throw new Error('Failed to add user');
        }
    })
    .catch(error => {
        console.error('Error adding user:', error);
        showToast('Lỗi thêm người dùng', 'error');
    });
}

function handleEditUser(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const userId = formData.get('userId');
    const userData = {
        fullName: formData.get('fullName'),
        email: formData.get('email'),
        phone: formData.get('phone'),
        role: formData.get('role'),
        status: formData.get('status')
    };
    
    const token = localStorage.getItem('authToken');
    
    fetch(`${API_BASE}/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(userData)
    })
    .then(response => {
        if (response.ok) {
            showToast('Cập nhật người dùng thành công', 'success');
            closeModal('edit-user-modal');
            loadUsersData();
        } else {
            throw new Error('Failed to update user');
        }
    })
    .catch(error => {
        console.error('Error updating user:', error);
        showToast('Lỗi cập nhật người dùng', 'error');
    });
}

// Settings functions
function saveSettings() {
    const settings = {
        siteName: document.getElementById('site-name').value,
        contactEmail: document.getElementById('contact-email').value,
        contactPhone: document.getElementById('contact-phone').value,
        sessionTimeout: document.getElementById('session-timeout').value,
        maxLoginAttempts: document.getElementById('max-login-attempts').value,
        require2FA: document.getElementById('require-2fa').checked,
        transactionFee: document.getElementById('transaction-fee').value,
        minDeposit: document.getElementById('min-deposit').value,
        minWithdraw: document.getElementById('min-withdraw').value,
        adminEmail: document.getElementById('admin-email').value,
        smsNotifications: document.getElementById('sms-notifications').checked,
        autoEmail: document.getElementById('auto-email').checked
    };
    
    const token = localStorage.getItem('authToken');
    
    fetch(`${API_BASE}/api/admin/settings`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(settings)
    })
    .then(response => {
        if (response.ok) {
            showToast('Lưu cài đặt thành công', 'success');
        } else {
            throw new Error('Failed to save settings');
        }
    })
    .catch(error => {
        console.error('Error saving settings:', error);
        showToast('Lỗi lưu cài đặt', 'error');
    });
}

function resetSettings() {
    if (!confirm('Bạn có chắc chắn muốn khôi phục cài đặt mặc định?')) return;
    
    // Reset to default values
    document.getElementById('site-name').value = 'HiPet';
    document.getElementById('contact-email').value = 'contact@hipet.com';
    document.getElementById('contact-phone').value = '1900-xxxx';
    document.getElementById('session-timeout').value = '60';
    document.getElementById('max-login-attempts').value = '5';
    document.getElementById('require-2fa').checked = false;
    document.getElementById('transaction-fee').value = '2';
    document.getElementById('min-deposit').value = '50000';
    document.getElementById('min-withdraw').value = '100000';
    document.getElementById('admin-email').value = 'admin@hipet.com';
    document.getElementById('sms-notifications').checked = false;
    document.getElementById('auto-email').checked = true;
    
    showToast('Đã khôi phục cài đặt mặc định', 'info');
}

// Export functions
function exportPetsData() {
    const csvContent = "data:text/csv;charset=utf-8," 
        + "ID,Tên,Loại,Giống,Tuổi,Giá,Chủ sở hữu,Địa điểm,Trạng thái,Ngày tạo\n"
        + petsData.map(pet => 
            `${pet.id},"${pet.name}","${getTypeText(pet.type)}","${pet.breed}",${pet.age},"${formatCurrency(pet.price)}","${pet.owner_name}","${pet.location}","${getStatusText(pet.status)}","${formatDateTime(pet.created_at)}"`
        ).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `pets_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast('Xuất dữ liệu thú cưng thành công', 'success');
}

function exportTransactionsData() {
    const csvContent = "data:text/csv;charset=utf-8," 
        + "ID,Người dùng,Loại,Số tiền,Trạng thái,Phương thức,Ngày tạo\n"
        + transactionsData.map(transaction => 
            `${transaction.id},"${transaction.user_name}","${getTransactionTypeText(transaction.type)}","${formatCurrency(transaction.amount)}","${getStatusText(transaction.status)}","${transaction.method || 'N/A'}","${formatDateTime(transaction.created_at)}"`
        ).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `transactions_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast('Xuất dữ liệu giao dịch thành công', 'success');
}

function generateReport() {
    showToast('Đang tạo báo cáo...', 'info');
    // Implementation for generating reports
}

// Utility functions
function logout() {
    if (confirm('Bạn có chắc chắn muốn đăng xuất?')) {
        // Use the new admin logout function
        if (typeof adminLogout === 'function') {
            adminLogout();
        } else {
            // Fallback to manual cleanup
            clearAdminAuth();
            window.location.reload();
        }
    }
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

function showLoading() {
    document.getElementById('loading-overlay').style.display = 'block';
}

function hideLoading() {
    document.getElementById('loading-overlay').style.display = 'none';
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <div class="toast-header">
            <span>Thông báo</span>
            <button class="toast-close" onclick="this.parentElement.parentElement.remove()">&times;</button>
        </div>
        <div class="toast-body">${message}</div>
    `;
    
    document.getElementById('toast-container').appendChild(toast);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (toast.parentElement) {
            toast.remove();
        }
    }, 5000);
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(amount);
}

function formatDateTime(dateString) {
    return new Date(dateString).toLocaleString('vi-VN');
}

function getActivityIcon(type) {
    const icons = {
        user: 'fa-user',
        pet: 'fa-paw',
        transaction: 'fa-credit-card',
        login: 'fa-sign-in-alt',
        register: 'fa-user-plus'
    };
    return icons[type] || 'fa-info';
}

function getRoleText(role) {
    const roles = {
        admin: 'Admin',
        support: 'Support',
        user: 'User'
    };
    return roles[role] || role;
}

function getStatusText(status) {
    const statuses = {
        active: 'Hoạt động',
        blocked: 'Bị khóa',
        pending: 'Chờ xử lý',
        completed: 'Hoàn thành',
        failed: 'Thất bại',
        cancelled: 'Đã hủy',
        approved: 'Đã duyệt',
        rejected: 'Bị từ chối'
    };
    return statuses[status] || status;
}

function getTypeText(type) {
    const types = {
        dog: 'Chó',
        cat: 'Mèo',
        bird: 'Chim',
        fish: 'Cá',
        rabbit: 'Thỏ',
        hamster: 'Chuột hamster',
        other: 'Khác'
    };
    return types[type] || type;
}

function getTransactionTypeText(type) {
    const types = {
        deposit: 'Nạp tiền',
        withdraw: 'Rút tiền',
        purchase: 'Mua hàng',
        refund: 'Hoàn tiền',
        fee: 'Phí giao dịch'
    };
    return types[type] || type;
}

// Global function to initialize admin dashboard after login
window.initializeAdminDashboard = function() {
    initializeAdmin();
};
