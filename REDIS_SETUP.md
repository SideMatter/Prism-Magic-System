# Redis Setup

## Quick Start

The app is configured to use your Redis connection string. Set the `REDIS_URL` environment variable:

```
REDIS_URL=redis://default:qKRoldQjGKjijdzKlOgxbpMjUpganIkG@redis-10207.c81.us-east-1-2.ec2.cloud.redislabs.com:10207
```

## Local Development

Create a `.env.local` file in the project root:

```bash
REDIS_URL="redis://default:qKRoldQjGKjijdzKlOgxbpMjUpganIkG@redis-10207.c81.us-east-1-2.ec2.cloud.redislabs.com:10207"
```

Then run:
```bash
npm run dev
```

## Vercel Deployment

1. Go to your Vercel project → **Settings** → **Environment Variables**
2. Add a new variable:
   - **Name**: `REDIS_URL`
   - **Value**: `redis://default:qKRoldQjGKjijdzKlOgxbpMjUpganIkG@redis-10207.c81.us-east-1-2.ec2.cloud.redislabs.com:10207`
3. Deploy!

The app will automatically use Redis instead of the file system.

## How It Works

- If `REDIS_URL` is set → Uses direct Redis connection (ioredis)
- If `UPSTASH_REDIS_REST_URL` is set → Uses Upstash REST API
- If `KV_REST_API_URL` is set → Uses Vercel KV REST API
- Otherwise → Uses file system (local dev only)

## Testing the Connection

Once you've set `REDIS_URL`, the app will:
1. Connect to Redis on startup
2. Store spell mappings in Redis
3. Store prisms in Redis
4. Use Redis for all data operations

You should see "Connected to Redis via REDIS_URL" in your server logs.

