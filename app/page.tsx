"use client";

import { useState, useEffect } from "react";
import { Search, Sparkles } from "lucide-react";

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

export default function Home() {
  const [searchQuery, setSearchQuery] = useState("");
  const [spells, setSpells] = useState<SpellWithPrism[]>([]);
  const [filteredSpells, setFilteredSpells] = useState<SpellWithPrism[]>([]);
  const [selectedSpell, setSelectedSpell] = useState<SpellWithPrism | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastCacheTimestamp, setLastCacheTimestamp] = useState<string>("");

  // Load spells from API
  const loadSpells = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const response = await fetch("/api/spells", {
        cache: 'no-store', // Always fetch fresh data
      });
      const data = await response.json();
      const cacheTimestamp = response.headers.get('X-Cache-Timestamp') || "";
      
      setSpells(data);
      setFilteredSpells(data);
      setLastCacheTimestamp(cacheTimestamp);
      
      // Update selected spell if it exists
      if (selectedSpell) {
        const updatedSpell = data.find((s: SpellWithPrism) => s.name === selectedSpell.name);
        if (updatedSpell) {
          setSelectedSpell(updatedSpell);
        }
      }
    } catch (error) {
      console.error("Error loading spells:", error);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    // Initial load
    loadSpells();
    
    // Reload when page becomes visible (user navigates back from admin)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log("Page visible, reloading spells...");
        loadSpells(false); // Don't show loading spinner on background refresh
      }
    };
    
    // Reload when window gains focus
    const handleFocus = () => {
      console.log("Window focused, reloading spells...");
      loadSpells(false);
    };
    
    // Add storage event listener to detect changes from other tabs/pages
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'spell-update-trigger') {
        console.log("Spell update detected from admin, reloading...");
        loadSpells(false);
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('storage', handleStorageChange);
    
    // Poll for updates more frequently (every 3 seconds for better UX)
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
        
        // Always update if timestamp changed (even if it seems older due to server time differences)
        if (cacheTimestamp !== lastCacheTimestamp) {
          console.log(`Cache timestamp changed (${lastCacheTimestamp} → ${cacheTimestamp}), updating spells...`);
          setSpells(data);
          setFilteredSpells(data);
          
          // Update selected spell if it exists (using functional update to avoid dependency)
          setSelectedSpell((current) => {
            if (!current) return current;
            const updatedSpell = data.find((s: SpellWithPrism) => s.name === current.name);
            return updatedSpell || current;
          });
          
          setLastCacheTimestamp(cacheTimestamp);
        }
      } catch (error) {
        // Silently fail on polling errors
        console.error("Error polling for updates:", error);
      }
    }, 3000); // Check every 3 seconds for faster updates
    
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [lastCacheTimestamp]); // Removed selectedSpell from dependencies to prevent infinite loop

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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Prism Magic System
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Search for D&D 5e spells and discover their prism
          </p>
        </div>

        <div className="max-w-2xl mx-auto mb-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search for a spell (e.g., Fireball, Magic Missile)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading spells...</p>
          </div>
        ) : (
          <>
            {selectedSpell ? (
              <div className="max-w-3xl mx-auto">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-4">
                  <button
                    onClick={() => setSelectedSpell(null)}
                    className="text-blue-500 hover:text-blue-700 mb-4"
                  >
                    ← Back to search
                  </button>
                  <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                    {selectedSpell.name}
                  </h2>
                        {selectedSpell.prism && (
                          <div className="mb-6 p-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg text-white">
                            <div className="flex items-center gap-2 mb-2">
                              <Sparkles className="w-6 h-6" />
                              <span className="text-xl font-bold">
                                {Array.isArray(selectedSpell.prism) ? 'Prisms:' : 'Prism:'}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-2 ml-8">
                              {Array.isArray(selectedSpell.prism) ? (
                                selectedSpell.prism.map((prism) => (
                                  <span key={prism} className="px-3 py-1 bg-white/20 rounded-full text-sm">
                                    {prism}
                                  </span>
                                ))
                              ) : (
                                <span className="text-xl">{selectedSpell.prism}</span>
                              )}
                            </div>
                          </div>
                        )}
                  {!selectedSpell.prism && (
                    <div className="mb-6 p-4 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
                      <p className="text-yellow-800 dark:text-yellow-200">
                        No prism assigned yet. Use the Admin panel to assign this spell to a prism.
                      </p>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Level</p>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        {selectedSpell.level}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">School</p>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        {selectedSpell.school}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Casting Time</p>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        {selectedSpell.casting_time}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Range</p>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        {selectedSpell.range}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Components</p>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        {selectedSpell.components}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Duration</p>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        {selectedSpell.duration}
                      </p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Description</p>
                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-line">
                      {selectedSpell.description}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="max-w-4xl mx-auto">
                {filteredSpells.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-600 dark:text-gray-400">
                      {searchQuery ? "No spells found matching your search." : "No spells available."}
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {filteredSpells.slice(0, 50).map((spell) => (
                      <div
                        key={spell.name}
                        onClick={() => setSelectedSpell(spell)}
                        className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 hover:shadow-lg transition-shadow cursor-pointer"
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
                          <div className="flex flex-wrap gap-1 ml-4 justify-end">
                            {spell.prism ? (
                              Array.isArray(spell.prism) ? (
                                spell.prism.map((prism) => (
                                  <span key={prism} className="px-2 py-1 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full text-white text-xs font-semibold whitespace-nowrap">
                                    {prism}
                                  </span>
                                ))
                              ) : (
                                <span className="px-3 py-1 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full text-white text-sm font-semibold whitespace-nowrap">
                                  {spell.prism}
                                </span>
                              )
                            ) : (
                              <span className="px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded-full text-gray-700 dark:text-gray-300 text-xs font-semibold whitespace-nowrap">
                                No Prism
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    {filteredSpells.length > 50 && (
                      <p className="text-center text-gray-600 dark:text-gray-400 py-4">
                        Showing first 50 results. Refine your search to see more.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

