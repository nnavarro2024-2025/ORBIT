# 🚀 ORBIT - Campus Management System

> **"Revolutionizing Campus Technology, One Innovation at a Time"**  
> *Developed by James Lemuel M. Rabang - BSIT Student, University of the Immaculate Conception*

[![React](https://img.shields.io/badge/React-18-blue.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green.svg)](https://supabase.com/)
[![Vercel](https://img.shields.io/badge/Deploy-Vercel-black.svg)](https://vercel.com/)

A comprehensive, full-stack campus management system designed for educational institutions. ORBIT combines computer lab management with facility booking capabilities, featuring real-time session tracking, automated workflows, and comprehensive administrative oversight.

## 🌟 Key Features

### 🖥️ **Computer Lab Management**

- **Real-time Session Tracking** - Monitor active computer sessions across multiple labs
- **Smart Auto-logout** - Automatic session termination after configurable inactivity periods
- **Time Extension System** - Students can request additional time with admin approval workflow
- **Comprehensive Analytics** - Session history, usage patterns, and lab utilization reports
- **Multi-lab Support** - Manage multiple computer labs with individual station tracking

### 🏢 **Facility Booking System**

- **Room Reservations** - Book collaborative learning rooms, board rooms, and study spaces
- **Approval Workflow** - Admin approval system for facility bookings with notification system
- **Email Notifications** - Automated confirmations and reminders via integrated email service
- **Booking Calendar** - Visual calendar interface for availability checking and scheduling
- **Conflict Prevention** - Automatic detection and prevention of double-bookings

### 👥 **Role-Based Access Control**

- **Students** - Access to computer sessions and facility booking with appropriate limitations
- **Faculty** - Enhanced booking privileges and extended session limits
- **Administrators** - Full system control, user management, analytics, and system oversight
- **Ban Management** - Comprehensive user restriction system with custom messaging and appeals

### 🔧 **Administrative Features**

- **User Management** - Create, edit, ban/unban users with detailed profiles and role assignment
- **Session Control** - Monitor, extend, or terminate active sessions with detailed logging
- **Booking Oversight** - Approve/reject facility requests with admin notes and communication
- **System Analytics** - Comprehensive dashboards showing usage patterns and system health
- **Activity Logging** - Complete audit trail of all system activities for compliance

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
git clone https://github.com/james-hub21/ORBIT.git
cd ORBIT

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
SMTP_FROM="ORBIT System <your_email@domain.com>"
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
ORBIT/
├── 📁 client/                    # React Frontend Application
│   ├── 📁 src/
│   │   ├── 📁 components/        # Reusable UI Components
│   │   │   ├── 📁 ui/           # Shadcn/ui Base Components
│   │   │   ├── 📁 modals/       # Modal Components (Booking, Profile, etc.)
│   │   │   ├── Header.tsx       # Navigation Header
│   │   │   ├── Sidebar.tsx      # Navigation Sidebar
│   │   │   ├── ToastNotification.tsx  # Toast System
│   │   │   └── UserEmailDisplay.tsx   # User Info Display
│   │   ├── 📁 pages/            # Route Components
│   │   │   ├── 📁 admin/        # Admin Dashboard Pages
│   │   │   ├── 📁 student/      # Student Dashboard Pages
│   │   │   ├── Login.tsx        # Authentication Page
│   │   │   ├── Landing.tsx      # Public Landing Page
│   │   │   └── BannedUser.tsx   # Banned User Interface
│   │   ├── 📁 lib/              # Utilities & Configuration
│   │   │   ├── supabase.ts      # Supabase Client Setup
│   │   │   ├── api.ts           # API Client Functions
│   │   │   ├── authUtils.ts     # Authentication Utilities
│   │   │   ├── queryClient.ts   # React Query Setup
│   │   │   └── utils.ts         # Helper Functions
│   │   ├── 📁 hooks/            # Custom React Hooks
│   │   │   ├── useAuth.ts       # Authentication Hook
│   │   │   ├── use-toast.ts     # Toast Hook
│   │   │   └── use-mobile.tsx   # Mobile Detection Hook
│   │   └── App.tsx              # Main Application Component
│   ├── index.html               # HTML Entry Point
│   ├── package.json             # Frontend Dependencies
│   ├── tailwind.config.ts       # Tailwind Configuration
│   └── vite.config.ts           # Vite Configuration
├── 📁 server/                    # Express Backend Application
│   ├── 📁 services/             # Business Logic Services
│   │   ├── emailService.ts      # Email Handling & SMTP
│   │   ├── sessionService.ts    # Session Management Logic
│   │   └── userService.ts       # User Operations & Management
│   ├── db.ts                    # Database Connection (Local Development)
│   ├── db-vercel.ts             # Database Connection (Serverless)
│   ├── routes.ts                # API Route Definitions
│   ├── storage.ts               # Data Access Layer
│   ├── supabase.ts              # Supabase Client
│   ├── supabaseAdmin.ts         # Supabase Admin Client
│   ├── supabaseAuth.ts          # Supabase Authentication
│   └── index.ts                 # Server Entry Point
├── 📁 api/                       # Vercel Serverless Functions
│   ├── index.ts                 # Main API Handler
│   ├── facilities.ts            # Facility Management API
│   ├── computer-stations.ts     # Station Management API
│   └── 📁 auth/                 # Authentication APIs
│       └── user.ts              # User Authentication Endpoint
├── 📁 shared/                    # Shared Code & Types
│   └── schema.ts                # Database Schema (Drizzle ORM)
├── 📁 migrations/                # Database Migration Files
│   ├── 0000_update_facility_names.sql
│   ├── 0001_delete_extra_facilities.sql
│   ├── 0002_add_ban_fields.sql
│   └── 📁 meta/                 # Migration Metadata
├── 📁 scripts/                   # Utility Scripts
│   ├── deploy.ps1               # Windows Deployment Script
│   ├── dev.ps1                  # Development Setup Script
│   ├── prepare-deploy.ps1       # Deployment Preparation
│   ├── start-dev.ps1            # Development Startup
│   ├── system-test.mjs          # System Testing Suite
│   └── test-api.mjs             # API Testing Script
├── 📁 attached_assets/           # Documentation & Assets
├── .env.example                 # Environment Template
├── components.json              # Shadcn/ui Configuration
├── drizzle.config.ts            # Drizzle ORM Configuration
├── package.json                 # Root Dependencies & Scripts
├── tailwind.config.ts           # Tailwind CSS Configuration
├── tsconfig.json                # TypeScript Configuration
├── vercel.json                  # Vercel Deployment Config
├── vite.config.vercel.ts        # Vite Vercel Configuration
└── README.md                    # This File
```

## 🔌 API Reference

### **Authentication**

```http
GET  /api/auth/user              # Get current user profile
POST /api/auth/login             # User authentication
POST /api/auth/logout            # User logout
```

### **Computer Sessions**

```http
GET    /api/computer-stations     # List all computer stations and availability
POST   /api/computer-stations     # Start new computer session
GET    /api/computer-stations/:id # Get specific station details
PUT    /api/computer-stations/:id # Update session or extend time
DELETE /api/computer-stations/:id # End computer session
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

- **`users`** - User profiles, roles, authentication data, and ban status
- **`computer_sessions`** - Computer lab session tracking with timestamps
- **`facilities`** - Available rooms and spaces for booking
- **`bookings`** - Facility reservation records with approval status
- **`computer_stations`** - Lab workstation inventory and availability
- **`time_extension_requests`** - Session extension workflows and approvals
- **`activity_logs`** - System audit trail for compliance and monitoring

### **Key Relationships**

- Users can have multiple computer sessions and facility bookings
- Facilities can have multiple bookings with time-based availability
- Sessions are linked to specific computer stations in designated labs
- Extension requests are associated with active computer sessions
- Admin actions are logged with user attribution and timestamps

## 🎯 Usage Examples

### **Starting a Computer Session**

1. Student logs in and navigates to Computer Lab Dashboard
2. Selects available computer station from real-time availability display
3. Session begins with automatic tracking and activity monitoring
4. System monitors for inactivity with configurable timeout periods
5. Student can request time extensions through the interface before timeout
6. Admin can approve/deny extension requests with notification system

### **Booking a Facility**

1. User accesses Facility Booking Dashboard with calendar view
2. Selects desired facility and available time slot
3. Submits booking request with purpose and additional details
4. Admin receives notification for approval workflow
5. User receives email confirmation once booking is approved
6. System prevents conflicts and manages booking modifications

### **Administrative Oversight**

1. Admin views comprehensive real-time dashboard with active sessions and bookings
2. Can extend, terminate, or transfer computer sessions with detailed logging
3. Manages facility booking approvals with notes and communication tools
4. Reviews system analytics including usage patterns and user behavior
5. Handles user management including role assignments and ban/unban actions
6. Monitors system health and performance through integrated dashboards

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

# Run linting (if configured)
npm run lint

# Run system tests
node scripts/system-test.mjs

# Run API tests
node scripts/test-api.mjs

# Test system integration
npm run test-system
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

For support and questions about the ORBIT system, please:

- Create an issue on GitHub: https://github.com/james-hub21/ORBIT/issues
- Contact the development team through the repository
- Check the documentation and guides in the attached_assets folder

## 🔄 Changelog

### v1.0.0 (Current)

- 🎉 Initial release of ORBIT Campus Management System
- ✨ Real-time computer session tracking and facility booking system
- 🔐 Comprehensive security with role-based access control
- 📱 Responsive design optimized for desktop and mobile devices
- 🚀 Production-ready deployment with Vercel and Supabase
- 📊 Advanced analytics and reporting capabilities
- 📧 Integrated email notification system
- 🛡️ User ban/unban management with appeals system

---

## 👨‍💻 Developer

**ORBIT Campus Management System** was developed by:

### **James Lemuel M. Rabang**
- 🎓 **Program**: Bachelor of Science in Information Technology  
- 🏫 **University**: University of the Immaculate Conception  
- 📅 **Year**: 3rd Year Student  
- 💻 **Role**: Lead Developer & System Architect

> *"Developed with passion for creating innovative solutions that enhance educational technology and campus management systems."*

### 🎯 Development Focus
- Full-stack web development with modern technologies
- Campus management and educational technology solutions
- Real-time systems and user experience optimization
- Scalable architecture and deployment strategies

---

**Built with ❤️ for educational institutions by James Lemuel M. Rabang**

_Last Updated: September 8, 2025_
