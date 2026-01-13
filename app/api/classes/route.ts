import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getConvexClient } from "@/lib/convex";
import { api } from "@/convex/_generated/api";
import { CharacterClass } from "@/lib/npc-generator";

export const dynamic = 'force-dynamic';

const DATA_DIR = path.join(process.cwd(), "data");
const CLASSES_FILE = path.join(DATA_DIR, "prism-classes.json");

interface ClassesData {
  classes: CharacterClass[];
  customClasses: CharacterClass[];
}

// Load base classes from file (static data)
function loadBaseClasses(): CharacterClass[] {
  if (fs.existsSync(CLASSES_FILE)) {
    try {
      const data = fs.readFileSync(CLASSES_FILE, "utf-8");
      const parsed = JSON.parse(data);
      return parsed.classes || [];
    } catch (error) {
      console.error("Error loading base classes from file:", error);
    }
  }
  return [];
}

export async function GET() {
  try {
    // Load base classes from file (these are static)
    const baseClasses = loadBaseClasses();
    console.log(`Loaded ${baseClasses.length} base classes from file`);
    
    // Load custom classes from Convex
    const convex = getConvexClient();
    const customClasses = await convex.query(api.customClasses.list, {});
    console.log(`Loaded ${customClasses.length} custom classes from Convex`);

    // Combine base classes with custom classes
    const allClasses = [
      ...baseClasses,
      ...customClasses,
    ];

    return NextResponse.json(allClasses, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    console.error("Error loading classes:", error);
    return NextResponse.json(
      { error: "Failed to load classes" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const newClass: CharacterClass = await request.json();
    
    // Validate required fields
    if (!newClass.id || !newClass.name || !newClass.hitDie || !newClass.statPriority) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const convex = getConvexClient();
    const result = await convex.mutation(api.customClasses.upsert, {
      id: newClass.id,
      name: newClass.name,
      hitDie: newClass.hitDie,
      primaryAbilities: newClass.primaryAbilities || [],
      savingThrows: newClass.savingThrows || [],
      statPriority: newClass.statPriority,
      description: newClass.description || "",
      prism: newClass.prism,
      type: newClass.type,
      spellList: newClass.spellList,
      features: newClass.features,
    });

    return NextResponse.json({ success: true, class: result.class });
  } catch (error) {
    console.error("Error saving class:", error);
    return NextResponse.json(
      { error: "Failed to save class" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const classId = searchParams.get('id');

    if (!classId) {
      return NextResponse.json(
        { error: "Class ID required" },
        { status: 400 }
      );
    }

    const convex = getConvexClient();
    await convex.mutation(api.customClasses.remove, { id: classId });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting class:", error);
    const message = error?.message || "Failed to delete class";
    if (message.includes("not found")) {
      return NextResponse.json({ error: "Custom class not found" }, { status: 404 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
