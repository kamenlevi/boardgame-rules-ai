"use client";

import { useState, useEffect, useMemo } from "react";
import { Header } from "@/components/layout/Header";
import { GameCard } from "@/components/games/GameCard";
import { GameFiltersBar } from "@/components/games/GameFilters";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { getUserGames, getProfile } from "@/lib/store";
import { UserGame, GameFilters, LibraryTab } from "@/types";
import { BookOpen, Star, Upload, Library } from "lucide-react";

export default function Home() {
  const [games, setGames] = useState<UserGame[]>([]);
  const [filters, setFilters] = useState<GameFilters>({});
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<LibraryTab>("all");

  function refresh() {
    setGames(getUserGames());
  }

  useEffect(() => {
    refresh();
  }, []);

  const filtered = useMemo(() => {
    let list = games;

    if (tab === "my-collection") list = list.filter((g) => g.bggOwned);
    if (tab === "my-uploads") list = list.filter((g) => g.hasUploadedRulebook);
    if (tab === "favorites") list = list.filter((g) => g.isFavorite);

    if (search) {
      const q = search.toLowerCase();
      list = list.filter((g) => g.game.name.toLowerCase().includes(q));
    }

    if (filters.minPlayers) {
      list = list.filter((g) => g.game.maxPlayers >= filters.minPlayers!);
    }
    if (filters.maxPlaytime) {
      list = list.filter(
        (g) => !g.game.minPlaytime || g.game.minPlaytime <= filters.maxPlaytime!
      );
    }
    if (filters.maxWeight) {
      list = list.filter(
        (g) => !g.game.weight || g.game.weight <= filters.maxWeight!
      );
    }

    return list;
  }, [games, tab, search, filters]);

  const profile = getProfile();

  return (
    <div className="min-h-screen bg-background">
      <Header onSearch={setSearch} onLibraryChanged={refresh} />

      <main className="container mx-auto px-4 py-6">
        <Tabs value={tab} onValueChange={(v: string) => setTab(v as LibraryTab)}>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <TabsList className="w-full sm:w-auto">
              <TabsTrigger value="all" className="gap-1.5">
                <Library className="h-3.5 w-3.5" />
                All Games
              </TabsTrigger>
              <TabsTrigger value="my-collection" className="gap-1.5">
                <BookOpen className="h-3.5 w-3.5" />
                My BGG
              </TabsTrigger>
              <TabsTrigger value="my-uploads" className="gap-1.5">
                <Upload className="h-3.5 w-3.5" />
                My Uploads
              </TabsTrigger>
              <TabsTrigger value="favorites" className="gap-1.5">
                <Star className="h-3.5 w-3.5" />
                Favorites
              </TabsTrigger>
            </TabsList>

            <div className="sm:ml-auto">
              <GameFiltersBar filters={filters} onChange={setFilters} />
            </div>
          </div>

          {(["all", "my-collection", "my-uploads", "favorites"] as LibraryTab[]).map((t) => (
            <TabsContent key={t} value={t}>
              {filtered.length === 0 ? (
                <EmptyState tab={t} bggConnected={profile.bggConnected} />
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {filtered.map((ug) => (
                    <GameCard key={ug.id} userGame={ug} onFavoriteToggle={refresh} />
                  ))}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </main>
    </div>
  );
}

function EmptyState({ tab, bggConnected }: { tab: LibraryTab; bggConnected: boolean }) {
  const messages: Record<LibraryTab, { title: string; desc: string }> = {
    all: {
      title: "No games yet",
      desc: bggConnected
        ? "Your BGG games will appear here."
        : "Connect your BGG account (Settings ⚙️) to get started.",
    },
    "my-collection": {
      title: "No BGG games",
      desc: "Connect your BGG account in Settings to sync your collection.",
    },
    "my-uploads": {
      title: "No uploaded rulebooks",
      desc: "Open a game and upload rulebook pages to extract rules.",
    },
    favorites: {
      title: "No favorites yet",
      desc: "Click the heart on any game card to add it to your favorites.",
    },
  };

  const { title, desc } = messages[tab];
  return (
    <div className="text-center py-24 text-muted-foreground">
      <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-30" />
      <p className="font-medium text-foreground">{title}</p>
      <p className="text-sm mt-1">{desc}</p>
    </div>
  );
}
