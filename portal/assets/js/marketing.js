// HiPet Marketing Dashboard JavaScript

// API Configuration
const API_BASE = 'https://api.zewk.fun';

// =============================================================================
// MARKETING LOGIN FUNCTIONALITY (Merged from marketing-login.js)
// =============================================================================

document.addEventListener('DOMContentLoaded', function() {
    const loginScreen = document.getElementById('marketing-login-screen');
    const dashboard = document.getElementById('marketing-dashboard');
    const loginForm = document.getElementById('marketing-login-form');

    checkMarketingAuth();

    if (loginForm) {
        loginForm.addEventListener('submit', handleMarketingLogin);
    }

    function checkMarketingAuth() {
        const marketingToken = localStorage.getItem('marketing_token') || sessionStorage.getItem('marketing_token');
        const marketingUser = localStorage.getItem('marketing_user') || sessionStorage.getItem('marketing_user');
        
        if (marketingToken && marketingUser) {
            try {
                const userData = JSON.parse(marketingUser);
                if (userData.role === 'marketing') {
                    showDashboard();
                    return true;
                }
            } catch (error) {
                clearMarketingAuth();
            }
        }
        
        showLoginScreen();
        return false;
    }

    async function handleMarketingLogin(e) {
        e.preventDefault();
        
        const email = document.getElementById('marketing-email').value;
        const password = document.getElementById('marketing-password').value;
        const remember = document.getElementById('marketing-remember').checked;
        
        const submitButton = loginForm.querySelector('.login-btn');
        const originalText = submitButton.innerHTML;
        
        submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang đăng nhập...';
        submitButton.disabled = true;

        try {
            const response = await fetch(`${API_BASE}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, role: 'marketing' }),
            });

            const result = await response.json();

            if (result.token && result.user && result.user.role === 'marketing') {
                if (remember) {
                    localStorage.setItem('marketing_token', result.token);
                    localStorage.setItem('marketing_user', JSON.stringify(result.user));
                } else {
                    sessionStorage.setItem('marketing_token', result.token);
                    sessionStorage.setItem('marketing_user', JSON.stringify(result.user));
                }

                showMarketingMessage('Đăng nhập thành công!', 'success');
                setTimeout(() => showDashboard(), 1000);
            } else {
                throw new Error(result.message || 'Đăng nhập thất bại');
            }
        } catch (error) {
            showMarketingMessage(error.message || 'Có lỗi xảy ra khi đăng nhập', 'error');
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

    function clearMarketingAuth() {
        localStorage.removeItem('marketing_token');
        localStorage.removeItem('marketing_user');
        sessionStorage.removeItem('marketing_token');
        sessionStorage.removeItem('marketing_user');
    }

    function showMarketingMessage(message, type) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `marketing-message ${type}`;
        messageDiv.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i><span>${message}</span>`;
        
        messageDiv.style.cssText = `
            position: fixed; top: 20px; right: 20px; padding: 16px 20px; border-radius: 8px;
            color: white; font-weight: 500; z-index: 10000; display: flex; align-items: center;
            gap: 12px; transform: translateX(400px); transition: transform 0.3s ease;
            background: ${type === 'success' ? '#27ae60' : '#e74c3c'};
        `;

        document.body.appendChild(messageDiv);
        setTimeout(() => messageDiv.style.transform = 'translateX(0)', 100);
        setTimeout(() => messageDiv.remove(), 4000);
    }

    window.marketingLogout = function() {
        clearMarketingAuth();
        showLoginScreen();
        showMarketingMessage('Đã đăng xuất thành công', 'success');
    };
});

function toggleMarketingPassword(inputId) {
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

// =============================================================================
// MARKETING DASHBOARD FUNCTIONALITY
// =============================================================================

class MarketingDashboard {
    constructor() {
        this.currentUser = null;
        this.campaigns = [];
        this.advertisers = [];
        this.adSpaces = [];
        this.charts = {};
        this.init();
    }

    // Helper function to get auth token
    getAuthToken() {
        return localStorage.getItem('marketing_token') || sessionStorage.getItem('marketing_token');
    }

    // Helper function to get auth headers
    getAuthHeaders() {
        const token = this.getAuthToken();
        return {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };
    }

    async init() {
        // Only initialize dashboard functions if user is authenticated
        if (this.checkAuth()) {
            this.bindEvents();
            this.loadDashboardData();
            this.initializeCharts();
        }
    }

    checkAuth() {
        // Check both localStorage and sessionStorage for marketing tokens
        const token = localStorage.getItem('marketing_token') || sessionStorage.getItem('marketing_token');
        const marketingUser = localStorage.getItem('marketing_user') || sessionStorage.getItem('marketing_user');

        if (!token || !marketingUser) {
            // Don't redirect - let the login screen handle this
            return false;
        }

        try {
            const userData = JSON.parse(marketingUser);
            if (userData.role !== 'marketing') {
                // Clear invalid auth data
                this.clearMarketingAuth();
                return false;
            }

            this.currentUser = userData;
            if (this.currentUser.name) {
                const userNameElement = document.querySelector('.nav-user .user-name');
                if (userNameElement) {
                    userNameElement.textContent = this.currentUser.name;
                }
            }
            return true;
        } catch (error) {
            console.error('Error parsing marketing user data:', error);
            this.clearMarketingAuth();
            return false;
        }
    }

    clearMarketingAuth() {
        localStorage.removeItem('marketing_token');
        localStorage.removeItem('marketing_user');
        sessionStorage.removeItem('marketing_token');
        sessionStorage.removeItem('marketing_user');
    }

    bindEvents() {
        // Navigation events
        document.querySelectorAll('.menu-item').forEach(item => {
            item.addEventListener('click', (e) => this.handleNavigation(e));
        });

        // Logout
        document.querySelector('.logout-btn').addEventListener('click', () => this.logout());

        // Date range change
        document.getElementById('date-range').addEventListener('change', (e) => this.updateDateRange(e.target.value));

        // Refresh dashboard
        const refreshBtn = document.querySelector('[onclick="refreshDashboard()"]');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.refreshDashboard());
        }

        // Campaign filters
        document.getElementById('campaign-search').addEventListener('input', (e) => this.filterCampaigns(e.target.value));
        document.getElementById('campaign-status-filter').addEventListener('change', (e) => this.filterCampaignsByStatus(e.target.value));
        document.getElementById('campaign-type-filter').addEventListener('change', (e) => this.filterCampaignsByType(e.target.value));

        // New campaign modal
        const newCampaignBtn = document.querySelector('[onclick="openNewCampaignModal()"]');
        if (newCampaignBtn) {
            newCampaignBtn.addEventListener('click', () => this.openNewCampaignModal());
        }

        // Modal close events
        document.querySelectorAll('.close').forEach(closeBtn => {
            closeBtn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                if (modal) this.closeModal(modal.id);
            });
        });

        // Campaign form
        document.getElementById('new-campaign-form').addEventListener('submit', (e) => this.createCampaign(e));

        // Campaign type change
        document.getElementById('campaign-type').addEventListener('change', (e) => this.updateAdPositions(e.target.value));

        // Budget calculation
        document.getElementById('daily-budget').addEventListener('input', () => this.calculateTotalBudget());
        document.getElementById('start-date').addEventListener('change', () => this.calculateTotalBudget());
        document.getElementById('end-date').addEventListener('change', () => this.calculateTotalBudget());

        // Chart buttons
        document.querySelectorAll('.chart-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchChart(e.target.dataset.chart));
        });

        // Analytics period change
        document.getElementById('analytics-period').addEventListener('change', (e) => this.updateAnalyticsPeriod(e.target.value));

        // Settings save
        const saveSettingsBtn = document.querySelector('[onclick="saveSettings()"]');
        if (saveSettingsBtn) {
            saveSettingsBtn.addEventListener('click', () => this.saveSettings());
        }

        // Modal outside click
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.closeModal(e.target.id);
            }
        });
    }

    handleNavigation(e) {
        e.preventDefault();
        const targetSection = e.currentTarget.dataset.section;
        
        // Update active menu item
        document.querySelectorAll('.menu-item').forEach(item => item.classList.remove('active'));
        e.currentTarget.classList.add('active');

        // Show target section
        document.querySelectorAll('.content-section').forEach(section => section.classList.remove('active'));
        document.getElementById(targetSection).classList.add('active');

        // Load section-specific data
        switch(targetSection) {
            case 'dashboard':
                this.loadDashboardData();
                break;
            case 'campaigns':
                this.loadCampaigns();
                break;
            case 'ad-spaces':
                this.loadAdSpaces();
                break;
            case 'advertisers':
                this.loadAdvertisers();
                break;
            case 'analytics':
                this.loadAnalytics();
                break;
            case 'billing':
                this.loadBilling();
                break;
            case 'settings':
                this.loadSettings();
                break;
        }
    }

    async loadDashboardData() {
        try {
            this.showLoading();
            const response = await fetch('/api/marketing/dashboard', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
            });
            
            if (response.ok) {
                const data = await response.json();
                this.updateDashboardStats(data.stats);
                this.renderTopCampaigns(data.topCampaigns);
                this.renderRecentActivity(data.recentActivity);
                this.updateRevenueChart(data.chartData);
            }
        } catch (error) {
            console.error('Error loading dashboard:', error);
            this.showToast('Error loading dashboard data', 'error');
        } finally {
            this.hideLoading();
        }
    }

    updateDashboardStats(stats) {
        document.getElementById('total-revenue').textContent = this.formatCurrency(stats.totalRevenue);
        document.getElementById('active-campaigns').textContent = stats.activeCampaigns;
        document.getElementById('total-impressions').textContent = this.formatNumber(stats.totalImpressions);
        document.getElementById('total-clicks').textContent = this.formatNumber(stats.totalClicks);

        // Update badge
        document.getElementById('active-campaigns-count').textContent = stats.activeCampaigns;

        // Update change indicators
        document.getElementById('revenue-change').textContent = `+${stats.revenueChange}%`;
        document.getElementById('campaigns-change').textContent = `${stats.campaignsChange}`;
        document.getElementById('impressions-change').textContent = `+${stats.impressionsChange}%`;
        document.getElementById('clicks-change').textContent = `+${stats.clicksChange}%`;
    }

    renderTopCampaigns(campaigns) {
        const container = document.getElementById('top-campaigns');
        container.innerHTML = campaigns.map(campaign => `
            <div class="campaign-item">
                <div class="campaign-info">
                    <div class="campaign-name">${campaign.name}</div>
                    <div class="campaign-stats">${campaign.impressions} impressions • ${campaign.clicks} clicks</div>
                </div>
                <div class="campaign-performance">
                    <div class="performance-value">${campaign.ctr}%</div>
                    <div class="performance-label">CTR</div>
                </div>
            </div>
        `).join('');
    }

    renderRecentActivity(activities) {
        const container = document.getElementById('recent-activity');
        container.innerHTML = activities.map(activity => `
            <div class="activity-item">
                <div class="activity-icon">
                    <i class="fas ${this.getActivityIcon(activity.type)}"></i>
                </div>
                <div class="activity-content">
                    <div class="activity-title">${activity.title}</div>
                    <div class="activity-description">${activity.description}</div>
                </div>
                <div class="activity-time">${this.formatTime(activity.timestamp)}</div>
            </div>
        `).join('');
    }

    getActivityIcon(type) {
        const icons = {
            'campaign_created': 'fa-plus',
            'campaign_paused': 'fa-pause',
            'campaign_resumed': 'fa-play',
            'payment_received': 'fa-credit-card',
            'advertiser_registered': 'fa-user-plus'
        };
        return icons[type] || 'fa-info';
    }

    initializeCharts() {
        // Revenue Chart
        const revenueCtx = document.getElementById('revenue-chart').getContext('2d');
        this.charts.revenue = new Chart(revenueCtx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Doanh thu',
                    data: [],
                    borderColor: '#ff6b35',
                    backgroundColor: 'rgba(255, 107, 53, 0.1)',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return new Intl.NumberFormat('vi-VN', {
                                    style: 'currency',
                                    currency: 'VND'
                                }).format(value);
                            }
                        }
                    }
                }
            }
        });

        // Performance Chart
        const performanceCtx = document.getElementById('performance-chart').getContext('2d');
        this.charts.performance = new Chart(performanceCtx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    {
                        label: 'Doanh thu',
                        data: [],
                        borderColor: '#ff6b35',
                        backgroundColor: 'rgba(255, 107, 53, 0.1)',
                        yAxisID: 'y'
                    },
                    {
                        label: 'Impressions',
                        data: [],
                        borderColor: '#4ecdc4',
                        backgroundColor: 'rgba(78, 205, 196, 0.1)',
                        yAxisID: 'y1'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        grid: {
                            drawOnChartArea: false,
                        },
                    }
                }
            }
        });

        // Ad Type Chart
        const adTypeCtx = document.getElementById('ad-type-chart').getContext('2d');
        this.charts.adType = new Chart(adTypeCtx, {
            type: 'doughnut',
            data: {
                labels: ['Banner', 'Sidebar', 'Floating', 'Sponsored'],
                datasets: [{
                    data: [30, 25, 20, 25],
                    backgroundColor: ['#ff6b35', '#4ecdc4', '#45b7d1', '#f39c12']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        });

        // Position Performance Chart
        const positionCtx = document.getElementById('position-performance-chart').getContext('2d');
        this.charts.position = new Chart(positionCtx, {
            type: 'bar',
            data: {
                labels: ['Top Banner', 'Sidebar', 'Floating', 'Bottom Banner'],
                datasets: [{
                    label: 'CTR (%)',
                    data: [2.5, 1.8, 3.2, 1.5],
                    backgroundColor: '#ff6b35'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return value + '%';
                            }
                        }
                    }
                }
            }
        });
    }

    updateRevenueChart(data) {
        if (this.charts.revenue) {
            this.charts.revenue.data.labels = data.labels;
            this.charts.revenue.data.datasets[0].data = data.revenue;
            this.charts.revenue.update();
        }
    }

    switchChart(chartType) {
        // Update active button
        document.querySelectorAll('.chart-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`[data-chart="${chartType}"]`).classList.add('active');

        // Update chart data
        // Implementation depends on chart type
    }

    async loadCampaigns() {
        try {
            this.showLoading();
            const response = await fetch('/api/marketing/campaigns', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
            });
            
            if (response.ok) {
                this.campaigns = await response.json();
                this.renderCampaigns(this.campaigns);
            }
        } catch (error) {
            console.error('Error loading campaigns:', error);
            this.showToast('Error loading campaigns', 'error');
        } finally {
            this.hideLoading();
        }
    }

    renderCampaigns(campaigns) {
        const tbody = document.querySelector('#campaigns-table tbody');
        tbody.innerHTML = campaigns.map(campaign => `
            <tr>
                <td>
                    <div>
                        <strong>${campaign.name}</strong>
                        <div style="font-size: 0.8rem; color: #666;">#${campaign.id}</div>
                    </div>
                </td>
                <td>${campaign.advertiserName}</td>
                <td><span class="campaign-type-badge ${campaign.type}">${this.formatCampaignType(campaign.type)}</span></td>
                <td>${this.formatCurrency(campaign.budget)}</td>
                <td>${this.formatNumber(campaign.impressions)}</td>
                <td>${this.formatNumber(campaign.clicks)}</td>
                <td>${campaign.ctr}%</td>
                <td><span class="status-badge ${campaign.status}">${this.formatStatus(campaign.status)}</span></td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn view" onclick="marketingDashboard.viewCampaign('${campaign.id}')" title="Xem">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="action-btn edit" onclick="marketingDashboard.editCampaign('${campaign.id}')" title="Chỉnh sửa">
                            <i class="fas fa-edit"></i>
                        </button>
                        ${campaign.status === 'active' ? 
                            `<button class="action-btn pause" onclick="marketingDashboard.pauseCampaign('${campaign.id}')" title="Tạm dừng">
                                <i class="fas fa-pause"></i>
                            </button>` :
                            `<button class="action-btn play" onclick="marketingDashboard.resumeCampaign('${campaign.id}')" title="Tiếp tục">
                                <i class="fas fa-play"></i>
                            </button>`
                        }
                        <button class="action-btn delete" onclick="marketingDashboard.deleteCampaign('${campaign.id}')" title="Xóa">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    filterCampaigns(searchTerm) {
        const filtered = this.campaigns.filter(campaign =>
            campaign.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            campaign.advertiserName.toLowerCase().includes(searchTerm.toLowerCase())
        );
        this.renderCampaigns(filtered);
    }

    filterCampaignsByStatus(status) {
        if (!status) {
            this.renderCampaigns(this.campaigns);
            return;
        }
        const filtered = this.campaigns.filter(campaign => campaign.status === status);
        this.renderCampaigns(filtered);
    }

    filterCampaignsByType(type) {
        if (!type) {
            this.renderCampaigns(this.campaigns);
            return;
        }
        const filtered = this.campaigns.filter(campaign => campaign.type === type);
        this.renderCampaigns(filtered);
    }

    openNewCampaignModal() {
        this.loadAdvertisersForSelect();
        document.getElementById('new-campaign-modal').style.display = 'block';
    }

    async loadAdvertisersForSelect() {
        try {
            const response = await fetch('/api/marketing/advertisers', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
            });
            
            if (response.ok) {
                const advertisers = await response.json();
                const select = document.getElementById('advertiser-select');
                select.innerHTML = '<option value="">Chọn nhà quảng cáo</option>' +
                    advertisers.map(adv => `<option value="${adv.id}">${adv.name}</option>`).join('');
            }
        } catch (error) {
            console.error('Error loading advertisers:', error);
        }
    }

    updateAdPositions(campaignType) {
        const positionSelect = document.getElementById('ad-position');
        const positions = {
            'banner': [
                { value: 'top-banner', text: 'Banner đầu trang' },
                { value: 'bottom-banner', text: 'Banner cuối trang' }
            ],
            'sidebar': [
                { value: 'pets-sidebar', text: 'Sidebar danh sách thú cưng' },
                { value: 'profile-sidebar', text: 'Sidebar trang cá nhân' }
            ],
            'floating': [
                { value: 'homepage-floating', text: 'Floating trang chủ' },
                { value: 'pets-floating', text: 'Floating trang thú cưng' }
            ],
            'sponsored': [
                { value: 'pets-list', text: 'Trong danh sách thú cưng' },
                { value: 'search-results', text: 'Kết quả tìm kiếm' }
            ]
        };

        positionSelect.innerHTML = '<option value="">Chọn vị trí</option>';
        if (positions[campaignType]) {
            positionSelect.innerHTML += positions[campaignType]
                .map(pos => `<option value="${pos.value}">${pos.text}</option>`)
                .join('');
        }
    }

    calculateTotalBudget() {
        const dailyBudget = parseFloat(document.getElementById('daily-budget').value) || 0;
        const startDate = new Date(document.getElementById('start-date').value);
        const endDate = new Date(document.getElementById('end-date').value);

        if (startDate && endDate && endDate > startDate) {
            const days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
            const totalBudget = dailyBudget * days;
            document.getElementById('total-budget').value = totalBudget;
        }
    }

    async createCampaign(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const campaignData = Object.fromEntries(formData);

        try {
            this.showLoading();
            const response = await fetch('/api/marketing/campaigns', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                },
                body: JSON.stringify(campaignData)
            });

            if (response.ok) {
                this.showToast('Campaign created successfully', 'success');
                this.closeModal('new-campaign-modal');
                this.loadCampaigns();
            } else {
                throw new Error('Failed to create campaign');
            }
        } catch (error) {
            console.error('Error creating campaign:', error);
            this.showToast('Error creating campaign', 'error');
        } finally {
            this.hideLoading();
        }
    }

    async viewCampaign(campaignId) {
        // Implementation for viewing campaign details
        console.log('Viewing campaign:', campaignId);
    }

    async editCampaign(campaignId) {
        // Implementation for editing campaign
        console.log('Editing campaign:', campaignId);
    }

    async pauseCampaign(campaignId) {
        if (!confirm('Bạn có chắc muốn tạm dừng chiến dịch này?')) return;

        try {
            const response = await fetch(`/api/marketing/campaigns/${campaignId}/pause`, {
                method: 'PATCH',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
            });

            if (response.ok) {
                this.showToast('Campaign paused successfully', 'success');
                this.loadCampaigns();
            }
        } catch (error) {
            console.error('Error pausing campaign:', error);
            this.showToast('Error pausing campaign', 'error');
        }
    }

    async resumeCampaign(campaignId) {
        try {
            const response = await fetch(`/api/marketing/campaigns/${campaignId}/resume`, {
                method: 'PATCH',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
            });

            if (response.ok) {
                this.showToast('Campaign resumed successfully', 'success');
                this.loadCampaigns();
            }
        } catch (error) {
            console.error('Error resuming campaign:', error);
            this.showToast('Error resuming campaign', 'error');
        }
    }

    async deleteCampaign(campaignId) {
        if (!confirm('Bạn có chắc muốn xóa chiến dịch này? Hành động này không thể hoàn tác.')) return;

        try {
            const response = await fetch(`/api/marketing/campaigns/${campaignId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
            });

            if (response.ok) {
                this.showToast('Campaign deleted successfully', 'success');
                this.loadCampaigns();
            }
        } catch (error) {
            console.error('Error deleting campaign:', error);
            this.showToast('Error deleting campaign', 'error');
        }
    }

    async loadAdSpaces() {
        // Load ad spaces data
        console.log('Loading ad spaces...');
    }

    async loadAdvertisers() {
        try {
            this.showLoading();
            const response = await fetch('/api/marketing/advertisers', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
            });
            
            if (response.ok) {
                this.advertisers = await response.json();
                this.renderAdvertisers(this.advertisers);
            }
        } catch (error) {
            console.error('Error loading advertisers:', error);
            this.showToast('Error loading advertisers', 'error');
        } finally {
            this.hideLoading();
        }
    }

    renderAdvertisers(advertisers) {
        const tbody = document.querySelector('#advertisers-table tbody');
        tbody.innerHTML = advertisers.map(advertiser => `
            <tr>
                <td>${advertiser.companyName}</td>
                <td>${advertiser.contactName}</td>
                <td>${advertiser.email}</td>
                <td>${advertiser.campaignsCount}</td>
                <td>${this.formatCurrency(advertiser.totalSpent)}</td>
                <td><span class="status-badge ${advertiser.status}">${this.formatStatus(advertiser.status)}</span></td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn view" onclick="marketingDashboard.viewAdvertiser('${advertiser.id}')">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="action-btn edit" onclick="marketingDashboard.editAdvertiser('${advertiser.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    async loadAnalytics() {
        console.log('Loading analytics...');
    }

    async loadBilling() {
        try {
            this.showLoading();
            const response = await fetch('/api/marketing/billing', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
            });
            
            if (response.ok) {
                const data = await response.json();
                this.updateBillingStats(data.stats);
                this.renderInvoices(data.invoices);
            }
        } catch (error) {
            console.error('Error loading billing:', error);
            this.showToast('Error loading billing data', 'error');
        } finally {
            this.hideLoading();
        }
    }

    updateBillingStats(stats) {
        document.getElementById('monthly-revenue').textContent = this.formatCurrency(stats.monthlyRevenue);
        document.getElementById('pending-payments').textContent = this.formatCurrency(stats.pendingPayments);
        document.getElementById('paid-amount').textContent = this.formatCurrency(stats.paidAmount);
    }

    renderInvoices(invoices) {
        const tbody = document.querySelector('#invoices-table tbody');
        tbody.innerHTML = invoices.map(invoice => `
            <tr>
                <td>#${invoice.number}</td>
                <td>${invoice.advertiserName}</td>
                <td>${this.formatCurrency(invoice.amount)}</td>
                <td>${this.formatDate(invoice.createdDate)}</td>
                <td>${this.formatDate(invoice.dueDate)}</td>
                <td><span class="status-badge ${invoice.status}">${this.formatStatus(invoice.status)}</span></td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn view" onclick="marketingDashboard.viewInvoice('${invoice.id}')">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="action-btn edit" onclick="marketingDashboard.downloadInvoice('${invoice.id}')">
                            <i class="fas fa-download"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    async loadSettings() {
        try {
            const response = await fetch('/api/marketing/settings', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
            });
            
            if (response.ok) {
                const settings = await response.json();
                this.populateSettings(settings);
            }
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    }

    populateSettings(settings) {
        // Populate form fields with current settings
        Object.keys(settings).forEach(key => {
            const element = document.querySelector(`[name="${key}"]`);
            if (element) {
                if (element.type === 'checkbox') {
                    element.checked = settings[key];
                } else {
                    element.value = settings[key];
                }
            }
        });
    }

    async saveSettings() {
        const pricingData = new FormData(document.getElementById('pricing-settings'));
        const displayData = new FormData(document.getElementById('display-settings'));
        const paymentData = new FormData(document.getElementById('payment-settings'));
        const notificationData = new FormData(document.getElementById('notification-settings'));

        const allSettings = {
            ...Object.fromEntries(pricingData),
            ...Object.fromEntries(displayData),
            ...Object.fromEntries(paymentData),
            ...Object.fromEntries(notificationData)
        };

        try {
            const response = await fetch('/api/marketing/settings', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                },
                body: JSON.stringify(allSettings)
            });

            if (response.ok) {
                this.showToast('Settings saved successfully', 'success');
            } else {
                throw new Error('Failed to save settings');
            }
        } catch (error) {
            console.error('Error saving settings:', error);
            this.showToast('Error saving settings', 'error');
        }
    }

    refreshDashboard() {
        this.loadDashboardData();
    }

    updateDateRange(range) {
        // Update dashboard data based on selected date range
        this.loadDashboardData();
    }

    updateAnalyticsPeriod(period) {
        // Update analytics based on selected period
        this.loadAnalytics();
    }

    // Utility functions
    formatCurrency(amount) {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND'
        }).format(amount);
    }

    formatNumber(number) {
        return new Intl.NumberFormat('vi-VN').format(number);
    }

    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('vi-VN');
    }

    formatTime(dateString) {
        return new Date(dateString).toLocaleString('vi-VN');
    }

    formatCampaignType(type) {
        const types = {
            'banner': 'Banner',
            'sidebar': 'Sidebar',
            'floating': 'Floating',
            'sponsored': 'Sponsored Post'
        };
        return types[type] || type;
    }

    formatStatus(status) {
        const statuses = {
            'active': 'Đang chạy',
            'paused': 'Tạm dừng',
            'completed': 'Hoàn thành',
            'draft': 'Bản nháp',
            'pending': 'Chờ thanh toán',
            'paid': 'Đã thanh toán'
        };
        return statuses[status] || status;
    }

    showLoading() {
        document.getElementById('loading-overlay').style.display = 'block';
    }

    hideLoading() {
        document.getElementById('loading-overlay').style.display = 'none';
    }

    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <div class="toast-header">
                <span>${type.charAt(0).toUpperCase() + type.slice(1)}</span>
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

    closeModal(modalId) {
        document.getElementById(modalId).style.display = 'none';
    }

    logout() {
        if (confirm('Bạn có chắc muốn đăng xuất?')) {
            // Use the new marketing logout function
            if (typeof marketingLogout === 'function') {
                marketingLogout();
            } else {
                // Fallback to manual cleanup
                this.clearMarketingAuth();
                window.location.reload();
            }
        }
    }
}

// Global function to initialize marketing dashboard after login
window.initializeMarketingDashboard = function() {
    if (window.marketingDashboard) {
        window.marketingDashboard.bindEvents();
        window.marketingDashboard.loadDashboardData();
        window.marketingDashboard.initializeCharts();
    }
};

// Initialize the dashboard when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.marketingDashboard = new MarketingDashboard();
});

// Global functions for onclick events
function refreshDashboard() {
    window.marketingDashboard.refreshDashboard();
}

function openNewCampaignModal() {
    window.marketingDashboard.openNewCampaignModal();
}

function saveSettings() {
    window.marketingDashboard.saveSettings();
}

function closeModal(modalId) {
    window.marketingDashboard.closeModal(modalId);
}
