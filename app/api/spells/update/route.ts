import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const MAPPINGS_FILE = path.join(DATA_DIR, "spell-prism-mappings.json");

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function loadMappings(): Record<string, string> {
  if (!fs.existsSync(MAPPINGS_FILE)) {
    return {};
  }
  try {
    const data = fs.readFileSync(MAPPINGS_FILE, "utf-8");
    return JSON.parse(data);
  } catch {
    return {};
  }
}

function saveMappings(mappings: Record<string, string>) {
  fs.writeFileSync(MAPPINGS_FILE, JSON.stringify(mappings, null, 2));
}

export async function POST(request: Request) {
  try {
    const { spellName, prism } = await request.json();

    if (!spellName) {
      return NextResponse.json({ error: "Spell name is required" }, { status: 400 });
    }

    const mappings = loadMappings();

    if (prism) {
      mappings[spellName] = prism;
    } else {
      delete mappings[spellName];
    }

    saveMappings(mappings);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating spell:", error);
    return NextResponse.json({ error: "Failed to update spell" }, { status: 500 });
  }
}

