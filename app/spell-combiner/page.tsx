"use client";

import { useState, useEffect } from "react";
import { Zap, Plus, X, Calculator, Sparkles } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

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

interface DamageInfo {
  diceNotation: string[];
  damageType: string;
  averageDamage: number;
}

interface CombinedSpell {
  spells: Spell[];
  totalDamage: number;
  damageBreakdown: { spell: string; damage: DamageInfo }[];
  totalLevel: number;
  strainCost: number;
}

export default function SpellCombinerPage() {
  const [spells, setSpells] = useState<Spell[]>([]);
  const [filteredSpells, setFilteredSpells] = useState<Spell[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSpells, setSelectedSpells] = useState<Spell[]>([]);
  const [loading, setLoading] = useState(false);

  // Load spells
  useEffect(() => {
    loadSpells();
  }, []);

  const loadSpells = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/spells", {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
        }
      });
      const data = await response.json();
      setSpells(data);
      setFilteredSpells(data);
    } catch (error) {
      console.error("Error loading spells:", error);
    } finally {
      setLoading(false);
    }
  };

  // Filter spells by search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredSpells(spells);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = spells.filter((spell) =>
      spell.name.toLowerCase().includes(query) ||
      spell.school.toLowerCase().includes(query)
    );
    setFilteredSpells(filtered);
  }, [searchQuery, spells]);

  // Parse damage from spell description
  const parseDamage = (spell: Spell): DamageInfo => {
    const description = spell.description.toLowerCase();
    const dicePattern = /(\d+d\d+(?:\s*\+\s*\d+)?)/gi;
    const allMatches = description.match(dicePattern) || [];
    
    // Extract damage type
    const damageTypes = ['fire', 'cold', 'lightning', 'thunder', 'acid', 'poison', 'necrotic', 'radiant', 'force', 'psychic', 'piercing', 'slashing', 'bludgeoning'];
    const foundType = damageTypes.find(type => description.includes(type)) || 'untyped';
    
    // If multiple dice notations found (upcast versions), pick the highest one
    let bestDice = '';
    let highestAverage = 0;
    
    allMatches.forEach(dice => {
      const match = dice.match(/(\d+)d(\d+)(?:\+(\d+))?/i);
      if (match) {
        const [, numDice, sides, modifier] = match;
        const avg = (parseInt(numDice) * (parseInt(sides) + 1)) / 2 + (modifier ? parseInt(modifier) : 0);
        if (avg > highestAverage) {
          highestAverage = avg;
          bestDice = dice;
        }
      }
    });

    return {
      diceNotation: bestDice ? [bestDice] : [],
      damageType: foundType,
      averageDamage: Math.round(highestAverage)
    };
  };

  // Calculate combined spell stats
  const calculateCombination = (): CombinedSpell | null => {
    if (selectedSpells.length === 0) return null;

    const damageBreakdown = selectedSpells.map(spell => ({
      spell: spell.name,
      damage: parseDamage(spell)
    }));

    const totalDamage = damageBreakdown.reduce((sum, item) => sum + item.damage.averageDamage, 0);
    const totalLevel = selectedSpells.reduce((sum, spell) => sum + spell.level, 0);
    
    // Strain cost: 1 per spell
    const strainCost = selectedSpells.length;

    return {
      spells: selectedSpells,
      totalDamage,
      damageBreakdown,
      totalLevel,
      strainCost
    };
  };

  const addSpell = (spell: Spell) => {
    if (!selectedSpells.find(s => s.name === spell.name)) {
      setSelectedSpells([...selectedSpells, spell]);
    }
  };

  const removeSpell = (spellName: string) => {
    setSelectedSpells(selectedSpells.filter(s => s.name !== spellName));
  };

  const combination = calculateCombination();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-center">
            <div className="text-center">
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <Zap className="w-8 h-8" />
                Spell Combiner
              </h1>
              <p className="text-muted-foreground mt-1">Combine multiple spells and calculate total damage</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Spell Selection */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Select Spells to Combine</CardTitle>
                <CardDescription>Search and add spells to your combination</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  placeholder="Search spells..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />

                <div className="max-h-[600px] overflow-y-auto space-y-2">
                  {loading ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Loading spells...
                    </div>
                  ) : filteredSpells.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No spells found
                    </div>
                  ) : (
                    filteredSpells.slice(0, 50).map((spell) => {
                      const isSelected = selectedSpells.find(s => s.name === spell.name);
                      const damage = parseDamage(spell);
                      
                      return (
                        <Card
                          key={spell.name}
                          className={`cursor-pointer transition-all hover:shadow-md ${isSelected ? 'ring-2 ring-primary' : ''}`}
                          onClick={() => isSelected ? removeSpell(spell.name) : addSpell(spell)}
                        >
                          <CardContent className="pt-4 pb-3">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="font-semibold text-sm">{spell.name}</h4>
                                  {isSelected && <Badge variant="default" className="text-xs">Selected</Badge>}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  Level {spell.level} • {spell.school}
                                </p>
                                {damage.diceNotation.length > 0 && (
                                  <div className="flex items-center gap-1 mt-1">
                                    <Calculator className="w-3 h-3" />
                                    <span className="text-xs font-medium">
                                      {damage.diceNotation.join(' + ')} {damage.damageType}
                                    </span>
                                  </div>
                                )}
                              </div>
                              {isSelected ? (
                                <X className="w-4 h-4 text-destructive ml-2" />
                              ) : (
                                <Plus className="w-4 h-4 text-primary ml-2" />
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Combination Results */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5" />
                  Combined Spell
                </CardTitle>
                <CardDescription>
                  {selectedSpells.length === 0 
                    ? "No spells selected" 
                    : `${selectedSpells.length} spell${selectedSpells.length !== 1 ? 's' : ''} combined`
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                {combination ? (
                  <div className="space-y-4">
                    {/* Summary Stats */}
                    <div className="grid grid-cols-2 gap-4">
                      <Card className="bg-destructive/10 border-destructive/20">
                        <CardContent className="pt-4">
                          <div className="text-center">
                            <Zap className="w-8 h-8 mx-auto mb-2 text-destructive" />
                            <div className="text-lg font-bold text-destructive mb-1">
                              {combination.damageBreakdown
                                .flatMap(item => item.damage.diceNotation)
                                .join(' + ') || 'No damage dice'}
                            </div>
                            <div className="text-xs text-muted-foreground">Total Damage Dice</div>
                            <div className="text-xs text-muted-foreground mt-1">
                              (≈{combination.totalDamage} average)
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="bg-primary/10 border-primary/20">
                        <CardContent className="pt-4">
                          <div className="text-center">
                            <Calculator className="w-8 h-8 mx-auto mb-2 text-primary" />
                            <div className="text-3xl font-bold text-primary">
                              {combination.strainCost}
                            </div>
                            <div className="text-xs text-muted-foreground">Strain Cost</div>
                            <div className="text-xs text-muted-foreground mt-1">
                              (1 per spell)
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Additional Info */}
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div className="text-center p-2 bg-secondary/50 rounded-lg">
                        <div className="text-xs text-muted-foreground">Spells</div>
                        <div className="font-bold">{combination.spells.length}</div>
                      </div>
                      <div className="text-center p-2 bg-secondary/50 rounded-lg">
                        <div className="text-xs text-muted-foreground">Total Level</div>
                        <div className="font-bold">{combination.totalLevel}</div>
                      </div>
                      <div className="text-center p-2 bg-secondary/50 rounded-lg">
                        <div className="text-xs text-muted-foreground">Strain</div>
                        <div className="font-bold">{combination.strainCost}</div>
                      </div>
                    </div>

                    {/* Damage Breakdown */}
                    <div>
                      <h4 className="font-semibold mb-2 text-sm">Damage Breakdown</h4>
                      <div className="space-y-2">
                        {combination.damageBreakdown.map((item, idx) => (
                          <Card key={idx} className="bg-secondary/50">
                            <CardContent className="py-3">
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <div className="font-medium text-sm">{item.spell}</div>
                                  {item.damage.diceNotation.length > 0 ? (
                                    <div className="mt-1">
                                      <div className="text-base font-bold">
                                        {item.damage.diceNotation.join(' + ')}
                                      </div>
                                      <Badge variant="outline" className="mt-1 text-xs">
                                        {item.damage.damageType}
                                      </Badge>
                                    </div>
                                  ) : (
                                    <div className="text-xs text-muted-foreground mt-1">
                                      No damage dice found
                                    </div>
                                  )}
                                </div>
                                <div className="text-right ml-4">
                                  <div className="text-xs text-muted-foreground">
                                    ≈{item.damage.averageDamage} avg
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>

                    {/* Selected Spells List */}
                    <div>
                      <h4 className="font-semibold mb-2 text-sm">Selected Spells</h4>
                      <div className="flex flex-wrap gap-2">
                        {combination.spells.map((spell) => (
                          <Badge key={spell.name} variant="secondary" className="cursor-pointer" onClick={() => removeSpell(spell.name)}>
                            {spell.name}
                            <X className="w-3 h-3 ml-1" />
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Clear All Button */}
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => setSelectedSpells([])}
                    >
                      <X className="w-4 h-4 mr-2" />
                      Clear All
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Zap className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-20" />
                    <p className="text-muted-foreground">
                      Select spells from the left to combine them
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

