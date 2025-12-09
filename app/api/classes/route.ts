import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { storage } from "@/lib/storage";
import { CharacterClass } from "@/lib/npc-generator";

export const dynamic = 'force-dynamic';

const DATA_DIR = path.join(process.cwd(), "data");
const CLASSES_FILE = path.join(DATA_DIR, "classes.json");

interface ClassesData {
  classes: CharacterClass[];
  customClasses: CharacterClass[];
}

// Load classes from storage or file
async function loadClasses(): Promise<ClassesData> {
  try {
    // Try to load from storage (Redis/KV) first
    const storedClasses = await storage.get<ClassesData>('classes');
    if (storedClasses) {
      return storedClasses;
    }
  } catch (error) {
    console.log('Storage not available, falling back to file');
  }

  // Fall back to file
  if (fs.existsSync(CLASSES_FILE)) {
    const data = fs.readFileSync(CLASSES_FILE, "utf-8");
    return JSON.parse(data);
  }

  // Return default empty structure
  return { classes: [], customClasses: [] };
}

// Save classes to storage
async function saveClasses(data: ClassesData): Promise<void> {
  try {
    await storage.set('classes', data);
  } catch (error) {
    console.log('Storage not available, saving to file');
    fs.writeFileSync(CLASSES_FILE, JSON.stringify(data, null, 2));
  }
}

export async function GET() {
  try {
    const data = await loadClasses();
    
    // Combine base classes with custom classes
    const allClasses = [
      ...data.classes,
      ...data.customClasses.map(c => ({ ...c, isCustom: true }))
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

    const data = await loadClasses();
    
    // Check for duplicate ID
    const existingIndex = data.customClasses.findIndex(c => c.id === newClass.id);
    if (existingIndex >= 0) {
      // Update existing
      data.customClasses[existingIndex] = { ...newClass, isCustom: true };
    } else {
      // Add new
      data.customClasses.push({ ...newClass, isCustom: true });
    }

    await saveClasses(data);

    return NextResponse.json({ success: true, class: newClass });
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

    const data = await loadClasses();
    
    // Only allow deleting custom classes
    const index = data.customClasses.findIndex(c => c.id === classId);
    if (index < 0) {
      return NextResponse.json(
        { error: "Custom class not found" },
        { status: 404 }
      );
    }

    data.customClasses.splice(index, 1);
    await saveClasses(data);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting class:", error);
    return NextResponse.json(
      { error: "Failed to delete class" },
      { status: 500 }
    );
  }
}

