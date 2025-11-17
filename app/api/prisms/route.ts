import { NextResponse } from "next/server";
import { storage } from "@/lib/storage";
import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const PRISMS_FILE = path.join(DATA_DIR, "prisms.json");

async function loadPrisms(): Promise<string[]> {
  let prisms = await storage.loadPrisms();
  
  // If no prisms exist, try to load from file system first (for migration)
  if (prisms.length === 0 && fs.existsSync(PRISMS_FILE)) {
    try {
      const filePrisms = JSON.parse(fs.readFileSync(PRISMS_FILE, "utf-8"));
      if (filePrisms.length > 0) {
        console.log(`Migrating ${filePrisms.length} prisms from file system to storage`);
        await storage.savePrisms(filePrisms);
        prisms = filePrisms;
      }
    } catch (error) {
      console.error("Error loading prisms from file:", error);
    }
  }
  
  // If still no prisms exist, initialize with defaults
  if (prisms.length === 0) {
    const defaultPrisms = [
      "ARCANE PRISM",
      "DIVINE PRISM",
      "ELEMENTAL PRISM",
      "FEY PRISM",
      "FIENDISH PRISM",
      "SHADOW PRISM",
      "SOLAR PRISM",
    ];
    await storage.savePrisms(defaultPrisms);
    // Also save to file system for backup
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(PRISMS_FILE, JSON.stringify(defaultPrisms, null, 2));
    return defaultPrisms;
  }
  
  return prisms;
}

export async function GET() {
  try {
    const prisms = await loadPrisms();
    return NextResponse.json(prisms);
  } catch (error) {
    console.error("Error loading prisms:", error);
    return NextResponse.json({ error: "Failed to load prisms" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { name } = await request.json();

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Prism name is required" }, { status: 400 });
    }

    const prisms = await loadPrisms();
    const prismName = name.trim();

    if (prisms.includes(prismName)) {
      return NextResponse.json({ error: "Prism already exists" }, { status: 400 });
    }

    prisms.push(prismName);
    await storage.savePrisms(prisms);

    return NextResponse.json({ success: true, prism: prismName });
  } catch (error) {
    console.error("Error adding prism:", error);
    return NextResponse.json({ error: "Failed to add prism" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { name } = await request.json();

    if (!name) {
      return NextResponse.json({ error: "Prism name is required" }, { status: 400 });
    }

    const prisms = await loadPrisms();
    const filteredPrisms = prisms.filter((p) => p !== name);
    await storage.savePrisms(filteredPrisms);

    // Also remove from spell mappings
    const mappings = await storage.loadMappings();
    Object.keys(mappings).forEach((spellName) => {
      if (mappings[spellName] === name) {
        delete mappings[spellName];
      }
    });
    await storage.saveMappings(mappings);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting prism:", error);
    return NextResponse.json({ error: "Failed to delete prism" }, { status: 500 });
  }
}

