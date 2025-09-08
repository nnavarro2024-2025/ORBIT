# 🎯 TaskMasterPro - Integrated Campus Management System

[![React](https://img.shields.io/badge/React-18-blue.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green.svg)](https://supabase.com/)
[![Vercel](https://img.shields.io/badge/Deploy-Vercel-black.svg)](https://vercel.com/)

A modern, full-stack campus management system designed for educational institutions. Combines computer lab management (ORZ System) with facility booking capabilities, featuring real-time session tracking, automated workflows, and comprehensive administrative oversight.

## 🌟 Key Features

### 🖥️ **ORZ Computer Lab Management**

- **Real-time Session Tracking** - Monitor active computer sessions across multiple labs
- **Smart Auto-logout** - Automatic session termination after 10 minutes of inactivity
- **Time Extension System** - Students can request additional time with admin approval
- **Comprehensive Analytics** - Session history, usage patterns, and lab utilization reports
- **Multi-lab Support** - Manage multiple computer labs (Lab A, Lab B, Lab C)

### 🏢 **Facility Booking System**

- **Room Reservations** - Book collaborative learning rooms, board rooms, and study spaces
- **Approval Workflow** - Admin approval system for facility bookings
- **Email Notifications** - Automated confirmations and reminders via SMTP
- **Booking Calendar** - Visual calendar interface for availability checking
- **Conflict Prevention** - Automatic detection and prevention of double-bookings

### 👥 **Role-Based Access Control**

- **Students** - Access to ORZ sessions and facility booking
- **Faculty** - Enhanced booking privileges and extended session limits
- **Administrators** - Full system control, user management, and analytics
- **Banned User Handling** - Automatic restriction system with custom messaging

### 🔧 **Administrative Features**

- **User Management** - Create, edit, ban/unban users with detailed profiles
- **Session Control** - Monitor, extend, or terminate active sessions
- **Booking Oversight** - Approve/reject facility requests with notes
- **System Analytics** - Comprehensive dashboards and usage reports
- **Activity Logging** - Complete audit trail of all system activities

## 🛠️ Technology Stack

### **Frontend**

- **React 18** - Modern React with hooks and functional components
- **TypeScript** - Full type safety and enhanced developer experience
- **Vite** - Lightning-fast build tool and development server
- **Tailwind CSS** - Utility-first CSS framework for responsive design
- **Shadcn/ui** - Modern component library built on Radix UI
- **React Query** - Powerful data fetching and state management

### **Backend**

- **Node.js 18+** - Server-side JavaScript runtime
- **Express.js** - Fast, unopinionated web framework
- **TypeScript** - End-to-end type safety
- **Drizzle ORM** - Type-safe database toolkit
- **Supabase Auth** - Authentication and user management
- **SMTP Integration** - Email notifications via Nodemailer

### **Database & Infrastructure**

- **PostgreSQL** - Robust relational database via Supabase
- **Supabase** - Backend-as-a-Service with real-time capabilities
- **Vercel** - Serverless deployment platform
- **Redis** (Optional) - Session caching and real-time features

### **Development Tools**

- **ESLint + Prettier** - Code formatting and linting
- **Husky** - Git hooks for code quality
- **Drizzle Kit** - Database migration and introspection
- **Concurrently** - Run multiple development servers

## 🚀 Quick Start

### **Prerequisites**

- **Node.js 18+** - [Download here](https://nodejs.org/)
- **Git** - [Download here](https://git-scm.com/)
- **VS Code** - [Download here](https://code.visualstudio.com/) (Recommended)
- **Supabase Account** - [Sign up here](https://supabase.com/)

### **1. Clone & Setup**

```bash
# Clone the repository
git clone https://github.com/your-username/TaskMasterPro.git
cd TaskMasterPro

# Install dependencies
npm install
cd client && npm install && cd ..
```

### **2. Environment Configuration**

```bash
# Copy environment template
cp .env.example .env
```

Edit `.env` with your Supabase credentials:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Database
DATABASE_URL=postgresql://postgres:password@db.your-project.supabase.co:5432/postgres

# Application
SESSION_SECRET=your_secure_random_string_here
VITE_API_URL=http://localhost:5000

# Email Configuration (Optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@domain.com
SMTP_PASS=your_app_password
SMTP_FROM="TaskMasterPro <your_email@domain.com>"
```

### **3. Database Setup**

```bash
# Push database schema
npm run db:push

# (Optional) Seed with sample data
npm run db:seed
```

### **4. Start Development**

```bash
# Start both frontend and backend
npm run dev

# Or start individually
npm run dev:server  # Backend on :5000
npm run dev:client  # Frontend on :5173
```

Visit **http://localhost:5173** to access the application.

## 📦 Deployment

### **Deploy to Vercel (Recommended)**

#### **Automated Deployment**

```bash
# Using the deployment script
./scripts/deploy.ps1

# Or manually
npx vercel --prod
```

#### **Environment Variables (Vercel)**

Add these in your Vercel dashboard:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
DATABASE_URL=postgresql://postgres:password@db.your-project.supabase.co:5432/postgres
SESSION_SECRET=your_secure_random_string
NODE_ENV=production
```

### **Other Deployment Options**

- **Docker** - Dockerfile included for containerized deployment
- **Railway** - One-click deployment with PostgreSQL
- **Heroku** - Traditional cloud platform deployment
- **VPS** - Self-hosted with PM2 process manager

## 📁 Project Structure

```
TaskMasterPro/
├── 📁 client/                    # React Frontend Application
│   ├── 📁 src/
│   │   ├── 📁 components/        # Reusable UI Components
│   │   │   ├── 📁 ui/           # Shadcn/ui Base Components
│   │   │   ├── 📁 modals/       # Modal Components
│   │   │   ├── Header.tsx       # Navigation Header
│   │   │   └── Sidebar.tsx      # Navigation Sidebar
│   │   ├── 📁 pages/            # Route Components
│   │   │   ├── 📁 admin/        # Admin Dashboard Pages
│   │   │   ├── 📁 student/      # Student Dashboard Pages
│   │   │   ├── Login.tsx        # Authentication Page
│   │   │   └── Landing.tsx      # Public Landing Page
│   │   ├── 📁 lib/              # Utilities & Configuration
│   │   │   ├── supabase.ts      # Supabase Client Setup
│   │   │   ├── api.ts           # API Client Functions
│   │   │   └── utils.ts         # Helper Functions
│   │   ├── 📁 hooks/            # Custom React Hooks
│   │   └── App.tsx              # Main Application Component
│   ├── index.html               # HTML Entry Point
│   ├── package.json             # Frontend Dependencies
│   └── vite.config.ts           # Vite Configuration
├── 📁 server/                    # Express Backend Application
│   ├── 📁 services/             # Business Logic Services
│   │   ├── emailService.ts      # Email Handling
│   │   ├── sessionService.ts    # Session Management
│   │   └── userService.ts       # User Operations
│   ├── db.ts                    # Database Connection (Local)
│   ├── db-vercel.ts             # Database Connection (Serverless)
│   ├── routes.ts                # API Route Definitions
│   ├── storage.ts               # Data Access Layer
│   ├── supabaseAdmin.ts         # Supabase Admin Client
│   └── index.ts                 # Server Entry Point
├── 📁 api/                       # Vercel Serverless Functions
│   ├── index.ts                 # Main API Handler
│   ├── facilities.ts            # Facility Management API
│   ├── computer-stations.ts     # Station Management API
│   └── 📁 auth/                 # Authentication APIs
├── 📁 shared/                    # Shared Code & Types
│   └── schema.ts                # Database Schema (Drizzle)
├── 📁 migrations/                # Database Migration Files
├── 📁 scripts/                   # Utility Scripts
│   ├── deploy.ps1               # Deployment Script
│   ├── dev.ps1                  # Development Setup
│   └── system-test.mjs          # System Testing
├── .env.example                 # Environment Template
├── drizzle.config.ts            # Drizzle ORM Configuration
├── package.json                 # Root Dependencies & Scripts
├── tailwind.config.ts           # Tailwind CSS Configuration
├── tsconfig.json                # TypeScript Configuration
├── vercel.json                  # Vercel Deployment Config
└── README.md                    # This File
```

## 🔌 API Reference

### **Authentication**

```http
GET  /api/auth/user              # Get current user profile
POST /api/auth/login             # User authentication
POST /api/auth/logout            # User logout
```

### **ORZ Computer Sessions**

```http
GET    /api/orz/sessions         # List all sessions (admin)
POST   /api/orz/sessions         # Start new session
GET    /api/orz/sessions/:id     # Get session details
PUT    /api/orz/sessions/:id     # Update session
DELETE /api/orz/sessions/:id     # End session
POST   /api/orz/extend/:id       # Request time extension
```

### **Facility Bookings**

```http
GET    /api/bookings             # Get user bookings
POST   /api/bookings             # Create new booking
PUT    /api/bookings/:id         # Update booking
DELETE /api/bookings/:id         # Cancel booking
GET    /api/facilities           # List available facilities
```

### **Administration**

```http
GET    /api/admin/users          # User management
PUT    /api/admin/users/:id      # Update user profile
POST   /api/admin/ban/:id        # Ban/unban user
GET    /api/admin/analytics      # System analytics
GET    /api/admin/logs           # Activity logs
```

## 📊 Database Schema

### **Core Tables**

- **`users`** - User profiles, roles, and authentication data
- **`orz_sessions`** - Computer lab session tracking
- **`facilities`** - Available rooms and spaces
- **`bookings`** - Facility reservation records
- **`computer_stations`** - Lab workstation inventory
- **`time_extension_requests`** - Session extension workflows
- **`activity_logs`** - System audit trail

### **Key Relationships**

- Users can have multiple ORZ sessions and bookings
- Facilities can have multiple bookings (time-based)
- Sessions belong to specific computer stations
- Extension requests link to active sessions

## 🎯 Usage Examples

### **Starting a Computer Session**

1. Student logs in and navigates to ORZ Dashboard
2. Selects available computer station
3. Session begins with automatic tracking
4. System monitors for inactivity (10-minute timeout)
5. Student can request extensions before timeout

### **Booking a Facility**

1. User accesses Booking Dashboard
2. Selects facility and desired time slot
3. Submits booking request with details
4. Admin receives notification for approval
5. User receives confirmation email once approved

### **Administrative Oversight**

1. Admin views real-time dashboard with active sessions
2. Can extend, terminate, or transfer sessions
3. Manages facility booking approvals
4. Reviews system analytics and user activity
5. Handles user management (ban/unban, role changes)

## 🔒 Security Features

- **Role-Based Access Control** - Granular permissions system
- **JWT Authentication** - Secure token-based authentication
- **SQL Injection Prevention** - Parameterized queries via Drizzle ORM
- **CORS Protection** - Configured cross-origin resource sharing
- **Environment Variables** - Sensitive data protection
- **Audit Logging** - Complete activity trail for compliance
- **Rate Limiting** - API abuse prevention
- **Input Validation** - Server-side data validation

## 🧪 Testing

```bash
# Run type checking
npm run check

# Run linting
npm run lint

# Run tests (when implemented)
npm run test

# Run system test
node scripts/system-test.mjs
```

## 📈 Performance

- **Frontend**: Vite for fast builds and HMR
- **Backend**: Express.js with efficient middleware
- **Database**: PostgreSQL with optimized queries
- **Caching**: Session data caching for performance
- **CDN**: Static assets served via Vercel Edge Network
- **Code Splitting**: Lazy-loaded routes and components

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙋‍♂️ Support

For support, email support@taskmaster.pro or join our Discord community.

## 🔄 Changelog

### v2.0.0 (Current)

- 🎉 Complete system redesign with modern tech stack
- ✨ Real-time session tracking and facility booking
- 🔐 Enhanced security and role-based access
- 📱 Responsive design for mobile and desktop
- 🚀 Optimized for Vercel deployment

---

**Built with ❤️ for educational institutions**

_Last Updated: September 8, 2025_
