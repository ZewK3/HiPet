# HiPet Support Portal Documentation

## Overview
HiPet Support Portal là hệ thống hỗ trợ khách hàng cho nền tảng thú cưng HiPet. Portal này cho phép team support quản lý tickets, live chat, knowledge base và hỗ trợ người dùng.

## Portal Structure

### URL: `D:\Web\HiPet\frontend\portal\support\index.html`

## Core Features

### 1. Tickets Management
- **Ticket lifecycle**: Tạo, assign, resolve, close tickets
- **Priority levels**: Low, Medium, High, Critical
- **Categories**: 
  - Account issues
  - Payment problems
  - Pet listing issues
  - Technical support
  - General inquiries
- **Status tracking**: New, In Progress, Waiting for Customer, Resolved, Closed
- **Ticket stats**: New tickets, pending, resolved today, average response time

### 2. Live Chat
- **Real-time messaging**: Instant communication with users
- **Chat queue**: Manage multiple conversations
- **Chat history**: Previous conversation records
- **Auto-routing**: Distribute chats to available agents
- **Chat stats**: Active chats, queue length, response times

### 3. Knowledge Base
- **Article management**: Create, edit, organize help articles
- **Categories**: FAQs, How-to guides, Troubleshooting
- **Search functionality**: Help users find answers
- **Article analytics**: Views, ratings, feedback
- **Content versioning**: Track article changes

### 4. User Management
- **User lookup**: Search users by email, phone, ID
- **Account overview**: User profile, transaction history
- **Quick actions**: Reset password, verify account, suspend user
- **User communication**: Send messages, notifications
- **Support history**: Previous tickets and interactions

### 5. Reports & Analytics
- **Ticket reports**: Volume, resolution time, satisfaction
- **Agent performance**: Individual and team metrics
- **Customer satisfaction**: Survey results, feedback
- **Knowledge base analytics**: Most viewed articles, search queries
- **Response time tracking**: SLA compliance monitoring

### 6. Settings
- **Support team management**: Add/remove agents, set roles
- **Auto-responses**: Canned replies, templates
- **SLA configuration**: Response time targets
- **Escalation rules**: Automatic ticket escalation
- **Integration settings**: Email, SMS, webhooks

## Database Tables (Current & Needed)

### Existing Tables
- **users**: Customer information
- **conversations**: Chat/messaging system (can be repurposed)
- **messages**: Chat messages (can be extended for tickets)

### Missing Support Tables (Need to Create)
```sql
-- Support tickets table
CREATE TABLE support_tickets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uuid TEXT UNIQUE NOT NULL,
    ticket_number TEXT UNIQUE NOT NULL, -- e.g., HP-2024-001234
    user_id INTEGER NOT NULL,
    assigned_agent_id INTEGER,
    subject TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT CHECK (category IN ('account', 'payment', 'pet_listing', 'technical', 'general')) DEFAULT 'general',
    priority TEXT CHECK (priority IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
    status TEXT CHECK (status IN ('new', 'open', 'in_progress', 'waiting_customer', 'resolved', 'closed')) DEFAULT 'new',
    source TEXT CHECK (source IN ('email', 'chat', 'phone', 'portal')) DEFAULT 'portal',
    first_response_at DATETIME,
    resolved_at DATETIME,
    closed_at DATETIME,
    satisfaction_rating INTEGER CHECK (satisfaction_rating BETWEEN 1 AND 5),
    satisfaction_comment TEXT,
    internal_notes TEXT,
    tags TEXT, -- JSON array of tags
    attachments TEXT, -- JSON array of file URLs
    escalated BOOLEAN DEFAULT 0,
    escalated_at DATETIME,
    sla_breached BOOLEAN DEFAULT 0,
    is_deleted BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    version INTEGER DEFAULT 1,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (assigned_agent_id) REFERENCES users(id)
);

-- Ticket messages/replies
CREATE TABLE support_ticket_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ticket_id INTEGER NOT NULL,
    sender_id INTEGER NOT NULL,
    sender_type TEXT CHECK (sender_type IN ('customer', 'agent', 'system')) NOT NULL,
    message TEXT NOT NULL,
    message_type TEXT CHECK (message_type IN ('text', 'attachment', 'internal_note')) DEFAULT 'text',
    attachments TEXT, -- JSON array of file URLs
    is_internal BOOLEAN DEFAULT 0, -- Internal notes only visible to agents
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ticket_id) REFERENCES support_tickets(id),
    FOREIGN KEY (sender_id) REFERENCES users(id)
);

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

-- Chat messages (extends existing messages table concept)
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
```

## Worker.js Endpoints (Need Implementation)

### Ticket Management
```javascript
// GET /api/support/tickets - List tickets with filters
// POST /api/support/tickets - Create new ticket
// GET /api/support/tickets/{id} - Get ticket details
// PUT /api/support/tickets/{id} - Update ticket
// POST /api/support/tickets/{id}/assign - Assign ticket to agent
// POST /api/support/tickets/{id}/messages - Add message to ticket
// PUT /api/support/tickets/{id}/status - Update ticket status
// POST /api/support/tickets/{id}/escalate - Escalate ticket
// PUT /api/support/tickets/{id}/close - Close ticket
```

### Live Chat Management
```javascript
// GET /api/support/chats - List active chat sessions
// POST /api/support/chats - Start new chat session
// GET /api/support/chats/{id} - Get chat details
// POST /api/support/chats/{id}/join - Agent joins chat
// POST /api/support/chats/{id}/messages - Send chat message
// PUT /api/support/chats/{id}/end - End chat session
// GET /api/support/chats/queue - Get chat queue status
```

### Knowledge Base Management
```javascript
// GET /api/support/kb/articles - List articles
// POST /api/support/kb/articles - Create article
// GET /api/support/kb/articles/{id} - Get article
// PUT /api/support/kb/articles/{id} - Update article
// DELETE /api/support/kb/articles/{id} - Delete article
// POST /api/support/kb/articles/{id}/rate - Rate article helpfulness
// GET /api/support/kb/search - Search articles
```

### User Support Functions
```javascript
// GET /api/support/users/{id} - Get user support profile
// GET /api/support/users/{id}/tickets - Get user's tickets
// GET /api/support/users/{id}/chats - Get user's chat history
// POST /api/support/users/{id}/notes - Add internal notes
// PUT /api/support/users/{id}/actions - Perform user actions (reset password, etc.)
```

### Analytics & Reports
```javascript
// GET /api/support/analytics/overview - Support dashboard stats
// GET /api/support/analytics/tickets - Ticket analytics
// GET /api/support/analytics/agents - Agent performance
// GET /api/support/analytics/satisfaction - Customer satisfaction metrics
// GET /api/support/reports/export - Export reports
```

## Required Worker.js Functions

### Ticket Management Functions
```javascript
async function createSupportTicket(request) {
    // Create new support ticket
    // Generate ticket number
    // Send notification to user and support team
}

async function getSupportTickets(request) {
    // List tickets with filters (status, priority, agent, date range)
    // Include pagination and search
}

async function assignTicket(request, ticketId) {
    // Assign ticket to agent
    // Update status and send notifications
    // Log assignment action
}

async function addTicketMessage(request, ticketId) {
    // Add message/reply to ticket
    // Handle attachments
    // Update ticket status and timestamps
}

async function escalateTicket(request, ticketId) {
    // Escalate ticket to higher level support
    // Update priority and reassign
    // Notify management
}
```

### Live Chat Functions
```javascript
async function startChatSession(request) {
    // Create new chat session
    // Add to queue or assign to available agent
    // Return session ID and status
}

async function joinChatSession(request, sessionId) {
    // Agent joins chat session
    // Update session status
    // Notify customer
}

async function sendChatMessage(request, sessionId) {
    // Send message in chat session
    // Handle real-time delivery
    // Store message history
}

async function getChatQueue(request) {
    // Get waiting customers in chat queue
    // Return queue position and estimated wait time
}
```

### Knowledge Base Functions
```javascript
async function createKBArticle(request) {
    // Create new knowledge base article
    // Handle content formatting and media
    // Set initial status as draft
}

async function searchKBArticles(request) {
    // Search articles by keyword
    // Return relevant results with highlighting
    // Track search queries for analytics
}

async function rateKBArticle(request, articleId) {
    // Rate article as helpful/not helpful
    // Update article metrics
    // Collect feedback for improvement
}
```

## CSS Styling
- **File**: `D:\Web\HiPet\frontend\portal\assets\css\support.css`
- **Theme**: Professional support interface với chat-focused design
- **Components**: Ticket tables, chat interface, knowledge base editor

## JavaScript Functionality (Missing)
- **Real-time chat**: WebSocket or SSE for live messaging
- **Ticket management**: CRUD operations for tickets
- **Rich text editor**: For knowledge base articles
- **File upload**: For ticket attachments
- **Auto-refresh**: Live updates for ticket status
- **Search**: KB article search functionality

## User Roles & Permissions

### Support Manager
- Full access to all support features
- Team management and configuration
- Reports and analytics access
- Escalation handling

### Senior Support Agent
- Handle complex tickets and escalations
- Access to all customer data
- Knowledge base editing
- Mentor junior agents

### Support Agent
- Handle regular tickets and chats
- Basic customer lookup
- Create knowledge base articles
- Standard support functions

### Chat Agent
- Specialized in live chat support
- Quick response to customer inquiries
- Basic ticket creation
- Chat queue management

## Integration Points

### Email System
- Ticket notifications via email
- Email-to-ticket conversion
- Auto-responses for common queries

### Main Platform
- Single sign-on with main HiPet platform
- User data synchronization
- Cross-platform notifications

### Third-party Tools
- CRM integration for customer data
- Analytics tools for performance tracking
- Communication tools (Slack, Teams)

## Performance Considerations

### Real-time Features
- WebSocket connections for chat
- Server-sent events for live updates
- Efficient message queuing

### Data Management
- Ticket archiving for old records
- Search indexing for knowledge base
- Caching for frequently accessed data

## Security Features

### Access Control
- Role-based permissions
- Agent authentication
- Customer data protection

### Data Privacy
- PII encryption
- Audit logging
- GDPR compliance

### Communication Security
- Encrypted chat messages
- Secure file uploads
- SSL/TLS for all connections

## SLA Management

### Response Time Targets
- Critical: 15 minutes
- High: 1 hour
- Medium: 4 hours
- Low: 24 hours

### Escalation Rules
- Auto-escalate if SLA breached
- Manager notification for critical issues
- Customer notification for delays

### Performance Metrics
- First response time
- Resolution time
- Customer satisfaction scores
- Agent productivity metrics

## Future Enhancements
- AI-powered ticket categorization
- Chatbot for common queries
- Voice support integration
- Mobile support app
- Advanced analytics dashboard
- Customer self-service portal
- Integration with social media platforms
- Video chat support