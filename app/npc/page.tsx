"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  User, 
  Dices, 
  Plus, 
  Trash2, 
  RefreshCw,
  Heart,
  Shield,
  Swords,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Save,
  ArrowUp,
  ArrowDown,
  Edit,
  X
} from "lucide-react";
import {
  CharacterClass,
  NPC,
  generateNPC,
  generateRandomName,
  getModifier,
  formatModifier,
  StatName,
} from "@/lib/npc-generator";
import { useToast } from "@/hooks/use-toast";

type RollingMethod = 'roll' | 'standard' | 'pointbuy';

export default function NPCGeneratorPage() {
  const { toast } = useToast();
  const [classes, setClasses] = useState<CharacterClass[]>([]);
  const [selectedClass, setSelectedClass] = useState<CharacterClass | null>(null);
  const [npcName, setNpcName] = useState("");
  const [npcLevel, setNpcLevel] = useState(1);
  const [rollingMethod, setRollingMethod] = useState<RollingMethod>('roll');
  const [generatedNPCs, setGeneratedNPCs] = useState<NPC[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedNPC, setExpandedNPC] = useState<string | null>(null);
  const [selectedPrism, setSelectedPrism] = useState<string>("all");
  const [editingNPC, setEditingNPC] = useState<string | null>(null);
  const [editedStats, setEditedStats] = useState<Partial<NPC>>({});
  
  // Custom class creation
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customClass, setCustomClass] = useState<Partial<CharacterClass>>({
    id: "",
    name: "",
    hitDie: 8,
    primaryAbilities: [],
    savingThrows: [],
    statPriority: ["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"],
    description: "",
  });

  // Load classes on mount
  useEffect(() => {
    loadClasses();
    // Load saved NPCs from localStorage
    const savedNPCs = localStorage.getItem('generated-npcs');
    if (savedNPCs) {
      setGeneratedNPCs(JSON.parse(savedNPCs));
    }
  }, []);

  // Save NPCs to localStorage when they change
  useEffect(() => {
    if (generatedNPCs.length > 0) {
      localStorage.setItem('generated-npcs', JSON.stringify(generatedNPCs));
    }
  }, [generatedNPCs]);

  async function loadClasses() {
    setLoading(true);
    try {
      console.log('Fetching classes from API...');
      const response = await fetch("/api/classes", {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      });
      console.log('API response status:', response.status);
      if (response.ok) {
        const data = await response.json();
        console.log('Loaded classes:', data.length, 'classes');
        setClasses(data);
        if (data.length > 0 && !selectedClass) {
          setSelectedClass(data[0]);
        }
      } else {
        console.error('API response not OK:', response.status, response.statusText);
      }
    } catch (error) {
      console.error("Error loading classes:", error);
    } finally {
      setLoading(false);
    }
  }

  function handleGenerateNPC() {
    if (!selectedClass) return;

    const name = npcName.trim() || generateRandomName();
    const npc = generateNPC(name, selectedClass, npcLevel, rollingMethod);
    
    setGeneratedNPCs(prev => [npc, ...prev]);
    setNpcName(""); // Clear for next generation
    setExpandedNPC(npc.id); // Auto-expand the new NPC
    
    toast({
      title: "NPC Generated!",
      description: `${npc.name} (Level ${npc.level} ${npc.class.name}) has been created.`,
    });
  }

  function handleDeleteNPC(id: string) {
    const npc = generatedNPCs.find(n => n.id === id);
    const updated = generatedNPCs.filter(n => n.id !== id);
    setGeneratedNPCs(updated);
    localStorage.setItem('generated-npcs', JSON.stringify(updated));
    if (expandedNPC === id) {
      setExpandedNPC(null);
    }
    
    toast({
      title: "NPC Deleted",
      description: `${npc?.name || 'NPC'} has been removed.`,
      variant: "destructive",
    });
  }

  function handleEditNPC(npc: NPC) {
    setEditingNPC(npc.id);
    setEditedStats(npc);
  }

  function handleSaveNPC(id: string) {
    if (!editedStats) return;
    
    const npc = generatedNPCs.find(n => n.id === id);
    const updated = generatedNPCs.map(n => 
      n.id === id ? { ...n, ...editedStats } : n
    );
    setGeneratedNPCs(updated);
    localStorage.setItem('generated-npcs', JSON.stringify(updated));
    setEditingNPC(null);
    setEditedStats({});
    
    toast({
      title: "NPC Updated!",
      description: `${npc?.name || 'NPC'} has been saved.`,
    });
  }

  function handleCancelEdit() {
    setEditingNPC(null);
    setEditedStats({});
  }

  function handleClearAllNPCs() {
    setGeneratedNPCs([]);
    localStorage.removeItem('generated-npcs');
  }

  async function handleSaveCustomClass() {
    if (!customClass.name || !customClass.id) {
      alert("Please fill in class name and ID");
      return;
    }

    try {
      const response = await fetch("/api/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(customClass),
      });

      if (response.ok) {
        await loadClasses();
        setShowCustomForm(false);
        const className = customClass.name;
        setCustomClass({
          id: "",
          name: "",
          hitDie: 8,
          primaryAbilities: [],
          savingThrows: [],
          statPriority: ["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"],
          description: "",
        });
        
        toast({
          title: "Custom Class Created!",
          description: `${className} has been saved to Redis.`,
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to save custom class.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error saving custom class:", error);
      toast({
        title: "Error",
        description: "Failed to save custom class.",
        variant: "destructive",
      });
    }
  }

  async function handleDeleteCustomClass(id: string) {
    if (!confirm("Are you sure you want to delete this custom class?")) return;

    try {
      const response = await fetch(`/api/classes?id=${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        await loadClasses();
        if (selectedClass?.id === id) {
          setSelectedClass(classes.find(c => !c.isCustom) || null);
        }
      }
    } catch (error) {
      console.error("Error deleting custom class:", error);
    }
  }

  const statLabels: Record<StatName, string> = {
    strength: "STR",
    dexterity: "DEX",
    constitution: "CON",
    intelligence: "INT",
    wisdom: "WIS",
    charisma: "CHA",
  };

  const statOrder: StatName[] = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'];

  const allStats: StatName[] = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'];

  // Get unique prisms from classes
  const prisms = Array.from(new Set(classes.map(c => c.prism).filter(Boolean))) as string[];
  
  // Filter classes by selected prism
  const filteredClasses = selectedPrism === "all" 
    ? classes 
    : classes.filter(c => c.prism === selectedPrism);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2 flex items-center justify-center gap-3">
            <User className="w-10 h-10" />
            NPC Generator
          </h1>
          <p className="text-lg text-muted-foreground">
            Create NPCs with class-based stat rolling
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Class Selection & Generation */}
          <div className="lg:col-span-1 space-y-6">
            {/* Class Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Swords className="w-5 h-5" />
                  Select Class
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Prism Filter */}
                {!loading && prisms.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Filter by Prism</label>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant={selectedPrism === "all" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedPrism("all")}
                      >
                        All
                      </Button>
                      {prisms.map((prism) => (
                        <Button
                          key={prism}
                          variant={selectedPrism === prism ? "default" : "outline"}
                          size="sm"
                          onClick={() => setSelectedPrism(prism)}
                        >
                          {prism}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {loading ? (
                  <div className="text-center py-4 text-muted-foreground">
                    Loading classes...
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-2">
                    {filteredClasses.map((cls) => {
                      const isSelected = selectedClass?.id === cls.id;
                      return (
                        <Button
                          key={cls.id}
                          variant={isSelected ? "default" : "outline"}
                          className="justify-start text-sm h-auto py-2 px-3"
                          onClick={() => setSelectedClass(cls)}
                        >
                          <div className="flex flex-col items-start w-full">
                            <div className="flex items-center justify-between w-full">
                              <span className="font-semibold">{cls.name}</span>
                              {cls.isCustom ? (
                                <Badge variant="secondary" className="text-xs">
                                  Custom
                                </Badge>
                              ) : cls.prism && (
                                <Badge 
                                  variant="outline" 
                                  className={`text-xs ${isSelected ? 'bg-primary-foreground text-primary border-primary-foreground' : ''}`}
                                >
                                  {cls.prism}
                                </Badge>
                              )}
                            </div>
                            {cls.type && (
                              <span className={`text-xs ${isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                                {cls.type} • d{cls.hitDie}
                              </span>
                            )}
                          </div>
                        </Button>
                      );
                    })}
                  </div>
                )}

                {/* Add Custom Class Button */}
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setShowCustomForm(!showCustomForm)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {showCustomForm ? "Cancel" : "Create Custom Class"}
                </Button>

                {/* Selected Class Info */}
                {selectedClass && !showCustomForm && (
                  <div className="p-4 bg-secondary/50 rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">{selectedClass.name}</h3>
                      {selectedClass.isCustom && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteCustomClass(selectedClass.id)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {selectedClass.description}
                    </p>
                    <div className="flex flex-wrap gap-2 text-xs">
                      {selectedClass.prism && (
                        <Badge variant="default">{selectedClass.prism} Prism</Badge>
                      )}
                      {selectedClass.type && (
                        <Badge variant="secondary">{selectedClass.type}</Badge>
                      )}
                      <Badge>Hit Die: d{selectedClass.hitDie}</Badge>
                      {selectedClass.primaryAbilities.map((ability) => (
                        <Badge key={ability} variant="outline">
                          {ability.toUpperCase().slice(0, 3)}
                        </Badge>
                      ))}
                    </div>
                    {selectedClass.spellList && (
                      <p className="text-xs text-muted-foreground">
                        📖 {selectedClass.spellList}
                      </p>
                    )}
                    {selectedClass.features && selectedClass.features.length > 0 && (
                      <div className="text-xs space-y-1">
                        {selectedClass.features.slice(0, 2).map((feature, idx) => (
                          <p key={idx} className="text-muted-foreground">• {feature}</p>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Custom Class Form */}
            {showCustomForm && (
              <Card>
                <CardHeader>
                  <CardTitle>Create Custom Class</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Class Name</label>
                    <Input
                      placeholder="e.g., Blood Hunter"
                      value={customClass.name || ""}
                      onChange={(e) => setCustomClass({
                        ...customClass,
                        name: e.target.value,
                        id: e.target.value.toLowerCase().replace(/\s+/g, '-'),
                      })}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Hit Die</label>
                    <div className="flex gap-2">
                      {[6, 8, 10, 12].map((die) => (
                        <Button
                          key={die}
                          type="button"
                          variant={customClass.hitDie === die ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCustomClass({ ...customClass, hitDie: die })}
                        >
                          d{die}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Primary Abilities</label>
                    <div className="flex flex-wrap gap-2">
                      {allStats.map((stat) => (
                        <Button
                          key={stat}
                          type="button"
                          variant={customClass.primaryAbilities?.includes(stat) ? "default" : "outline"}
                          size="sm"
                          onClick={() => {
                            const current = customClass.primaryAbilities || [];
                            setCustomClass({
                              ...customClass,
                              primaryAbilities: current.includes(stat)
                                ? current.filter(s => s !== stat)
                                : [...current, stat],
                            });
                          }}
                        >
                          {statLabels[stat]}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Stat Priority (1st = highest stat)</label>
                    <div className="space-y-1 border rounded-lg p-2 bg-secondary/30">
                      {(customClass.statPriority || []).map((stat, index) => {
                        const current = customClass.statPriority || [];
                        const canMoveUp = index > 0;
                        const canMoveDown = index < current.length - 1;
                        
                        return (
                          <div
                            key={`${stat}-${index}`}
                            className="flex items-center gap-2 p-2 rounded hover:bg-secondary/50"
                          >
                            <span className="text-xs font-medium text-muted-foreground w-6">
                              {index + 1}.
                            </span>
                            <Badge variant="outline" className="flex-1 justify-center">
                              {statLabels[stat as StatName]}
                            </Badge>
                            <div className="flex gap-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                disabled={!canMoveUp}
                                onClick={() => {
                                  const newPriority = [...current];
                                  [newPriority[index], newPriority[index - 1]] = 
                                    [newPriority[index - 1], newPriority[index]];
                                  setCustomClass({
                                    ...customClass,
                                    statPriority: newPriority,
                                  });
                                }}
                              >
                                <ArrowUp className="w-3 h-3" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                disabled={!canMoveDown}
                                onClick={() => {
                                  const newPriority = [...current];
                                  [newPriority[index], newPriority[index + 1]] = 
                                    [newPriority[index + 1], newPriority[index]];
                                  setCustomClass({
                                    ...customClass,
                                    statPriority: newPriority,
                                  });
                                }}
                              >
                                <ArrowDown className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Use ↑↓ buttons to reorder. Click stats below to add/remove from priority.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {allStats.map((stat) => {
                        const isInPriority = (customClass.statPriority || []).includes(stat);
                        return (
                          <Button
                            key={stat}
                            type="button"
                            variant={isInPriority ? "default" : "outline"}
                            size="sm"
                            onClick={() => {
                              const current = customClass.statPriority || [];
                              if (isInPriority) {
                                // Remove from priority
                                setCustomClass({
                                  ...customClass,
                                  statPriority: current.filter(s => s !== stat),
                                });
                              } else {
                                // Add to end of priority
                                setCustomClass({
                                  ...customClass,
                                  statPriority: [...current, stat],
                                });
                              }
                            }}
                          >
                            {statLabels[stat]}
                          </Button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Description</label>
                    <Input
                      placeholder="A brief description of the class..."
                      value={customClass.description || ""}
                      onChange={(e) => setCustomClass({ ...customClass, description: e.target.value })}
                    />
                  </div>

                  <Button className="w-full" onClick={handleSaveCustomClass}>
                    <Save className="w-4 h-4 mr-2" />
                    Save Custom Class
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* NPC Generation Options */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Dices className="w-5 h-5" />
                  Generate NPC
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">NPC Name (optional)</label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Leave blank for random name"
                      value={npcName}
                      onChange={(e) => setNpcName(e.target.value)}
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setNpcName(generateRandomName())}
                      title="Generate random name"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Level</label>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setNpcLevel(Math.max(1, npcLevel - 1))}
                    >
                      -
                    </Button>
                    <Input
                      type="number"
                      min={1}
                      max={20}
                      value={npcLevel}
                      onChange={(e) => setNpcLevel(Math.min(20, Math.max(1, parseInt(e.target.value) || 1)))}
                      className="w-20 text-center"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setNpcLevel(Math.min(20, npcLevel + 1))}
                    >
                      +
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Rolling Method</label>
                  <div className="flex gap-2">
                    <Button
                      variant={rollingMethod === 'roll' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setRollingMethod('roll')}
                      className="flex-1"
                    >
                      4d6 Drop
                    </Button>
                    <Button
                      variant={rollingMethod === 'standard' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setRollingMethod('standard')}
                      className="flex-1"
                    >
                      Standard
                    </Button>
                  </div>
                </div>

                <Button
                  className="w-full"
                  size="lg"
                  onClick={handleGenerateNPC}
                  disabled={!selectedClass}
                >
                  <Sparkles className="w-5 h-5 mr-2" />
                  Generate NPC
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Generated NPCs */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <User className="w-5 h-5" />
                    Generated NPCs ({generatedNPCs.length})
                  </span>
                  {generatedNPCs.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleClearAllNPCs}
                      className="text-destructive"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Clear All
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {generatedNPCs.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <User className="w-16 h-16 mx-auto mb-4 opacity-20" />
                    <p>No NPCs generated yet.</p>
                    <p className="text-sm">Select a class and click Generate NPC!</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {generatedNPCs.map((npc) => (
                      <Card
                        key={npc.id}
                        className={`transition-all ${expandedNPC === npc.id ? 'ring-2 ring-primary' : ''}`}
                      >
                        <CardHeader
                          className="cursor-pointer"
                          onClick={() => setExpandedNPC(expandedNPC === npc.id ? null : npc.id)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div>
                                <h3 className="font-bold text-lg">{npc.name}</h3>
                                <p className="text-sm text-muted-foreground">
                                  Level {npc.level} {npc.class.name}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-2 text-sm">
                                <Heart className="w-4 h-4 text-red-500" />
                                <span className="font-bold">
                                  {npc.currentHP ?? npc.hp}/{npc.maxHP ?? npc.hp}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-sm">
                                <Shield className="w-4 h-4 text-blue-500" />
                                <span className="font-bold">AC {npc.ac}</span>
                              </div>
                              <div className="flex items-center gap-2 text-sm">
                                <Sparkles className="w-4 h-4 text-purple-500" />
                                <span className="font-bold">DC {npc.dc ?? 10}</span>
                              </div>
                              {expandedNPC === npc.id ? (
                                <ChevronUp className="w-5 h-5" />
                              ) : (
                                <ChevronDown className="w-5 h-5" />
                              )}
                            </div>
                          </div>
                        </CardHeader>

                        {expandedNPC === npc.id && (
                          <CardContent className="pt-0">
                            {editingNPC === npc.id ? (
                              // Edit Mode
                              <>
                                {/* Editable Stats Grid */}
                                <div className="grid grid-cols-6 gap-2 mb-4">
                                  {statOrder.map((stat) => {
                                    const value = editedStats.stats?.[stat] ?? npc.stats[stat];
                                    const mod = getModifier(value);
                                    const isPrimary = npc.class.primaryAbilities.includes(stat);
                                    return (
                                      <div
                                        key={stat}
                                        className={`text-center p-2 rounded-lg ${
                                          isPrimary ? 'bg-primary/10 ring-1 ring-primary' : 'bg-secondary/50'
                                        }`}
                                      >
                                        <div className="text-xs font-medium text-muted-foreground mb-1">
                                          {statLabels[stat]}
                                        </div>
                                        <Input
                                          type="number"
                                          min={1}
                                          max={30}
                                          value={value}
                                          onChange={(e) => setEditedStats({
                                            ...editedStats,
                                            stats: {
                                              ...npc.stats,
                                              ...editedStats.stats,
                                              [stat]: parseInt(e.target.value) || 1
                                            }
                                          })}
                                          className="h-8 text-center text-lg font-bold"
                                        />
                                        <div className={`text-xs mt-1 ${mod >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                          {formatModifier(mod)}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>

                                {/* Editable HP, AC, DC, Strain */}
                                <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-4">
                                  <div className="space-y-1">
                                    <label className="text-xs font-medium">Current HP</label>
                                    <Input
                                      type="number"
                                      min={0}
                                      max={editedStats.maxHP ?? npc.maxHP ?? npc.hp}
                                      value={editedStats.currentHP ?? npc.currentHP ?? npc.hp}
                                      onChange={(e) => setEditedStats({
                                        ...editedStats,
                                        currentHP: parseInt(e.target.value) || 0
                                      })}
                                      className="h-8 text-center"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-xs font-medium">Max HP</label>
                                    <Input
                                      type="number"
                                      min={1}
                                      value={editedStats.maxHP ?? npc.maxHP ?? npc.hp}
                                      onChange={(e) => setEditedStats({
                                        ...editedStats,
                                        maxHP: parseInt(e.target.value) || 1
                                      })}
                                      className="h-8 text-center"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-xs font-medium">AC</label>
                                    <Input
                                      type="number"
                                      min={1}
                                      value={editedStats.ac ?? npc.ac}
                                      onChange={(e) => setEditedStats({
                                        ...editedStats,
                                        ac: parseInt(e.target.value) || 1
                                      })}
                                      className="h-8 text-center"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-xs font-medium">DC</label>
                                    <Input
                                      type="number"
                                      min={1}
                                      value={editedStats.dc ?? npc.dc ?? 10}
                                      onChange={(e) => setEditedStats({
                                        ...editedStats,
                                        dc: parseInt(e.target.value) || 1
                                      })}
                                      className="h-8 text-center"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-xs font-medium">Max Strain</label>
                                    <Input
                                      type="number"
                                      min={1}
                                      value={editedStats.maxStrain ?? npc.maxStrain}
                                      onChange={(e) => setEditedStats({
                                        ...editedStats,
                                        maxStrain: parseInt(e.target.value) || 1
                                      })}
                                      className="h-8 text-center"
                                    />
                                  </div>
                                </div>

                                {/* Save/Cancel Actions */}
                                <div className="flex justify-end gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleCancelEdit();
                                    }}
                                  >
                                    <X className="w-4 h-4 mr-2" />
                                    Cancel
                                  </Button>
                                  <Button
                                    variant="default"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleSaveNPC(npc.id);
                                    }}
                                  >
                                    <Save className="w-4 h-4 mr-2" />
                                    Save Changes
                                  </Button>
                                </div>
                              </>
                            ) : (
                              // View Mode
                              <>
                                {/* Stats Grid */}
                                <div className="grid grid-cols-6 gap-2 mb-4">
                                  {statOrder.map((stat) => {
                                    const value = npc.stats[stat];
                                    const mod = getModifier(value);
                                    const isPrimary = npc.class.primaryAbilities.includes(stat);
                                    return (
                                      <div
                                        key={stat}
                                        className={`text-center p-3 rounded-lg ${
                                          isPrimary ? 'bg-primary/10 ring-1 ring-primary' : 'bg-secondary/50'
                                        }`}
                                      >
                                        <div className="text-xs font-medium text-muted-foreground">
                                          {statLabels[stat]}
                                        </div>
                                        <div className="text-2xl font-bold">{value}</div>
                                        <div className={`text-sm ${mod >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                          {formatModifier(mod)}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>

                                {/* Additional Info */}
                                <div className="space-y-2 mb-4">
                                  <div className="flex flex-wrap gap-2">
                                    {npc.class.prism && (
                                      <Badge variant="default">{npc.class.prism} Prism</Badge>
                                    )}
                                    {npc.class.type && (
                                      <Badge variant="secondary">{npc.class.type}</Badge>
                                    )}
                                    <Badge>Hit Die: d{npc.class.hitDie}</Badge>
                                    <Badge variant="outline">
                                      Max Strain: {npc.maxStrain}
                                    </Badge>
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    <strong>Saves:</strong> {npc.class.savingThrows.map(s => statLabels[s as StatName]).join(', ')}
                                  </div>
                                  {npc.class.spellList && (
                                    <div className="text-xs text-muted-foreground">
                                      <strong>Spells:</strong> {npc.class.spellList}
                                    </div>
                                  )}
                                </div>

                                {/* Actions */}
                                <div className="flex justify-end gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleEditNPC(npc);
                                    }}
                                  >
                                    <Edit className="w-4 h-4 mr-2" />
                                    Edit
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteNPC(npc.id);
                                    }}
                                    className="text-destructive"
                                  >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Delete
                                  </Button>
                                </div>
                              </>
                            )}
                          </CardContent>
                        )}
                      </Card>
                    ))}
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

