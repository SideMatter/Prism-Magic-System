import { NextResponse } from "next/server";
import { storage } from "@/lib/storage";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { spellName, prism } = body;

    console.log("Update request received:", { spellName, prism });

    if (!spellName) {
      console.error("Missing spellName in request");
      return NextResponse.json({ error: "Spell name is required" }, { status: 400 });
    }

    const mappings = await storage.loadMappings();
    console.log(`Loaded ${Object.keys(mappings).length} existing mappings`);

    const previousPrism = mappings[spellName];
    
    if (prism && prism.trim()) {
      mappings[spellName] = prism.trim();
      console.log(`Setting ${spellName} to ${prism.trim()} (was: ${previousPrism || 'none'})`);
    } else {
      delete mappings[spellName];
      console.log(`Removing prism from ${spellName} (was: ${previousPrism || 'none'})`);
    }

    await storage.saveMappings(mappings);
    
    // Verify the save worked
    const verifyMappings = await storage.loadMappings();
    const savedPrism = verifyMappings[spellName];
    console.log(`Verified save: ${spellName} = ${savedPrism || 'none'}`);

    return NextResponse.json({ 
      success: true, 
      message: "Spell updated successfully",
      spellName,
      prism: savedPrism || null
    });
  } catch (error) {
    console.error("Error updating spell:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ 
      error: "Failed to update spell",
      details: errorMessage
    }, { status: 500 });
  }
}

