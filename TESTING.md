# 🧪 HiPet API Testing Guide

## Manual Testing with cURL

### Prerequisites
Make sure your worker is deployed and get the worker URL from:
```bash
wrangler whoami
```
Your worker URL should be: `https://hipet-backend.your-subdomain.workers.dev`

### 1. Health Check
```bash
curl https://your-worker-url.workers.dev/health
```
Expected: `{"status":"ok","timestamp":"...","database":"connected"}`

### 2. User Registration
```bash
curl -X POST https://your-worker-url.workers.dev/api/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "fullName": "Test User",
    "phone": "0123456789"
  }'
```
Expected: `{"message":"Registration successful","userId":1}`

### 3. User Login
```bash
curl -X POST https://your-worker-url.workers.dev/api/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```
Expected: `{"token":"jwt-token-here","user":{...}}`

**Save the token for subsequent requests!**

### 4. Get Profile (Protected)
```bash
curl -X GET https://your-worker-url.workers.dev/api/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE"
```

### 5. Create Pet Listing
```bash
curl -X POST https://your-worker-url.workers.dev/api/pets \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE" \
  -d '{
    "name": "Fluffy",
    "type": "dog",
    "breed": "Golden Retriever",
    "age": 2,
    "gender": "female",
    "price": 500,
    "description": "Beautiful and friendly dog",
    "location": "Ho Chi Minh City",
    "vaccinated": true,
    "neutered": false
  }'
```

### 6. List Pets
```bash
curl https://your-worker-url.workers.dev/api/pets
```

### 7. Get Wallet Balance
```bash
curl -X GET https://your-worker-url.workers.dev/api/wallet \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE"
```

### 8. Deposit Money
```bash
curl -X POST https://your-worker-url.workers.dev/api/wallet/deposit \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE" \
  -d '{
    "amount": 1000,
    "method": "bank_transfer"
  }'
```

### 9. Send Message
```bash
curl -X POST https://your-worker-url.workers.dev/api/messages \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE" \
  -d '{
    "receiverId": 2,
    "content": "Hello, is this pet still available?"
  }'
```

### 10. Admin Login (if you have admin account)
```bash
curl -X POST https://your-worker-url.workers.dev/api/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@hipet.com",
    "password": "admin123"
  }'
```

### 11. Admin - List Users
```bash
curl -X GET https://your-worker-url.workers.dev/api/admin/users \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN_HERE"
```

## PowerShell Testing Script

Create a PowerShell script for automated testing:

```powershell
# test-api.ps1
$WORKER_URL = "https://your-worker-url.workers.dev"
$TOKEN = ""

function Test-Endpoint {
    param($Method, $Endpoint, $Body = $null, $Headers = @{})
    
    $uri = "$WORKER_URL$Endpoint"
    $defaultHeaders = @{"Content-Type" = "application/json"}
    
    if ($TOKEN) {
        $defaultHeaders["Authorization"] = "Bearer $TOKEN"
    }
    
    $allHeaders = $defaultHeaders + $Headers
    
    try {
        if ($Body) {
            $response = Invoke-RestMethod -Uri $uri -Method $Method -Body ($Body | ConvertTo-Json) -Headers $allHeaders
        } else {
            $response = Invoke-RestMethod -Uri $uri -Method $Method -Headers $allHeaders
        }
        Write-Host "✅ $Method $Endpoint - Success" -ForegroundColor Green
        return $response
    } catch {
        Write-Host "❌ $Method $Endpoint - Failed: $($_.Exception.Message)" -ForegroundColor Red
        return $null
    }
}

# Test health check
Write-Host "Testing Health Check..." -ForegroundColor Yellow
Test-Endpoint -Method "GET" -Endpoint "/health"

# Test registration
Write-Host "`nTesting Registration..." -ForegroundColor Yellow
$regResponse = Test-Endpoint -Method "POST" -Endpoint "/api/register" -Body @{
    email = "test@example.com"
    password = "password123"
    fullName = "Test User"
    phone = "0123456789"
}

# Test login
Write-Host "`nTesting Login..." -ForegroundColor Yellow
$loginResponse = Test-Endpoint -Method "POST" -Endpoint "/api/login" -Body @{
    email = "test@example.com"
    password = "password123"
}

if ($loginResponse -and $loginResponse.token) {
    $script:TOKEN = $loginResponse.token
    Write-Host "Token saved: $TOKEN" -ForegroundColor Cyan
}

# Test protected endpoints
if ($TOKEN) {
    Write-Host "`nTesting Protected Endpoints..." -ForegroundColor Yellow
    
    # Profile
    Test-Endpoint -Method "GET" -Endpoint "/api/profile"
    
    # Wallet
    Test-Endpoint -Method "GET" -Endpoint "/api/wallet"
    
    # Create pet
    Test-Endpoint -Method "POST" -Endpoint "/api/pets" -Body @{
        name = "Test Pet"
        type = "dog"
        breed = "Test Breed"
        age = 2
        gender = "male"
        price = 500
        description = "Test description"
        location = "Test City"
        vaccinated = $true
        neutered = $false
    }
    
    # List pets
    Test-Endpoint -Method "GET" -Endpoint "/api/pets"
}

Write-Host "`nTesting completed!" -ForegroundColor Green
```

## Browser Testing (JavaScript Console)

Open your frontend website and use the browser console:

```javascript
// Test API directly from browser console
const API_BASE = 'https://your-worker-url.workers.dev';
let token = '';

// Test registration
fetch(`${API_BASE}/api/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        email: 'test2@example.com',
        password: 'password123',
        fullName: 'Test User 2',
        phone: '0987654321'
    })
})
.then(r => r.json())
.then(data => console.log('Registration:', data));

// Test login
fetch(`${API_BASE}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        email: 'test2@example.com',
        password: 'password123'
    })
})
.then(r => r.json())
.then(data => {
    console.log('Login:', data);
    if (data.token) token = data.token;
});

// Test protected endpoint
fetch(`${API_BASE}/api/profile`, {
    headers: { 'Authorization': `Bearer ${token}` }
})
.then(r => r.json())
.then(data => console.log('Profile:', data));
```

## Database Verification

Check your database directly:

```bash
# List all users
wrangler d1 execute hipet-db --command="SELECT id, email, full_name, role, created_at FROM users;"

# List all pets
wrangler d1 execute hipet-db --command="SELECT id, name, type, breed, price, owner_id FROM pets;"

# List all transactions
wrangler d1 execute hipet-db --command="SELECT id, user_id, type, amount, status, created_at FROM transactions;"

# List all messages
wrangler d1 execute hipet-db --command="SELECT id, sender_id, receiver_id, content, created_at FROM messages LIMIT 10;"

# Check wallet balances
wrangler d1 execute hipet-db --command="SELECT user_id, balance FROM users WHERE balance > 0;"
```

## R2 Storage Testing

Test file upload functionality:

```bash
# List uploaded files
wrangler r2 object list hipet-files

# Check if a specific file exists
wrangler r2 object get hipet-files/pets/1/image1.jpg
```

## Common Test Scenarios

### 1. Complete User Journey
1. Register new user
2. Login and get token
3. Update profile
4. Create pet listing
5. Upload pet images
6. Deposit money to wallet
7. Browse other pets
8. Send message to pet owner
9. Make purchase transaction

### 2. Admin Workflow
1. Login as admin
2. View all users
3. Moderate pet listings
4. Monitor transactions
5. Handle support requests

### 3. Error Handling
1. Try invalid login credentials
2. Access protected routes without token
3. Try to create pet without required fields
4. Attempt unauthorized actions

## Performance Testing

```bash
# Test multiple concurrent requests
for i in {1..10}; do
    curl -X GET https://your-worker-url.workers.dev/api/pets &
done
wait

# Check response times
time curl https://your-worker-url.workers.dev/health
```

## Monitoring

### View Real-time Logs
```bash
wrangler tail
```

### Check Worker Analytics
```bash
wrangler analytics
```

### Monitor D1 Database
Check database metrics in Cloudflare Dashboard under D1.

### Monitor R2 Storage
Check storage usage and requests in Cloudflare Dashboard under R2.

## Troubleshooting Common Issues

### 1. CORS Errors
- Check if CORS headers are properly set in worker
- Verify frontend domain is allowed

### 2. Authentication Issues
- Verify JWT secret is set correctly
- Check token expiration
- Ensure proper Authorization header format

### 3. Database Errors
- Verify database schema is applied
- Check database binding in wrangler.toml
- Ensure proper SQL queries

### 4. File Upload Issues
- Check R2 bucket permissions
- Verify file size limits
- Ensure proper MIME type handling

---

**Happy testing! 🧪🐾**
