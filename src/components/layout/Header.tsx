"use client";

import { useState, useEffect, useRef } from "react";
import { BookOpen, Settings, Search, Plus, Loader2, KeyRound, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getProfile, saveProfile, getAnthropicKey, saveAnthropicKey, saveUserGame } from "@/lib/store";
import { bggFetchCollection, bggSearch } from "@/lib/bgg-client";
import { BGGGame } from "@/types";
import { toast } from "sonner";
import Image from "next/image";

interface HeaderProps {
  onSearch?: (query: string) => void;
  onLibraryChanged?: () => void;
}

export function Header({ onSearch, onLibraryChanged }: HeaderProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [bggUsername, setBggUsername] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [importing, setImporting] = useState(false);
  const [profile, setProfile] = useState(getProfile());

  // Game search state
  const [addGameOpen, setAddGameOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<BGGGame[]>([]);
  const [searching, setSearching] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const p = getProfile();
    setProfile(p);
    setBggUsername(p.bggUsername ?? "");
    setApiKey(getAnthropicKey());
  }, [settingsOpen]);

  async function connectBGG() {
    if (!bggUsername.trim()) return;
    setImporting(true);
    try {
      const games = await bggFetchCollection(bggUsername.trim());
      const { importBGGCollection } = await import("@/lib/store");
      importBGGCollection(games);
      const updated = saveProfile({ bggUsername: bggUsername.trim(), bggConnected: true });
      setProfile(updated);
      toast.success(`Imported ${games.length} games from BGG`);
      setSettingsOpen(false);
      onLibraryChanged?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to connect to BGG");
    } finally {
      setImporting(false);
    }
  }

  function saveKey() {
    if (!apiKey.trim()) return;
    saveAnthropicKey(apiKey.trim());
    const updated = saveProfile({ hasAnthropicKey: true });
    setProfile(updated);
    toast.success("API key saved");
  }

  function removeKey() {
    saveAnthropicKey("");
    const updated = saveProfile({ hasAnthropicKey: false });
    setProfile(updated);
    setApiKey("");
    toast.success("API key removed");
  }

  function handleGameSearch(q: string) {
    setSearchQuery(q);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (!q.trim()) { setSearchResults([]); return; }
    searchTimeout.current = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await bggSearch(q);
        setSearchResults(results);
      } catch {
        toast.error("Search failed");
      } finally {
        setSearching(false);
      }
    }, 500);
  }

  function addGame(game: BGGGame) {
    saveUserGame(game, { bggOwned: false });
    toast.success(`Added ${game.name}`);
    onLibraryChanged?.();
  }

  return (
    <>
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto flex items-center gap-3 px-4 py-3">
          <div className="flex items-center gap-2 font-bold text-lg shrink-0">
            <BookOpen className="h-5 w-5 text-primary" />
            <span>RulebookAI</span>
          </div>

          <div className="flex-1 max-w-md relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Filter your library..."
              className="pl-9"
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => onSearch?.(e.target.value)}
            />
          </div>

          <div className="ml-auto flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setAddGameOpen(true)}>
              <Plus className="h-4 w-4" />
              Add Game
            </Button>
            {profile.bggConnected && (
              <span className="text-sm text-muted-foreground hidden sm:block">
                BGG: <span className="font-medium text-foreground">{profile.bggUsername}</span>
              </span>
            )}
            <Button variant="ghost" size="icon" onClick={() => setSettingsOpen(true)}>
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Settings Dialog */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Settings</DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="bgg">
            <TabsList className="w-full">
              <TabsTrigger value="bgg" className="flex-1">BGG Account</TabsTrigger>
              <TabsTrigger value="api" className="flex-1">API Key</TabsTrigger>
            </TabsList>

            <TabsContent value="bgg" className="space-y-3 mt-4">
              <p className="text-sm text-muted-foreground">
                Enter your BoardGameGeek username to import your owned game collection.
              </p>
              <div className="flex gap-2">
                <Input
                  placeholder="BGG username"
                  value={bggUsername}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBggUsername(e.target.value)}
                  onKeyDown={(e: React.KeyboardEvent) => e.key === "Enter" && connectBGG()}
                  disabled={importing}
                />
                <Button onClick={connectBGG} disabled={importing || !bggUsername.trim()}>
                  {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : profile.bggConnected ? "Re-sync" : "Connect"}
                </Button>
              </div>
              {profile.bggConnected && (
                <p className="text-xs text-green-600">
                  ✓ Connected as <strong>{profile.bggUsername}</strong>
                </p>
              )}
            </TabsContent>

            <TabsContent value="api" className="space-y-3 mt-4">
              <p className="text-sm text-muted-foreground">
                Add your Anthropic API key to enable rule extraction and Q&amp;A. The key is stored only in your browser.
              </p>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    type={showApiKey ? "text" : "password"}
                    placeholder="sk-ant-..."
                    value={apiKey}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setApiKey(e.target.value)}
                    onKeyDown={(e: React.KeyboardEvent) => e.key === "Enter" && saveKey()}
                    className="pr-8"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <KeyRound className="h-4 w-4" />
                  </button>
                </div>
                <Button onClick={saveKey} disabled={!apiKey.trim()}>Save</Button>
                {profile.hasAnthropicKey && (
                  <Button variant="ghost" size="icon" onClick={removeKey}>
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              {profile.hasAnthropicKey && (
                <p className="text-xs text-green-600">✓ API key is set</p>
              )}
              <p className="text-xs text-muted-foreground">
                Get your key at{" "}
                <a href="https://console.anthropic.com" target="_blank" rel="noopener noreferrer" className="underline">
                  console.anthropic.com
                </a>
              </p>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Add Game Dialog */}
      <Dialog open={addGameOpen} onOpenChange={(open) => { setAddGameOpen(open); if (!open) { setSearchQuery(""); setSearchResults([]); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add a Game</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search BoardGameGeek..."
                value={searchQuery}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleGameSearch(e.target.value)}
                className="pl-9"
                autoFocus
              />
            </div>

            {searching && (
              <div className="flex items-center justify-center py-8 text-muted-foreground gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Searching BGG...</span>
              </div>
            )}

            {!searching && searchResults.length > 0 && (
              <div className="space-y-1 max-h-80 overflow-y-auto">
                {searchResults.map((game) => (
                  <button
                    key={game.id}
                    onClick={() => { addGame(game); setAddGameOpen(false); setSearchQuery(""); setSearchResults([]); }}
                    className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted text-left transition-colors"
                  >
                    {game.thumbnail ? (
                      <Image
                        src={game.thumbnail}
                        alt={game.name}
                        width={40}
                        height={40}
                        className="rounded object-cover shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded bg-muted-foreground/20 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{game.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {game.yearPublished > 0 && `${game.yearPublished} · `}
                        {game.minPlayers}–{game.maxPlayers} players
                      </p>
                    </div>
                    <Plus className="h-4 w-4 text-muted-foreground shrink-0" />
                  </button>
                ))}
              </div>
            )}

            {!searching && searchQuery && searchResults.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">No games found</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
