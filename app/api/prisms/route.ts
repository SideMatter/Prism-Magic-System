import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const PRISMS_FILE = path.join(DATA_DIR, "prisms.json");

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function loadPrisms(): string[] {
  if (!fs.existsSync(PRISMS_FILE)) {
    // Initialize with some default prisms based on common D&D magic schools
    const defaultPrisms = [
      "Abjuration",
      "Conjuration",
      "Divination",
      "Enchantment",
      "Evocation",
      "Illusion",
      "Necromancy",
      "Transmutation",
    ];
    savePrisms(defaultPrisms);
    return defaultPrisms;
  }
  try {
    const data = fs.readFileSync(PRISMS_FILE, "utf-8");
    return JSON.parse(data);
  } catch {
    return [];
  }
}

function savePrisms(prisms: string[]) {
  fs.writeFileSync(PRISMS_FILE, JSON.stringify(prisms, null, 2));
}

export async function GET() {
  try {
    const prisms = loadPrisms();
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

    const prisms = loadPrisms();
    const prismName = name.trim();

    if (prisms.includes(prismName)) {
      return NextResponse.json({ error: "Prism already exists" }, { status: 400 });
    }

    prisms.push(prismName);
    savePrisms(prisms);

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

    const prisms = loadPrisms();
    const filteredPrisms = prisms.filter((p) => p !== name);
    savePrisms(filteredPrisms);

    // Also remove from spell mappings
    const MAPPINGS_FILE = path.join(DATA_DIR, "spell-prism-mappings.json");
    if (fs.existsSync(MAPPINGS_FILE)) {
      const mappings = JSON.parse(fs.readFileSync(MAPPINGS_FILE, "utf-8"));
      Object.keys(mappings).forEach((spellName) => {
        if (mappings[spellName] === name) {
          delete mappings[spellName];
        }
      });
      fs.writeFileSync(MAPPINGS_FILE, JSON.stringify(mappings, null, 2));
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting prism:", error);
    return NextResponse.json({ error: "Failed to delete prism" }, { status: 500 });
  }
}

