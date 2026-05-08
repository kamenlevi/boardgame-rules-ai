"use client";

import { GameFilters } from "@/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface GameFiltersProps {
  filters: GameFilters;
  onChange: (filters: GameFilters) => void;
}

export function GameFiltersBar({ filters, onChange }: GameFiltersProps) {
  function update(patch: Partial<GameFilters>) {
    onChange({ ...filters, ...patch });
  }

  const hasFilters = Object.values(filters).some((v) => v !== undefined && v !== "");

  return (
    <div className="flex flex-wrap gap-2 items-center">
      <Select
        value={filters.minPlayers?.toString() ?? "any"}
        onValueChange={(v: string | null) => update({ minPlayers: !v || v === "any" ? undefined : parseInt(v) })}
      >
        <SelectTrigger className="w-32 h-8 text-xs">
          <SelectValue placeholder="Players" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="any">Any players</SelectItem>
          <SelectItem value="1">1+ players</SelectItem>
          <SelectItem value="2">2+ players</SelectItem>
          <SelectItem value="3">3+ players</SelectItem>
          <SelectItem value="4">4+ players</SelectItem>
          <SelectItem value="5">5+ players</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={filters.maxPlaytime?.toString() ?? "any"}
        onValueChange={(v: string | null) => update({ maxPlaytime: !v || v === "any" ? undefined : parseInt(v) })}
      >
        <SelectTrigger className="w-36 h-8 text-xs">
          <SelectValue placeholder="Playtime" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="any">Any length</SelectItem>
          <SelectItem value="30">Under 30m</SelectItem>
          <SelectItem value="60">Under 1h</SelectItem>
          <SelectItem value="90">Under 90m</SelectItem>
          <SelectItem value="120">Under 2h</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={filters.maxWeight?.toString() ?? "any"}
        onValueChange={(v: string | null) => update({ maxWeight: !v || v === "any" ? undefined : parseFloat(v) })}
      >
        <SelectTrigger className="w-36 h-8 text-xs">
          <SelectValue placeholder="Complexity" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="any">Any complexity</SelectItem>
          <SelectItem value="2">Light (≤2)</SelectItem>
          <SelectItem value="3">Medium (≤3)</SelectItem>
          <SelectItem value="4">Heavy (≤4)</SelectItem>
        </SelectContent>
      </Select>

      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-xs"
          onClick={() => onChange({})}
        >
          <X className="h-3 w-3 mr-1" />
          Clear
        </Button>
      )}
    </div>
  );
}
