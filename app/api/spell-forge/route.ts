import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface Message {
  role: "user" | "assistant";
  content: string;
}

export interface SpellDraft {
  name: string | null;
  level: number | null;
  school: string | null;
  casting_time: string | null;
  range: string | null;
  components: string | null;
  duration: string | null;
  description: string | null;
  prism: string | string[] | null;
}

const SYSTEM_PROMPT = `You are Spell Forge, a creative D&D 5e spell designer specializing in the Prism Magic System homebrew. Your role is to collaboratively design balanced, thematic custom spells through a natural guided conversation — one question or suggestion at a time.

## The Prism Magic System
Spells belong to one (or more) of 7 prisms:
1. ARCANE PRISM – Manipulation, transmutation, force effects, arcane utility
2. DIVINE PRISM – Healing, protection, smiting, holy power, blessings
3. ELEMENTAL PRISM – Fire, cold, lightning, thunder, earth, water damage
4. FEY PRISM – Illusions, charms, nature, shapeshifting, fairy magic
5. FIENDISH PRISM – Hellish fire, fear, domination, dark bargains
6. SHADOW PRISM – Necromancy, darkness, stealth, necrotic damage, undeath
7. SOLAR PRISM – Radiant light, teleportation, cosmic and planar magic

Spells can belong to multiple prisms when thematically appropriate (e.g. a void spell could be SHADOW + ARCANE).

## D&D 5e Design Standards
- Schools: Abjuration, Conjuration, Divination, Enchantment, Evocation, Illusion, Necromancy, Transmutation
- Casting Times: "1 action", "1 bonus action", "1 reaction, which you take when [trigger]", "1 minute", "10 minutes", "1 hour"
- Range: "Self", "Touch", "10 feet", "30 feet", "60 feet", "90 feet", "120 feet", "150 feet", "300 feet", "1 mile", "Sight"
- Components: "V, S", "V, S, M (brief material description)", "V", "S", "V, M (material)"
  - Material components worth 100+ gp should be listed with cost; consumed materials should say "which the spell consumes"
- Duration: "Instantaneous", "1 round", "1 minute", "10 minutes", "1 hour", "8 hours", "24 hours", "Until dispelled"
  - Concentration spells: append "(concentration)" e.g. "1 minute (concentration)"

## Your Workflow
Work through these 9 fields one at a time, in roughly this order:
1. name — Suggest 2–3 evocative options based on the concept
2. school — Recommend the best-fitting school with a brief rationale
3. level — Recommend a level with a balance justification
4. casting_time — Recommend based on the spell's role (combat vs. utility)
5. range — Recommend based on the spell's use case
6. components — List V/S/M as appropriate; if M is needed, specify the material
7. duration — Recommend based on the spell's effect type
8. description — Write a complete, official-style spell description with clear mechanics
9. prism — Assign the appropriate prism(s) with reasoning

Once ALL 9 fields are confirmed, set complete to true and present the full spell for final review.

## Conversation Rules
- Ask ONE question or make ONE clear recommendation per response — keep the conversation flowing
- Be creative, enthusiastic, and knowledgeable — you're a master spell designer!
- Validate balance: damage spells at level 3 should be roughly comparable to Fireball (8d6), etc.
- NEVER lose confirmed spell data — once a field is agreed upon, always carry it forward in spellDraft
- If a user changes their mind about a confirmed field, update it and re-confirm

## MANDATORY RESPONSE FORMAT
Respond ONLY with valid JSON — no text before or after. Exact structure required:
{
  "message": "Your conversational response here. Can use markdown formatting. Be helpful, engaging, and expert.",
  "spellDraft": {
    "name": "confirmed spell name, or null if not yet set",
    "level": confirmed_integer_0_to_9_or_null,
    "school": "confirmed school, or null",
    "casting_time": "confirmed casting time, or null",
    "range": "confirmed range, or null",
    "components": "confirmed components, or null",
    "duration": "confirmed duration, or null",
    "description": "full spell description text, or null",
    "prism": "PRISM NAME" or ["PRISM ONE", "PRISM TWO"] or null
  },
  "complete": false,
  "focusField": "current field being discussed: name|school|level|casting_time|range|components|duration|description|prism|review"
}

Set "complete": true ONLY when all 9 fields in spellDraft are non-null AND you've presented the complete spell summary asking the user to confirm they're ready to save.`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messages, spellDraft } = body as {
      messages: Message[];
      spellDraft: SpellDraft;
    };

    if (!messages || messages.length === 0) {
      return NextResponse.json(
        { error: "Messages are required" },
        { status: 400 }
      );
    }

    // Inject current draft state into system prompt so the AI never loses track
    const draftContext =
      spellDraft && Object.values(spellDraft).some((v) => v !== null)
        ? `\n\n## Current Confirmed Spell Draft\nKeep ALL of these confirmed values in every response:\n${JSON.stringify(spellDraft, null, 2)}`
        : "";

    const openaiMessages: OpenAI.ChatCompletionMessageParam[] = [
      { role: "system", content: SYSTEM_PROMPT + draftContext },
      ...messages.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    ];

    const completion = await openai.chat.completions.create({
      model: "gpt-5.2",
      messages: openaiMessages,
      temperature: 0.8,
      max_completion_tokens: 1500,
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0]?.message?.content || "{}";

    let parsed: {
      message: string;
      spellDraft: SpellDraft;
      complete: boolean;
      focusField: string;
    };

    try {
      parsed = JSON.parse(raw);
    } catch {
      console.error("Failed to parse AI JSON response:", raw);
      return NextResponse.json(
        { error: "AI returned an unparseable response. Please try again." },
        { status: 500 }
      );
    }

    if (!parsed.message || !parsed.spellDraft) {
      return NextResponse.json(
        { error: "AI response was missing required fields. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json(parsed);
  } catch (error: unknown) {
    console.error("Spell Forge error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    const isAuthError =
      message.includes("401") ||
      message.includes("Incorrect API key") ||
      message.includes("invalid_api_key");
    return NextResponse.json(
      {
        error: isAuthError
          ? "Invalid OpenAI API key. Check OPENAI_API_KEY in .env.local"
          : `Failed to get response: ${message}`,
      },
      { status: 500 }
    );
  }
}
