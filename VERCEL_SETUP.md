# Vercel Deployment Setup

## Important: File System Limitations

Vercel uses serverless functions with a **read-only file system**. The file-based storage (`data/` directory) will **NOT work** on Vercel in production.

## Solution: Use Redis

The app has been updated to automatically use **Redis** when deployed to Vercel, and file system storage for local development.

Supports:
- **Direct Redis connection** via `REDIS_URL` (recommended)
- **Upstash Redis REST API** via `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`
- **Vercel KV** via `KV_REST_API_URL` / `KV_REST_API_TOKEN`

## Setup Steps

### 1. Install Dependencies

The `@vercel/kv` package is already in `package.json`. Install it:

```bash
npm install
```

### 2. Set Up Redis

**Option A: Direct Redis Connection (Recommended)**

1. Get your Redis connection string (format: `redis://default:password@host:port`)
2. In Vercel project settings, go to **Environment Variables**
3. Add:
   ```
   REDIS_URL=redis://default:password@host:port
   ```
4. Deploy!

**Option B: Upstash Redis via Vercel Storage**

1. Go to your Vercel project dashboard
2. Navigate to **Storage** → **Create Database**
3. Select **Upstash Redis** (or just **Redis**)
4. Create the database
5. Vercel will automatically add environment variables:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`

**Option C: Vercel KV**

1. Go to **Storage** → **Create Database**
2. Select **Vercel KV**
3. Vercel will automatically add:
   - `KV_REST_API_URL`
   - `KV_REST_API_TOKEN`

### 3. Deploy to Vercel

The app will automatically detect the Redis environment variables and use Redis instead of file system.

## How It Works

- **Local Development**: Uses file system (`data/` directory)
- **Vercel Production**: Automatically uses Redis when Redis environment variables are set

The storage abstraction layer (`lib/storage.ts`) handles this automatically - no code changes needed!

**Priority order** (first match wins):
1. `REDIS_URL` - Direct Redis connection (ioredis)
2. `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` - Upstash Redis REST API
3. `KV_REST_API_URL` / `KV_REST_API_TOKEN` - Vercel KV REST API
4. File system (fallback)

## Migrating Existing Data

If you have existing spell mappings in `data/spell-prism-mappings.json`, you can:

1. Run the app locally
2. The mappings will be automatically loaded
3. When you deploy to Vercel with KV, the first save will populate KV with your data

Or manually migrate:

```bash
# Export your mappings
cat data/spell-prism-mappings.json

# Then use Vercel KV CLI or dashboard to import
```

## Testing Locally with Redis

If you want to test with Redis locally:

1. Create an Upstash Redis database in Vercel
2. Copy the environment variables to `.env.local`:
   ```
   UPSTASH_REDIS_REST_URL=your_url
   UPSTASH_REDIS_REST_TOKEN=your_token
   ```
   OR if using Vercel KV:
   ```
   KV_REST_API_URL=your_url
   KV_REST_API_TOKEN=your_token
   ```
3. Restart your dev server

## Free Tier Limits

Upstash Redis free tier includes:
- 256 MB storage
- 30,000 commands/day
- More than enough for this app!

