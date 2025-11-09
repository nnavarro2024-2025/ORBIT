# ORBIT - Online Resource Booking & Inventory Tracking

A modern facility booking and management system built with Next.js 16, featuring real-time availability, admin dashboard, and integrated notifications.

## Features

- 🏢 **Facility Booking System** - Book collaborative learning rooms, board rooms, and other facilities
- 👥 **User Management** - Role-based access control (Student, Faculty, Admin)
- 📊 **Admin Dashboard** - Comprehensive booking management and analytics
- 🔔 **Real-time Notifications** - Instant alerts for bookings and updates
- 📧 **Email Integration** - Automated booking confirmations
- 🔐 **Supabase Authentication** - Secure authentication with UIC email domain restriction
- 🎨 **Modern UI** - Built with shadcn/ui components and Tailwind CSS

## Tech Stack

- **Framework:** Next.js 16 (App Router) with React 19
- **Database:** PostgreSQL via Supabase
- **ORM:** Drizzle ORM
- **Authentication:** Supabase Auth
- **UI:** shadcn/ui, Tailwind CSS, Radix UI
- **Forms:** React Hook Form + Zod validation
- **State Management:** TanStack Query

## Getting Started

### Prerequisites
- Node.js 20+ installed
- Access to Supabase database
- Environment variables configured

### Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   Copy `.env.local` or `.env.production` and configure your database and API credentials.

3. **Run development server:**
   ```bash
   npm run dev
   ```

4. **Open application:**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Deployment

### Deploy to Vercel (Recommended)

This application is optimized for Vercel deployment. See [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md) for detailed instructions.

**Quick Deploy:**
1. Push code to GitHub
2. Import project to Vercel
3. Configure environment variables
4. Deploy!

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

## Project Structure

```
orbit-next/
├── src/
│   ├── app/              # Next.js app router pages
│   │   ├── (app)/       # Protected app pages
│   │   └── api/         # API routes
│   ├── components/      # React components
│   ├── lib/            # Utilities and helpers
│   └── server/         # Server-side code
│       ├── auth.ts     # Authentication logic
│       ├── db.ts       # Database connection
│       └── storage.ts  # Data access layer
├── shared/             # Shared schema definitions
└── migrations/         # Database migrations

```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server

## Environment Variables

See `.env.local` for required environment variables including:
- Database connection strings
- Supabase configuration
- SMTP settings
- External API credentials

## Documentation

- [Vercel Deployment Guide](./VERCEL_DEPLOYMENT.md) - Complete deployment instructions
- [Next.js Documentation](https://nextjs.org/docs)
- [Drizzle ORM Docs](https://orm.drizzle.team)

## Support

For issues or questions, please contact the development team.
