# Prism Magic System

A comprehensive web application for managing and exploring D&D 5e spells within the Prism Magic System homebrew. Features real-time spell data, multi-prism support, player management, strain tracking, and powerful filtering capabilities.

## ✨ Features

### Spell Management
- 🔍 **Full Spell Database**: 333+ spells from D&D 5e API (319 cached + 14 custom spells)
- ✨ **Multi-Prism Support**: Spells can belong to one or multiple prisms (37 multi-prism spells)
- 🎯 **Advanced Filtering**:
  - Filter by prism(s) - single or multiple
  - Filter by spell level (0-9, including cantrips)
  - Filter by components (Verbal, Somatic, Material)
  - Filter by player (automatically applies their prisms and max spell level)
- 🔎 **Command Palette**: Press `⌘K` (Mac) or `Ctrl+K` (Windows) for quick search and filtering
- 📝 **Custom Spells**: Create and manage custom spells with full D&D 5e spell properties

### Player Management
- 👥 **Player Profiles**: Track players with their accessible prisms and max spell level
- 🎲 **Quick Filters**: One-click filtering to show only spells accessible to a specific player
- 📊 **Strain Meter**: Track spellcasting strain with persistent storage
  - Permanent strain tracking
  - Temporary strain (consumes before permanent)
  - Long rest reset functionality
  - Strain cost calculation based on spell level

### Admin Panel (`/admin`)
- 🛠️ **Spell-Prism Mapping**: Assign spells to one or multiple prisms
- ➕ **Create Custom Spells**: Add homebrew spells with full details
- 👤 **Player Management**: Add, edit, and remove players
- 🎨 **Prism Management**: Add or remove prism types
- 📚 **Custom Classes**: Manage custom character classes

### Spell Combiner (`/spell-combiner`)
- 🔮 **Spell Combination Calculator**: Combine multiple spells to calculate total damage and strain cost
- 📊 **Damage Breakdown**: See individual spell contributions
- 🎯 **Player-Specific Filtering**: Filter spells by player's accessible prisms

### NPC Generator (`/npc`)
- 🎲 **Random NPC Generation**: Generate NPCs with custom Prism Magic classes
- 📊 **Stat Rolling**: Multiple stat generation methods (roll, standard array, point buy)
- 🎨 **Class Customization**: Full support for custom Prism Magic classes
- 💾 **Save & Export**: Save generated NPCs for later use

### Technical Features
- ⚡ **Real-time Updates**: Powered by Convex for instant data synchronization
- 📱 **Responsive Design**: Works seamlessly on desktop, tablet, and mobile
- 🎨 **Modern UI**: Built with Tailwind CSS and Radix UI components
- 🔒 **Type Safety**: Full TypeScript support throughout

## 🏗️ Architecture

### Backend: Convex
The application uses [Convex](https://www.convex.dev/) as the backend-as-a-service:
- **Real-time Database**: Automatic synchronization across all clients
- **Serverless Functions**: API routes backed by Convex queries and mutations
- **Type-Safe**: Auto-generated TypeScript types from schema

### Data Models
- **Spells**: Cached D&D 5e spells + custom spells
- **Spell Mappings**: Maps spell names to prism(s) - supports single or multiple prisms
- **Prisms**: Available prism types (Arcane, Divine, Elemental, Fey, Fiendish, Shadow, Solar)
- **Players**: Player profiles with accessible prisms and max spell level
- **Custom Classes**: Homebrew character classes with prism associations

### Frontend: Next.js 16
- **App Router**: Modern Next.js routing
- **Server Components**: Optimized rendering
- **API Routes**: RESTful endpoints for data access
- **Client Components**: Interactive UI with React hooks

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Convex account (free tier available)

### Installation

1. **Clone the repository**:
```bash
git clone https://github.com/your-username/Prism-Magic-System.git
cd Prism-Magic-System
```

2. **Install dependencies**:
```bash
npm install
```

3. **Set up Convex**:
```bash
npx convex dev
```
This will:
- Create a Convex project (if needed)
- Generate environment variables
- Deploy your schema and functions

4. **Set up environment variables**:
Create a `.env.local` file:
```env
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud
```

5. **Populate initial data** (optional):
```bash
# Import all D&D 5e spells
node scripts/import-spells-to-convex.js

# Import prisms, players, and mappings
node scripts/import-to-convex.js
```

6. **Run the development server**:
```bash
npm run dev
```

7. **Open** [http://localhost:3000](http://localhost:3000) in your browser

## 📖 Usage

### Searching and Filtering Spells

1. **Basic Search**: Use the search bar or press `⌘K` to open the command palette
2. **Filter by Prism**: Click prism badges in the sidebar to filter spells
3. **Filter by Level**: Select spell levels (0-9) to narrow results
4. **Filter by Components**: Select V (Verbal), S (Somatic), or M (Material) requirements
5. **Filter by Player**: Click a player name to show only their accessible spells
6. **View Spell Details**: Click any spell card to see full details, strain cost, and prism assignment

### Managing Strain

- **Cast a Spell**: Click "Cast Spell" on any spell detail page to add strain
- **Adjust Strain**: Use +/- buttons or type directly in the strain meter
- **Temporary Strain**: Add temporary strain that consumes before permanent strain
- **Long Rest**: Click the flame icon to reset all strain to 0

### Admin Panel

Navigate to `/admin` to:
- **Assign Prisms**: Search for spells and assign them to one or multiple prisms
- **Create Custom Spells**: Add homebrew spells with full D&D 5e properties
- **Manage Players**: Add players with their accessible prisms and max spell level
- **Manage Prisms**: Add or remove prism types from the system
- **Manage Classes**: Create and edit custom character classes

### Spell Combiner

Navigate to `/spell-combiner` to:
- Search and select multiple spells
- Calculate combined damage output
- See total strain cost
- Filter by player's accessible spells

### NPC Generator

Navigate to `/npc` to:
- Select a custom Prism Magic class
- Generate random stats (roll, standard array, or point buy)
- Generate random names
- Save and manage generated NPCs

## 🗂️ Project Structure

```
Prism-Magic-System/
├── app/                    # Next.js app directory
│   ├── admin/             # Admin panel page
│   ├── api/               # API routes
│   ├── npc/               # NPC generator page
│   ├── spell-combiner/    # Spell combiner page
│   └── page.tsx           # Main spell search page
├── components/            # React components
│   ├── ui/                # Reusable UI components
│   └── convex-client-provider.tsx
├── convex/                # Convex backend
│   ├── schema.ts         # Database schema
│   ├── spells.ts         # Spell queries
│   ├── prisms.ts         # Prism management
│   ├── players.ts        # Player management
│   ├── customSpells.ts   # Custom spell management
│   └── ...
├── hooks/                 # React hooks
│   └── use-spell-data.ts  # Spell data fetching
├── lib/                   # Utility functions
│   ├── utils.ts          # Helper functions
│   ├── player-utils.ts   # Player utilities
│   └── npc-generator.ts  # NPC generation logic
├── scripts/               # Utility scripts
│   ├── import-spells-to-convex.js
│   ├── import-to-convex.js
│   ├── fetch-all-spells.js
│   └── ...
└── data/                  # Data files (for migration)
```

## 🔧 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

### Data Migration Scripts

- `scripts/import-spells-to-convex.js` - Import D&D 5e spells from `data/all-spells.json`
- `scripts/import-to-convex.js` - Import prisms, players, and mappings from `data/migration-export.json`
- `scripts/fetch-all-spells.js` - Fetch all spells from D&D 5e API (with rate limiting)
- `scripts/copy-convex-data.js` - Copy data between Convex deployments (dev/prod)

## 🌐 Deployment

### Vercel Deployment

1. **Set up Convex Production Deployment**:
```bash
npx convex deploy --yes
```

2. **Set Environment Variable in Vercel**:
   - Go to Vercel Dashboard → Your Project → Settings → Environment Variables
   - Add: `NEXT_PUBLIC_CONVEX_URL` = `https://your-production-deployment.convex.cloud`

3. **Populate Production Data**:
```bash
# Set production URL
export NEXT_PUBLIC_CONVEX_URL=https://your-production-deployment.convex.cloud

# Import spells
node scripts/import-spells-to-convex.js

# Copy data from dev to prod
node scripts/copy-convex-data.js
```

4. **Deploy**:
```bash
git push origin main
```

Vercel will automatically deploy on push to main.

See `VERCEL_DEPLOYMENT.md` for detailed deployment instructions.

## 📊 Data Statistics

- **Total Spells**: 333 (319 from D&D 5e API + 14 custom)
- **Spell-Prism Mappings**: 498
- **Multi-Prism Spells**: 37
- **Available Prisms**: 7 (Arcane, Divine, Elemental, Fey, Fiendish, Shadow, Solar)
- **Players**: 5 (configurable)

## 🎮 Multi-Prism System

The system supports spells belonging to multiple prisms. See `MULTI-PRISM-GUIDE.md` for:
- Examples of multi-prism spells
- How to assign multiple prisms in the admin panel
- Technical implementation details

## 🔌 API Endpoints

- `GET /api/spells` - Get all spells with prism mappings
- `GET /api/prisms` - Get all available prisms
- `GET /api/players` - Get all players
- `GET /api/custom-spells` - Get all custom spells
- `GET /api/classes` - Get all custom classes
- `POST /api/spells/update` - Update spell-prism mapping

## 🛠️ Technology Stack

- **Frontend**: Next.js 16, React 19, TypeScript
- **Backend**: Convex (real-time database & serverless functions)
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI
- **Icons**: Lucide React
- **Data Source**: D&D 5e API (https://www.dnd5eapi.co/)

## 📝 License

MIT

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📚 Additional Documentation

- `MULTI-PRISM-GUIDE.md` - Guide to the multi-prism spell system
- `VERCEL_DEPLOYMENT.md` - Detailed Vercel deployment instructions
- `VERCEL_SETUP.md` - Vercel setup guide
- `REDIS_SETUP.md` - Legacy Redis setup (now using Convex)

---

**Built for the Prism Magic System homebrew for D&D 5e** ✨