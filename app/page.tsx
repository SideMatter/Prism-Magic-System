"use client";

import { useState, useEffect } from "react";
import { Search, Sparkles, Plus, Minus, ArrowLeft, Hash, Check, User, X } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import type { Player } from "@/lib/player-utils";
import { getAvailableSpellLevels } from "@/lib/player-utils";

interface Spell {
  name: string;
  level: number;
  school: string;
  casting_time: string;
  range: string;
  components: string;
  duration: string;
  description: string;
}

interface SpellWithPrism extends Spell {
  prism?: string | string[]; // Can have multiple prisms
  isCustom?: boolean; // Indicates if this is a custom spell
}

export default function Home() {
  const [spells, setSpells] = useState<SpellWithPrism[]>([]);
  const [filteredSpells, setFilteredSpells] = useState<SpellWithPrism[]>([]);
  const [selectedSpell, setSelectedSpell] = useState<SpellWithPrism | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastCacheTimestamp, setLastCacheTimestamp] = useState<string>("");
  const [prisms, setPrisms] = useState<string[]>([]);
  const [selectedPrisms, setSelectedPrisms] = useState<string[]>([]);
  const [includeNoPrism, setIncludeNoPrism] = useState(false);
  const [selectedLevels, setSelectedLevels] = useState<number[]>([]);
  const [commandOpen, setCommandOpen] = useState(false);
  const [commandSearchQuery, setCommandSearchQuery] = useState("");
  
  // Player filter state
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  
  // Strain Meter state (persisted in localStorage)
  const [strain, setStrain] = useState(0);
  const [maxStrain, setMaxStrain] = useState(100);

  // Load from localStorage after mount to avoid hydration mismatch
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedStrain = localStorage.getItem('strain');
      const savedMaxStrain = localStorage.getItem('maxStrain');
      if (savedStrain) setStrain(parseInt(savedStrain, 10));
      if (savedMaxStrain) setMaxStrain(parseInt(savedMaxStrain, 10));
    }
  }, []);

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

  // Load spells from API
  const loadSpells = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const cacheBuster = Date.now();
      const response = await fetch(`/api/spells?_=${cacheBuster}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
        },
      });
      const data = await response.json();
      const cacheTimestamp = response.headers.get('X-Cache-Timestamp') || "";
      
      console.log(`✓ Loaded ${data.length} spells from API (timestamp: ${cacheTimestamp})`);
      
      setSpells(data);
      setFilteredSpells(data);
      setLastCacheTimestamp(cacheTimestamp);
      
      if (selectedSpell) {
        const updatedSpell = data.find((s: SpellWithPrism) => s.name === selectedSpell.name);
        if (updatedSpell) {
          setSelectedSpell(updatedSpell);
        }
      }
    } catch (error) {
      console.error("❌ Error loading spells:", error);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  // Load prisms from API
  const loadPrisms = async () => {
    try {
      const response = await fetch("/api/prisms");
      const data = await response.json();
      setPrisms(data);
    } catch (error) {
      console.error("Error loading prisms:", error);
    }
  };

  // Load players from API
  const loadPlayers = async () => {
    try {
      const response = await fetch("/api/players", {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
        }
      });
      const data = await response.json();
      setPlayers(data);
    } catch (error) {
      console.error("Error loading players:", error);
    }
  };

  useEffect(() => {
    loadSpells();
    loadPrisms();
    loadPlayers();
    
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log("Page visible, reloading spells...");
        loadSpells(false);
      }
    };
    
    const handleFocus = () => {
      console.log("Window focused, reloading spells...");
      loadSpells(false);
    };
    
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'spell-update-trigger') {
        console.log("Spell update detected from admin, reloading...");
        loadSpells(false);
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('storage', handleStorageChange);
    
    const interval = setInterval(async () => {
      try {
        const response = await fetch("/api/spells", {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache',
          }
        });
        const cacheTimestamp = response.headers.get('X-Cache-Timestamp') || "";
        const data = await response.json();
        
        if (cacheTimestamp !== lastCacheTimestamp) {
          console.log(`Cache timestamp changed (${lastCacheTimestamp} → ${cacheTimestamp}), updating spells...`);
          setSpells(data);
          setFilteredSpells(data);
          
          setSelectedSpell((current) => {
            if (!current) return current;
            const updatedSpell = data.find((s: SpellWithPrism) => s.name === current.name);
            return updatedSpell || current;
          });
          
          setLastCacheTimestamp(cacheTimestamp);
        }
      } catch (error) {
        console.error("Error polling for updates:", error);
      }
    }, 3000);
    
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [lastCacheTimestamp]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('strain', strain.toString());
    }
  }, [strain]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('maxStrain', maxStrain.toString());
    }
  }, [maxStrain]);

  const increaseStrain = (amount: number = 1) => {
    setStrain((prev) => Math.min(prev + amount, maxStrain));
  };

  const decreaseStrain = (amount: number = 1) => {
    setStrain((prev) => Math.max(prev - amount, 0));
  };

  const setStrainValue = (value: number) => {
    setStrain(Math.max(0, Math.min(value, maxStrain)));
  };

  const setMaxStrainValue = (value: number) => {
    const newMax = Math.max(1, value);
    setMaxStrain(newMax);
    if (strain > newMax) {
      setStrain(newMax);
    }
  };

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
    // Apply the player's prisms
    setSelectedPrisms(player.prisms);
    setIncludeNoPrism(false);
    // Apply spell levels based on max spell level
    const availableLevels = getAvailableSpellLevels(player.maxSpellLevel);
    setSelectedLevels(availableLevels);
  };

  const clearPlayerFilter = () => {
    setSelectedPlayer(null);
    setSelectedPrisms([]);
    setIncludeNoPrism(false);
    setSelectedLevels([]);
  };

  useEffect(() => {
    let filtered = spells;

    // Main page list is only filtered by prism and level, not by search query
    if (selectedPrisms.length > 0 || includeNoPrism) {
      filtered = filtered.filter((spell) => {
        const hasPrism = !!spell.prism;

        // Match "no prism" filter
        if (!hasPrism) {
          return includeNoPrism;
        }

        // Match selected prism chips
        const spellPrisms = (Array.isArray(spell.prism)
          ? spell.prism
          : [spell.prism]
        ).filter((p): p is string => typeof p === "string" && p.length > 0);

        const matchesPrism = spellPrisms.some((prism) =>
          selectedPrisms.includes(prism)
        );

        // If spell has prisms, only include it if it matches selected prisms
        return matchesPrism;
      });
    }

    if (selectedLevels.length > 0) {
      filtered = filtered.filter((spell) =>
        selectedLevels.includes(spell.level)
      );
    }

    setFilteredSpells(filtered);
  }, [spells, selectedPrisms, includeNoPrism, selectedLevels]);

  // Separate filtered list for command dialog (includes search query)
  const commandFilteredSpells = (() => {
    let filtered = spells;

    // Apply search query filter
    if (commandSearchQuery.trim()) {
      const query = commandSearchQuery.toLowerCase();
      filtered = filtered.filter((spell) =>
        spell.name.toLowerCase().includes(query)
      );
    }

    // Apply prism filters
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

    // Apply level filters
    if (selectedLevels.length > 0) {
      filtered = filtered.filter((spell) =>
        selectedLevels.includes(spell.level)
      );
    }

    return filtered;
  })();

  const strainPercentage = maxStrain > 0 ? (strain / maxStrain) * 100 : 0;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Strain Meter */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Strain Meter</span>
              <span className="text-sm font-normal text-muted-foreground">
                {strain} / {maxStrain}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Strain Bar */}
            <div className="w-full h-8 bg-secondary rounded-full overflow-hidden relative border">
              <div
                className="h-full bg-destructive transition-all duration-300 ease-out flex items-center justify-end pr-2"
                style={{ width: `${strainPercentage}%` }}
              >
                {strainPercentage > 10 && (
                  <span className="text-destructive-foreground text-xs font-bold">
                    {Math.round(strainPercentage)}%
                  </span>
                )}
              </div>
              {strainPercentage <= 10 && strain > 0 && (
                <span className="absolute inset-0 flex items-center justify-center text-destructive text-xs font-bold">
                  {Math.round(strainPercentage)}%
                </span>
              )}
            </div>

            {/* Controls */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Current Strain</label>
                <div className="flex items-center gap-2">
                  <Button onClick={() => decreaseStrain(1)} variant="outline" size="sm">
                    <Minus className="w-4 h-4" />
                  </Button>
                  <Button onClick={() => decreaseStrain(5)} variant="outline" size="sm">
                    -5
                  </Button>
                  <Input
                    type="number"
                    min="0"
                    max={maxStrain}
                    value={strain}
                    onChange={(e) => setStrainValue(parseInt(e.target.value) || 0)}
                    className="flex-1 text-center"
                  />
                  <Button onClick={() => increaseStrain(1)} variant="destructive" size="sm">
                    <Plus className="w-4 h-4" />
                  </Button>
                  <Button onClick={() => increaseStrain(5)} variant="destructive" size="sm">
                    +5
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Max Strain Capacity</label>
                <div className="flex items-center gap-2">
                  <Button onClick={() => setMaxStrainValue(maxStrain - 10)} variant="outline" size="sm">
                    -10
                  </Button>
                  <Input
                    type="number"
                    min="1"
                    value={maxStrain}
                    onChange={(e) => setMaxStrainValue(parseInt(e.target.value) || 1)}
                    className="flex-1 text-center"
                  />
                  <Button onClick={() => setMaxStrainValue(maxStrain + 10)} variant="outline" size="sm">
                    +10
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">
            Prism Magic System
          </h1>
          <p className="text-lg text-muted-foreground">
            Search for D&D 5e spells and discover their prism
          </p>
        </div>

        {/* Search and Filters */}
        <div className="max-w-2xl mx-auto mb-8 space-y-4">
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
                    <User className="w-5 h-5" />
                    <h3 className="text-sm font-semibold">Quick Filter by Player</h3>
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
                <div className="flex flex-wrap gap-2">
                  {players.map((player) => {
                    const isSelected = selectedPlayer?.id === player.id;
                    return (
                      <Button
                        key={player.id}
                        onClick={() => isSelected ? clearPlayerFilter() : applyPlayerFilter(player)}
                        variant={isSelected ? "default" : "outline"}
                        size="sm"
                        className="rounded-full"
                      >
                        <User className="w-3 h-3 mr-1" />
                        {player.name}
                        <Badge variant={isSelected ? "secondary" : "outline"} className="ml-2 text-[10px] px-1">
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
                  <Sparkles className="w-5 h-5" />
                  <h3 className="text-sm font-semibold">Filter by Prism</h3>
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
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => setIncludeNoPrism((prev) => !prev)}
                  variant={includeNoPrism ? "default" : "outline"}
                  size="sm"
                  className="rounded-full"
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
                      className="rounded-full"
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
                  <Hash className="w-5 h-5" />
                  <h3 className="text-sm font-semibold">Filter by Spell Level</h3>
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
              <div className="flex flex-wrap gap-2">
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((level) => {
                  const isSelected = selectedLevels.includes(level);
                  return (
                    <Button
                      key={level}
                      onClick={() => toggleLevel(level)}
                      variant={isSelected ? "default" : "outline"}
                      size="sm"
                      className="rounded-full w-10 h-10 p-0"
                    >
                      {level === 0 ? "C" : level}
                    </Button>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                C = Cantrips (Level 0)
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Content */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="mt-4 text-muted-foreground">Loading spells...</p>
          </div>
        ) : (
          <>
            {selectedSpell ? (
              <div className="max-w-3xl mx-auto">
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
                    <div className="flex items-center gap-2">
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
                        <p className="text-lg font-semibold">{selectedSpell.level}</p>
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
              <div className="max-w-4xl mx-auto">
                {filteredSpells.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground">
                      {(selectedPrisms.length > 0 || includeNoPrism || selectedLevels.length > 0)
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
      </div>

      {/* Command Dialog */}
      <CommandDialog 
        open={commandOpen} 
        onOpenChange={(open) => {
          setCommandOpen(open);
          if (!open) {
            // Clear search query when dialog closes
            setCommandSearchQuery("");
          }
        }}
      >
        <CommandInput
          placeholder="Search for a spell or filter..."
          value={commandSearchQuery}
          onValueChange={setCommandSearchQuery}
        />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>

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
                  <span className="font-medium">{spell.name}</span>
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
        </CommandList>
      </CommandDialog>
    </div>
  );
}
