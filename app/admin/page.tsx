"use client";

import { useState, useEffect } from "react";
import { Save, Search, X } from "lucide-react";

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

export default function AdminPage() {
  const [spells, setSpells] = useState<SpellWithPrism[]>([]);
  const [filteredSpells, setFilteredSpells] = useState<SpellWithPrism[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingSpell, setEditingSpell] = useState<string | null>(null);
  const [prismValue, setPrismValue] = useState("");
  const [selectedPrisms, setSelectedPrisms] = useState<string[]>([]); // For multi-select
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

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [spellsRes, prismsRes] = await Promise.all([
        fetch("/api/spells", {
          cache: 'no-store', // Force fresh data
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
      setPrismValue(""); // Not used for multi-select
    } else {
      setPrismValue(spell.prism || "");
      setSelectedPrisms([]);
    }
  };

  const handleCancel = () => {
    setEditingSpell(null);
    setPrismValue("");
    setSelectedPrisms([]);
  };

  const handleSave = async (spellName: string) => {
    setSaving(true);
    try {
      // Determine what to save: array of prisms or single prism
      const prismToSave = selectedPrisms.length > 0 
        ? selectedPrisms 
        : (prismValue || null);
      
      console.log("Saving spell:", spellName, "with prism(s):", prismToSave);
      
      const response = await fetch("/api/spells/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          spellName,
          prism: prismToSave,
        }),
      });

      const result = await response.json();
      
      if (response.ok) {
        console.log("Save successful:", result);
        
        // Update local state immediately with the value returned from the server
        const updatedPrism = result.prism || undefined;
        
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
        setPrismValue("");
        setSelectedPrisms([]);
        
        // Trigger update in other tabs/pages via localStorage event
        try {
          localStorage.setItem('spell-update-trigger', Date.now().toString());
          localStorage.removeItem('spell-update-trigger'); // Clean up immediately
        } catch (e) {
          // Ignore localStorage errors
        }
        
        // Don't reload - trust the optimistic update
        // The change is already in Redis and will be reflected on search page
      } else {
        console.error("Save failed:", result);
        alert(`Failed to save: ${result.error || "Please try again."}`);
      }
    } catch (error) {
      console.error("Error saving:", error);
      alert(`Error saving: ${error instanceof Error ? error.message : "Please try again."}`);
    } finally {
      setSaving(false);
    }
  };

  const handleAddPrism = async () => {
    if (!newPrism.trim()) return;

    try {
      const response = await fetch("/api/prisms", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: newPrism.trim() }),
      });

      if (response.ok) {
        // Reload data to get fresh prism list
        await loadData();
        setNewPrism("");
      } else {
        const error = await response.json().catch(() => ({ error: "Unknown error" }));
        alert(`Failed to add prism: ${error.error || "It may already exist."}`);
      }
    } catch (error) {
      console.error("Error adding prism:", error);
      alert("Error adding prism. Please try again.");
    }
  };

  const handleRemovePrism = async (prismName: string) => {
    if (!confirm(`Remove prism "${prismName}"? This will unassign it from all spells.`)) {
      return;
    }

    try {
      const response = await fetch("/api/prisms", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: prismName }),
      });

      if (response.ok) {
        // Reload data to get fresh state
        await loadData();
      } else {
        const error = await response.json().catch(() => ({ error: "Unknown error" }));
        alert(`Failed to remove prism: ${error.error || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Error removing prism:", error);
      alert("Error removing prism. Please try again.");
    }
  };

  const handleCreateCustomSpell = async () => {
    if (!customSpellForm.name.trim() || !customSpellForm.school.trim() || 
        !customSpellForm.casting_time.trim() || !customSpellForm.range.trim() ||
        !customSpellForm.components.trim() || !customSpellForm.duration.trim() ||
        !customSpellForm.description.trim()) {
      alert("Please fill in all required fields.");
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
          prism: customSpellForm.prism.length > 0 ? customSpellForm.prism : undefined,
        }),
      });

      const result = await response.json();
      
      if (response.ok) {
        console.log("Custom spell created successfully:", result);
        // Reset form
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
        // Reload data
        await loadData();
        // Trigger update in other tabs/pages
        try {
          localStorage.setItem('spell-update-trigger', Date.now().toString());
          localStorage.removeItem('spell-update-trigger');
        } catch (e) {
          // Ignore localStorage errors
        }
      } else {
        console.error("Failed to create custom spell:", result);
        const errorMsg = result.error || result.details || "Unknown error";
        alert(`Failed to create custom spell: ${errorMsg}`);
      }
    } catch (error) {
      console.error("Error creating custom spell:", error);
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      alert(`Error creating custom spell: ${errorMsg}`);
    } finally {
      setCreatingCustomSpell(false);
    }
  };

  const handleDeleteCustomSpell = async (spellName: string) => {
    if (!confirm(`Delete custom spell "${spellName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch("/api/custom-spells", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: spellName }),
      });

      if (response.ok) {
        // Reload data
        await loadData();
        // Trigger update in other tabs/pages
        try {
          localStorage.setItem('spell-update-trigger', Date.now().toString());
          localStorage.removeItem('spell-update-trigger');
        } catch (e) {
          // Ignore localStorage errors
        }
      } else {
        const error = await response.json().catch(() => ({ error: "Unknown error" }));
        alert(`Failed to delete custom spell: ${error.error || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Error deleting custom spell:", error);
      alert("Error deleting custom spell. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Paul's Prism Panel of Awesomeness and Power
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Manage spell-to-prism mappings
          </p>
        </div>

        {/* Custom Spell Creation */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
              Custom Spells
            </h2>
            <button
              onClick={() => setShowCustomSpellForm(!showCustomSpellForm)}
              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
            >
              {showCustomSpellForm ? "Cancel" : "Create Custom Spell"}
            </button>
          </div>
          
          {showCustomSpellForm && (
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Spell Name *
                  </label>
                  <input
                    type="text"
                    value={customSpellForm.name}
                    onChange={(e) => setCustomSpellForm({ ...customSpellForm, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="e.g., Fire Bolt"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Level *
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="9"
                    value={customSpellForm.level}
                    onChange={(e) => setCustomSpellForm({ ...customSpellForm, level: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    School *
                  </label>
                  <input
                    type="text"
                    value={customSpellForm.school}
                    onChange={(e) => setCustomSpellForm({ ...customSpellForm, school: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="e.g., Evocation"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Casting Time *
                  </label>
                  <input
                    type="text"
                    value={customSpellForm.casting_time}
                    onChange={(e) => setCustomSpellForm({ ...customSpellForm, casting_time: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="e.g., 1 action"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Range *
                  </label>
                  <input
                    type="text"
                    value={customSpellForm.range}
                    onChange={(e) => setCustomSpellForm({ ...customSpellForm, range: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="e.g., 120 feet"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Components *
                  </label>
                  <input
                    type="text"
                    value={customSpellForm.components}
                    onChange={(e) => setCustomSpellForm({ ...customSpellForm, components: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="e.g., V, S, M (a piece of iron)"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Duration *
                  </label>
                  <input
                    type="text"
                    value={customSpellForm.duration}
                    onChange={(e) => setCustomSpellForm({ ...customSpellForm, duration: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="e.g., Instantaneous"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Prisms (optional)
                  </label>
                  <div className="flex flex-wrap gap-1 p-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-700 min-h-[40px]">
                    {availablePrisms.map((prism) => {
                      const isSelected = customSpellForm.prism.includes(prism);
                      return (
                        <button
                          key={prism}
                          type="button"
                          onClick={() => {
                            setCustomSpellForm({
                              ...customSpellForm,
                              prism: isSelected
                                ? customSpellForm.prism.filter(p => p !== prism)
                                : [...customSpellForm.prism, prism]
                            });
                          }}
                          className={`px-2 py-1 rounded-full text-xs font-semibold transition-colors ${
                            isSelected
                              ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                              : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500'
                          }`}
                        >
                          {prism}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Description *
                  </label>
                  <textarea
                    value={customSpellForm.description}
                    onChange={(e) => setCustomSpellForm({ ...customSpellForm, description: e.target.value })}
                    rows={6}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Enter the full spell description..."
                  />
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <button
                  onClick={handleCreateCustomSpell}
                  disabled={creatingCustomSpell}
                  className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50"
                >
                  {creatingCustomSpell ? "Creating..." : "Create Spell"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Prism Management */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
            Manage Prisms
          </h2>
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              placeholder="Add new prism..."
              value={newPrism}
              onChange={(e) => setNewPrism(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleAddPrism()}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
            <button
              onClick={handleAddPrism}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              Add Prism
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {availablePrisms.map((prism) => (
              <div
                key={prism}
                className="flex items-center gap-2 px-3 py-1 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full text-white"
              >
                <span>{prism}</span>
                <button
                  onClick={() => handleRemovePrism(prism)}
                  className="hover:bg-white/20 rounded-full p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Spell Search */}
        <div className="mb-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search spells to edit..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Spell List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredSpells.map((spell) => (
              <div
                key={spell.name}
                className="bg-white dark:bg-gray-800 rounded-lg shadow p-4"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                        {spell.name}
                      </h3>
                      {spell.isCustom && (
                        <span className="px-2 py-0.5 bg-green-500 text-white text-xs font-semibold rounded-full">
                          Custom
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Level {spell.level} • {spell.school}
                    </p>
                  </div>
                  {editingSpell === spell.name ? (
                    <div className="flex flex-col items-end gap-2 ml-4 min-w-[300px]">
                      {/* Multi-select prisms */}
                      <div className="w-full">
                        <label className="text-sm text-gray-600 dark:text-gray-400 mb-1 block">
                          Select Prisms (click to toggle):
                        </label>
                        <div className="flex flex-wrap gap-1 p-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-700 min-h-[40px]">
                          {availablePrisms.map((prism) => {
                            const isSelected = selectedPrisms.includes(prism);
                            return (
                              <button
                                key={prism}
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setSelectedPrisms(prev =>
                                    isSelected
                                      ? prev.filter(p => p !== prism)
                                      : [...prev, prism]
                                  );
                                }}
                                className={`px-2 py-1 rounded-full text-xs font-semibold transition-colors ${
                                  isSelected
                                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                                    : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500'
                                }`}
                              >
                                {prism}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleSave(spell.name);
                          }}
                          disabled={saving}
                          className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 flex items-center gap-1"
                        >
                          <Save className="w-4 h-4" />
                          <span>Save</span>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleCancel();
                          }}
                          className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 flex items-center gap-1"
                        >
                          <X className="w-4 h-4" />
                          <span>Cancel</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-end gap-2 ml-4">
                      <div className="flex flex-wrap gap-1 justify-end">
                        {spell.prism ? (
                          Array.isArray(spell.prism) ? (
                            spell.prism.map((prism) => (
                              <span key={prism} className="px-2 py-1 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full text-white text-xs font-semibold">
                                {prism}
                              </span>
                            ))
                          ) : (
                            <span className="px-3 py-1 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full text-white text-xs font-semibold">
                              {spell.prism}
                            </span>
                          )
                        ) : (
                          <span className="px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded-full text-gray-700 dark:text-gray-300 text-xs font-semibold">
                            No Prism
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleEdit(spell);
                        }}
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                      >
                        {spell.prism ? "Edit" : "Assign"}
                      </button>
                      {spell.isCustom && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleDeleteCustomSpell(spell.name);
                          }}
                          className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

