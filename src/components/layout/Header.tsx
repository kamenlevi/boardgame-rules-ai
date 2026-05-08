"use client";

import { useState } from "react";
import { BookOpen, Settings, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getProfile, saveProfile } from "@/lib/store";
import { toast } from "sonner";

interface HeaderProps {
  onSearch?: (query: string) => void;
  onCollectionImported?: () => void;
}

export function Header({ onSearch, onCollectionImported }: HeaderProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [bggUsername, setBggUsername] = useState(() => getProfile().bggUsername ?? "");
  const [importing, setImporting] = useState(false);

  async function connectBGG() {
    if (!bggUsername.trim()) return;
    setImporting(true);
    try {
      const res = await fetch(`/api/bgg/collection?username=${encodeURIComponent(bggUsername)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const { importBGGCollection } = await import("@/lib/store");
      importBGGCollection(data.games);
      saveProfile({ bggUsername, bggConnected: true });
      toast.success(`Imported ${data.games.length} games from BGG`);
      setSettingsOpen(false);
      onCollectionImported?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to connect BGG");
    } finally {
      setImporting(false);
    }
  }

  const profile = getProfile();

  return (
    <>
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto flex items-center gap-4 px-4 py-3">
          <div className="flex items-center gap-2 font-bold text-lg mr-4">
            <BookOpen className="h-5 w-5 text-primary" />
            <span>RulebookAI</span>
          </div>

          <div className="flex-1 max-w-md relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search games..."
              className="pl-9"
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => onSearch?.(e.target.value)}
            />
          </div>

          <div className="ml-auto flex items-center gap-2">
            {profile.bggConnected && (
              <span className="text-sm text-muted-foreground">
                BGG: <span className="font-medium text-foreground">{profile.bggUsername}</span>
              </span>
            )}
            <Button variant="ghost" size="icon" onClick={() => setSettingsOpen(true)}>
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Settings</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium mb-2">BoardGameGeek Account</h3>
              <p className="text-xs text-muted-foreground mb-3">
                Enter your BGG username to import your collection and sync game data.
              </p>
              <div className="flex gap-2">
                <Input
                  placeholder="BGG username"
                  value={bggUsername}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBggUsername(e.target.value)}
                  onKeyDown={(e: React.KeyboardEvent) => e.key === "Enter" && connectBGG()}
                />
                <Button onClick={connectBGG} disabled={importing || !bggUsername.trim()}>
                  {importing ? "Importing..." : profile.bggConnected ? "Re-sync" : "Connect"}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
