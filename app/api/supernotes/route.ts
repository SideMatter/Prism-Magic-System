import { NextResponse } from "next/server";

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const SUPERNOTES_API_KEY = process.env.SUPERNOTES_API_KEY;
const CARD_ID = "d289766e-b7dd-4337-9de4-0952ab3ac579";

export async function GET() {
  if (!SUPERNOTES_API_KEY) {
    return NextResponse.json(
      { error: "Supernotes API key not configured" },
      { status: 500 }
    );
  }

  try {
    // Fetch the specific card from Supernotes
    const response = await fetch(
      `https://api.supernotes.app/v1/cards/get/select`,
      {
        method: "POST",
        headers: {
          "Api-Key": SUPERNOTES_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          card_ids: [CARD_ID],
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Supernotes API error:", errorText);
      return NextResponse.json(
        { error: "Failed to fetch from Supernotes" },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    // The API returns cards keyed by their ID
    const card = data[CARD_ID];
    
    if (!card) {
      return NextResponse.json(
        { error: "Card not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      name: card.data?.name || "Untitled",
      markup: card.data?.markup || "",
      html: card.data?.html || "",
      created_when: card.data?.created_when,
      modified_when: card.data?.modified_when,
    });
  } catch (error) {
    console.error("Error fetching from Supernotes:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

