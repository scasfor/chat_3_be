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

## Legacy Data Migration

If you are migrating from the old Laravel-based COI-Bot application, the project includes a script to migrate data natively.

1. Ensure the `LEGACY_DB_*` variables in `.env` are pointing to the old Laravel MySQL database.
2. Ensure `DATABASE_URL` points to the new database.
3. Run the migration script:
   ```bash
   npm run migrate:legacy-data
   ```

---

## Deployment Steps (Docker)

The recommended way to deploy the COI-Bot Admin in production is via Docker and Docker Compose. A `Dockerfile` and `docker-compose.yml` are provided in the repository.

### 1. Prepare the Host
Ensure Docker and Docker Compose are installed on your production server.

### 2. Configure Environment
Clone the repository to your server and set up the production environment variables:

```bash
cp .env.docker.example .env
```

Ensure you update the `.env` file with secure values:
- `AUTH_SECRET`: Random 32-byte base64 string.
- `APP_ENCRYPTION_KEY`: Random 32-byte base64 string.
- `DB_ROOT_PASSWORD`, `DB_PASSWORD`: Secure passwords for the MySQL container.
- `NEXTAUTH_URL`: The public URL of your admin panel (e.g., `https://admin.coi-bot.com`).
- `CHATBOT_CORS_ORIGINS`: Comma-separated list of domains where the frontend widget is hosted (e.g., `https://my-website.com`).

### 3. Start the Containers
Use Docker Compose to build the Next.js app and start both the `web` and `mysql` services:

```bash
docker-compose up -d --build
```

### What Happens During Deployment?
1. **Build Phase (`Dockerfile`)**: Docker installs dependencies, generates the Prisma client, and builds the Next.js standalone application.
2. **Database Initialization**: The `mysql` container starts up using the credentials provided in the `.env` file. A health check ensures it is ready before the web container boots.
3. **Container Startup (`docker-entrypoint.sh`)**: Before the Node.js server starts, the entrypoint script automatically runs `npx prisma migrate deploy` to ensure the production database schema is up to date.
4. **App Start**: The Next.js production server starts on port `3000`.

### 4. Reverse Proxy Setup (Optional but Recommended)
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

### Updating the Application
When pushing new changes to the server, rebuild and restart the containers:
```bash
docker-compose up -d --build
```
Database migrations will be applied automatically upon container restart.
