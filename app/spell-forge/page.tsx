"use client";

import { useState, useEffect, useRef } from "react";
import {
  Send,
  Loader2,
  Sparkles,
  CheckCircle2,
  Circle,
  RotateCcw,
  BookPlus,
  Wand2,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import type { SpellDraft } from "@/app/api/spell-forge/route";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  isWelcome?: boolean;
}

const PRISM_COLORS: Record<string, string> = {
  "ARCANE PRISM": "bg-violet-500/20 text-violet-300 border-violet-500/40",
  "DIVINE PRISM": "bg-yellow-500/20 text-yellow-300 border-yellow-500/40",
  "ELEMENTAL PRISM": "bg-orange-500/20 text-orange-300 border-orange-500/40",
  "FEY PRISM": "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
  "FIENDISH PRISM": "bg-red-500/20 text-red-300 border-red-500/40",
  "SHADOW PRISM": "bg-slate-500/20 text-slate-300 border-slate-500/40",
  "SOLAR PRISM": "bg-amber-500/20 text-amber-300 border-amber-500/40",
};

const SPELL_FIELDS: {
  key: keyof SpellDraft;
  label: string;
  focusKey: string;
}[] = [
  { key: "name", label: "Name", focusKey: "name" },
  { key: "school", label: "School", focusKey: "school" },
  { key: "level", label: "Level", focusKey: "level" },
  { key: "casting_time", label: "Casting Time", focusKey: "casting_time" },
  { key: "range", label: "Range", focusKey: "range" },
  { key: "components", label: "Components", focusKey: "components" },
  { key: "duration", label: "Duration", focusKey: "duration" },
  { key: "prism", label: "Prism", focusKey: "prism" },
  { key: "description", label: "Description", focusKey: "description" },
];

const EMPTY_DRAFT: SpellDraft = {
  name: null,
  level: null,
  school: null,
  casting_time: null,
  range: null,
  components: null,
  duration: null,
  description: null,
  prism: null,
};

const WELCOME_MESSAGE = `✨ **Welcome to Spell Forge!**

I'm your AI spell designer, specialized in the **Prism Magic System**. Together we'll craft a balanced, thematic custom spell through a quick back-and-forth conversation.

**To get started, describe your spell concept!** Tell me the theme, the feeling, or what you want it to *do* in the game. For example:

- *"A shadow spell that lets me drain an enemy's life force"*
- *"An icy storm that slows enemies and deals cold damage over time"*
- *"A fey illusion that makes someone see their worst fears"*

The more vivid your description, the better I can tailor the spell. What's your vision?`;

function formatFieldValue(key: keyof SpellDraft, value: SpellDraft[keyof SpellDraft]): string {
  if (value === null || value === undefined) return "";
  if (key === "level") {
    return (value as number) === 0 ? "Cantrip" : `Level ${value}`;
  }
  if (key === "prism") {
    if (Array.isArray(value)) return value.join(", ");
    return value as string;
  }
  return value as string;
}

function PrismBadges({ prism }: { prism: string | string[] | null }) {
  if (!prism) return null;
  const prisms = Array.isArray(prism) ? prism : [prism];
  return (
    <div className="flex flex-wrap gap-1">
      {prisms.map((p) => (
        <span
          key={p}
          className={`inline-flex items-center px-2 py-0.5 rounded border text-xs font-medium ${
            PRISM_COLORS[p] ?? "bg-secondary text-secondary-foreground border-border"
          }`}
        >
          {p.replace(" PRISM", "")}
        </span>
      ))}
    </div>
  );
}

function SpellPreviewCard({
  draft,
  focusField,
  complete,
  saving,
  onSave,
}: {
  draft: SpellDraft;
  focusField: string;
  complete: boolean;
  saving: boolean;
  onSave: () => void;
}) {
  const filledCount = Object.entries(draft).filter(
    ([, v]) => v !== null && v !== undefined
  ).length;
  const totalFields = 9;
  const progressPct = Math.round((filledCount / totalFields) * 100);

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Wand2 className="w-4 h-4 text-primary" />
            Spell Preview
          </CardTitle>
          <span className="text-xs text-muted-foreground">
            {filledCount}/{totalFields} fields
          </span>
        </div>
        <Progress value={progressPct} className="h-1.5" />
      </CardHeader>

      <CardContent className="flex-1 overflow-y-auto space-y-2 text-sm">
        {/* Core stat fields */}
        {SPELL_FIELDS.filter((f) => f.key !== "description").map((field) => {
          const value = draft[field.key];
          const isFilled = value !== null && value !== undefined;
          const isFocus = focusField === field.focusKey;

          return (
            <div
              key={field.key}
              className={`flex items-start justify-between gap-2 py-1.5 px-2 rounded-md transition-colors ${
                isFocus
                  ? "bg-primary/10 ring-1 ring-primary/30"
                  : isFilled
                  ? "bg-secondary/40"
                  : ""
              }`}
            >
              <div className="flex items-center gap-1.5 min-w-0 flex-shrink-0">
                {isFilled ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                ) : (
                  <Circle className="w-3.5 h-3.5 text-muted-foreground/40 flex-shrink-0" />
                )}
                <span
                  className={`font-medium ${
                    isFilled ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {field.label}
                </span>
              </div>

              <div className="text-right min-w-0">
                {isFilled ? (
                  field.key === "prism" ? (
                    <PrismBadges prism={draft.prism} />
                  ) : (
                    <span className="text-foreground break-words">
                      {formatFieldValue(field.key, value)}
                    </span>
                  )
                ) : (
                  <span className="text-muted-foreground/40 italic text-xs">
                    {isFocus ? "discussing now…" : "pending"}
                  </span>
                )}
              </div>
            </div>
          );
        })}

        {/* Description — shown below, full width */}
        {(() => {
          const isFocus = focusField === "description";
          const isFilled = !!draft.description;
          return (
            <div
              className={`mt-2 rounded-md p-2 transition-colors ${
                isFocus
                  ? "bg-primary/10 ring-1 ring-primary/30"
                  : isFilled
                  ? "bg-secondary/40"
                  : ""
              }`}
            >
              <div className="flex items-center gap-1.5 mb-1">
                {isFilled ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                ) : (
                  <Circle className="w-3.5 h-3.5 text-muted-foreground/40" />
                )}
                <span
                  className={`font-medium ${
                    isFilled ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  Description
                </span>
              </div>
              {isFilled ? (
                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-6">
                  {draft.description}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground/40 italic">
                  {isFocus ? "writing now…" : "pending"}
                </p>
              )}
            </div>
          );
        })()}

        {/* Save button */}
        {complete && (
          <div className="pt-3">
            <Button
              onClick={onSave}
              disabled={saving}
              className="w-full gap-2"
              size="sm"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <BookPlus className="w-4 h-4" />
                  Add to Spellbook
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function SpellForgePage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: WELCOME_MESSAGE,
      timestamp: new Date(),
      isWelcome: true,
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [spellDraft, setSpellDraft] = useState<SpellDraft>(EMPTY_DRAFT);
  const [complete, setComplete] = useState(false);
  const [focusField, setFocusField] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      // Build API messages: skip the static welcome, send only real conversation
      const allMessages = [...messages, userMessage];
      const apiMessages = allMessages
        .filter((m) => !m.isWelcome)
        .map((m) => ({ role: m.role, content: m.content }));

      const response = await fetch("/api/spell-forge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: apiMessages,
          spellDraft,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to get response");
      }

      const data = await response.json();

      const assistantMessage: Message = {
        role: "assistant",
        content: data.message,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);

      if (data.spellDraft) {
        setSpellDraft(data.spellDraft);
      }
      if (data.focusField) {
        setFocusField(data.focusField);
      }
      if (data.complete) {
        setComplete(true);
      }
    } catch (error) {
      console.error("Spell Forge error:", error);
      const errorMessage: Message = {
        role: "assistant",
        content:
          error instanceof Error
            ? `⚠️ ${error.message}`
            : "⚠️ Something went wrong. Please try again.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleSave = async () => {
    if (!complete || saving) return;

    // Validate all fields are present
    const missing = Object.entries(spellDraft)
      .filter(([, v]) => v === null || v === undefined)
      .map(([k]) => k);

    if (missing.length > 0) {
      toast({
        title: "Spell incomplete",
        description: `Still missing: ${missing.join(", ")}`,
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/custom-spells", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: spellDraft.name,
          level: spellDraft.level,
          school: spellDraft.school,
          casting_time: spellDraft.casting_time,
          range: spellDraft.range,
          components: spellDraft.components,
          duration: spellDraft.duration,
          description: spellDraft.description,
          prism: spellDraft.prism,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to save spell");
      }

      toast({
        title: "✨ Spell added!",
        description: `"${spellDraft.name}" has been added to the spellbook.`,
      });

      // Add a confirmation message in the chat
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `🎉 **"${spellDraft.name}" has been added to your spellbook!** You can find it in the spell list on the home page and in the Admin panel.\n\nWant to forge another spell? Just describe your next concept!`,
          timestamp: new Date(),
        },
      ]);

      // Reset for a new spell
      setSpellDraft(EMPTY_DRAFT);
      setComplete(false);
      setFocusField("");
    } catch (error) {
      console.error("Save error:", error);
      toast({
        title: "Save failed",
        description:
          error instanceof Error ? error.message : "Failed to save spell",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setMessages([
      {
        role: "assistant",
        content: WELCOME_MESSAGE,
        timestamp: new Date(),
        isWelcome: true,
      },
    ]);
    setSpellDraft(EMPTY_DRAFT);
    setComplete(false);
    setFocusField("");
    setInput("");
  };

  return (
    <div className="h-[calc(100vh-64px)] bg-background flex flex-col overflow-hidden">
      {/* Header */}
      <div className="border-b bg-card flex-shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Spell Forge</h1>
                <p className="text-xs text-muted-foreground">
                  AI-guided custom spell creator
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {complete && (
                <Badge variant="default" className="text-xs gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Ready to save
                </Badge>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                className="gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">New Spell</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main content: chat + preview side by side */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 flex gap-4 min-h-0 overflow-hidden">
        {/* Chat column */}
        <div className="flex-1 flex flex-col min-h-0 min-w-0">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto space-y-4 mb-4 min-h-0 scrollbar-hide">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex gap-3 ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {message.role === "assistant" && (
                  <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-4 h-4 text-primary" />
                  </div>
                )}
                <Card
                  className={`max-w-[85%] ${
                    message.role === "user" ? "bg-secondary" : "bg-secondary"
                  }`}
                >
                  <CardContent className="py-3 px-4">
                    <div className="text-sm prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0 prose-headings:my-2">
                      <ReactMarkdown>{message.content}</ReactMarkdown>
                    </div>
                    <div className="text-xs text-muted-foreground mt-2">
                      {message.timestamp.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </CardContent>
                </Card>
                {message.role === "user" && (
                  <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-medium">You</span>
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex gap-3 justify-start">
                <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-4 h-4 text-primary" />
                </div>
                <Card className="bg-secondary">
                  <CardContent className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm text-muted-foreground">
                        Forging your spell…
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t pt-3 flex-shrink-0">
            {complete && (
              <div className="flex items-center gap-2 mb-2 p-2 rounded-md bg-emerald-500/10 border border-emerald-500/20">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <p className="text-xs text-emerald-400">
                  Your spell is complete! Hit{" "}
                  <strong>Add to Spellbook</strong> in the preview panel to
                  save it, or keep chatting to make changes.
                </p>
              </div>
            )}
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  complete
                    ? "Make changes or ask questions…"
                    : "Describe your spell concept…"
                }
                disabled={loading}
                className="flex-1"
              />
              <Button
                onClick={sendMessage}
                disabled={loading || !input.trim()}
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Powered by GPT · Answers questions and builds your spell one step at a time
            </p>
          </div>
        </div>

        {/* Preview column — hidden on small screens, shown md+ */}
        <div className="hidden md:flex w-72 lg:w-80 flex-shrink-0 flex-col min-h-0">
          <SpellPreviewCard
            draft={spellDraft}
            focusField={focusField}
            complete={complete}
            saving={saving}
            onSave={handleSave}
          />
        </div>
      </div>

      {/* Mobile: save button pinned at bottom when complete */}
      {complete && (
        <div className="md:hidden border-t bg-card p-3 flex-shrink-0">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <BookPlus className="w-4 h-4" />
                Add to Spellbook
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
