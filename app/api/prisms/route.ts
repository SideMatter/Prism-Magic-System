import { NextResponse } from "next/server";
import { getConvexClient } from "@/lib/convex";
import { api } from "@/convex/_generated/api";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const convex = getConvexClient();
    const prisms = await convex.query(api.prisms.list, {});
    
    // Initialize defaults if empty
    if (prisms.length === 0) {
      await convex.mutation(api.prisms.initializeDefaults, {});
      const newPrisms = await convex.query(api.prisms.list, {});
      return NextResponse.json(newPrisms);
    }
    
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

    const convex = getConvexClient();
    const result = await convex.mutation(api.prisms.add, { name: name.trim() });

    return NextResponse.json({ success: true, prism: result.name });
  } catch (error: any) {
    console.error("Error adding prism:", error);
    const message = error?.message || "Failed to add prism";
    if (message.includes("already exists")) {
      return NextResponse.json({ error: "Prism already exists" }, { status: 400 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { name } = await request.json();

    if (!name) {
      return NextResponse.json({ error: "Prism name is required" }, { status: 400 });
    }

    const convex = getConvexClient();
    await convex.mutation(api.prisms.remove, { name });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting prism:", error);
    return NextResponse.json({ error: error?.message || "Failed to delete prism" }, { status: 500 });
  }
}
