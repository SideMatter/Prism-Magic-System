import { NextResponse } from "next/server";
import { getConvexClient } from "@/lib/convex";
import { api } from "@/convex/_generated/api";

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { spellName, prism } = body;

    console.log("Update request received:", { spellName, prism });

    if (!spellName) {
      console.error("Missing spellName in request");
      return NextResponse.json({ error: "Spell name is required" }, { status: 400 });
    }

    const convex = getConvexClient();
    
    // Normalize prism value
    let normalizedPrism: string | string[] | null = null;
    if (prism) {
      if (Array.isArray(prism)) {
        normalizedPrism = prism.length > 0 ? prism : null;
      } else if (typeof prism === 'string' && prism.trim()) {
        normalizedPrism = prism.trim();
      }
    }

    const result = await convex.mutation(api.spellMappings.update, {
      spellName,
      prism: normalizedPrism,
    });

    console.log("Update result:", result);

    return NextResponse.json({ 
      success: true, 
      message: "Spell updated successfully",
      spellName,
      prism: result.prism
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
