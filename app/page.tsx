"use client";

import { useState, useEffect, useMemo } from "react";
import { Search, Sparkles, ArrowLeft, Hash, Check, User, X, Volume2, Hand, Package } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { getAvailableSpellLevels } from "@/lib/player-utils";
import { useSpellData, usePlayers, type Spell, type Player } from "@/hooks/use-spell-data";
import { parseDiceExpression, isDiceCommand, extractDiceExpression, type DiceResult } from "@/lib/dice";

export default function Home() {
  // Use Convex hooks for real-time data (no polling needed!)
  const { spells, prisms, isLoading: spellsLoading } = useSpellData();
  const { players, isLoading: playersLoading } = usePlayers();
  
  const loading = spellsLoading || playersLoading;
  
  const [selectedSpell, setSelectedSpell] = useState<Spell | null>(null);
  const [selectedPrisms, setSelectedPrisms] = useState<string[]>([]);
  const [includeNoPrism, setIncludeNoPrism] = useState(false);
  const [selectedLevels, setSelectedLevels] = useState<number[]>([]);
  const [selectedComponents, setSelectedComponents] = useState<string[]>([]);
  
  // Helper to parse component types from a component string like "V, S, M (a tiny ball...)"
  const parseComponentTypes = (components: string): string[] => {
    const types: string[] = [];
    // Split by comma and check for standalone V, S, M before any parentheses
    const mainPart = components.split('(')[0]; // Get part before material description
    const parts = mainPart.split(',').map(p => p.trim().toUpperCase());
    if (parts.includes('V')) types.push('V');
    if (parts.includes('S')) types.push('S');
    if (parts.includes('M')) types.push('M');
    return types;
  };
  
  const toggleComponent = (comp: string) => {
    setSelectedComponents((prev) =>
      prev.includes(comp)
        ? prev.filter((c) => c !== comp)
        : [...prev, comp]
    );
  };
  const [commandOpen, setCommandOpen] = useState(false);
  const [commandSearchQuery, setCommandSearchQuery] = useState("");
  const [diceResult, setDiceResult] = useState<DiceResult | null>(null);
  
  // Player filter state
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);

  // Command palette keyboard shortcut
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setCommandOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  // Update selected spell when spells data changes (real-time sync)
  useEffect(() => {
    if (selectedSpell && spells.length > 0) {
      const updatedSpell = spells.find((s) => s.name === selectedSpell.name);
      if (updatedSpell && JSON.stringify(updatedSpell) !== JSON.stringify(selectedSpell)) {
        setSelectedSpell(updatedSpell);
      }
    }
  }, [spells, selectedSpell]);

  const togglePrism = (prism: string) => {
    setSelectedPrisms((prev) =>
      prev.includes(prism)
        ? prev.filter((p) => p !== prism)
        : [...prev, prism]
    );
  };

  const toggleLevel = (level: number) => {
    setSelectedLevels((prev) =>
      prev.includes(level)
        ? prev.filter((l) => l !== level)
        : [...prev, level]
    );
  };

  const applyPlayerFilter = (player: Player) => {
    setSelectedPlayer(player);
    setSelectedPrisms(player.prisms);
    setIncludeNoPrism(false);
    const availableLevels = getAvailableSpellLevels(player.maxSpellLevel);
    setSelectedLevels(availableLevels);
  };

  const clearPlayerFilter = () => {
    setSelectedPlayer(null);
    setSelectedPrisms([]);
    setIncludeNoPrism(false);
    setSelectedLevels([]);
    setSelectedComponents([]);
  };


  // Memoized filtered spells for better performance
  const filteredSpells = useMemo(() => {
    let filtered = spells;

    if (selectedPrisms.length > 0 || includeNoPrism) {
      filtered = filtered.filter((spell) => {
        const hasPrism = !!spell.prism;

        if (!hasPrism) {
          return includeNoPrism;
        }

        const spellPrisms = (Array.isArray(spell.prism)
          ? spell.prism
          : [spell.prism]
        ).filter((p): p is string => typeof p === "string" && p.length > 0);

        const matchesPrism = spellPrisms.some((prism) =>
          selectedPrisms.includes(prism)
        );

        return matchesPrism;
      });
    }

    if (selectedLevels.length > 0) {
      filtered = filtered.filter((spell) =>
        selectedLevels.includes(spell.level)
      );
    }

    if (selectedComponents.length > 0) {
      filtered = filtered.filter((spell) => {
        const spellComponents = parseComponentTypes(spell.components);
        return selectedComponents.every((comp) => spellComponents.includes(comp));
      });
    }

    return filtered;
  }, [spells, selectedPrisms, includeNoPrism, selectedLevels, selectedComponents]);

  // Memoized command filtered spells - always searches from root (all spells)
  const commandFilteredSpells = useMemo(() => {
    if (!commandSearchQuery.trim()) return spells;

    const query = commandSearchQuery.toLowerCase();
    return spells.filter((spell) =>
      spell.name.toLowerCase().includes(query)
    );
  }, [spells, commandSearchQuery]);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left Sidebar - Filters */}
          <aside className="w-full lg:w-80 lg:sticky lg:top-[5.5rem] lg:self-start lg:h-[calc(100vh-7rem)] lg:overflow-y-auto scrollbar-hide space-y-4">
        {/* Command palette trigger */}
        <Button
          variant="outline"
          className="w-full justify-start text-muted-foreground"
          onClick={() => setCommandOpen(true)}
        >
          <Search className="w-4 h-4 mr-2" />
          <span>Search spells...</span>
          <kbd className="pointer-events-none ml-auto inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
            <span className="text-xs">⌘</span>K
          </kbd>
        </Button>

          {/* Player Quick Filter */}
          {players.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    <h3 className="text-sm font-semibold">Player Filter</h3>
                  </div>
                  {selectedPlayer && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearPlayerFilter}
                      className="h-auto py-1 px-2 text-xs"
                    >
                      <X className="w-3 h-3 mr-1" />
                      Clear
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-1.5">
                  {players.map((player) => {
                    const isSelected = selectedPlayer?.id === player.id;
                    return (
                      <Button
                        key={player.id}
                        onClick={() => isSelected ? clearPlayerFilter() : applyPlayerFilter(player)}
                        variant={isSelected ? "default" : "outline"}
                        size="sm"
                        className="justify-start h-8"
                      >
                        <User className="w-3 h-3 mr-2" />
                        <span className="flex-1 text-left text-xs">{player.name}</span>
                        <Badge variant={isSelected ? "secondary" : "outline"} className="text-[10px] px-1.5">
                          Max {player.maxSpellLevel}
                        </Badge>
                      </Button>
                    );
                  })}
                </div>
                {selectedPlayer && (
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-xs text-muted-foreground mb-2">
                      Filtering to <span className="font-semibold">{selectedPlayer.name}'s</span> accessible spells:
                    </p>
                    <div className="flex flex-wrap gap-1">
                      <Badge variant="secondary" className="text-xs">
                        Spell Levels: {getAvailableSpellLevels(selectedPlayer.maxSpellLevel).join(', ')}
                      </Badge>
                      {selectedPlayer.prisms.map((prism) => (
                        <Badge key={prism} variant="default" className="text-xs">
                          {prism}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
          
          {/* Prism Filter */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  <h3 className="text-sm font-semibold">Prisms</h3>
                </div>
                {(selectedPrisms.length > 0 || includeNoPrism) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedPrisms([]);
                      setIncludeNoPrism(false);
                    }}
                    className="h-auto py-1 px-2 text-xs"
                  >
                    Clear all
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1.5">
                <Button
                  onClick={() => setIncludeNoPrism((prev) => !prev)}
                  variant={includeNoPrism ? "default" : "outline"}
                  size="sm"
                  className="rounded-full text-xs h-7"
                >
                  No Prism
                </Button>
                {prisms.map((prism) => {
                  const isSelected = selectedPrisms.includes(prism);
                  return (
                    <Button
                      key={prism}
                      onClick={() => togglePrism(prism)}
                      variant={isSelected ? "default" : "outline"}
                      size="sm"
                      className="rounded-full text-xs h-7"
                    >
                      {prism}
                    </Button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Spell Level Filter */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Hash className="w-4 h-4" />
                  <h3 className="text-sm font-semibold">Spell Levels</h3>
                </div>
                {selectedLevels.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedLevels([])}
                    className="h-auto py-1 px-2 text-xs"
                  >
                    Clear all
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1.5">
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((level) => {
                  const isSelected = selectedLevels.includes(level);
                  return (
                    <Button
                      key={level}
                      onClick={() => toggleLevel(level)}
                      variant={isSelected ? "default" : "outline"}
                      size="sm"
                      className="rounded-full w-9 h-9 p-0 text-xs"
                    >
                      {level === 0 ? "C" : level}
                    </Button>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                C = Cantrips
              </p>
            </CardContent>
          </Card>

          {/* Component Filter */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  <h3 className="text-sm font-semibold">Components</h3>
                </div>
                {selectedComponents.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedComponents([])}
                    className="h-auto py-1 px-2 text-xs"
                  >
                    Clear all
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { key: 'V', label: 'Verbal', icon: Volume2 },
                  { key: 'S', label: 'Somatic', icon: Hand },
                  { key: 'M', label: 'Material', icon: Package },
                ].map(({ key, label, icon: Icon }) => {
                  const isSelected = selectedComponents.includes(key);
                  return (
                    <Button
                      key={key}
                      onClick={() => toggleComponent(key)}
                      variant={isSelected ? "default" : "outline"}
                      size="sm"
                      className="rounded-full text-xs h-7 gap-1.5"
                    >
                      <Icon className="w-3 h-3" />
                      {label}
                    </Button>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Filter spells that require these components
              </p>
            </CardContent>
          </Card>

        </aside>

        {/* Main Content Area - Spells */}
        <main className="flex-1 min-w-0">
          {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="mt-4 text-muted-foreground">Loading spells...</p>
          </div>
        ) : (
          <>
            {selectedSpell ? (
              <div className="w-full">
                <Card>
                  <CardHeader>
                    <Button
                      variant="ghost"
                      onClick={() => setSelectedSpell(null)}
                      className="w-fit mb-2 -ml-2"
                    >
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Back to search
                    </Button>
                    <div className="flex items-center gap-3 flex-wrap">
                      <CardTitle className="text-3xl">
                        {selectedSpell.name}
                      </CardTitle>
                      {selectedSpell.isCustom && (
                        <Badge>Custom Spell</Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {selectedSpell.prism && (
                      <div className="p-4 border rounded-lg bg-secondary/50">
                        <div className="flex items-center gap-2 mb-2">
                          <Sparkles className="w-5 h-5" />
                          <span className="font-bold">
                            {Array.isArray(selectedSpell.prism) ? 'Prisms:' : 'Prism:'}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {Array.isArray(selectedSpell.prism) ? (
                            selectedSpell.prism.map((prism) => (
                              <Badge key={prism} variant="default">
                                {prism}
                              </Badge>
                            ))
                          ) : (
                            <Badge variant="default">{selectedSpell.prism}</Badge>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {!selectedSpell.prism && (
                      <div className="p-4 border border-yellow-500/50 rounded-lg bg-yellow-500/10">
                        <p className="text-sm text-yellow-700 dark:text-yellow-300">
                          No prism assigned yet. Use the Admin panel to assign this spell to a prism.
                        </p>
                      </div>
                    )}
                    
<div className="grid grid-cols-2 gap-4">
                                      <div>
                                        <p className="text-sm text-muted-foreground">Level</p>
                                        <p className="text-lg font-semibold">{selectedSpell.level === 0 ? 'Cantrip' : selectedSpell.level}</p>
                                      </div>
                                      <div>
                                        <p className="text-sm text-muted-foreground">School</p>
                                        <p className="text-lg font-semibold">{selectedSpell.school}</p>
                                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Casting Time</p>
                        <p className="text-lg font-semibold">{selectedSpell.casting_time}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Range</p>
                        <p className="text-lg font-semibold">{selectedSpell.range}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Components</p>
                        <p className="text-lg font-semibold">{selectedSpell.components}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Duration</p>
                        <p className="text-lg font-semibold">{selectedSpell.duration}</p>
                      </div>
                    </div>
                    
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Description</p>
                      <p className="whitespace-pre-line">
                        {selectedSpell.description}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="w-full">
                {filteredSpells.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground">
                      {(selectedPrisms.length > 0 || includeNoPrism || selectedLevels.length > 0 || selectedComponents.length > 0)
                        ? "No spells found matching your filters."
                        : "No spells available."}
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="grid gap-4">
                      {filteredSpells.map((spell) => (
                        <Card
                          key={spell.name}
                          onClick={() => setSelectedSpell(spell)}
                          className="cursor-pointer transition-all hover:shadow-lg"
                        >
                          <CardHeader>
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <CardTitle className="text-xl">
                                    {spell.name}
                                  </CardTitle>
                                  {spell.isCustom && (
                                    <Badge variant="secondary">Custom</Badge>
                                  )}
                                </div>
                                <CardDescription>
                                  Level {spell.level} • {spell.school}
                                </CardDescription>
                              </div>
                              <div className="flex flex-wrap gap-1 ml-4 justify-end">
                                {spell.prism ? (
                                  Array.isArray(spell.prism) ? (
                                    spell.prism.map((prism) => (
                                      <Badge key={prism} variant="default" className="whitespace-nowrap">
                                        {prism}
                                      </Badge>
                                    ))
                                  ) : (
                                    <Badge variant="default" className="whitespace-nowrap">
                                      {spell.prism}
                                    </Badge>
                                  )
                                ) : (
                                  <Badge variant="outline" className="whitespace-nowrap">
                                    No Prism
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </CardHeader>
                        </Card>
                      ))}
                    </div>
                    <div className="text-center py-4 mt-4">
                      <p className="text-muted-foreground">
                        Showing <span className="font-semibold">{filteredSpells.length}</span> spell{filteredSpells.length !== 1 ? 's' : ''}
                        {spells.length > 0 && filteredSpells.length !== spells.length && (
                          <span> of {spells.length} total</span>
                        )}
                      </p>
                    </div>
                  </>
                )}
              </div>
            )}
          </>
        )}
        </main>
        </div>
      </div>

      {/* Command Dialog */}
      <CommandDialog 
        open={commandOpen} 
        onOpenChange={(open) => {
          setCommandOpen(open);
          if (!open) {
            setCommandSearchQuery("");
            setDiceResult(null);
          }
        }}
        shouldFilter={!isDiceCommand(commandSearchQuery)}
      >
        <CommandInput
          placeholder="Search spells or type 'roll 1d20'..."
          value={commandSearchQuery}
          onValueChange={(value) => {
            setCommandSearchQuery(value);
            // Auto-roll when typing a dice command
            if (isDiceCommand(value)) {
              const expression = extractDiceExpression(value);
              const result = parseDiceExpression(expression);
              setDiceResult(result);
            } else {
              setDiceResult(null);
            }
          }}
        />
        <CommandList>
          {/* Dice Roll Results */}
          {diceResult && (
            <div className="px-4 py-4">
              <div className="flex items-center justify-between gap-4">
                {/* Left side - Result */}
                <div className="flex-1">
                  <div className="text-6xl font-bold tracking-tight tabular-nums">
                    {diceResult.total}
                  </div>
                  <div className="text-sm text-muted-foreground font-mono mt-1">
                    {diceResult.breakdown}
                  </div>
                </div>
                
                {/* Right side - Dice badges */}
                <div className="flex flex-wrap gap-1 justify-end">
                  {diceResult.rolls.map((roll, index) => (
                    <div key={index} className="flex items-center gap-1">
                      {index > 0 && (
                        <span className="text-muted-foreground mx-0.5">
                          {roll.operator}
                        </span>
                      )}
                      {roll.sides === 0 ? (
                        <Badge variant="secondary" className="font-mono text-xs">
                          {roll.total}
                        </Badge>
                      ) : (
                        roll.rolls.map((r, ri) => (
                          <Badge
                            key={ri}
                            variant={
                              r === roll.sides
                                ? "default"
                                : r === 1
                                ? "destructive"
                                : "secondary"
                            }
                            className="font-mono text-xs"
                          >
                            {r}
                          </Badge>
                        ))
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-3 text-center">
                Edit the dice expression above to reroll
              </p>
            </div>
          )}

          {!diceResult && (
            <CommandEmpty>
              {isDiceCommand(commandSearchQuery) ? (
                <div className="text-muted-foreground">
                  Invalid dice format. Try: roll 1d20, roll 2d6+3, roll 2d4-1d6
                </div>
              ) : (
                "No results found."
              )}
            </CommandEmpty>
          )}

          {!diceResult && (
            <>
          <CommandGroup heading="Filter by Prism">
            <CommandItem
              onSelect={() => {
                setIncludeNoPrism((prev) => !prev);
              }}
            >
              <Sparkles className="w-4 h-4 mr-2" />
              <span>No Prism</span>
              {includeNoPrism && (
                <Check className="w-4 h-4 ml-auto text-primary" />
              )}
            </CommandItem>
            {prisms.map((prism) => {
              const isSelected = selectedPrisms.includes(prism);
              return (
                <CommandItem
                  key={prism}
                  onSelect={() => togglePrism(prism)}
                >
                  <span>{prism}</span>
                  {isSelected && (
                    <Check className="w-4 h-4 ml-auto text-primary" />
                  )}
                </CommandItem>
              );
            })}
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="Filter by Level">
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((level) => {
              const isSelected = selectedLevels.includes(level);
              return (
                <CommandItem
                  key={level}
                  onSelect={() => toggleLevel(level)}
                >
                  <span>{level === 0 ? "Cantrips (0)" : `Level ${level}`}</span>
                  {isSelected && (
                    <Check className="w-4 h-4 ml-auto text-primary" />
                  )}
                </CommandItem>
              );
            })}
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="Filter by Component">
            {[
              { key: 'V', label: 'Verbal', icon: Volume2 },
              { key: 'S', label: 'Somatic', icon: Hand },
              { key: 'M', label: 'Material', icon: Package },
            ].map(({ key, label, icon: Icon }) => {
              const isSelected = selectedComponents.includes(key);
              return (
                <CommandItem
                  key={key}
                  onSelect={() => toggleComponent(key)}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  <span>{label}</span>
                  {isSelected && (
                    <Check className="w-4 h-4 ml-auto text-primary" />
                  )}
                </CommandItem>
              );
            })}
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="Spells">
            {commandFilteredSpells.slice(0, 50).map((spell) => (
              <CommandItem
                key={spell.name}
                value={spell.name}
                onSelect={() => {
                  setSelectedSpell(spell);
                  setCommandOpen(false);
                }}
              >
                <div className="flex flex-col gap-0.5 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{spell.name}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    Level {spell.level} • {spell.school}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {spell.prism ? (
                    Array.isArray(spell.prism) ? (
                      spell.prism.map((prism) => (
                        <Badge
                          key={prism}
                          variant="outline"
                          className="text-[10px] px-1 py-0"
                        >
                          {prism}
                        </Badge>
                      ))
                    ) : (
                      <Badge
                        variant="outline"
                        className="text-[10px] px-1 py-0"
                      >
                        {spell.prism}
                      </Badge>
                    )
                  ) : (
                    <Badge
                      variant="outline"
                      className="text-[10px] px-1 py-0"
                    >
                      No Prism
                    </Badge>
                  )}
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
            </>
          )}
        </CommandList>
      </CommandDialog>
    </div>
  );
}
