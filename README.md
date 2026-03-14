# EstateFlow

Real estate website starter built with TypeScript, Next.js (App Router), Node.js runtime, Prisma, and PostgreSQL.

##The file postgres-binaries.zip is too large for Github. you can download it from OneDrive here.
https://1drv.ms/f/c/990b44d90075e61e/IgBQvjvrXaBWT6ZGFp9HteewAQClzC59ArR72v7sI4Zzgbo?e=Jzl1aA

## Stack

- Next.js 16 + React 19
- TypeScript
- Prisma ORM
- PostgreSQL

## Quick Start

1. Install dependencies:

```bash
npm install
```

2. Set your database connection in `.env`:

```env
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/real_estate_db?schema=public"
CLOUDINARY_CLOUD_NAME="your_cloud_name"
CLOUDINARY_API_KEY="your_api_key"
CLOUDINARY_API_SECRET="your_api_secret"
```

3. Generate Prisma client:

```bash
npm run prisma:generate
```

4. Create database tables:

```bash
npm run db:push
```

5. Start development server:

```bash
npm run dev
```

Visit `http://localhost:3000`.

## Prisma Commands

- `npm run prisma:generate` - Generate Prisma client
- `npm run prisma:migrate` - Create and apply a migration in development
- `npm run db:push` - Push schema directly to the database
- `npm run prisma:studio` - Open Prisma Studio

## Testing

- `npm run test` - Run automated tests (Vitest)
- `npm run test:watch` - Run tests in watch mode

Current automated test coverage includes token/session helpers and rate-limit behavior.

## CI

GitHub Actions workflow is included at `.github/workflows/ci.yml`.

CI runs:

- `npm run prisma:generate`
- `npm run lint`
- `npm run test`
- `npm run build`

## App Routes

- `/` - Homepage with featured listings
- `/properties` - Full listings page
- `/sell` - Listing form with image upload
- `/api/properties` - API route
- `/api/uploads` - Upload image route (Cloudinary)
- `/privacy`, `/terms`, `/contact` - Public legal and support pages
- `/robots.txt` and `/sitemap.xml` - SEO metadata routes

## API

### GET `/api/properties`

Returns all properties ordered by featured and created date.

Optional query params:

- `city` - Case-insensitive partial city match
- `featured` - `true` or `false`
- `minPrice` - Minimum price filter
- `maxPrice` - Maximum price filter
- `limit` - Max rows to return (capped at `100`)

```

### POST `/api/properties`

Creates a new property.

Validation rules:

- `title`, `description`, `city`, `address` must be non-empty strings
- `price` must be a positive integer
- `bedrooms` must be a non-negative integer
- `bathrooms` must be zero or greater
- `areaSqft` must be a positive integer
- `imageUrl` is optional (stored as `null` if missing/empty)

Example body:

```json
{
	"title": "Lakeview Townhouse",
	"description": "Spacious townhouse near downtown and schools.",
	"city": "Seattle",
	"address": "120 Market St",
	"price": 640000,
	"bedrooms": 3,
	"bathrooms": 2.5,
	"areaSqft": 1850,
	"imageUrl": "https://images.example.com/home-1.jpg",
	"featured": true
}
```

### POST `/api/uploads`

Uploads an image file using Cloudinary and returns a hosted URL.

- Request: `multipart/form-data` with a `file` field
- Max file size: `5MB`
- Accepted files: image MIME types

Example response:

```json
{
	"imageUrl": "https://res.cloudinary.com/.../image/upload/...jpg",
	"publicId": "naijapropertyhub/abc123"
}
```

### POST `/api/saved-searches/alerts/run`

Runs saved-search alerts.

Authorization options:

- Admin session cookie
- Cron token via `Authorization: Bearer <CRON_ALERTS_SECRET>`
- Cron token via `x-cron-secret: <CRON_ALERTS_SECRET>`

Use this for scheduled jobs from external cron providers.

## Security and Hardening

- Security headers configured in `next.config.ts` (CSP, HSTS, frame/type/referrer policies)
- Rate limiting now supports distributed storage via Upstash Redis and falls back to in-memory buckets
- Structured API error logging helper in `src/lib/logger.ts`
- Root-level `error.tsx`, `loading.tsx`, and `not-found.tsx` pages for resilient UX

## Notes

- If your database is unavailable, the homepage uses fallback sample cards so the UI still renders.
- The `/properties` page requires actual database records to show data.
