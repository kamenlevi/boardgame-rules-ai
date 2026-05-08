"use client";

import { use, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Clock, Users, Star, Heart, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RulesUploader } from "@/components/rules/RulesUploader";
import { RulesList } from "@/components/rules/RulesList";
import { RulesQA } from "@/components/rules/RulesQA";
import { getUserGames, saveUserGame, toggleFavorite, saveExtractedRules } from "@/lib/store";
import { UserGame, Rule } from "@/types";
import { bggFetchGame } from "@/lib/bgg-client";
import { cn } from "@/lib/utils";

export default function GamePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [userGame, setUserGame] = useState<UserGame | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFav, setIsFav] = useState(false);

  useEffect(() => {
    async function load() {
      const games = getUserGames();
      let ug = games.find((g) => g.bggId === id) ?? null;

      if (!ug) {
        // Fetch from BGG and save locally
        try {
          const game = await bggFetchGame(id);
          ug = saveUserGame(game);
        } catch {
          setLoading(false);
          return;
        }
      }

      setUserGame(ug);
      setIsFav(ug.isFavorite);
      setLoading(false);
    }
    load();
  }, [id]);

  function handleFavorite() {
    const newVal = toggleFavorite(id);
    setIsFav(newVal);
  }

  function handleRulesExtracted(rules: Rule[]) {
    saveExtractedRules(id, rules);
    setUserGame((prev) =>
      prev ? { ...prev, extractedRules: rules, hasUploadedRulebook: true } : prev
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!userGame) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Game not found</p>
        <Link href="/"><Button variant="outline">Back to library</Button></Link>
      </div>
    );
  }

  const { game } = userGame;
  const playtime =
    game.minPlaytime === game.maxPlaytime
      ? `${game.minPlaytime} min`
      : `${game.minPlaytime}–${game.maxPlaytime} min`;
  const players =
    game.minPlayers === game.maxPlayers
      ? `${game.minPlayers} players`
      : `${game.minPlayers}–${game.maxPlayers} players`;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="font-semibold truncate flex-1">{game.name}</h1>
          <Button variant="ghost" size="icon" onClick={handleFavorite}>
            <Heart
              className={cn("h-4 w-4", isFav ? "fill-red-500 text-red-500" : "text-muted-foreground")}
            />
          </Button>
          <a
            href={`https://boardgamegeek.com/boardgame/${game.id}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="ghost" size="icon">
              <ExternalLink className="h-4 w-4" />
            </Button>
          </a>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-8">
          {/* Sidebar */}
          <div className="space-y-4">
            {game.image && (
              <div className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                <Image src={game.image} alt={game.name} fill className="object-cover" />
              </div>
            )}

            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Users className="h-4 w-4" />
                <span>{players}</span>
              </div>
              {game.minPlaytime > 0 && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>{playtime}</span>
                </div>
              )}
              {game.rating > 0 && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <span>{game.rating.toFixed(1)} / 10</span>
                </div>
              )}
              {game.weight > 0 && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span className="text-xs">Complexity:</span>
                  <span>{game.weight.toFixed(1)} / 5</span>
                </div>
              )}
              {game.yearPublished > 0 && (
                <div className="text-muted-foreground">{game.yearPublished}</div>
              )}
            </div>

            {game.categories.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {game.categories.slice(0, 5).map((c) => (
                  <Badge key={c} variant="secondary" className="text-xs">
                    {c}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Main content */}
          <div>
            <Tabs defaultValue={userGame.extractedRules.length > 0 ? "rules" : "upload"}>
              <TabsList className="mb-4">
                <TabsTrigger value="upload">Upload Pages</TabsTrigger>
                <TabsTrigger value="rules" disabled={userGame.extractedRules.length === 0}>
                  Rules ({userGame.extractedRules.length})
                </TabsTrigger>
                <TabsTrigger value="ask" disabled={userGame.extractedRules.length === 0}>
                  Ask Rules
                </TabsTrigger>
              </TabsList>

              <TabsContent value="upload">
                <div className="max-w-xl">
                  <p className="text-sm text-muted-foreground mb-4">
                    Upload photos or scans of specific rulebook pages. Claude will read every page
                    and extract all rules precisely.
                  </p>
                  <RulesUploader gameName={game.name} onRulesExtracted={handleRulesExtracted} />
                </div>
              </TabsContent>

              <TabsContent value="rules">
                {userGame.extractedRules.length > 0 ? (
                  <RulesList rules={userGame.extractedRules} />
                ) : (
                  <p className="text-muted-foreground text-sm">
                    Upload rulebook pages to extract rules.
                  </p>
                )}
              </TabsContent>

              <TabsContent value="ask" className="h-[500px] flex flex-col">
                <RulesQA rules={userGame.extractedRules} gameName={game.name} />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>
    </div>
  );
}
