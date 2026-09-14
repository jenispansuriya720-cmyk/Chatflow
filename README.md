# ChatFlow — Real-Time Chat & Social Media Platform

**ChatFlow** is a modern, production-grade real-time messaging and social-communication platform inspired by the aesthetics and capabilities of **Instagram, TikTok, WhatsApp, Telegram, and Discord**. It seamlessly combines end-to-end real-time communication via Socket.IO with a full social media ecosystem featuring Posts, Stories, Reels, Live Streaming, Likes, Comments, Shares, Saves, Follows, Mentions, Hashtags, and Creator Profiles.

---

## 1. Features

### Real-Time Messaging Engine
- **Instant Real-Time Messaging**: Bidirectional messaging powered by Socket.IO with conversation rooms and instant delivery.
- **Message Status Receipts**: Real-time status indicators for Sent (✓), Delivered (✓✓ grey), and Read (✓✓ blue).
- **Typing Indicators**: Real-time animated indicator showing when teammates are actively composing messages.
- **Presence & Online Status**: Real-time presence tracking, last seen timestamps, and online badges.
- **Rich Media & File Uploads**: Support for images (with full-screen lightbox preview), videos, documents (PDF, DOCX, ZIP), and voice notes.
- **Voice Messages**: In-app audio recorder using the MediaRecorder API with duration timer, waveform visualizer, and preview player.
- **Message Reactions & Emoji Picker**: Interactive emoji reactions (❤️, 👍, 😂, 😮, 😢, 😡, 🔥) with toggle count badges.
- **Quoted Replies & Forwarding**: Reply directly to messages with quote previews, or forward messages to any other chat.
- **Message Editing & Deletion**: Edit messages inline or delete ("Delete for me" or "Delete for everyone").
- **Group Chats**: Create group channels, assign administrators, edit group info, add/remove members, or leave groups.

### Social Media Ecosystem
- **Stories System**: 24-hour expiring stories, segmented 5-second progress bars, pause-on-hold, tap navigation, emoji reactions, and direct chat thread replies.
- **Posts & Social Feed**: Rich post composer with photo attachments and hashtag pills, multi-image carousel, optimistic likes, comments modal, and share-to-chat.
- **Vertical Reels**: 9:16 vertical video player, play/pause controls, mute/unmute, creator info with follow toggle, rotating audio disc, and action rail (likes, comments, share, save).
- **Live Streaming**: Live channels hub with viewer counters and "LIVE" badges, broadcaster studio with camera/mic preview, viewer watch page with low-latency chat, and floating reaction bursts.
- **Explore & Discovery**: Keyword and hashtag search, trending category pills (`#fullstack`, `#ai`, `#design`, `#react`), and responsive Pinterest/Instagram-style discovery grid.
- **Creator Social Profile**: Cover banner, avatar with online indicator, follower/following/post statistics, follow toggle, message button, and tabbed views for Posts, Reels, and Saved bookmarks.
- **Contacts & User Blocking**: Directory of users, filter online contacts, one-click chat initiation, and user blocking/unblocking.
- **Real-Time Notifications**: Instant alert badges for incoming messages, reactions, mentions, and group events with "Mark all as read".
- **Dark & Light Mode**: Tailored dark theme with subtle borders, glowing brand accents, and accessible contrast.
- **Zero-Config Database Fallback**: Out-of-the-box support for external MongoDB instances, with an embedded in-memory MongoDB fallback if no local Mongo daemon is running.

---

## 2. Technology Stack

### Frontend
- **Framework**: React.js (v18) + Vite
- **Styling**: Tailwind CSS + Custom CSS Design System
- **Icons**: Lucide React
- **Routing**: React Router DOM (v7)
- **Real-time Client**: Socket.IO Client (v4)
- **HTTP Client**: Axios
- **Dates**: date-fns

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Real-time Engine**: Socket.IO (v4)
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens) + bcryptjs password hashing
- **Uploads**: Multer file storage & static delivery

---

## 3. Project Structure

```text
chatflow/
│
├── client/                     # React + Vite Frontend
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   ├── chat/           # ChatList, ChatItem, ChatHeader, MessageBubble, MessageInput, VoiceRecorder
│   │   │   ├── common/         # UserAvatar, LoadingSpinner, Toast
│   │   │   ├── layout/         # Sidebar (Desktop & Mobile bottom bar)
│   │   │   └── modals/         # MediaPreviewModal, ForwardModal, ConversationInfoDrawer
│   │   ├── context/            # AuthContext, SocketContext, ChatContext, ThemeContext
│   │   ├── pages/
│   │   │   ├── auth/           # LoginPage, RegisterPage, ForgotPasswordPage, ResetPasswordPage
│   │   │   ├── chat/           # ChatDashboard
│   │   │   ├── contacts/       # ContactsPage
│   │   │   ├── groups/         # CreateGroupPage
│   │   │   ├── notifications/  # NotificationsPage
│   │   │   ├── profile/        # ProfilePage
│   │   │   ├── settings/       # SettingsPage
│   │   │   └── common/         # NotFoundPage
│   │   ├── services/           # Axios API client
│   │   ├── App.jsx             # Route definitions & protected routes
│   │   ├── main.jsx            # React root
│   │   └── index.css           # Design tokens & glassmorphism
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.js
│
├── server/                     # Node.js + Express Backend
│   ├── config/                 # db.js (MongoDB + MemoryServer fallback)
│   ├── controllers/            # authController, userController, conversationController, messageController, notificationController
│   ├── middleware/             # auth.js, upload.js, errorHandler.js
│   ├── models/                 # User.js, Conversation.js, Message.js, Notification.js
│   ├── routes/                 # Express API routes
│   ├── seed/                   # seedData.js (Demo users & conversations)
│   ├── socket/                 # Socket.IO event handlers
│   ├── test/                   # Automated API & DB test suite
│   ├── uploads/                # Static uploaded files directory
│   ├── .env.example            # Environment template
│   ├── server.js               # Main HTTP & Socket.IO server
│   └── package.json
│
├── package.json                # Root package for concurrent execution
└── README.md
```

---

## 4. Quick Start & Installation

### Prerequisites
- Node.js (v18+ recommended)
- npm (v9+)

### Installation
Clone or navigate to the `chatflow` root directory:

```bash
# 1. Install server dependencies
cd server
npm install

# 2. Install client dependencies
cd ../client
npm install
```

---

## 5. Environment Configuration

In `server/`:
Create or review `.env`:

```env
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173
JWT_SECRET=chatflow_super_secret_jwt_key_2026_modern_realtime_chat
MONGO_URI=mongodb://127.0.0.1:27017/chatflow
```

> **Note on MongoDB**: If you have a local MongoDB daemon or MongoDB Atlas URI, ChatFlow connects to it. If MongoDB is not running locally, ChatFlow automatically falls back to an embedded in-memory database server so you can test all features immediately!

---

## 6. Running the Application

### Option A: Run concurrently from root
```bash
npm run dev
```

### Option B: Run separately in two terminals
**Terminal 1 (Backend):**
```bash
cd server
npm run dev
# Server starts on http://localhost:5000
```

**Terminal 2 (Frontend):**
```bash
cd client
npm run dev
# Client starts on http://localhost:5173
```

Visit **http://localhost:5173** in your web browser.

---

## 7. Automated Backend Tests

To run the automated test suite verifying User Authentication, Password Encryption, Conversations, Messages, Reactions, and User Blocking:

```bash
cd server
npm test
```

---

## 8. API Reference

### Authentication
- `POST /api/auth/register` — Register a new account
- `POST /api/auth/login` — Sign in with email/username and password
- `POST /api/auth/logout` — Invalidate user session
- `GET  /api/auth/me` — Fetch currently authenticated user
- `POST /api/auth/forgot-password` — Generate password reset token
- `POST /api/auth/reset-password` — Reset password using token

### Conversations
- `GET  /api/conversations` — Get user's conversation list with unread counts
- `POST /api/conversations/direct/:userId` — Start or get direct conversation
- `POST /api/conversations/group` — Create a new group conversation
- `GET  /api/conversations/:id` — Get conversation details
- `PUT  /api/conversations/:id/pin` — Toggle pin status
- `PUT  /api/conversations/:id/mute` — Toggle mute status
- `DELETE /api/conversations/:id` — Delete conversation

### Messages
- `GET    /api/messages/:conversationId` — Get paginated messages for a conversation
- `POST   /api/messages` — Send a new message (text, attachments, voice notes, reply)
- `PUT    /api/messages/:id` — Edit a sent message
- `DELETE /api/messages/:id` — Delete message ('for_everyone' or 'for_me')
- `POST   /api/messages/:id/react` — Add/toggle emoji reaction
- `POST   /api/messages/:id/forward` — Forward message to another conversation
- `PUT    /api/messages/read/:conversationId` — Mark conversation messages as read

### Media Upload
- `POST /api/upload` — Upload image, audio, video, or document (returns static URL)

### Notifications
- `GET /api/notifications` — Get user notifications
- `PUT /api/notifications/read-all` — Mark all notifications as read

---

## 9. Real-Time Socket.IO Events

| Event Name | Direction | Description |
| :--- | :--- | :--- |
| `setupUser` | Client → Server | Registers user socket with active session |
| `getOnlineUsers` | Server → Client | Initial set of all online user IDs |
| `userOnline` | Server → Client | Broadcasts when a user connects |
| `userOffline` | Server → Client | Broadcasts when a user disconnects |
| `joinConversation` | Client → Server | Joins conversation room |
| `sendMessage` | Client → Server | Dispatches real-time message to room |
| `receiveMessage` | Server → Client | Delivers new message to conversation room |
| `typing` | Client → Server | Emits typing state |
| `userTyping` | Server → Client | Broadcasts user typing notification |
| `stopTyping` | Client → Server | Cancels typing state |
| `messageReaction` | Bidirectional | Updates emoji reactions on a message |
| `messageEdited` | Bidirectional | Updates edited message content |
| `messageDeleted` | Bidirectional | Broadcasts deletion state |

---

## 10. License
MIT License. Built for production-ready real-time communication.
