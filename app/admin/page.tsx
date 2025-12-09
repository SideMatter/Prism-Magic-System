"use client";

import { useState, useEffect, useRef } from "react";
import { Save, Search, X, Plus, Trash2, Edit2, Home } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";

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
  prism?: string | string[];
  isCustom?: boolean;
}

export default function AdminPage() {
  const { toast } = useToast();
  const [spells, setSpells] = useState<SpellWithPrism[]>([]);
  const [filteredSpells, setFilteredSpells] = useState<SpellWithPrism[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingSpell, setEditingSpell] = useState<string | null>(null);
  const [selectedPrisms, setSelectedPrisms] = useState<string[]>([]);
  const [availablePrisms, setAvailablePrisms] = useState<string[]>([]);
  const [newPrism, setNewPrism] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showCustomSpellForm, setShowCustomSpellForm] = useState(false);
  const [customSpellForm, setCustomSpellForm] = useState({
    name: "",
    level: 0,
    school: "",
    casting_time: "",
    range: "",
    components: "",
    duration: "",
    description: "",
    prism: [] as string[],
  });
  const [creatingCustomSpell, setCreatingCustomSpell] = useState(false);
  const [editingCustomSpell, setEditingCustomSpell] = useState<SpellWithPrism | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const statusTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showStatus = (type: "success" | "error", text: string) => {
    if (statusTimeoutRef.current) {
      clearTimeout(statusTimeoutRef.current);
    }
    setStatusMessage({ type, text });
    statusTimeoutRef.current = setTimeout(() => {
      setStatusMessage(null);
      statusTimeoutRef.current = null;
    }, 4000);
  };

  useEffect(() => {
    return () => {
      if (statusTimeoutRef.current) {
        clearTimeout(statusTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [spellsRes, prismsRes] = await Promise.all([
        fetch("/api/spells", {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache',
          }
        }),
        fetch("/api/prisms", {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache',
          }
        }),
      ]);
      const spellsData = await spellsRes.json();
      const prismsData = await prismsRes.json();
      setSpells(spellsData);
      setFilteredSpells(spellsData);
      setAvailablePrisms(prismsData);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredSpells(spells);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = spells.filter((spell) =>
      spell.name.toLowerCase().includes(query)
    );
    setFilteredSpells(filtered);
  }, [searchQuery, spells]);

  const handleEdit = (spell: SpellWithPrism) => {
    setEditingSpell(spell.name);
    if (Array.isArray(spell.prism)) {
      setSelectedPrisms(spell.prism);
    } else if (spell.prism) {
      setSelectedPrisms([spell.prism]);
    } else {
      setSelectedPrisms([]);
    }
  };

  const handleCancel = () => {
    setEditingSpell(null);
    setSelectedPrisms([]);
  };

  const togglePrismSelection = (prism: string) => {
    setSelectedPrisms(prev =>
      prev.includes(prism)
        ? prev.filter(p => p !== prism)
        : [...prev, prism]
    );
  };

  const handleSave = async (spellName: string) => {
    setSaving(true);
    try {
      const prismToSave = selectedPrisms.length > 1 ? selectedPrisms : 
                         selectedPrisms.length === 1 ? selectedPrisms[0] : 
                         null;
      
      console.log(`💾 Saving spell: ${spellName} with prism(s):`, prismToSave);
      
      const response = await fetch("/api/spells/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache, no-store, must-revalidate",
        },
        body: JSON.stringify({
          spellName,
          prism: prismToSave,
        }),
      });

      const result = await response.json();
      
      if (response.ok) {
        console.log(`✓ Save successful for ${spellName}:`, result);
        
        const updatedPrism = result.prism === null ? undefined : result.prism;
        setSpells((prev) =>
          prev.map((s) =>
            s.name === spellName ? { ...s, prism: updatedPrism } : s
          )
        );
        setFilteredSpells((prev) =>
          prev.map((s) =>
            s.name === spellName ? { ...s, prism: updatedPrism } : s
          )
        );
        
        setEditingSpell(null);
        setSelectedPrisms([]);
        
        try {
          const timestamp = Date.now().toString();
          localStorage.setItem('spell-update-trigger', timestamp);
          setTimeout(() => {
            localStorage.removeItem('spell-update-trigger');
          }, 100);
        } catch (e) {
          console.warn('Failed to trigger localStorage event:', e);
        }
        
        await loadData();
        
        showStatus("success", `Prism mapping for "${spellName}" saved successfully!`);
      } else {
        console.error("Save failed:", result);
        showStatus("error", `Failed to save: ${result.error || "Please try again."}`);
      }
    } catch (error) {
      console.error("Error saving:", error);
      showStatus(
        "error",
        `Error saving: ${error instanceof Error ? error.message : "Please try again."}`
      );
    } finally {
      setSaving(false);
    }
  };

  const handleAddPrism = async () => {
    const prismName = newPrism.trim();
    if (!prismName) {
      showStatus("error", "Please enter a prism name before adding.");
      return;
    }

    try {
      const response = await fetch("/api/prisms", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: prismName }),
      });

      if (response.ok) {
        await loadData();
        setNewPrism("");
        toast({
          title: "Prism Added!",
          description: `${prismName} has been saved to Redis.`,
        });
        showStatus("success", `Prism "${prismName}" added successfully!`);
      } else {
        const error = await response.json().catch(() => ({ error: "Unknown error" }));
        toast({
          title: "Error",
          description: `Failed to add prism: ${error.error || "It may already exist."}`,
          variant: "destructive",
        });
        showStatus("error", `Failed to add prism: ${error.error || "It may already exist."}`);
      }
    } catch (error) {
      console.error("Error adding prism:", error);
      toast({
        title: "Error",
        description: "Error adding prism. Please try again.",
        variant: "destructive",
      });
      showStatus("error", "Error adding prism. Please try again.");
    }
  };

  const handleRemovePrism = async (prismName: string) => {
    if (!confirm(`Remove prism "${prismName}"? This will unassign it from all spells.`)) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/prisms", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: prismName }),
      });

      if (response.ok) {
        await loadData();
        showStatus("success", `Prism "${prismName}" removed successfully!`);
      } else {
        const error = await response.json().catch(() => ({ error: "Unknown error" }));
        showStatus("error", `Failed to remove prism: ${error.error || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Error removing prism:", error);
      showStatus("error", "Error removing prism. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCustomSpell = async () => {
    if (!customSpellForm.name.trim() || !customSpellForm.school.trim() || 
        !customSpellForm.casting_time.trim() || !customSpellForm.range.trim() ||
        !customSpellForm.components.trim() || !customSpellForm.duration.trim() ||
        !customSpellForm.description.trim()) {
      showStatus("error", "Please fill in all required fields before creating a spell.");
      return;
    }

    setCreatingCustomSpell(true);
    try {
      const response = await fetch("/api/custom-spells", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...customSpellForm,
          prism: customSpellForm.prism.length > 1 ? customSpellForm.prism :
                 customSpellForm.prism.length === 1 ? customSpellForm.prism[0] :
                 undefined,
        }),
      });

      if (response.ok) {
        await loadData();
        setCustomSpellForm({
          name: "",
          level: 0,
          school: "",
          casting_time: "",
          range: "",
          components: "",
          duration: "",
          description: "",
          prism: [],
        });
        setShowCustomSpellForm(false);
        showStatus("success", `Custom spell "${customSpellForm.name}" created successfully!`);
      } else {
        const error = await response.json().catch(() => ({ error: "Unknown error" }));
        showStatus("error", `Failed to create spell: ${error.error || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Error creating custom spell:", error);
      showStatus("error", "Error creating spell. Please try again.");
    } finally {
      setCreatingCustomSpell(false);
    }
  };

  const handleDeleteCustomSpell = async (spellName: string) => {
    if (!confirm(`Delete custom spell "${spellName}"? This cannot be undone.`)) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/custom-spells", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: spellName }),
      });

      if (response.ok) {
        await loadData();
        showStatus("success", `Custom spell "${spellName}" deleted successfully!`);
      } else {
        const error = await response.json().catch(() => ({ error: "Unknown error" }));
        showStatus("error", `Failed to delete spell: ${error.error || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Error deleting custom spell:", error);
      showStatus("error", "Error deleting spell. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">Admin Panel</h1>
            <p className="text-muted-foreground">Manage spells and prisms</p>
          </div>
          <Link href="/">
            <Button variant="outline">
              <Home className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </Link>
        </div>

        {/* Status Message */}
        {statusMessage && (
          <Card className={`mb-6 border-2 ${statusMessage.type === "success" ? "border-green-500" : "border-destructive"}`}>
            <CardContent className="pt-6">
              <p className={statusMessage.type === "success" ? "text-green-600 dark:text-green-400" : "text-destructive"}>
                {statusMessage.text}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Prism Management */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Manage Prisms</CardTitle>
            <CardDescription>Add or remove prisms that can be assigned to spells</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="New prism name..."
                value={newPrism}
                onChange={(e) => setNewPrism(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleAddPrism()}
              />
              <Button onClick={handleAddPrism}>
                <Plus className="w-4 h-4 mr-2" />
                Add Prism
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {availablePrisms.map((prism) => (
                <div key={prism} className="flex items-center gap-1">
                  <Badge variant="outline" className="pr-1">
                    {prism}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto p-1 ml-1 hover:bg-destructive hover:text-destructive-foreground"
                      onClick={() => handleRemovePrism(prism)}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Custom Spell Creation */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Custom Spells</CardTitle>
                <CardDescription>Create your own custom spells for the Prism Magic System</CardDescription>
              </div>
              <Button
                onClick={() => setShowCustomSpellForm(!showCustomSpellForm)}
                variant={showCustomSpellForm ? "secondary" : "default"}
              >
                {showCustomSpellForm ? <X className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                {showCustomSpellForm ? "Cancel" : "New Spell"}
              </Button>
            </div>
          </CardHeader>
          {showCustomSpellForm && (
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Spell Name *</label>
                  <Input
                    value={customSpellForm.name}
                    onChange={(e) => setCustomSpellForm({ ...customSpellForm, name: e.target.value })}
                    placeholder="e.g., Prismatic Blast"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Level *</label>
                  <Input
                    type="number"
                    min="0"
                    max="9"
                    value={customSpellForm.level}
                    onChange={(e) => setCustomSpellForm({ ...customSpellForm, level: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">School *</label>
                  <Input
                    value={customSpellForm.school}
                    onChange={(e) => setCustomSpellForm({ ...customSpellForm, school: e.target.value })}
                    placeholder="e.g., Evocation"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Casting Time *</label>
                  <Input
                    value={customSpellForm.casting_time}
                    onChange={(e) => setCustomSpellForm({ ...customSpellForm, casting_time: e.target.value })}
                    placeholder="e.g., 1 action"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Range *</label>
                  <Input
                    value={customSpellForm.range}
                    onChange={(e) => setCustomSpellForm({ ...customSpellForm, range: e.target.value })}
                    placeholder="e.g., 60 feet"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Components *</label>
                  <Input
                    value={customSpellForm.components}
                    onChange={(e) => setCustomSpellForm({ ...customSpellForm, components: e.target.value })}
                    placeholder="e.g., V, S, M (a crystal prism)"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-sm font-medium">Duration *</label>
                  <Input
                    value={customSpellForm.duration}
                    onChange={(e) => setCustomSpellForm({ ...customSpellForm, duration: e.target.value })}
                    placeholder="e.g., Instantaneous"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-sm font-medium">Description *</label>
                  <textarea
                    className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={customSpellForm.description}
                    onChange={(e) => setCustomSpellForm({ ...customSpellForm, description: e.target.value })}
                    placeholder="Enter spell description..."
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-sm font-medium">Assign Prisms (Optional)</label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {availablePrisms.map((prism) => {
                      const isSelected = customSpellForm.prism.includes(prism);
                      return (
                        <Button
                          key={prism}
                          type="button"
                          variant={isSelected ? "default" : "outline"}
                          size="sm"
                          onClick={() => {
                            setCustomSpellForm({
                              ...customSpellForm,
                              prism: isSelected
                                ? customSpellForm.prism.filter(p => p !== prism)
                                : [...customSpellForm.prism, prism]
                            });
                          }}
                        >
                          {prism}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              </div>
              <Button
                onClick={handleCreateCustomSpell}
                disabled={creatingCustomSpell}
                className="w-full"
              >
                {creatingCustomSpell ? "Creating..." : "Create Custom Spell"}
              </Button>
            </CardContent>
          )}
        </Card>

        {/* Search */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
              <Input
                placeholder="Search spells..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Spell List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="mt-4 text-muted-foreground">Loading spells...</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredSpells.map((spell) => (
              <Card key={spell.name}>
                <CardContent className="pt-6">
                  {editingSpell === spell.name ? (
                    <div className="space-y-4">
                      <div>
                        <h3 className="font-semibold text-lg mb-3">{spell.name}</h3>
                        <p className="text-sm text-muted-foreground mb-3">
                          Select one or more prisms for this spell:
                        </p>
                        <div className="flex flex-wrap gap-2 mb-4">
                          {availablePrisms.map((prism) => {
                            const isSelected = selectedPrisms.includes(prism);
                            return (
                              <Button
                                key={prism}
                                variant={isSelected ? "default" : "outline"}
                                size="sm"
                                onClick={() => togglePrismSelection(prism)}
                              >
                                {prism}
                              </Button>
                            );
                          })}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleSave(spell.name)}
                          disabled={saving}
                          className="flex-1"
                        >
                          <Save className="w-4 h-4 mr-2" />
                          {saving ? "Saving..." : "Save"}
                        </Button>
                        <Button
                          onClick={handleCancel}
                          variant="outline"
                          disabled={saving}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-lg">{spell.name}</h3>
                          {spell.isCustom && (
                            <Badge variant="secondary">Custom</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          Level {spell.level} • {spell.school}
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {spell.prism ? (
                            Array.isArray(spell.prism) ? (
                              spell.prism.map((prism) => (
                                <Badge key={prism} variant="default">
                                  {prism}
                                </Badge>
                              ))
                            ) : (
                              <Badge variant="default">{spell.prism}</Badge>
                            )
                          ) : (
                            <Badge variant="outline">No Prism</Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(spell)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        {spell.isCustom && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteCustomSpell(spell.name)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!loading && filteredSpells.length === 0 && (
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-muted-foreground">
                {searchQuery ? "No spells found matching your search." : "No spells available."}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
