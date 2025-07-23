# ORBIT - Integrated Library Facility & Computer Usage Management System

A comprehensive university library management system with dual subsystems for computer usage tracking and facility booking, featuring role-based access and administrative oversight.

## Features

### ORZ Computer Usage System
- Real-time computer session tracking
- Automatic logout after 10 minutes of inactivity
- Time extension requests with admin approval
- Session history and analytics

### Library Facility Booking System
- Facility reservation management
- Admin approval workflow
- Email notifications for bookings
- Booking history and reports

### Role-Based Access Control
- **Students**: Access to ORZ and booking systems
- **Faculty**: Enhanced booking privileges
- **Administrators**: Full system management and oversight

## Tech Stack

- **Frontend**: React 18 + TypeScript, Vite, Tailwind CSS, Radix UI
- **Backend**: Node.js, Express.js, TypeScript
- **Database**: PostgreSQL (Supabase)
- **Authentication**: Supabase Auth
- **Deployment**: Vercel
- **ORM**: Drizzle ORM

## Prerequisites

- Node.js 18+ 
- PowerShell (for Windows users)
- Supabase account
- Vercel account

## VS Code Setup (Windows PowerShell)

### 1. Prerequisites
- Windows 10/11 with PowerShell 5.1 or later
- Node.js 18+ from [nodejs.org](https://nodejs.org/)
- Git for Windows (optional, for version control)

### 2. Quick Start

1. **Extract/Copy the project folder** to your desired location
2. **Open in VS Code**: Right-click the folder → "Open with Code"
3. **Install recommended extensions** when prompted
4. **Open PowerShell terminal** in VS Code: `Ctrl + Shift + ` (backtick)

### 3. Automated Setup

Run the automated setup script:
```powershell
.\scripts\dev.ps1
```

### 4. Manual Setup

If you prefer manual setup:

#### Step 1: Install Dependencies
```powershell
npm install
```

#### Step 2: Database Setup (Supabase)
1. Go to [Supabase Dashboard](https://supabase.com/dashboard/projects)
2. Create a new project
3. Go to Settings → Database
4. Copy the "Connection string" from the "Connection pooling" section
5. Replace `[YOUR-PASSWORD]` with your database password

#### Step 3: Environment Configuration
```powershell
Copy-Item .env.example .env
```

Edit `.env` file with your actual values:
```env
DATABASE_URL=postgresql://postgres:your_password@db.project_id.supabase.co:5432/postgres
SESSION_SECRET=your_very_secure_random_string_here
NEXT_PUBLIC_SUPABASE_URL=https://your_project_id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
VITE_SUPABASE_URL=https://your_project_id.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

#### Step 4: Database Schema Setup
```powershell
npm run db:push
```

#### Step 5: Start Development
```powershell
npm run dev
```

The application will be available at `http://localhost:5000`

## Deployment to Vercel

### Automated Deployment
```powershell
.\scripts\deploy.ps1
```

### Manual Deployment

#### Step 1: Build the Project
```powershell
npm run build
```

#### Step 2: Deploy to Vercel
```powershell
# Install Vercel CLI (if not already installed)
npm install -g vercel

# Login to Vercel
vercel login

# Deploy to production
vercel --prod
```

#### Step 3: Configure Environment Variables
In your Vercel dashboard, add these environment variables:
- `DATABASE_URL` - Your Supabase database connection string
- `SESSION_SECRET` - A secure random string for session encryption
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anonymous key
- `NODE_ENV` - Set to `production`

## Project Structure

```
orbit/
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── hooks/          # Custom React hooks
│   │   ├── lib/            # Utility functions
│   │   ├── pages/          # Route components
│   │   └── index.css       # Global styles
│   └── index.html
├── server/                 # Backend Express application
│   ├── services/           # Business logic services
│   ├── db.ts              # Database connection
│   ├── index.ts           # Server entry point
│   ├── routes.ts          # API routes
│   └── storage.ts         # Data access layer
├── shared/                 # Shared types and schemas
│   └── schema.ts          # Database schema definitions
├── api/                   # Vercel serverless functions
├── migrations/            # Database migrations
├── .env.example           # Environment variables template
├── drizzle.config.ts      # Drizzle ORM configuration
├── package.json           # Dependencies and scripts
├── tailwind.config.ts     # Tailwind CSS configuration
├── tsconfig.json          # TypeScript configuration
├── vercel.json            # Vercel deployment configuration
└── vite.config.ts         # Vite build configuration
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run db:push` - Push database schema changes
- `npm run check` - TypeScript type checking

## Authentication Flow

1. Users access the landing page
2. Click "Get Started" to initiate authentication
3. Supabase handles authentication process
4. Upon successful login, users are redirected based on their role
5. Session management is handled automatically

## API Endpoints

- `GET /api/auth/user` - Get current user information
- `POST /api/orz/sessions` - Start computer session
- `GET /api/orz/sessions/:id` - Get session details
- `POST /api/bookings` - Create facility booking
- `GET /api/bookings` - Get user bookings
- `GET /api/admin/*` - Admin-only endpoints

## Database Schema

The system uses the following main tables:
- `users` - User profiles and roles
- `orz_sessions` - Computer usage sessions
- `facilities` - Available facilities
- `bookings` - Facility reservations
- `computer_stations` - Computer workstations
- `time_extension_requests` - Session extension requests
- `activity_logs` - System activity audit trail

## Support

For technical support or questions about the system, please refer to the documentation or contact the development team.
# ORBIT
