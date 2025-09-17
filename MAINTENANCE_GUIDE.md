# Hướng dẫn quản lý Maintenance Mode và Error Handling

## 📋 **Tổng quan**

HiPet hiện đã được tích hợp hệ thống kiểm tra maintenance mode và xử lý lỗi tự động. Hệ thống sẽ:

- ✅ Kiểm tra maintenance mode khi người dùng truy cập
- ✅ Tự động chuyển hướng đến trang bảo trì
- ✅ Xử lý lỗi 404 và chuyển đến trang lỗi đẹp
- ✅ Giám sát sức khỏe hệ thống
- ✅ Thông báo lỗi kết nối

---

## 🛠️ **Cách bật/tắt Maintenance Mode**

### **Phương pháp 1: Trực tiếp qua Database**

```sql
-- Bật maintenance mode
UPDATE system_settings 
SET value = '1' 
WHERE key = 'maintenance_mode';

-- Tắt maintenance mode  
UPDATE system_settings 
SET value = '0' 
WHERE key = 'maintenance_mode';
```

### **Phương pháp 2: Qua Admin Portal**

1. Đăng nhập Admin Portal: `/portal/admin/`
2. Vào **System Settings**
3. Tìm **maintenance_mode**
4. Chuyển đổi giá trị `0` (tắt) / `1` (bật)
5. Lưu thay đổi

### **Phương pháp 3: Qua API (cho developers)**

```javascript
// Bật maintenance mode
fetch('/api/admin/settings', {
    method: 'POST',
    headers: { 
        'Content-Type': 'application/json',
        'Authorization': 'Bearer YOUR_ADMIN_TOKEN'
    },
    body: JSON.stringify({
        maintenance_mode: '1'
    })
});

// Tắt maintenance mode
fetch('/api/admin/settings', {
    method: 'POST',
    headers: { 
        'Content-Type': 'application/json',
        'Authorization': 'Bearer YOUR_ADMIN_TOKEN'
    },
    body: JSON.stringify({
        maintenance_mode: '0'
    })
});
```

---

## 🔍 **API Endpoints được thêm**

### **GET `/api/system/status`**
Kiểm tra trạng thái hệ thống

**Response:**
```json
{
    "success": true,
    "data": {
        "maintenance_mode": false,
        "registration_enabled": true,
        "site_name": "HiPet",
        "support_enabled": true,
        "marketing_enabled": true
    },
    "timestamp": "2025-01-16T10:30:00.000Z"
}
```

---

## 📁 **Files được tạo**

### **1. `/frontend/maintenance.html`**
- 🎨 Trang bảo trì đẹp với animation
- 🔄 Tự động kiểm tra và redirect khi hết bảo trì
- 📞 Thông tin liên hệ support
- 📱 Responsive design

### **2. `/frontend/404.html`**
- 🎯 Trang 404 thú vị với pet theme
- 🔍 Tích hợp search box
- 🏠 Quick navigation links
- 🎮 Interactive elements

### **3. `/frontend/system-monitor.js`**
- 🔧 Kiểm tra maintenance mode tự động
- ⚠️ Error handling và network monitoring
- 🚨 Notification system
- 📊 Health check periodic

---

## ⚙️ **Cấu hình System Settings**

Các settings mới được thêm vào database:

```sql
INSERT INTO system_settings (key, value, description) VALUES
('marketing_enabled', '1', 'Kích hoạt hệ thống quảng cáo'),
('support_enabled', '1', 'Kích hoạt hệ thống hỗ trợ'),
('auto_assign_support', '1', 'Tự động phân công support'),
('max_ads_per_page', '3', 'Số quảng cáo tối đa mỗi trang');
```

---

## 🔄 **Workflow khi bật Maintenance Mode**

1. **Admin bật maintenance mode** trong database
2. **User truy cập trang** → System monitor check API
3. **API trả về** `maintenance_mode: true`
4. **JavaScript redirect** → `/maintenance.html`
5. **Trang maintenance hiển thị** với thông tin đẹp
6. **Auto-check mỗi 60s** để redirect về khi hết bảo trì

---

## 🚨 **Error Handling Flow**

### **Lỗi Network:**
- Detect network error
- Show notification
- Auto-retry maintenance check

### **Lỗi 404:**
- Catch 404 response
- Redirect to `/404.html`
- Provide search và navigation

### **Lỗi 500+:**
- Show server error message
- Suggest retry
- Log error details

---

## 📱 **Mobile Support**

Tất cả pages đều được optimize cho mobile:
- ✅ Responsive design
- ✅ Touch-friendly controls
- ✅ Mobile navigation
- ✅ Fast loading

---

## 🧪 **Testing Maintenance Mode**

### **Test Steps:**

1. **Bật maintenance mode:**
   ```sql
   UPDATE system_settings SET value = '1' WHERE key = 'maintenance_mode';
   ```

2. **Truy cập trang chính** → Sẽ redirect đến `/maintenance.html`

3. **Kiểm tra trang maintenance:**
   - ✅ Hiển thị đúng thông tin
   - ✅ Button "Kiểm tra lại" hoạt động
   - ✅ Auto-refresh mỗi 60s

4. **Tắt maintenance mode:**
   ```sql
   UPDATE system_settings SET value = '0' WHERE key = 'maintenance_mode';
   ```

5. **Click "Kiểm tra lại"** → Sẽ redirect về trang chính

---

## 🎨 **Customization**

### **Thay đổi giao diện maintenance page:**
Edit file `/frontend/maintenance.html`:
- Đổi màu sắc trong CSS
- Thay đổi nội dung message
- Cập nhật thông tin liên hệ

### **Thay đổi tần suất check:**
Edit file `/frontend/system-monitor.js`:
```javascript
// Thay đổi từ 60s thành 30s
setInterval(checkMaintenanceStatus, 30000);
```

### **Custom error messages:**
Edit function `handleAPIError()` trong `system-monitor.js`

---

## 📊 **Monitoring & Logs**

### **Console Logs:**
- `🔍 Checking system status...`
- `🛠️ System in maintenance mode, redirecting...`
- `✅ System operational, continuing normal operation...`
- `⚠️ System health check failed...`

### **Health Check:**
Hệ thống tự động check health mỗi 5 phút qua `/api/health`

---

## 🔐 **Security Notes**

- ✅ System status API không cần authentication
- ✅ Admin settings API cần admin token
- ✅ CORS headers được config đúng
- ✅ No sensitive data exposed

---

## 🚀 **Deployment**

Khi deploy lên production:

1. ✅ Upload tất cả files mới
2. ✅ Run schema updates (đã có sẵn)
3. ✅ Test maintenance mode
4. ✅ Verify 404 handling
5. ✅ Check mobile responsiveness

---

**🎉 Hệ thống maintenance và error handling đã sẵn sàng!**