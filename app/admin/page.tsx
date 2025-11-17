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
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">
                      {spell.name}
                    </h3>
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

