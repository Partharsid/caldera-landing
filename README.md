# Arcade Management System - RR Downtown

A modern arcade management system built with Next.js 15, Supabase, Tailwind CSS, and Shadcn UI.

## Features

- **Service Management**: Track courts, machines, and tables with peak/off-peak pricing
- **Inventory System**: Manage food, beverage, and misc items with stock tracking
- **Slot Booking**: Time-based slot management with availability status
- **Transaction Processing**: Handle payments (cash/UPI) with unified cart data
- **Membership System**: Track user passes with remaining hours

## Tech Stack

- **Next.js 15** (App Router, TypeScript)
- **Supabase** (PostgreSQL database, auth, real-time)
- **Tailwind CSS v4** (styling)
- **Shadcn UI** (Radix-based component library)
- **React Query** (data fetching)
- **Lucide React** (icons)

## Project Structure

```
src/
  app/              # Next.js app router pages
  components/       # React components
    ui/             # Shadcn UI components
  lib/              # Utilities (supabase client, react-query)
supabase/
  migrations/       # Database migration files
```

## Getting Started

### Prerequisites
- Node.js 18+ and npm
- Supabase account and project

### Installation

1. Clone the repository:
   ```bash
   git clone <repo-url>
   cd rrdowntown.in
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.local.example .env.local
   ```
   Edit `.env.local` with your Supabase credentials:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   ```

4. Run database migrations:
   ```bash
   # Using Supabase CLI
   supabase db reset
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Database Schema

The system includes five main tables:

1. **services** - Arcade services (courts, machines, tables)
2. **inventory** - Food, beverage, and misc items
3. **slots** - Time slots for service bookings
4. **transactions** - Payment transactions with cart data
5. **memberships** - User membership passes

See `supabase/migrations/001_initial_arcade_tables.sql` for full schema.

## Development

- Run TypeScript checks: `npx tsc --noEmit`
- Format code: `npm run lint`
- Build for production: `npm run build`

## Deployment

This project is configured for deployment on Vercel. Connect your GitHub repository to Vercel and set the environment variables.

## License

MIT