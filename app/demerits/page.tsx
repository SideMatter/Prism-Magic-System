"use client";

import { useState, useEffect } from "react";
import { Trophy, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const DISTRACTION_TITLES = [
  "The Most Distracted",
  "Chief Daydreamer",
  "Lord of the Wandering Mind",
  "The Attention Nomad",
  "Supreme Scatterbrain",
  "Grand Master of Tangents",
  "The Unfocused One",
  "Duke of Distraction",
  "Captain Side-Quest",
  "The Perpetual Zoner",
  "Archmage of Absent-Mindedness",
  "The Squirrel Whisperer",
  "Baron of Brain Fog",
  "The Phone Checker",
  "Knight of the Short Attention Span",
  "Sovereign of Spacing Out",
  "The Tab Hoarder",
  "Vizier of Vacant Stares",
  "The Wandering Eye",
  "Champion of 'Wait, What?'",
];

function getDistractionTitle(playerName: string): string {
  let hash = 0;
  for (let i = 0; i < playerName.length; i++) {
    hash = ((hash << 5) - hash) + playerName.charCodeAt(i);
    hash |= 0;
  }
  return DISTRACTION_TITLES[Math.abs(hash) % DISTRACTION_TITLES.length];
}

interface DemeritScore {
  playerName: string;
  playerId: string;
  count: number;
}

interface Demerit {
  _id: string;
  playerId: string;
  playerName: string;
  reason?: string;
  timestamp: number;
}

export default function DemeritsPage() {
  const [scores, setScores] = useState<DemeritScore[]>([]);
  const [allDemerits, setAllDemerits] = useState<Demerit[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedPlayer, setExpandedPlayer] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [scoresRes, allRes] = await Promise.all([
          fetch("/api/demerits", { cache: "no-store" }),
          fetch("/api/demerits?mode=all", { cache: "no-store" }),
        ]);
        if (scoresRes.ok) setScores(await scoresRes.json());
        if (allRes.ok) setAllDemerits(await allRes.json());
      } catch (error) {
        console.error("Error loading demerits:", error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const getPlayerDemerits = (playerId: string) =>
    allDemerits
      .filter((d) => d.playerId === playerId)
      .sort((a, b) => b.timestamp - a.timestamp);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="mt-4 text-muted-foreground">Loading demerits...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
            <AlertTriangle className="w-9 h-9 text-yellow-500" />
            Demerit Board
          </h1>
          <p className="text-muted-foreground">The hall of shame</p>
        </div>

        {scores.length > 0 ? (
          <div className="space-y-3">
            {scores.map((score, index) => {
              const isTop = index === 0;
              const isExpanded = expandedPlayer === score.playerId;
              const playerDemerits = getPlayerDemerits(score.playerId);

              return (
                <Card
                  key={score.playerId}
                  className={isTop ? "border-2 border-yellow-500/40" : ""}
                >
                  <div
                    className={`p-4 cursor-pointer ${isTop ? "bg-yellow-500/5" : ""}`}
                    onClick={() => setExpandedPlayer(isExpanded ? null : score.playerId)}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-2xl font-bold text-muted-foreground w-8 text-center">
                          {index + 1}
                        </span>
                        {isTop && <Trophy className="w-6 h-6 text-yellow-500 shrink-0" />}
                        <div className="min-w-0">
                          <p className={`text-lg font-semibold ${isTop ? "text-yellow-600 dark:text-yellow-400" : ""}`}>
                            {score.playerName}
                          </p>
                          {isTop && (
                            <p className="text-sm text-yellow-600/80 dark:text-yellow-400/80 italic">
                              {getDistractionTitle(score.playerName)}
                            </p>
                          )}
                        </div>
                      </div>
                      <Badge
                        variant={isTop ? "default" : "secondary"}
                        className={`text-lg px-4 py-1 ${isTop ? "bg-yellow-500 hover:bg-yellow-600 text-yellow-950" : ""}`}
                      >
                        {score.count}
                      </Badge>
                    </div>
                  </div>

                  {isExpanded && playerDemerits.length > 0 && (
                    <CardContent className="pt-0 border-t">
                      <div className="space-y-2 pt-3">
                        {playerDemerits.map((demerit) => (
                          <div key={demerit._id} className="p-2 rounded-md bg-muted/50">
                            <p className="text-sm">
                              {demerit.reason || (
                                <span className="text-muted-foreground italic">No reason given</span>
                              )}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(demerit.timestamp).toLocaleDateString()}{" "}
                              {new Date(demerit.timestamp).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="text-center py-12">
              <AlertTriangle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg text-muted-foreground">
                No demerits yet. Everyone&apos;s being good... for now.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
