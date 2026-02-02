import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface Player {
  id: string;
  name: string;
  maxSpellLevel: number;
  prisms: string[];
  playerClass?: string;
  classInfo?: string;
}

interface PrismClass {
  id: string;
  name: string;
  prism?: string;
  type?: string;
  hitDie: number;
  description: string;
  features?: string[];
  spellList?: string;
}

interface Spell {
  name: string;
  level: number;
  school: string;
  casting_time: string;
  range: string;
  components: string;
  duration: string;
  description: string;
  prism?: string | string[];
  isCustom?: boolean;
}

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

// Build the system prompt with player context
function buildSystemPrompt(player: Player, accessibleSpells: Spell[], playerClassInfo: PrismClass | null): string {
  const spellsByLevel: Record<number, Spell[]> = {};
  
  accessibleSpells.forEach((spell) => {
    if (!spellsByLevel[spell.level]) {
      spellsByLevel[spell.level] = [];
    }
    spellsByLevel[spell.level].push(spell);
  });

  const spellSummary = Object.entries(spellsByLevel)
    .sort(([a], [b]) => parseInt(a) - parseInt(b))
    .map(([level, spells]) => {
      const levelName = level === "0" ? "Cantrips" : `Level ${level}`;
      const spellList = spells
        .map((s) => {
          const prismInfo = Array.isArray(s.prism)
            ? s.prism.join(", ")
            : s.prism || "Unknown";
          return `  - ${s.name} (${s.school}, ${prismInfo})`;
        })
        .join("\n");
      return `${levelName} (${spells.length} spells):\n${spellList}`;
    })
    .join("\n\n");

  // Build spell details for reference (just the first 50 most common ones to save tokens)
  const detailedSpells = accessibleSpells
    .slice(0, 50)
    .map(
      (s) =>
        `**${s.name}** (Level ${s.level} ${s.school})
Casting Time: ${s.casting_time} | Range: ${s.range} | Components: ${s.components}
Duration: ${s.duration}
${s.description}`
    )
    .join("\n\n---\n\n");

  // Build class info section
  let classSection = "";
  if (player.playerClass || player.classInfo || playerClassInfo) {
    classSection = `\n## ${player.name}'s Class`;
    if (player.playerClass) {
      classSection += `\n- **Class**: ${player.playerClass}`;
    }
    if (playerClassInfo) {
      classSection += `\n- **Type**: ${playerClassInfo.type || "Unknown"}`;
      classSection += `\n- **Prism**: ${playerClassInfo.prism || "Unknown"}`;
      classSection += `\n- **Hit Die**: d${playerClassInfo.hitDie}`;
      classSection += `\n- **Description**: ${playerClassInfo.description}`;
      if (playerClassInfo.spellList) {
        classSection += `\n- **Spell List Access**: ${playerClassInfo.spellList}`;
      }
      if (playerClassInfo.features && playerClassInfo.features.length > 0) {
        classSection += `\n- **Features**: ${playerClassInfo.features.join(", ")}`;
      }
    }
    if (player.classInfo) {
      classSection += `\n\n### Additional Class Notes\n${player.classInfo}`;
    }
  }

  return `You are Paul Bot, a helpful and knowledgeable assistant for D&D 5th Edition, specializing in the Prism Magic System homebrew. You're friendly, enthusiastic about magic, and always ready to help with spell questions, tactical advice, and character building.

## About the Player
- **Name**: ${player.name}
- **Maximum Spell Level**: ${player.maxSpellLevel} (can cast spells from cantrips up to level ${player.maxSpellLevel})
- **Prisms**: ${player.prisms.join(", ")}
${classSection}

## About the Prism Magic System
The Prism Magic System is a homebrew for D&D 5e that organizes spells into 7 thematic Prisms:
1. **ARCANE PRISM** - Classic wizard magic: manipulation, transmutation, force effects
2. **DIVINE PRISM** - Holy power: healing, protection, smiting evil
3. **ELEMENTAL PRISM** - Elemental forces: fire, cold, lightning, thunder, earth, water
4. **FEY PRISM** - Fey magic: illusions, charms, nature, shapeshifting
5. **FIENDISH PRISM** - Dark bargains: fire, fear, domination, hellish power
6. **SHADOW PRISM** - Darkness and death: necromancy, stealth, fear, necrotic damage
7. **SOLAR PRISM** - Cosmic/radiant: light, teleportation, planar magic

Some spells belong to multiple prisms (like Misty Step being both FEY and ARCANE). Players can only cast spells from prisms they have access to.

## Strain System
In this system, casting spells costs Strain based on spell level:
- Cantrips: 0 Strain
- 1st-2nd level: 1 Strain
- 3rd-4th level: 2 Strain
- 5th-6th level: 4 Strain
- 7th level: 7 Strain
- 8th level: 10 Strain
- 9th level: 14 Strain

## ${player.name}'s Accessible Spells (${accessibleSpells.length} total)
${spellSummary}

## Spell Details Reference
${detailedSpells}

## Your Role
1. Answer questions about spells the player can cast
2. Suggest tactical spell combinations and strategies based on their class and abilities
3. Explain spell mechanics and interactions
4. Help with character building decisions considering their class features
5. Clarify D&D 5e rules and how they interact with the Prism system
6. Remember: ${player.name} can ONLY cast spells from their prisms (${player.prisms.join(", ")}) up to level ${player.maxSpellLevel}
${player.playerClass ? `7. Consider their ${player.playerClass} class features and abilities when giving advice` : ""}

Be helpful, accurate, and enthusiastic! If asked about a spell the player doesn't have access to, let them know it's outside their current prisms or spell level, but still explain what it does.`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messages, player } = body as {
      messages: Message[];
      player: Player;
    };

    if (!player) {
      return NextResponse.json(
        { error: "Player data is required" },
        { status: 400 }
      );
    }

    if (!messages || messages.length === 0) {
      return NextResponse.json(
        { error: "Messages are required" },
        { status: 400 }
      );
    }

    // Fetch all spells and classes to build context
    const baseUrl = request.nextUrl.origin;
    const [spellsResponse, classesResponse] = await Promise.all([
      fetch(`${baseUrl}/api/spells`, { cache: "no-store" }),
      fetch(`${baseUrl}/api/classes`, { cache: "no-store" }),
    ]);
    const allSpells: Spell[] = await spellsResponse.json();
    const allClasses: PrismClass[] = await classesResponse.json();

    // Filter to spells this player can access
    const accessibleSpells = allSpells.filter((spell) => {
      // Check spell level
      if (spell.level > player.maxSpellLevel) return false;

      // Check prism access
      if (!spell.prism) return false;

      const spellPrisms = Array.isArray(spell.prism)
        ? spell.prism
        : [spell.prism];
      return spellPrisms.some((prism) => player.prisms.includes(prism));
    });

    // Find the player's class info if they have one
    let playerClassInfo: PrismClass | null = null;
    if (player.playerClass) {
      playerClassInfo = allClasses.find(
        (c) => c.name.toLowerCase() === player.playerClass?.toLowerCase()
      ) || null;
    }

    // Build system prompt with full context
    const systemPrompt = buildSystemPrompt(player, accessibleSpells, playerClassInfo);

    // Prepare messages for OpenAI
    const openaiMessages: OpenAI.ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
      ...messages.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    ];

    // Call OpenAI GPT-5.2
    const completion = await openai.chat.completions.create({
      model: "gpt-5.2",
      messages: openaiMessages,
      temperature: 0.7,
      max_completion_tokens: 2000,
    });

    const assistantMessage = completion.choices[0]?.message?.content || "";

    return NextResponse.json({
      message: assistantMessage,
      spellCount: accessibleSpells.length,
    });
  } catch (error: unknown) {
    console.error("Paul Bot error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    const isAuthError = message.includes("401") || message.includes("Incorrect API key") || message.includes("invalid_api_key");
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
