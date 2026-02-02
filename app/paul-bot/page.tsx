"use client";

import { useState, useEffect, useRef } from "react";
import { Send, User, Loader2, Sparkles, AlertCircle, ChevronDown } from "lucide-react";
import Image from "next/image";
import ReactMarkdown from "react-markdown";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import type { Player } from "@/lib/player-utils";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export default function PaulBotPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [playerLoading, setPlayerLoading] = useState(true);
  const [spellCount, setSpellCount] = useState<number | null>(null);
  const [showPlayerDropdown, setShowPlayerDropdown] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load all players
  useEffect(() => {
    loadPlayers();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowPlayerDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadPlayers = async () => {
    setPlayerLoading(true);
    try {
      const response = await fetch("/api/players", {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      });
      const data = await response.json();
      setPlayers(data);
      // Default to first player if available
      if (data.length > 0) {
        setSelectedPlayer(data[0]);
      }
    } catch (error) {
      console.error("Error loading players:", error);
    } finally {
      setPlayerLoading(false);
    }
  };

  const selectPlayer = (player: Player) => {
    setSelectedPlayer(player);
    setShowPlayerDropdown(false);
    setMessages([]); // Clear chat when switching players
    setSpellCount(null);
  };

  const sendMessage = async () => {
    if (!input.trim() || !selectedPlayer || loading) return;

    const userMessage: Message = {
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/paul-bot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage].map((m) => ({
            role: m.role,
            content: m.content,
          })),
          player: selectedPlayer,
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
      if (data.spellCount) {
        setSpellCount(data.spellCount);
      }
    } catch (error) {
      console.error("Error sending message:", error);
      const errorMessage: Message = {
        role: "assistant",
        content:
          error instanceof Error
            ? error.message
            : "Sorry, I encountered an error. Please check your OpenAI API key in .env.local and try again.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };


  return (
    <div className="h-[calc(100vh-64px)] bg-background flex flex-col overflow-hidden">
      {/* Compact Header */}
      <div className="border-b bg-card flex-shrink-0">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between gap-4">
            {/* Left: Paul Bot title */}
            <div className="flex items-center gap-3">
              <Image
                src="/paul-bot.png?v=2"
                alt="Paul Bot"
                width={40}
                height={40}
                className="rounded-full"
              />
              <div>
                <h1 className="text-xl font-bold">Paul Bot</h1>
                <p className="text-xs text-muted-foreground">
                  AI assistant for spells & abilities
                </p>
              </div>
            </div>

            {/* Right: Player selector and info */}
            <div className="flex items-center gap-2 flex-wrap justify-end">
              {/* Player Dropdown */}
              <div className="relative" ref={dropdownRef}>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPlayerDropdown(!showPlayerDropdown)}
                  className="flex items-center gap-2"
                  disabled={playerLoading}
                >
                  <User className="w-4 h-4" />
                  {selectedPlayer ? selectedPlayer.name : "Select Player"}
                  <ChevronDown className="w-3 h-3" />
                </Button>
                {showPlayerDropdown && players.length > 0 && (
                  <div className="absolute right-0 top-full mt-1 w-48 bg-popover border rounded-md shadow-lg z-50">
                    {players.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => selectPlayer(p)}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors ${
                          selectedPlayer?.id === p.id ? "bg-accent" : ""
                        }`}
                      >
                        <div className="font-medium">{p.name}</div>
                        <div className="text-xs text-muted-foreground">
                          Level 0-{p.maxSpellLevel} • {p.prisms.length} prisms
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Player Info Badges */}
              {selectedPlayer && (
                <>
                  <Badge variant="outline" className="text-xs hidden sm:flex">
                    Lvl 0-{selectedPlayer.maxSpellLevel}
                  </Badge>
                  {selectedPlayer.prisms.slice(0, 3).map((prism) => (
                    <Badge key={prism} variant="default" className="text-xs hidden md:flex">
                      {prism.replace(" PRISM", "")}
                    </Badge>
                  ))}
                  {selectedPlayer.prisms.length > 3 && (
                    <Badge variant="secondary" className="text-xs hidden md:flex">
                      +{selectedPlayer.prisms.length - 3}
                    </Badge>
                  )}
                  {spellCount && (
                    <Badge variant="secondary" className="text-xs hidden lg:flex">
                      <Sparkles className="w-3 h-3 mr-1" />
                      {spellCount} spells
                    </Badge>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col min-h-0">
        {playerLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">Loading players...</p>
            </div>
          </div>
        ) : players.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <Card className="max-w-md">
              <CardContent className="pt-6">
                <div className="text-center">
                  <AlertCircle className="w-12 h-12 mx-auto mb-4 text-destructive" />
                  <h3 className="text-lg font-semibold mb-2">
                    No Players Found
                  </h3>
                  <p className="text-muted-foreground">
                    Please create a player in the Admin panel first.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : !selectedPlayer ? (
          <div className="flex-1 flex items-center justify-center">
            <Card className="max-w-md">
              <CardContent className="pt-6">
                <div className="text-center">
                  <User className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">
                    Select a Player
                  </h3>
                  <p className="text-muted-foreground">
                    Choose a player from the dropdown to start chatting.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto space-y-4 mb-4 min-h-0 scrollbar-hide">
              {messages.length === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <Card className="max-w-lg bg-secondary/30">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-center flex items-center justify-center gap-2 text-lg">
                        <Image
                          src="/paul-bot.png?v=2"
                          alt="Paul Bot"
                          width={24}
                          height={24}
                          className="rounded-full"
                        />
                        Welcome to Paul Bot!
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-center text-muted-foreground pt-0">
                      <p className="mb-3 text-sm">
                        I know all about {selectedPlayer.name}&apos;s spells and abilities. Ask me anything!
                      </p>
                      <div className="text-sm space-y-1">
                        <p className="font-medium text-foreground text-xs">
                          Try asking:
                        </p>
                        <ul className="space-y-0.5 text-xs">
                          <li>&quot;What are my best damage spells?&quot;</li>
                          <li>&quot;How does Fireball work?&quot;</li>
                          <li>&quot;What spells should I prepare?&quot;</li>
                          <li>&quot;Explain the Strain system&quot;</li>
                        </ul>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex gap-3 ${
                      message.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    {message.role === "assistant" && (
                      <div className="w-8 h-8 flex-shrink-0">
                        <Image
                          src="/paul-bot.png?v=2"
                          alt="Paul Bot"
                          width={32}
                          height={32}
                          className="rounded-full w-8 h-8 object-cover"
                        />
                      </div>
                    )}
                    <Card
                      className={`max-w-[80%] ${
                        message.role === "user"
                          ? "bg-secondary"
                          : "bg-secondary"
                      }`}
                    >
                      <CardContent className="py-3 px-4">
                        <div className="text-sm prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0 prose-headings:my-2">
                          <ReactMarkdown>{message.content}</ReactMarkdown>
                        </div>
                        <div
                          className={`text-xs mt-2 ${
                            message.role === "user"
                              ? "text-muted-foreground"
                              : "text-muted-foreground"
                          }`}
                        >
                          {message.timestamp.toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </CardContent>
                    </Card>
                    {message.role === "user" && (
                      <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                        <User className="w-5 h-5" />
                      </div>
                    )}
                  </div>
                ))
              )}
              {loading && (
                <div className="flex gap-3 justify-start">
                  <div className="w-8 h-8 flex-shrink-0">
                    <Image
                      src="/paul-bot.png?v=2"
                      alt="Paul Bot"
                      width={32}
                      height={32}
                      className="rounded-full w-8 h-8 object-cover"
                    />
                  </div>
                  <Card className="bg-secondary">
                    <CardContent className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-sm text-muted-foreground">
                          Paul is thinking...
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="border-t pt-3 flex-shrink-0">
              <div className="flex gap-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder={`Ask about ${selectedPlayer.name}'s spells and abilities...`}
                  disabled={loading}
                  className="flex-1"
                />
                <Button onClick={sendMessage} disabled={loading || !input.trim()}>
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2 text-center">
                Powered by GPT-5.2 with full knowledge of your Prism Magic System spells
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
