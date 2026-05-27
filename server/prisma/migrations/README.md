# Migrations

Dev: `npx prisma migrate dev --name <description>`
Prod: `npx prisma migrate deploy`

Current DB: SQLite (dev) — change provider to postgresql for production and update DATABASE_URL.
