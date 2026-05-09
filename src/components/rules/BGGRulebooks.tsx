"use client";

import { useEffect, useState } from "react";
import { FileText, Download, Loader2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BGGFile {
  id: string;
  name: string;
  url: string;
  size: number;
  filetype: string;
}

interface BGGRulebooksProps {
  gameId: string;
}

export function BGGRulebooks({ gameId }: BGGRulebooksProps) {
  const [files, setFiles] = useState<BGGFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchFiles() {
      try {
        const res = await fetch(`/api/bgg/files?gameId=${encodeURIComponent(gameId)}`);
        if (!res.ok) {
          setError("Could not fetch rulebooks from BGG");
          return;
        }
        const data = await res.json();
        setFiles(data.files ?? []);
      } catch {
        setError("Failed to load BGG rulebooks");
      } finally {
        setLoading(false);
      }
    }
    fetchFiles();
  }, [gameId]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
        <Loader2 className="h-4 w-4 animate-spin" />
        Checking BGG for rulebooks...
      </div>
    );
  }

  if (error) {
    return <p className="text-sm text-muted-foreground py-2">{error}</p>;
  }

  if (files.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-2">
        No rulebooks found on BGG for this game.
      </p>
    );
  }

  function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">
        Rulebooks available on BoardGameGeek:
      </p>
      <div className="space-y-1">
        {files.map((file) => (
          <a
            key={file.id}
            href={file.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted transition-colors group"
          >
            <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{file.name}</p>
              {file.size > 0 && (
                <p className="text-xs text-muted-foreground">{formatSize(file.size)}</p>
              )}
            </div>
            <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
          </a>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Download a rulebook PDF, then upload its pages above to extract rules with AI.
      </p>
    </div>
  );
}
