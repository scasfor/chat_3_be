# COI-Bot Admin Panel

Comprehensive documentation for the COI-Bot Admin backend and dashboard.

## Overview

COI-Bot Admin is a Next.js (App Router) application designed to manage the configuration and content of a chatbot (categories, intents, synonyms, and follow-ups). It provides a full-featured admin panel built with [Refine](https://refine.dev/) and Ant Design, secured by NextAuth.js (Auth.js v5), and uses Prisma as its ORM over a MySQL/MariaDB database.

### Key Technologies
- **Framework**: [Next.js](https://nextjs.org/) (React 19)
- **Admin Framework**: [Refine](https://refine.dev/)
- **UI Components**: [Ant Design](https://ant.design/) & Tailwind CSS
- **ORM**: [Prisma](https://www.prisma.io/)
- **Authentication**: [NextAuth.js (v5)](https://authjs.dev/)
- **Database**: MySQL 8.4 / MariaDB
- **Containerization**: Docker & Docker Compose

## Features

- **Dashboard**: Overview of chatbot metrics and unmatched questions.
- **Intent Management**: Create, edit, and delete intents, along with associated phrases, keywords, and follow-up paths.
- **Category Management**: Group intents by configurable categories and topics.
- **Synonym Dictionary**: Manage terms and synonyms for the bot's natural language processing.
- **Conversation Logs**: View user interactions with the bot, matched intents, confidence scores, and unmatched questions.
- **Settings**: Encrypted storage for sensitive configurations like the Gemini API Key (`APP_ENCRYPTION_KEY` secures values before DB insertion).
- **Public API / Chatbot Widget Integration**: Cross-origin allowed endpoints (`/api/chatbot/*`) configurable via CORS origins.
- **Legacy Migration**: Scripts to migrate data from the legacy Laravel-based schema.

---

## Folder Structure

A high-level overview of the project's folder structure:

```text
├── app/                  # Next.js App Router (Pages, API routes, Layouts)
│   ├── admin/            # Refine admin dashboard pages
│   ├── api/              # Backend API routes (e.g., auth, chatbot endpoints)
│   └── generated/        # Generated code (e.g., Prisma Client)
├── lib/                  # Shared utilities and configuration
├── prisma/               # Database schema (`schema.prisma`), migrations, and seed scripts
├── public/               # Static assets (images, fonts, etc.)
├── scripts/              # Custom scripts (e.g., legacy data migration)
├── test/                 # Test files and Vitest configuration
├── types/                # TypeScript type definitions
├── auth.ts               # NextAuth configuration
└── ...
```

---

## Local Development Setup

### Prerequisites
- Node.js (v22 recommended)
- MySQL or MariaDB running locally (or via Docker)

### 1. Environment Variables
Copy the example environment file and fill in the required values:

```bash
cp .env.example .env
```

Key variables to configure in `.env`:
- `DATABASE_URL`: Connection string to your local MySQL database.
- `AUTH_SECRET`: Generate a random 32-byte string (e.g., `openssl rand -base64 32`).
- `APP_ENCRYPTION_KEY`: Generate a random 32-byte base64 key (e.g., `openssl rand -base64 32`).
- `NEXTAUTH_URL`: Should be `http://localhost:3000` for local dev.
- `SEED_ADMIN_*`: Credentials for the initial admin user.

### 2. Install Dependencies
```bash
npm install
```

### 3. Database Setup
Push the schema to your database and generate the Prisma client:

```bash
# Push schema to dev DB
npm run db:migrate:dev

# Generate Prisma Client (outputs to app/generated/prisma)
npm run db:generate

# Seed the database with the initial admin user
npm run db:seed
```

*(Optional)* To view your database in a GUI:
```bash
npm run db:studio
```

### 4. Run the Development Server
```bash
npm run dev
```
Access the admin panel at [http://localhost:3000](http://localhost:3000). Log in with the credentials defined in `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD`.

---

## Deployment Steps

If you prefer to host the application directly on a server (e.g., using PM2 and Nginx) without Docker, follow these steps:

### 1. Prepare the Environment
Ensure Node.js (v22+) and your preferred database (MySQL/MariaDB) are installed on your server.

### 2. Clone and Install
Clone the repository and install dependencies:
```bash
git clone <your-repo-url>
cd nextjs-app
npm install
```

### 3. Environment Variables
Create your production `.env` file based on `.env.example`:
```bash
cp .env.example .env
```
Update `.env` with your production database credentials (`DATABASE_URL`), a strong `AUTH_SECRET`, and `APP_ENCRYPTION_KEY`. Ensure `NEXTAUTH_URL` is set to your production domain.

### 4. Database Migrations & Prisma Client
Run Prisma migrations to update your production database and generate the Prisma client:
```bash
npm run db:migrate:deploy
npm run db:generate
```
*(If this is the first time deploying, you may also want to run `npm run db:seed` to create the initial admin user).*

### 5. Build the Application
Build the Next.js app for production:
```bash
npm run build
```

### 6. Start the Server with PM2
Install PM2 globally if you haven't already:
```bash
npm install -g pm2
```
Start the application using PM2 to keep it running in the background:
```bash
pm2 start npm --name "coi-bot-admin" -- run start
pm2 save
pm2 startup
```

### 7. Reverse Proxy Setup (Optional but Recommended)
In production, you should run the application behind a reverse proxy like Nginx or Caddy to handle SSL/TLS termination. 

**Example Nginx Configuration:**
```nginx
server {
    listen 80;
    server_name admin.coi-bot.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```