// HiPet Support Dashboard JavaScript

// API Configuration
const API_BASE = 'https://api.zewk.fun';

// =============================================================================
// SUPPORT LOGIN FUNCTIONALITY (Merged from support-login.js)
// =============================================================================

document.addEventListener('DOMContentLoaded', function() {
    const loginScreen = document.getElementById('support-login-screen');
    const dashboard = document.getElementById('support-dashboard');
    const loginForm = document.getElementById('support-login-form');

    // Check if user is already logged in
    checkSupportAuth();

    // Handle login form submission
    if (loginForm) {
        loginForm.addEventListener('submit', handleSupportLogin);
    }

    function checkSupportAuth() {
        const supportToken = localStorage.getItem('support_token') || sessionStorage.getItem('support_token');
        const supportUser = localStorage.getItem('support_user') || sessionStorage.getItem('support_user');
        
        if (supportToken && supportUser) {
            try {
                const userData = JSON.parse(supportUser);
                if (userData.role === 'support') {
                    showDashboard();
                    return true;
                }
            } catch (error) {
                console.error('Error parsing support user data:', error);
                clearSupportAuth();
            }
        }
        
        showLoginScreen();
        return false;
    }

    async function handleSupportLogin(e) {
        e.preventDefault();
        
        const email = document.getElementById('support-email').value;
        const password = document.getElementById('support-password').value;
        const remember = document.getElementById('support-remember').checked;
        
        const submitButton = loginForm.querySelector('.login-btn');
        const originalText = submitButton.innerHTML;
        
        submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang đăng nhập...';
        submitButton.disabled = true;

        try {
            const response = await fetch(`${API_BASE}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, role: 'support' }),
            });

            const result = await response.json();

            if (result.token && result.user && result.user.role === 'support') {
                if (remember) {
                    localStorage.setItem('support_token', result.token);
                    localStorage.setItem('support_user', JSON.stringify(result.user));
                } else {
                    sessionStorage.setItem('support_token', result.token);
                    sessionStorage.setItem('support_user', JSON.stringify(result.user));
                }

                await updateSupportStatus('online');
                showSupportMessage('Đăng nhập thành công!', 'success');
                setTimeout(() => {
                    showDashboard();
                    startSupportAgent();
                }, 1000);
            } else {
                throw new Error(result.message || 'Đăng nhập thất bại');
            }
        } catch (error) {
            showSupportMessage(error.message || 'Có lỗi xảy ra khi đăng nhập', 'error');
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

    function clearSupportAuth() {
        localStorage.removeItem('support_token');
        localStorage.removeItem('support_user');
        sessionStorage.removeItem('support_token');
        sessionStorage.removeItem('support_user');
    }

    async function updateSupportStatus(status) {
        try {
            const token = localStorage.getItem('support_token') || sessionStorage.getItem('support_token');
            if (!token) return;

            await fetch(`${API_BASE}/api/support/status`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ status })
            });
        } catch (error) {
            console.error('Error updating support status:', error);
        }
    }

    function startSupportAgent() {
        setInterval(() => updateSupportStatus('online'), 30000);
    }

    function showSupportMessage(message, type) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `support-message ${type}`;
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

    // Global logout function
    window.supportLogout = function() {
        updateSupportStatus('offline');
        clearSupportAuth();
        showLoginScreen();
        showSupportMessage('Đã đăng xuất thành công', 'success');
    };
});

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

// =============================================================================
// SUPPORT DASHBOARD FUNCTIONALITY
// =============================================================================

class SupportDashboard {
    constructor() {
        this.currentUser = null;
        this.currentTicket = null;
        this.currentChat = null;
        this.tickets = [];
        this.chatUsers = [];
        this.messages = [];
        this.knowledgeBase = [];
        this.init();
    }

    // Helper function to get auth token
    getAuthToken() {
        return localStorage.getItem('support_token') || sessionStorage.getItem('support_token');
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
            this.initializeChat();
            this.loadKnowledgeBase();
        }
    }

    checkAuth() {
        // Check both localStorage and sessionStorage for support tokens
        const token = localStorage.getItem('support_token') || sessionStorage.getItem('support_token');
        const supportUser = localStorage.getItem('support_user') || sessionStorage.getItem('support_user');

        if (!token || !supportUser) {
            // Don't redirect - let the login screen handle this
            return false;
        }

        try {
            const userData = JSON.parse(supportUser);
            if (userData.role !== 'support') {
                // Clear invalid auth data
                this.clearSupportAuth();
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
            console.error('Error parsing support user data:', error);
            this.clearSupportAuth();
            return false;
        }
    }

    clearSupportAuth() {
        localStorage.removeItem('support_token');
        localStorage.removeItem('support_user');
        sessionStorage.removeItem('support_token');
        sessionStorage.removeItem('support_user');
    }

    bindEvents() {
        // Navigation events
        document.querySelectorAll('.menu-item').forEach(item => {
            item.addEventListener('click', (e) => this.handleNavigation(e));
        });

        // Logout
        document.querySelector('.logout-btn').addEventListener('click', () => this.logout());

        // Filters
        document.getElementById('ticket-search').addEventListener('input', (e) => this.filterTickets(e.target.value));
        document.getElementById('priority-filter').addEventListener('change', (e) => this.filterByPriority(e.target.value));
        document.getElementById('status-filter').addEventListener('change', (e) => this.filterByStatus(e.target.value));
        document.getElementById('category-filter').addEventListener('change', (e) => this.filterByCategory(e.target.value));

        // New ticket modal
        document.getElementById('new-ticket-btn').addEventListener('click', () => this.openNewTicketModal());
        document.querySelector('#new-ticket-modal .close').addEventListener('click', () => this.closeModal('new-ticket-modal'));

        // Ticket creation
        document.getElementById('create-ticket-btn').addEventListener('click', () => this.createTicket());

        // Chat events
        document.getElementById('message-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendMessage();
        });
        document.getElementById('send-btn').addEventListener('click', () => this.sendMessage());
        document.getElementById('attachment-btn').addEventListener('click', () => this.attachFile());

        // Quick responses
        document.querySelectorAll('.quick-response-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.insertQuickResponse(e.target.textContent));
        });

        // Knowledge base
        document.getElementById('kb-search-input').addEventListener('input', (e) => this.searchKnowledgeBase(e.target.value));
        document.getElementById('kb-search-btn').addEventListener('click', () => this.searchKnowledgeBase());

        // New article modal
        document.getElementById('new-article-btn').addEventListener('click', () => this.openNewArticleModal());
        document.querySelector('#new-article-modal .close').addEventListener('click', () => this.closeModal('new-article-modal'));

        // Article creation
        document.getElementById('create-article-btn').addEventListener('click', () => this.createArticle());

        // Settings
        document.getElementById('save-settings-btn').addEventListener('click', () => this.saveSettings());

        // Support status toggle
        document.querySelectorAll('input[name="support-status"]').forEach(radio => {
            radio.addEventListener('change', (e) => this.updateSupportStatus(e.target.value));
        });

        // Modal close on outside click
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
            case 'tickets':
                this.loadTickets();
                break;
            case 'chat':
                this.loadChatUsers();
                break;
            case 'users':
                this.loadUsers();
                break;
            case 'knowledge':
                this.loadKnowledgeBase();
                break;
            case 'reports':
                this.loadReports();
                break;
            case 'settings':
                this.loadSettings();
                break;
        }
    }

    async loadDashboardData() {
        try {
            this.showLoading();
            const response = await fetch(`${API_BASE}/api/support/dashboard`, {
                headers: this.getAuthHeaders()
            });
            
            if (response.ok) {
                const data = await response.json();
                this.updateDashboardStats(data.stats);
                this.renderRecentTickets(data.recentTickets);
            }
        } catch (error) {
            console.error('Error loading dashboard:', error);
            this.showToast('Error loading dashboard data', 'error');
        } finally {
            this.hideLoading();
        }
    }

    updateDashboardStats(stats) {
        document.querySelector('.stat-card.new .stat-info h3').textContent = stats.newTickets || 0;
        document.querySelector('.stat-card.in-progress .stat-info h3').textContent = stats.inProgressTickets || 0;
        document.querySelector('.stat-card.resolved .stat-info h3').textContent = stats.resolvedTickets || 0;
        document.querySelector('.stat-card.urgent .stat-info h3').textContent = stats.urgentTickets || 0;
    }

    renderRecentTickets(tickets) {
        const container = document.querySelector('.recent-tickets');
        if (!container) return;

        container.innerHTML = tickets.map(ticket => `
            <div class="ticket-item" onclick="supportDashboard.viewTicket('${ticket.id}')">
                <div class="ticket-header">
                    <span class="ticket-id">#${ticket.id}</span>
                    <span class="priority-badge ${ticket.priority}">${ticket.priority}</span>
                </div>
                <h4 class="ticket-title">${ticket.title}</h4>
                <p class="ticket-meta">
                    <span><i class="fas fa-user"></i> ${ticket.customerName}</span>
                    <span><i class="fas fa-clock"></i> ${this.formatDate(ticket.createdAt)}</span>
                </p>
            </div>
        `).join('');
    }

    async loadTickets() {
        try {
            this.showLoading();
            const response = await fetch(`${API_BASE}/api/support/tickets`, {
                headers: this.getAuthHeaders()
            });
            
            if (response.ok) {
                this.tickets = await response.json();
                this.renderTickets(this.tickets);
            }
        } catch (error) {
            console.error('Error loading tickets:', error);
            this.showToast('Error loading tickets', 'error');
        } finally {
            this.hideLoading();
        }
    }

    renderTickets(tickets) {
        const container = document.getElementById('tickets-list');
        
        container.innerHTML = tickets.map(ticket => `
            <div class="ticket-card" onclick="supportDashboard.viewTicket('${ticket.id}')">
                <div class="ticket-header">
                    <div>
                        <h3 class="ticket-title">${ticket.title}</h3>
                        <p class="ticket-id">#${ticket.id}</p>
                    </div>
                    <div class="ticket-badges">
                        <span class="priority-badge ${ticket.priority}">${ticket.priority}</span>
                        <span class="status-badge ${ticket.status}">${ticket.status.replace('_', ' ')}</span>
                    </div>
                </div>
                <div class="ticket-meta">
                    <span><i class="fas fa-user"></i> ${ticket.customerName}</span>
                    <span><i class="fas fa-envelope"></i> ${ticket.customerEmail}</span>
                    <span><i class="fas fa-tag"></i> ${ticket.category}</span>
                    <span><i class="fas fa-clock"></i> ${this.formatDate(ticket.createdAt)}</span>
                </div>
                <p class="ticket-description">${ticket.description}</p>
                <div class="ticket-footer">
                    <div class="ticket-assignee">
                        ${ticket.assignee ? `<i class="fas fa-user-tie"></i> ${ticket.assignee}` : '<i class="fas fa-user-slash"></i> Unassigned'}
                    </div>
                    <div class="ticket-actions">
                        <button class="action-btn view" onclick="event.stopPropagation(); supportDashboard.viewTicket('${ticket.id}')">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="action-btn edit" onclick="event.stopPropagation(); supportDashboard.assignTicket('${ticket.id}')">
                            <i class="fas fa-user-plus"></i>
                        </button>
                        <button class="action-btn delete" onclick="event.stopPropagation(); supportDashboard.resolveTicket('${ticket.id}')">
                            <i class="fas fa-check"></i>
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    filterTickets(search) {
        const filtered = this.tickets.filter(ticket => 
            ticket.title.toLowerCase().includes(search.toLowerCase()) ||
            ticket.customerName.toLowerCase().includes(search.toLowerCase()) ||
            ticket.id.toString().includes(search)
        );
        this.renderTickets(filtered);
    }

    filterByPriority(priority) {
        if (!priority) {
            this.renderTickets(this.tickets);
            return;
        }
        const filtered = this.tickets.filter(ticket => ticket.priority === priority);
        this.renderTickets(filtered);
    }

    filterByStatus(status) {
        if (!status) {
            this.renderTickets(this.tickets);
            return;
        }
        const filtered = this.tickets.filter(ticket => ticket.status === status);
        this.renderTickets(filtered);
    }

    filterByCategory(category) {
        if (!category) {
            this.renderTickets(this.tickets);
            return;
        }
        const filtered = this.tickets.filter(ticket => ticket.category === category);
        this.renderTickets(filtered);
    }

    openNewTicketModal() {
        document.getElementById('new-ticket-modal').style.display = 'block';
    }

    async createTicket() {
        const formData = new FormData(document.getElementById('new-ticket-form'));
        const ticketData = Object.fromEntries(formData);

        try {
            const response = await fetch('/api/support/tickets', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                },
                body: JSON.stringify(ticketData)
            });

            if (response.ok) {
                this.showToast('Ticket created successfully', 'success');
                this.closeModal('new-ticket-modal');
                this.loadTickets();
            } else {
                throw new Error('Failed to create ticket');
            }
        } catch (error) {
            console.error('Error creating ticket:', error);
            this.showToast('Error creating ticket', 'error');
        }
    }

    async viewTicket(ticketId) {
        try {
            const response = await fetch(`/api/support/tickets/${ticketId}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
            });
            
            if (response.ok) {
                const ticket = await response.json();
                this.showTicketDetails(ticket);
            }
        } catch (error) {
            console.error('Error loading ticket:', error);
            this.showToast('Error loading ticket details', 'error');
        }
    }

    showTicketDetails(ticket) {
        // Implementation for showing ticket details in a modal or detailed view
        console.log('Showing ticket details:', ticket);
    }

    async assignTicket(ticketId) {
        const assignee = prompt('Assign to:');
        if (!assignee) return;

        try {
            const response = await fetch(`/api/support/tickets/${ticketId}/assign`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                },
                body: JSON.stringify({ assignee })
            });

            if (response.ok) {
                this.showToast('Ticket assigned successfully', 'success');
                this.loadTickets();
            } else {
                throw new Error('Failed to assign ticket');
            }
        } catch (error) {
            console.error('Error assigning ticket:', error);
            this.showToast('Error assigning ticket', 'error');
        }
    }

    async resolveTicket(ticketId) {
        if (!confirm('Mark this ticket as resolved?')) return;

        try {
            const response = await fetch(`/api/support/tickets/${ticketId}/resolve`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                }
            });

            if (response.ok) {
                this.showToast('Ticket resolved successfully', 'success');
                this.loadTickets();
            } else {
                throw new Error('Failed to resolve ticket');
            }
        } catch (error) {
            console.error('Error resolving ticket:', error);
            this.showToast('Error resolving ticket', 'error');
        }
    }

    // Chat functionality
    initializeChat() {
        this.loadChatUsers();
        setInterval(() => this.pollMessages(), 5000); // Poll for new messages every 5 seconds
    }

    async loadChatUsers() {
        try {
            const response = await fetch('/api/support/chat/users', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
            });
            
            if (response.ok) {
                this.chatUsers = await response.json();
                this.renderChatUsers();
            }
        } catch (error) {
            console.error('Error loading chat users:', error);
        }
    }

    renderChatUsers() {
        const container = document.querySelector('.chat-list');
        
        container.innerHTML = this.chatUsers.map(user => `
            <div class="chat-item ${user.id === this.currentChat?.id ? 'active' : ''}" 
                 onclick="supportDashboard.selectChat('${user.id}')">
                <img src="${user.avatar || '/images/default-avatar.svg'}" alt="${user.name}" class="chat-item-avatar">
                <div class="chat-item-info">
                    <div class="chat-item-name">${user.name}</div>
                    <div class="chat-item-last-message">${user.lastMessage || 'No messages yet'}</div>
                </div>
                <div class="chat-item-time">${user.lastMessageTime ? this.formatTime(user.lastMessageTime) : ''}</div>
            </div>
        `).join('');
    }

    async selectChat(userId) {
        try {
            const response = await fetch(`/api/support/chat/users/${userId}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
            });
            
            if (response.ok) {
                this.currentChat = await response.json();
                this.loadChatMessages(userId);
                this.updateChatHeader();
                document.querySelector('.no-chat-selected').style.display = 'none';
                document.querySelector('.chat-messages').style.display = 'flex';
                document.querySelector('.chat-input').style.display = 'block';
            }
        } catch (error) {
            console.error('Error selecting chat:', error);
        }
    }

    async loadChatMessages(userId) {
        try {
            const response = await fetch(`/api/support/chat/users/${userId}/messages`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
            });
            
            if (response.ok) {
                this.messages = await response.json();
                this.renderMessages();
            }
        } catch (error) {
            console.error('Error loading messages:', error);
        }
    }

    renderMessages() {
        const container = document.querySelector('.chat-messages');
        
        container.innerHTML = this.messages.map(message => `
            <div class="message ${message.sender === 'support' ? 'sent' : 'received'}">
                <img src="${message.avatar || '/images/default-avatar.svg'}" alt="${message.senderName}" class="message-avatar">
                <div class="message-content">
                    <div class="message-text">${message.text}</div>
                    <div class="message-time">${this.formatTime(message.timestamp)}</div>
                </div>
            </div>
        `).join('');

        // Scroll to bottom
        container.scrollTop = container.scrollHeight;
    }

    updateChatHeader() {
        if (!this.currentChat) return;

        document.querySelector('.chat-user-details h4').textContent = this.currentChat.name;
        document.querySelector('.chat-user-details p').textContent = this.currentChat.email;
        document.querySelector('.chat-avatar').src = this.currentChat.avatar || '/images/default-avatar.svg';
    }

    async sendMessage() {
        const input = document.getElementById('message-input');
        const message = input.value.trim();
        
        if (!message || !this.currentChat) return;

        try {
            const response = await fetch('/api/support/chat/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                },
                body: JSON.stringify({
                    recipientId: this.currentChat.id,
                    message: message
                })
            });

            if (response.ok) {
                input.value = '';
                this.loadChatMessages(this.currentChat.id);
            } else {
                throw new Error('Failed to send message');
            }
        } catch (error) {
            console.error('Error sending message:', error);
            this.showToast('Error sending message', 'error');
        }
    }

    insertQuickResponse(response) {
        const input = document.getElementById('message-input');
        input.value = response;
        input.focus();
    }

    attachFile() {
        // Create file input dynamically
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.multiple = true;
        fileInput.accept = 'image/*,.pdf,.doc,.docx,.txt';
        
        fileInput.onchange = (e) => {
            const files = Array.from(e.target.files);
            this.handleFileAttachment(files);
        };
        
        fileInput.click();
    }

    async handleFileAttachment(files) {
        if (!this.currentChat) return;

        const formData = new FormData();
        files.forEach(file => formData.append('files', file));
        formData.append('recipientId', this.currentChat.id);

        try {
            const response = await fetch('/api/support/chat/attachments', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                },
                body: formData
            });

            if (response.ok) {
                this.showToast('Files attached successfully', 'success');
                this.loadChatMessages(this.currentChat.id);
            } else {
                throw new Error('Failed to attach files');
            }
        } catch (error) {
            console.error('Error attaching files:', error);
            this.showToast('Error attaching files', 'error');
        }
    }

    async pollMessages() {
        if (this.currentChat) {
            await this.loadChatMessages(this.currentChat.id);
        }
        await this.loadChatUsers();
    }

    // Knowledge Base functionality
    async loadKnowledgeBase() {
        try {
            const response = await fetch('/api/support/knowledge-base', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
            });
            
            if (response.ok) {
                this.knowledgeBase = await response.json();
                this.renderKnowledgeBase();
            }
        } catch (error) {
            console.error('Error loading knowledge base:', error);
        }
    }

    renderKnowledgeBase() {
        const container = document.getElementById('kb-articles-list');
        
        container.innerHTML = this.knowledgeBase.map(article => `
            <div class="kb-article" onclick="supportDashboard.viewArticle('${article.id}')">
                <h4>${article.title}</h4>
                <p>${article.summary}</p>
                <div class="article-meta">
                    <span><i class="fas fa-tag"></i> ${article.category}</span>
                    <span><i class="fas fa-clock"></i> ${this.formatDate(article.updatedAt)}</span>
                </div>
            </div>
        `).join('');
    }

    searchKnowledgeBase(query) {
        if (!query) {
            this.renderKnowledgeBase();
            return;
        }

        const filtered = this.knowledgeBase.filter(article =>
            article.title.toLowerCase().includes(query.toLowerCase()) ||
            article.content.toLowerCase().includes(query.toLowerCase()) ||
            article.category.toLowerCase().includes(query.toLowerCase())
        );

        const container = document.getElementById('kb-articles-list');
        container.innerHTML = filtered.map(article => `
            <div class="kb-article" onclick="supportDashboard.viewArticle('${article.id}')">
                <h4>${article.title}</h4>
                <p>${article.summary}</p>
                <div class="article-meta">
                    <span><i class="fas fa-tag"></i> ${article.category}</span>
                    <span><i class="fas fa-clock"></i> ${this.formatDate(article.updatedAt)}</span>
                </div>
            </div>
        `).join('');
    }

    viewArticle(articleId) {
        const article = this.knowledgeBase.find(a => a.id === articleId);
        if (article) {
            // Show article in modal or navigate to article view
            console.log('Viewing article:', article);
        }
    }

    openNewArticleModal() {
        document.getElementById('new-article-modal').style.display = 'block';
    }

    async createArticle() {
        const formData = new FormData(document.getElementById('new-article-form'));
        const articleData = Object.fromEntries(formData);

        try {
            const response = await fetch('/api/support/knowledge-base', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                },
                body: JSON.stringify(articleData)
            });

            if (response.ok) {
                this.showToast('Article created successfully', 'success');
                this.closeModal('new-article-modal');
                this.loadKnowledgeBase();
            } else {
                throw new Error('Failed to create article');
            }
        } catch (error) {
            console.error('Error creating article:', error);
            this.showToast('Error creating article', 'error');
        }
    }

    // User lookup functionality
    async loadUsers() {
        try {
            const response = await fetch('/api/support/users', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
            });
            
            if (response.ok) {
                const users = await response.json();
                this.renderUsers(users);
            }
        } catch (error) {
            console.error('Error loading users:', error);
        }
    }

    renderUsers(users) {
        const tbody = document.querySelector('#users-table tbody');
        
        tbody.innerHTML = users.map(user => `
            <tr>
                <td>
                    <img src="${user.avatar || '/images/default-avatar.svg'}" alt="${user.name}" class="user-avatar">
                    <span>${user.name}</span>
                </td>
                <td>${user.email}</td>
                <td>${user.phone || 'N/A'}</td>
                <td><span class="status-badge ${user.status}">${user.status}</span></td>
                <td>${this.formatDate(user.joinedAt)}</td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn view" onclick="supportDashboard.viewUserProfile('${user.id}')">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="action-btn edit" onclick="supportDashboard.startChat('${user.id}')">
                            <i class="fas fa-comment"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    async viewUserProfile(userId) {
        try {
            const response = await fetch(`/api/support/users/${userId}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
            });
            
            if (response.ok) {
                const user = await response.json();
                this.showUserProfile(user);
            }
        } catch (error) {
            console.error('Error loading user profile:', error);
        }
    }

    showUserProfile(user) {
        // Implementation for showing user profile details
        console.log('Showing user profile:', user);
    }

    startChat(userId) {
        // Switch to chat section and start conversation with user
        this.handleNavigation({ preventDefault: () => {}, currentTarget: { dataset: { section: 'chat' } } });
        setTimeout(() => this.selectChat(userId), 500);
    }

    // Reports functionality
    async loadReports() {
        try {
            const response = await fetch('/api/support/reports', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
            });
            
            if (response.ok) {
                const reports = await response.json();
                this.renderReports(reports);
            }
        } catch (error) {
            console.error('Error loading reports:', error);
        }
    }

    renderReports(reports) {
        // Update report metrics
        const resolutionTime = document.querySelector('.report-card:nth-child(1) .metric:nth-child(1) .metric-value');
        const satisfaction = document.querySelector('.report-card:nth-child(1) .metric:nth-child(2) .metric-value');
        const responseTime = document.querySelector('.report-card:nth-child(1) .metric:nth-child(3) .metric-value');

        if (resolutionTime) resolutionTime.textContent = reports.avgResolutionTime || '0h';
        if (satisfaction) satisfaction.textContent = `${reports.satisfactionRate || 0}%`;
        if (responseTime) responseTime.textContent = reports.avgResponseTime || '0m';

        // Render top issues
        const topIssues = document.querySelector('.top-issues');
        if (topIssues && reports.topIssues) {
            topIssues.innerHTML = reports.topIssues.map(issue => `
                <div class="issue-item">
                    <div class="issue-title">${issue.category}</div>
                    <div class="issue-count">${issue.count} tickets</div>
                </div>
            `).join('');
        }

        // Render recent feedback
        const recentFeedback = document.querySelector('.recent-feedback');
        if (recentFeedback && reports.recentFeedback) {
            recentFeedback.innerHTML = reports.recentFeedback.map(feedback => `
                <div class="feedback-item">
                    <div class="feedback-text">${feedback.comment}</div>
                    <div class="feedback-rating">${'★'.repeat(feedback.rating)}${'☆'.repeat(5-feedback.rating)} - ${feedback.customerName}</div>
                </div>
            `).join('');
        }
    }

    // Settings functionality
    async loadSettings() {
        try {
            const response = await fetch('/api/support/settings', {
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
            const element = document.getElementById(key) || document.querySelector(`[name="${key}"]`);
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
        const formData = new FormData(document.getElementById('settings-form'));
        const settings = Object.fromEntries(formData);

        try {
            const response = await fetch('/api/support/settings', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                },
                body: JSON.stringify(settings)
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

    updateSupportStatus(status) {
        // Update support status indicator
        const indicator = document.querySelector('.status-indicator');
        const statusText = document.querySelector('.support-status span:last-child');
        
        indicator.className = `status-indicator ${status}`;
        statusText.textContent = status.charAt(0).toUpperCase() + status.slice(1);

        // Save status to server
        this.saveSupportStatus(status);
    }

    async saveSupportStatus(status) {
        try {
            await fetch(`${API_BASE}/api/support/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.getAuthToken()}`
                },
                body: JSON.stringify({ status })
            });
        } catch (error) {
            console.error('Error saving support status:', error);
        }
    }

    // Utility functions
    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    formatTime(dateString) {
        const date = new Date(dateString);
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    showLoading() {
        document.querySelector('.loading-overlay').style.display = 'block';
    }

    hideLoading() {
        document.querySelector('.loading-overlay').style.display = 'none';
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

        document.querySelector('.toast-container').appendChild(toast);

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
        if (confirm('Are you sure you want to logout?')) {
            // Use the new support logout function
            if (typeof supportLogout === 'function') {
                supportLogout();
            } else {
                // Fallback to manual cleanup
                this.clearSupportAuth();
                window.location.reload();
            }
        }
    }
}

// Global function to initialize dashboard after login
window.initializeSupportDashboard = function() {
    if (window.supportDashboard) {
        window.supportDashboard.bindEvents();
        window.supportDashboard.loadDashboardData();
        window.supportDashboard.initializeChat();
        window.supportDashboard.loadKnowledgeBase();
    }
};

// Initialize the dashboard when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.supportDashboard = new SupportDashboard();
});

// Add loading overlay HTML if not present
document.addEventListener('DOMContentLoaded', () => {
    if (!document.querySelector('.loading-overlay')) {
        const loadingOverlay = document.createElement('div');
        loadingOverlay.className = 'loading-overlay';
        loadingOverlay.innerHTML = `
            <div class="loading-spinner">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Loading...</p>
            </div>
        `;
        document.body.appendChild(loadingOverlay);
    }

    if (!document.querySelector('.toast-container')) {
        const toastContainer = document.createElement('div');
        toastContainer.className = 'toast-container';
        document.body.appendChild(toastContainer);
    }
});
