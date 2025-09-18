// ==============================================
// HIPET SYSTEM MONITORING & MAINTENANCE CHECK
// ==============================================

// API Configuration
const SYSTEM_API_BASE = 'https://api.zewk.fun';

// Check if we're on maintenance page (maintenance page should keep periodic checking)
const isMaintenancePage = window.location.pathname.includes('maintenance.html');

// Development mode - enable periodic checking for testing, but only on maintenance page
const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const ENABLE_PERIODIC_CHECK = isDevelopment && isMaintenancePage; // Only in development AND on maintenance page
const CHECK_INTERVAL = 30 * 1000; // 30 seconds for development

// ==============================================
// MAINTENANCE MODE CHECK
// ==============================================

// Check maintenance mode on page load
async function checkMaintenanceMode() {
    // Skip check if we're already on maintenance page
    if (window.location.pathname.includes('maintenance.html')) {
        return;
    }

    try {
        const response = await fetch(`${SYSTEM_API_BASE}/api/system/status`);
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

// ==============================================
// ERROR HANDLING & 404 MANAGEMENT
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

// ==============================================
// SYSTEM HEALTH MONITORING
// ==============================================

// System health check (can be called periodically)
async function checkSystemHealth() {
    try {
        const response = await fetch(`${SYSTEM_API_BASE}/api/system/status`);
        const data = await response.json();
        
        return {
            healthy: response.ok && data.success,
            maintenance_mode: data.data?.maintenance_mode || false,
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

// ==============================================
// INITIALIZATION & EVENT LISTENERS
// ==============================================

// Check maintenance mode when page loads
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🔍 Checking system status...');
    
    const isOperational = await checkMaintenanceMode();
    if (!isOperational) {
        console.log('🛠️ System in maintenance mode, redirecting...');
        return; // Stop execution if in maintenance mode
    }
    
    console.log('✅ System operational, continuing normal operation...');
});

// Periodic maintenance check (only in specific conditions)
if (ENABLE_PERIODIC_CHECK) {
    console.log('🔧 Development mode on maintenance page: Enabling periodic maintenance checks every', CHECK_INTERVAL / 1000, 'seconds');
    setInterval(async () => {
        console.log('🔍 Periodic system health check...');
        const health = await checkSystemHealth();
        if (!health.healthy) {
            console.warn('⚠️ System health check failed, checking maintenance mode...');
            await checkMaintenanceMode();
        } else if (health.maintenance_mode) {
            console.warn('🛠️ Maintenance mode detected in periodic check');
            await checkMaintenanceMode();
        } else {
            console.log('✅ System healthy');
        }
    }, CHECK_INTERVAL);
} else if (isMaintenancePage) {
    console.log('�️ Maintenance page: Periodic checks disabled in production (handled by maintenance page itself)');
} else {
    console.log('🚀 Index page: One-time check only. No periodic maintenance monitoring.');
}

// Page visibility change handler - check maintenance when user returns
document.addEventListener('visibilitychange', function() {
    if (!document.hidden) {
        // User returned to page, check maintenance status
        setTimeout(() => {
            checkMaintenanceMode();
        }, 1000);
    }
});

// URL change detection for SPA
let monitorCurrentPath = window.location.pathname;
function detectURLChange() {
    if (window.location.pathname !== monitorCurrentPath) {
        monitorCurrentPath = window.location.pathname;
        console.log('🔄 URL changed to:', monitorCurrentPath);
        
        // You can add custom routing logic here
        // For example, check if the new path should exist
    }
}

// Monitor URL changes
setInterval(detectURLChange, 1000);

// ==============================================
// UTILITY FUNCTIONS
// ==============================================

// Show maintenance notification
function showMaintenanceNotification() {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        background: linear-gradient(135deg, #ff6b6b, #ee5a5a);
        color: white;
        padding: 15px;
        text-align: center;
        z-index: 10000;
        font-family: 'Segoe UI', sans-serif;
        font-weight: 500;
        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        animation: slideDown 0.3s ease-out;
    `;
    
    notification.innerHTML = `
        🛠️ Hệ thống đang được bảo trì. Bạn sẽ được chuyển hướng trong giây lát...
    `;
    
    // Add animation CSS
    if (!document.querySelector('#maintenance-notification-style')) {
        const style = document.createElement('style');
        style.id = 'maintenance-notification-style';
        style.textContent = `
            @keyframes slideDown {
                from { transform: translateY(-100%); }
                to { transform: translateY(0); }
            }
        `;
        document.head.appendChild(style);
    }
    
    document.body.insertBefore(notification, document.body.firstChild);
    
    // Auto redirect after 3 seconds
    setTimeout(() => {
        window.location.href = '/maintenance.html';
    }, 3000);
}

// Show network error notification
function showNetworkErrorNotification() {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: rgba(255, 87, 87, 0.95);
        color: white;
        padding: 15px 20px;
        border-radius: 10px;
        z-index: 10000;
        font-family: 'Segoe UI', sans-serif;
        font-weight: 500;
        box-shadow: 0 5px 20px rgba(0,0,0,0.3);
        max-width: 300px;
        animation: slideInRight 0.3s ease-out;
    `;
    
    notification.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
            <span style="font-size: 1.2em;">⚠️</span>
            <div>
                <div style="font-weight: 600;">Lỗi kết nối</div>
                <div style="font-size: 0.9em; opacity: 0.9;">Không thể kết nối đến server</div>
            </div>
        </div>
    `;
    
    // Add animation CSS
    if (!document.querySelector('#network-error-style')) {
        const style = document.createElement('style');
        style.id = 'network-error-style';
        style.textContent = `
            @keyframes slideInRight {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
    }
    
    document.body.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        notification.style.animation = 'slideInRight 0.3s ease-out reverse';
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 5000);
}

// Export functions for global use
window.checkMaintenanceMode = checkMaintenanceMode;
window.handleAPIError = handleAPIError;
window.enhancedFetch = enhancedFetch;
window.checkSystemHealth = checkSystemHealth;
window.handle404 = handle404;
window.showMaintenanceNotification = showMaintenanceNotification;
window.showNetworkErrorNotification = showNetworkErrorNotification;

console.log('🔧 System monitoring initialized');