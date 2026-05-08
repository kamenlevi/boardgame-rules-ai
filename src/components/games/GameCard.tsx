"use client";

import Image from "next/image";
import Link from "next/link";
import { Heart, Clock, Users, Star } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UserGame } from "@/types";
import { toggleFavorite } from "@/lib/store";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface GameCardProps {
  userGame: UserGame;
  onFavoriteToggle?: () => void;
}

export function GameCard({ userGame, onFavoriteToggle }: GameCardProps) {
  const { game } = userGame;
  const [isFav, setIsFav] = useState(userGame.isFavorite);

  function handleFavorite(e: React.MouseEvent) {
    e.preventDefault();
    const newVal = toggleFavorite(game.id);
    setIsFav(newVal);
    onFavoriteToggle?.();
  }

  const playtime =
    game.minPlaytime === game.maxPlaytime
      ? `${game.minPlaytime}m`
      : `${game.minPlaytime}–${game.maxPlaytime}m`;

  const players =
    game.minPlayers === game.maxPlayers
      ? `${game.minPlayers}`
      : `${game.minPlayers}–${game.maxPlayers}`;

  return (
    <Link href={`/game/${game.id}`}>
      <Card className="group hover:shadow-md transition-shadow cursor-pointer h-full">
        <div className="relative aspect-square overflow-hidden rounded-t-lg bg-muted">
          {game.thumbnail ? (
            <Image
              src={game.thumbnail}
              alt={game.name}
              fill
              className="object-cover group-hover:scale-105 transition-transform"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
              No image
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-1 right-1 bg-background/80 hover:bg-background h-7 w-7"
            onClick={handleFavorite}
          >
            <Heart
              className={cn("h-4 w-4", isFav ? "fill-red-500 text-red-500" : "text-muted-foreground")}
            />
          </Button>
          {userGame.hasUploadedRulebook && (
            <Badge className="absolute bottom-1 left-1 text-[10px] py-0">
              Rules
            </Badge>
          )}
        </div>
        <CardContent className="p-3">
          <p className="font-medium text-sm line-clamp-2 mb-2">{game.name}</p>
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {players}
            </span>
            {game.minPlaytime > 0 && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {playtime}
              </span>
            )}
            {game.rating > 0 && (
              <span className="flex items-center gap-1 ml-auto">
                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                {game.rating.toFixed(1)}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
