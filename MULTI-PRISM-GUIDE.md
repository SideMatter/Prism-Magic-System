# Multi-Prism Spell System 🌈

## Overview

The Prism Magic System now supports spells that belong to multiple prisms! This reflects the reality that some spells draw power from multiple magical sources.

## Statistics

- **417 total spells** mapped
- **37 spells** have multiple prisms  
- **380 spells** have single prisms

## Examples of Multi-Prism Spells

### Transportation Magic
- **Misty Step**: FEY PRISM, ARCANE PRISM
- **Dimension Door**: SOLAR PRISM, ARCANE PRISM
- **Teleport**: SOLAR PRISM, ARCANE PRISM
- **Plane Shift**: SOLAR PRISM, DIVINE PRISM
- **Gate**: SOLAR PRISM, DIVINE PRISM, FIENDISH PRISM

### Healing & Life Magic
- **Cure Wounds**: DIVINE PRISM, FEY PRISM
- **Lesser Restoration**: DIVINE PRISM, FEY PRISM
- **Greater Restoration**: DIVINE PRISM, FEY PRISM
- **Revivify**: DIVINE PRISM, FEY PRISM

### Death & Necromancy
- **Raise Dead**: DIVINE PRISM, SHADOW PRISM
- **Resurrection**: DIVINE PRISM, SHADOW PRISM
- **True Resurrection**: DIVINE PRISM, SHADOW PRISM
- **Animate Dead**: SHADOW PRISM, FIENDISH PRISM
- **Create Undead**: SHADOW PRISM, FIENDISH PRISM

### Illusion & Stealth
- **Invisibility**: SHADOW PRISM, ARCANE PRISM
- **Greater Invisibility**: SHADOW PRISM, ARCANE PRISM
- **Disguise Self**: SHADOW PRISM, ARCANE PRISM

### Transformation
- **Alter Self**: ARCANE PRISM, FEY PRISM
- **Polymorph**: ARCANE PRISM, FEY PRISM
- **True Polymorph**: ARCANE PRISM, FEY PRISM
- **Shapechange**: FEY PRISM, ARCANE PRISM

### Domination & Control
- **Charm Person**: FEY PRISM, ARCANE PRISM
- **Hold Person**: FEY PRISM, ARCANE PRISM
- **Suggestion**: FEY PRISM, ARCANE PRISM
- **Dominate Person**: FIENDISH PRISM, FEY PRISM
- **Dominate Monster**: FIENDISH PRISM, FEY PRISM

### Destructive Magic
- **Fireball**: ELEMENTAL PRISM, FIENDISH PRISM
- **Hellish Rebuke**: FIENDISH PRISM, ELEMENTAL PRISM

### Protection
- **Shield**: ARCANE PRISM, DIVINE PRISM

### Dark Magic
- **Darkness**: FIENDISH PRISM, SHADOW PRISM
- **Fear**: SHADOW PRISM, FIENDISH PRISM

## How It Works

### Data Structure

Spells can now have either:
- **Single prism**: `"prism": "ARCANE PRISM"`
- **Multiple prisms**: `"prism": ["ARCANE PRISM", "FEY PRISM"]"`

### UI Display

**Search Page:**
- Single prism: Shows one badge
- Multiple prisms: Shows multiple badges side-by-side

**Spell Detail View:**
- Displays "Prism:" or "Prisms:" based on count
- Lists all prisms with individual badges

**Admin Panel:**
- Click-to-toggle multi-select interface
- Selected prisms highlight in purple/pink gradient
- Unselected prisms show in gray
- Can select 0, 1, or many prisms per spell

### API Format

```typescript
interface SpellWithPrism {
  name: string;
  level: number;
  school: string;
  // ... other spell properties
  prism?: string | string[]; // Can be single or array
}
```

## Admin Panel Usage

### Editing a Spell:

1. Click "Edit" or "Assign" button
2. See multi-select interface with all available prisms
3. Click prisms to toggle selection (purple = selected, gray = unselected)
4. Click "Save" to persist
5. Changes propagate to all clients within 3 seconds

### Examples:

**Single Prism:**
- Select: ELEMENTAL PRISM only
- Result: `"prism": "ELEMENTAL PRISM"`

**Multiple Prisms:**
- Select: FEY PRISM + ARCANE PRISM
- Result: `"prism": ["FEY PRISM", "ARCANE PRISM"]`

**No Prism:**
- Select: nothing
- Result: `"prism": null`

## Why Multiple Prisms?

Some spells naturally draw from multiple magical sources:

1. **Misty Step** - Uses fey magic (Feywild teleportation) and arcane magic (bending space)
2. **Cure Wounds** - Divine healing power + natural fey life magic
3. **Raise Dead** - Divine resurrection + manipulation of death (shadow)
4. **Gate** - Planar travel (solar/cosmic) + divine/fiendish summoning
5. **Fireball** - Elemental fire + hellish destruction

## Technical Details

### Storage in Redis

```json
{
  "Magic Missile": "ARCANE PRISM",
  "Misty Step": ["FEY PRISM", "ARCANE PRISM"],
  "Gate": ["SOLAR PRISM", "DIVINE PRISM", "FIENDISH PRISM"]
}
```

### Migration

Run the migration script to update Redis with multi-prism mappings:
```bash
node migrate-multi-prism-to-redis.js
```

This was already done, so all 37 multi-prism spells are currently in Redis.

## Future Enhancements

- Filter by prism combinations
- Search for spells in multiple specific prisms
- Visualize prism relationships
- Prism intersection analysis

---

✨ The magic system is now more nuanced and accurate to how spells actually work!

