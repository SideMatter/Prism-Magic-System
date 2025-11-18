"use client";

import { useState, useEffect, useRef } from "react";
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
  const [editingCustomSpell, setEditingCustomSpell] = useState<SpellWithPrism | null>(null);
  const [editCustomSpellForm, setEditCustomSpellForm] = useState({
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
  const [updatingCustomSpell, setUpdatingCustomSpell] = useState(false);
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
        setPrismValue("");
        setSelectedPrisms([]);
        
        // Reload entire database
        await loadData();
        
        // Trigger update in other tabs/pages via localStorage event
        try {
          localStorage.setItem('spell-update-trigger', Date.now().toString());
          localStorage.removeItem('spell-update-trigger');
        } catch (e) {
          // Ignore localStorage errors
        }
        
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
        // Reload data to get fresh prism list
        await loadData();
        setNewPrism("");
        showStatus("success", `Prism "${prismName}" added successfully!`);
      } else {
        const error = await response.json().catch(() => ({ error: "Unknown error" }));
        showStatus("error", `Failed to add prism: ${error.error || "It may already exist."}`);
      }
    } catch (error) {
      console.error("Error adding prism:", error);
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
        // Reload entire database
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
          prism: customSpellForm.prism.length > 0 ? customSpellForm.prism : undefined,
        }),
      });

      const result = await response.json();
      
      if (response.ok) {
        console.log("Custom spell created successfully:", result);
        
        const spellName = customSpellForm.name;
        
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
        
        // Reload entire database
        await loadData();
        
        // Trigger update in other tabs/pages
        try {
          localStorage.setItem('spell-update-trigger', Date.now().toString());
          localStorage.removeItem('spell-update-trigger');
        } catch (e) {
          // Ignore localStorage errors
        }
        
        showStatus("success", `Custom spell "${spellName}" created successfully!`);
      } else {
        console.error("Failed to create custom spell:", result);
        const errorMsg = result.error || result.details || "Unknown error";
        showStatus("error", `Failed to create custom spell: ${errorMsg}`);
      }
    } catch (error) {
      console.error("Error creating custom spell:", error);
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      showStatus("error", `Error creating custom spell: ${errorMsg}`);
    } finally {
      setCreatingCustomSpell(false);
    }
  };

  const handleDeleteCustomSpell = async (spellName: string) => {
    if (!confirm(`Delete custom spell "${spellName}"? This action cannot be undone.`)) {
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
        console.log("Custom spell deleted successfully");
        
        // Optimistically update UI
        setSpells((prev) => prev.filter((s) => s.name !== spellName));
        setFilteredSpells((prev) => prev.filter((s) => s.name !== spellName));
        
        // Reload entire database to reflect deletion
        await loadData();
        
        // Trigger update in other tabs/pages
        try {
          localStorage.setItem('spell-update-trigger', Date.now().toString());
          localStorage.removeItem('spell-update-trigger');
        } catch (e) {
          // Ignore localStorage errors
        }
        
        showStatus("success", `Custom spell "${spellName}" deleted successfully!`);
      } else {
        const error = await response.json().catch(() => ({ error: "Unknown error" }));
        showStatus("error", `Failed to delete custom spell: ${error.error || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Error deleting custom spell:", error);
      showStatus("error", "Error deleting custom spell. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleEditCustomSpell = (spell: SpellWithPrism) => {
    setEditingCustomSpell(spell);
    setEditCustomSpellForm({
      name: spell.name,
      level: spell.level,
      school: spell.school,
      casting_time: spell.casting_time,
      range: spell.range,
      components: spell.components,
      duration: spell.duration,
      description: spell.description,
      prism: Array.isArray(spell.prism) ? spell.prism : (spell.prism ? [spell.prism] : []),
    });
  };

  const handleUpdateCustomSpell = async () => {
    if (!editingCustomSpell) return;

    if (!editCustomSpellForm.name.trim() || !editCustomSpellForm.school.trim() || 
        !editCustomSpellForm.casting_time.trim() || !editCustomSpellForm.range.trim() ||
        !editCustomSpellForm.components.trim() || !editCustomSpellForm.duration.trim() ||
        !editCustomSpellForm.description.trim()) {
      showStatus("error", "Please fill in all required fields before updating.");
      return;
    }

    const originalName = editingCustomSpell.name;
    setUpdatingCustomSpell(true);
    try {
      const response = await fetch("/api/custom-spells", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          originalName: editingCustomSpell.name,
          ...editCustomSpellForm,
          prism: editCustomSpellForm.prism.length > 0 ? editCustomSpellForm.prism : undefined,
        }),
      });

      const result = await response.json();
      
      if (response.ok) {
        console.log("Custom spell updated successfully:", result);
        setEditingCustomSpell(null);
        
        // Optimistically update UI
        const updatedSpell = { ...result.spell, isCustom: true };
        setSpells((prev) =>
          prev.map((s) => (s.name === originalName ? updatedSpell : s))
        );
        setFilteredSpells((prev) =>
          prev.map((s) => (s.name === originalName ? updatedSpell : s))
        );
        
        // Reload entire database
        await loadData();
        
        // Trigger update in other tabs/pages
        try {
          localStorage.setItem('spell-update-trigger', Date.now().toString());
          localStorage.removeItem('spell-update-trigger');
        } catch (e) {
          // Ignore localStorage errors
        }
        
        showStatus("success", `Custom spell "${originalName}" updated successfully!`);
      } else {
        console.error("Failed to update custom spell:", result);
        const errorMsg = result.error || result.details || "Unknown error";
        showStatus("error", `Failed to update custom spell: ${errorMsg}`);
      }
    } catch (error) {
      console.error("Error updating custom spell:", error);
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      showStatus("error", `Error updating custom spell: ${errorMsg}`);
    } finally {
      setUpdatingCustomSpell(false);
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

        {statusMessage && (
          <div
            className={`mb-6 rounded-lg border px-4 py-3 text-sm font-medium ${
              statusMessage.type === "success"
                ? "bg-green-50 border-green-200 text-green-800 dark:bg-green-900/30 dark:border-green-700 dark:text-green-100"
                : "bg-red-50 border-red-200 text-red-800 dark:bg-red-900/30 dark:border-red-700 dark:text-red-100"
            }`}
          >
            {statusMessage.text}
          </div>
        )}

        {/* Edit Custom Spell Modal */}
        {editingCustomSpell && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                  Edit Custom Spell: {editingCustomSpell.name}
                </h2>
                <button
                  onClick={() => setEditingCustomSpell(null)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Spell Name *
                  </label>
                  <input
                    type="text"
                    value={editCustomSpellForm.name}
                    onChange={(e) => setEditCustomSpellForm({ ...editCustomSpellForm, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
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
                    value={editCustomSpellForm.level}
                    onChange={(e) => setEditCustomSpellForm({ ...editCustomSpellForm, level: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    School *
                  </label>
                  <input
                    type="text"
                    value={editCustomSpellForm.school}
                    onChange={(e) => setEditCustomSpellForm({ ...editCustomSpellForm, school: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Casting Time *
                  </label>
                  <input
                    type="text"
                    value={editCustomSpellForm.casting_time}
                    onChange={(e) => setEditCustomSpellForm({ ...editCustomSpellForm, casting_time: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Range *
                  </label>
                  <input
                    type="text"
                    value={editCustomSpellForm.range}
                    onChange={(e) => setEditCustomSpellForm({ ...editCustomSpellForm, range: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Components *
                  </label>
                  <input
                    type="text"
                    value={editCustomSpellForm.components}
                    onChange={(e) => setEditCustomSpellForm({ ...editCustomSpellForm, components: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Duration *
                  </label>
                  <input
                    type="text"
                    value={editCustomSpellForm.duration}
                    onChange={(e) => setEditCustomSpellForm({ ...editCustomSpellForm, duration: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Prisms (optional)
                  </label>
                  <div className="flex flex-wrap gap-1 p-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-700 min-h-[40px]">
                    {availablePrisms.map((prism) => {
                      const isSelected = editCustomSpellForm.prism.includes(prism);
                      return (
                        <button
                          key={prism}
                          type="button"
                          onClick={() => {
                            setEditCustomSpellForm({
                              ...editCustomSpellForm,
                              prism: isSelected
                                ? editCustomSpellForm.prism.filter(p => p !== prism)
                                : [...editCustomSpellForm.prism, prism]
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
                    value={editCustomSpellForm.description}
                    onChange={(e) => setEditCustomSpellForm({ ...editCustomSpellForm, description: e.target.value })}
                    rows={6}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
              
              <div className="mt-6 flex justify-end gap-2">
                <button
                  onClick={() => setEditingCustomSpell(null)}
                  className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateCustomSpell}
                  disabled={updatingCustomSpell}
                  className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
                >
                  {updatingCustomSpell ? "Updating..." : "Update Spell"}
                </button>
              </div>
            </div>
          </div>
        )}

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
                      
                      {spell.isCustom ? (
                        // Custom spell buttons
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleEditCustomSpell(spell);
                            }}
                            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                          >
                            Edit
                          </button>
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
                        </div>
                      ) : (
                        // Regular spell button (prism assignment only)
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleEdit(spell);
                          }}
                          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                        >
                          {spell.prism ? "Edit Prism" : "Assign Prism"}
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

