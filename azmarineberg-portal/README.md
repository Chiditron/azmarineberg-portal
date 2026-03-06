# Azmarineberg Consulting Limited – Client Portal

A secure, multi-tenant, enterprise-grade client-facing web portal for Azmarineberg Consulting Limited, an accredited environmental consulting firm in Nigeria.

## Tech Stack

- **Frontend:** React 18, TypeScript, Vite, React Router, TanStack Query, Tailwind CSS
- **Backend:** Node.js, Express, TypeScript
- **Database:** PostgreSQL
- **File Storage:** MinIO (S3-compatible)
- **Cache:** Redis
- **Auth:** JWT + refresh tokens, bcrypt

## Getting Started

### Prerequisites

- Node.js 18+
- Docker & Docker Compose (for local dev)
- npm or pnpm

### Local Development

1. **Start infrastructure:**
   ```bash
   docker-compose up -d
   ```

2. **Install dependencies:**
   ```bash
   npm install
   cd server && npm install
   cd ../client && npm install
   ```

3. **Configure environment:**
   - Copy `server/.env.example` to `server/.env`
   - Update database and other config as needed

4. **Run migrations and seed:**
   ```bash
   npm run db:migrate
   npm run db:seed
   ```

5. **Start dev servers:**
   ```bash
   npm run dev
   ```

- Frontend: http://localhost:5173
- Backend API: http://localhost:3000

### Default Super Admin

After seeding, log in with:
- Email: `superadmin@azmarineberg.com`
- Password: (check seed script or set in .env)

## Project Structure

```
azmarineberg-portal/
├── client/           # React SPA
├── server/           # Node.js API
├── shared/           # Shared types & constants
├── docker-compose.yml
└── README.md
```

## License

Proprietary – Azmarineberg Consulting Limited
