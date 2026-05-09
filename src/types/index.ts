export interface BGGGame {
  id: string;
  name: string;
  thumbnail: string;
  image: string;
  minPlayers: number;
  maxPlayers: number;
  minPlaytime: number;
  maxPlaytime: number;
  minAge: number;
  yearPublished: number;
  rating: number;
  weight: number; // complexity 1-5
  categories: string[];
  mechanics: string[];
  description: string;
  rulebookUrl?: string;
}

export interface UserGame {
  id: string;
  bggId: string;
  userId: string;
  isFavorite: boolean;
  hasUploadedRulebook: boolean;
  uploadedPages: UploadedPage[];
  extractedRules: Rule[];
  game: BGGGame;
  bggOwned: boolean;
}

export interface UploadedPage {
  id: string;
  imageUrl: string;
  pageNumber?: number;
  uploadedAt: string;
}

export interface Rule {
  id: string;
  title: string;
  content: string;
  category: RuleCategory;
  pageReference?: string;
}

export type RuleCategory =
  | "setup"
  | "gameplay"
  | "winning"
  | "special"
  | "components"
  | "other";

export type AIProvider = "anthropic" | "openrouter";

export interface AIConfig {
  provider: AIProvider;
  apiKey: string;
  model?: string; // optional custom model for OpenRouter
}

export interface UserProfile {
  id: string;
  email?: string;
  bggUsername?: string;
  bggConnected: boolean;
  bggLoggedIn?: boolean;
  bggCookies?: string;
  aiProvider?: AIProvider;
  hasAIKey?: boolean;
}

export interface GameFilters {
  minPlayers?: number;
  maxPlayers?: number;
  minPlaytime?: number;
  maxPlaytime?: number;
  maxWeight?: number;
  category?: string;
  search?: string;
}

export type LibraryTab =
  | "all"
  | "my-collection"
  | "my-uploads"
  | "favorites";
