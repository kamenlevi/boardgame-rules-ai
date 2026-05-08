"use client";

import { Rule, RuleCategory } from "@/types";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { cn } from "@/lib/utils";

const CATEGORY_COLORS: Record<RuleCategory, string> = {
  setup: "bg-blue-100 text-blue-800",
  gameplay: "bg-green-100 text-green-800",
  winning: "bg-yellow-100 text-yellow-800",
  special: "bg-purple-100 text-purple-800",
  components: "bg-gray-100 text-gray-800",
  other: "bg-slate-100 text-slate-800",
};

interface RulesListProps {
  rules: Rule[];
}

export function RulesList({ rules }: RulesListProps) {
  const [activeCategory, setActiveCategory] = useState<RuleCategory | "all">("all");

  const categories = Array.from(new Set(rules.map((r) => r.category)));
  const filtered = activeCategory === "all" ? rules : rules.filter((r) => r.category === activeCategory);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setActiveCategory("all")}
          className={cn(
            "text-xs px-2 py-1 rounded-full border transition-colors",
            activeCategory === "all" ? "bg-primary text-primary-foreground border-primary" : "border-muted-foreground/30 hover:border-primary"
          )}
        >
          All ({rules.length})
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={cn(
              "text-xs px-2 py-1 rounded-full border transition-colors capitalize",
              activeCategory === cat ? "bg-primary text-primary-foreground border-primary" : "border-muted-foreground/30 hover:border-primary"
            )}
          >
            {cat} ({rules.filter((r) => r.category === cat).length})
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map((rule) => (
          <div key={rule.id} className="border rounded-lg p-4">
            <div className="flex items-start gap-2 mb-2">
              <p className="font-medium text-sm flex-1">{rule.title}</p>
              <Badge
                className={cn("text-[10px] py-0 capitalize shrink-0", CATEGORY_COLORS[rule.category])}
                variant="secondary"
              >
                {rule.category}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">{rule.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
