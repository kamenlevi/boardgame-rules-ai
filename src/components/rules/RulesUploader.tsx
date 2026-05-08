"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Rule } from "@/types";
import { toast } from "sonner";
import { aiHeaders } from "@/lib/ai-headers";
import Image from "next/image";

interface RulesUploaderProps {
  gameName: string;
  onRulesExtracted: (rules: Rule[]) => void;
}

export function RulesUploader({ gameName, onRulesExtracted }: RulesUploaderProps) {
  const [images, setImages] = useState<string[]>([]);
  const [extracting, setExtracting] = useState(false);

  const onDrop = useCallback((files: File[]) => {
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        setImages((prev) => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [] },
    maxFiles: 10,
  });

  function removeImage(idx: number) {
    setImages((prev) => prev.filter((_, i) => i !== idx));
  }

  async function extractRules() {
    if (!images.length) return;
    setExtracting(true);
    try {
      const res = await fetch("/api/rules/extract", {
        method: "POST",
        headers: aiHeaders(),
        body: JSON.stringify({ imageDataUrls: images, gameName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`Extracted ${data.rules.length} rules`);
      onRulesExtracted(data.rules);
      setImages([]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Extraction failed");
    } finally {
      setExtracting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/30 hover:border-primary/50"
        }`}
      >
        <input {...getInputProps()} />
        <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          {isDragActive
            ? "Drop rulebook pages here"
            : "Drag rulebook pages here, or click to select (up to 10 images)"}
        </p>
      </div>

      {images.length > 0 && (
        <>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            {images.map((src, idx) => (
              <div key={idx} className="relative aspect-[3/4] rounded overflow-hidden bg-muted group">
                <Image src={src} alt={`Page ${idx + 1}`} fill className="object-cover" />
                <button
                  onClick={() => removeImage(idx)}
                  className="absolute top-1 right-1 bg-background/80 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-3 w-3" />
                </button>
                <span className="absolute bottom-1 left-1 text-[10px] bg-background/80 px-1 rounded">
                  {idx + 1}
                </span>
              </div>
            ))}
          </div>

          <Button onClick={extractRules} disabled={extracting} className="w-full">
            {extracting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Extracting rules...
              </>
            ) : (
              `Extract rules from ${images.length} page${images.length !== 1 ? "s" : ""}`
            )}
          </Button>
        </>
      )}
    </div>
  );
}
