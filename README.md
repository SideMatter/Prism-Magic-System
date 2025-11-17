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

This app is ready to deploy on Vercel:

1. Push your code to GitHub
2. Import the project in Vercel
3. Deploy!

The app will work out of the box on Vercel with the file-based storage system.

## Future Enhancements

- Integration with D&D 5e API for complete spell database
- Database migration (PostgreSQL, MongoDB, etc.)
- User authentication for admin panel
- Spell filtering by level, school, etc.
- Export/import functionality for spell mappings

## License

MIT

