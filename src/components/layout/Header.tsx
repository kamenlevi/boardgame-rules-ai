"use client";

import { useState, useEffect, useRef } from "react";
import { BookOpen, Settings, Search, Plus, Loader2, Eye, EyeOff, X, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getProfile, saveProfile, getAIConfig, saveAIConfig, saveUserGame } from "@/lib/store";
import { bggFetchCollection, bggSearch, BGGAuthError } from "@/lib/bgg-client";
import { BGGGame, AIProvider } from "@/types";
import { toast } from "sonner";
import Image from "next/image";

interface HeaderProps {
  onSearch?: (query: string) => void;
  onLibraryChanged?: () => void;
}

const OPENROUTER_MODELS = [
  { id: "anthropic/claude-sonnet-4-5", label: "Claude Sonnet (via OpenRouter)" },
  { id: "anthropic/claude-3.5-haiku", label: "Claude Haiku — faster/cheaper" },
  { id: "openai/gpt-4o", label: "GPT-4o" },
  { id: "google/gemini-2.0-flash-001", label: "Gemini 2.0 Flash" },
  { id: "meta-llama/llama-3.2-90b-vision-instruct", label: "Llama 3.2 90B Vision" },
];

export function Header({ onSearch, onLibraryChanged }: HeaderProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [profile, setProfile] = useState(getProfile);
  const [aiConfig, setAIConfig] = useState(getAIConfig);

  // BGG state
  const [bggUsername, setBggUsername] = useState("");
  const [bggPassword, setBggPassword] = useState("");
  const [importing, setImporting] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);
  const [bggError, setBggError] = useState("");

  // AI key state
  const [keyInput, setKeyInput] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<AIProvider>("anthropic");
  const [selectedModel, setSelectedModel] = useState(OPENROUTER_MODELS[0].id);

  // Add game search state
  const [addGameOpen, setAddGameOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<BGGGame[]>([]);
  const [searching, setSearching] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (settingsOpen) {
      const p = getProfile();
      const ai = getAIConfig();
      setProfile(p);
      setAIConfig(ai);
      setBggUsername(p.bggUsername ?? "");
      setKeyInput(ai.apiKey ?? "");
      setSelectedProvider(ai.provider ?? "anthropic");
      setSelectedModel(ai.model ?? OPENROUTER_MODELS[0].id);
      setBggError("");
    }
  }, [settingsOpen]);

  async function loginBGG() {
    if (!bggUsername.trim() || !bggPassword.trim()) return;
    setBggError("");
    setLoggingIn(true);
    try {
      const res = await fetch("/api/bgg/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: bggUsername.trim(), password: bggPassword.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const updated = saveProfile({
        bggUsername: bggUsername.trim(),
        bggLoggedIn: true,
        bggCookies: data.bggCookies,
      });
      setProfile(updated);
      setBggPassword("");
      toast.success("Logged in to BGG");
      await connectBGG(data.bggCookies);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Login failed";
      setBggError(msg);
    } finally {
      setLoggingIn(false);
    }
  }

  async function connectBGG(cookies?: string) {
    if (!bggUsername.trim()) return;
    setBggError("");
    setImporting(true);
    try {
      const p = getProfile();
      const bggCookies = cookies ?? p.bggCookies;
      const games = await bggFetchCollection(bggUsername.trim(), bggCookies);
      const { importBGGCollection } = await import("@/lib/store");
      importBGGCollection(games);
      const updated = saveProfile({ bggUsername: bggUsername.trim(), bggConnected: true });
      setProfile(updated);
      toast.success(`Imported ${games.length} games from BGG`);
      setSettingsOpen(false);
      onLibraryChanged?.();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to connect to BGG";
      setBggError(msg);
    } finally {
      setImporting(false);
    }
  }

  function saveKey() {
    const config = {
      provider: selectedProvider,
      apiKey: keyInput.trim(),
      model: selectedProvider === "openrouter" ? selectedModel : undefined,
    };
    saveAIConfig(config);
    setAIConfig(config);
    const updated = saveProfile({ aiProvider: selectedProvider, hasAIKey: !!keyInput.trim() });
    setProfile(updated);
    toast.success("AI settings saved");
  }

  function removeKey() {
    const config = { provider: selectedProvider, apiKey: "" };
    saveAIConfig(config);
    setAIConfig(config);
    setKeyInput("");
    const updated = saveProfile({ hasAIKey: false });
    setProfile(updated);
    toast.success("Key removed");
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
        toast.error("Search failed — BGG may be slow, try again");
      } finally {
        setSearching(false);
      }
    }, 600);
  }

  function addGame(game: BGGGame) {
    saveUserGame(game, { bggOwned: false });
    toast.success(`Added ${game.name}`);
    onLibraryChanged?.();
  }

  function closeAddGame() {
    setAddGameOpen(false);
    setSearchQuery("");
    setSearchResults([]);
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
              <TabsTrigger value="ai" className="flex-1">AI Provider</TabsTrigger>
            </TabsList>

            {/* BGG Tab */}
            <TabsContent value="bgg" className="space-y-3 mt-4">
              <p className="text-sm text-muted-foreground">
                Log in with your BGG account to import your collection (including private collections).
              </p>
              <Input
                placeholder="BGG username"
                value={bggUsername}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  setBggUsername(e.target.value);
                  setBggError("");
                }}
                disabled={importing || loggingIn}
              />
              <Input
                type="password"
                placeholder="BGG password"
                value={bggPassword}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  setBggPassword(e.target.value);
                  setBggError("");
                }}
                onKeyDown={(e: React.KeyboardEvent) => e.key === "Enter" && loginBGG()}
                disabled={importing || loggingIn}
              />
              <div className="flex gap-2">
                <Button
                  onClick={loginBGG}
                  disabled={loggingIn || importing || !bggUsername.trim() || !bggPassword.trim()}
                  className="flex-1"
                >
                  {loggingIn ? <Loader2 className="h-4 w-4 animate-spin" /> : "Log in & Import"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => connectBGG()}
                  disabled={importing || loggingIn || !bggUsername.trim()}
                >
                  {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : profile.bggConnected ? "Re-sync" : "Public only"}
                </Button>
              </div>

              {bggError && (
                <div className="flex gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-xs">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <div className="whitespace-pre-line">{bggError}</div>
                </div>
              )}

              {!bggError && profile.bggLoggedIn && (
                <p className="text-xs text-green-600">
                  ✓ Logged in as <strong>{profile.bggUsername}</strong>
                </p>
              )}
              {!bggError && !profile.bggLoggedIn && profile.bggConnected && (
                <p className="text-xs text-green-600">
                  ✓ Connected as <strong>{profile.bggUsername}</strong> (public collection only)
                </p>
              )}

              <div className="text-xs text-muted-foreground pt-1 border-t">
                <p>Log in to access private collections. Or use &quot;Public only&quot; if your collection is public.</p>
              </div>
            </TabsContent>

            {/* AI Provider Tab */}
            <TabsContent value="ai" className="space-y-4 mt-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Provider</label>
                <Select
                  value={selectedProvider}
                  onValueChange={(v: string | null) => setSelectedProvider((v ?? "anthropic") as AIProvider)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="anthropic">
                      Anthropic (Claude)
                    </SelectItem>
                    <SelectItem value="openrouter">
                      OpenRouter (Multi-model)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {selectedProvider === "openrouter" && (
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Model</label>
                  <Select
                    value={selectedModel}
                    onValueChange={(v: string | null) => setSelectedModel(v ?? OPENROUTER_MODELS[0].id)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {OPENROUTER_MODELS.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div>
                <label className="text-sm font-medium mb-1.5 block">
                  {selectedProvider === "anthropic" ? "Anthropic API Key" : "OpenRouter API Key"}
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      type={showKey ? "text" : "password"}
                      placeholder={selectedProvider === "anthropic" ? "sk-ant-..." : "sk-or-..."}
                      value={keyInput}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setKeyInput(e.target.value)}
                      onKeyDown={(e: React.KeyboardEvent) => e.key === "Enter" && saveKey()}
                      className="pr-9"
                    />
                    <button
                      type="button"
                      onClick={() => setShowKey(!showKey)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <Button onClick={saveKey}>Save</Button>
                  {profile.hasAIKey && (
                    <Button variant="ghost" size="icon" onClick={removeKey}>
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                {profile.hasAIKey && aiConfig.provider && (
                  <p className="text-xs text-green-600 mt-1.5">
                    ✓ {aiConfig.provider === "anthropic" ? "Anthropic" : "OpenRouter"} key set
                    {aiConfig.model ? ` · ${aiConfig.model.split("/").pop()}` : ""}
                  </p>
                )}
              </div>

              <p className="text-xs text-muted-foreground">
                {selectedProvider === "anthropic" ? (
                  <>Get your key at{" "}<a href="https://console.anthropic.com" target="_blank" rel="noopener noreferrer" className="underline">console.anthropic.com</a></>
                ) : (
                  <>Get your key at{" "}<a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer" className="underline">openrouter.ai/keys</a>. Supports Claude, GPT-4o, Gemini, Llama and more.</>
                )}
              </p>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Add Game Dialog */}
      <Dialog open={addGameOpen} onOpenChange={(open) => { if (!open) closeAddGame(); else setAddGameOpen(true); }}>
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
                    onClick={() => { addGame(game); closeAddGame(); }}
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
