# Redis Setup for Custom Spells

Custom spells need to be synced to Redis/cloud storage to work across all environments (local, preview, production).

## Quick Setup

1. **Create `.env.local` file** in the project root:

```bash
cp .env.example .env.local
```

2. **Edit `.env.local`** and make sure this line is uncommented:

```
REDIS_URL=redis://default:qKRoldQjGKjijdzKlOgxbpMjUpganIkG@redis-10207.c81.us-east-1-2.ec2.cloud.redislabs.com:10207
```

3. **Restart the dev server**:

```bash
# Stop the current server (Ctrl+C)
npm run dev
```

You should see `Connected to Redis via REDIS_URL` in the console.

## Testing Custom Spells

1. Go to http://localhost:3000/admin
2. Click "Create Custom Spell"
3. Fill in all fields
4. Click "Create Spell"
5. The spell will be saved to Redis and appear in the spell list

## Vercel Deployment

The same `REDIS_URL` is already configured in Vercel environment variables, so custom spells will work the same in production.

## Storage Behavior

- **Without Redis** (no `.env.local`): Custom spells save to local `data/custom-spells.json` file (NOT synced)
- **With Redis** (`.env.local` configured): Custom spells save to Redis (SYNCED across all environments)

## Troubleshooting

If custom spells aren't appearing:

1. Check console for "Connected to Redis via REDIS_URL"
2. Check browser console for any errors
3. Hard refresh (Cmd+Shift+R or Ctrl+Shift+R)
4. Check Redis has the data:
   - Key: `custom-spells`
   - Should contain JSON array of custom spells

