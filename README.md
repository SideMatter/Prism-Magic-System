# Prism Magic System

A web application for searching D&D 5e spells and discovering which "prism" they belong to in the Prism Magic System homebrew.

## Features

- 🔍 **Spell Search**: Search through D&D 5e spells by name
- ✨ **Prism Display**: See which prism each spell belongs to
- 🛠️ **Admin Panel**: Manage spell-to-prism mappings
- 📱 **Responsive Design**: Works on desktop and mobile devices

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

## Usage

### Searching Spells

1. Navigate to the home page
2. Use the search bar to find spells by name
3. Click on a spell to see its details and prism assignment

### Admin Panel

1. Navigate to `/admin`
2. **Manage Prisms**: Add or remove prisms from the system
3. **Assign Prisms**: Search for spells and assign them to prisms
4. Changes are saved automatically

## Data Storage

The app uses JSON files stored in the `data/` directory:
- `spells.json` - Spell data (currently using sample data)
- `spell-prism-mappings.json` - Maps spell names to prisms
- `prisms.json` - List of available prisms

## Adding More Spells

Currently, the app uses a sample set of spells. To add more spells:

1. You can modify `app/api/spells/route.ts` to fetch from a D&D 5e API
2. Or add spells directly to the `loadSpells()` function

Popular D&D 5e APIs:
- [D&D 5e API](https://www.dnd5eapi.co/)
- [Open5e](https://open5e.com/)

## Deployment

### Vercel Deployment

**Important**: Vercel uses serverless functions with a read-only file system. You **must** set up Redis for production.

#### Quick Setup:

**Option 1: Direct Redis Connection (Recommended)**
1. Set the `REDIS_URL` environment variable in Vercel:
   ```
   REDIS_URL=redis://default:password@host:port
   ```
2. Deploy - the app will automatically use Redis!

**Option 2: Upstash Redis via Vercel**
1. Go to your Vercel project → **Storage** → **Create Database**
2. Select **Upstash Redis** (or just **Redis**)
3. Vercel will automatically add environment variables:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`

**Deploy**:
```bash
# Push to GitHub
git push origin main

# Or deploy via Vercel CLI
vercel
```

The app automatically detects Redis and uses it instead of file system!

#### Local Development:

- Uses file system (`data/` directory) by default
- No setup required - just run `npm run dev`

#### Migrating Data:

Your existing `data/spell-prism-mappings.json` will be automatically used when you first deploy. The first save will populate Upstash Redis.

See `VERCEL_SETUP.md` for detailed instructions.

## Future Enhancements

- Integration with D&D 5e API for complete spell database
- Database migration (PostgreSQL, MongoDB, etc.)
- User authentication for admin panel
- Spell filtering by level, school, etc.
- Export/import functionality for spell mappings

## License

MIT

