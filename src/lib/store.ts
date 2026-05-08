// Client-side store using localStorage for demo (replace with Supabase in production)
import { UserGame, BGGGame, Rule, UploadedPage, UserProfile, AIConfig, AIProvider } from "@/types";

const KEYS = {
  profile: "bga_profile",
  games: "bga_games",
  aiConfig: "bga_ai_config",
};

export function getProfile(): UserProfile {
  if (typeof window === "undefined") return { id: "local", bggConnected: false };
  const raw = localStorage.getItem(KEYS.profile);
  return raw ? JSON.parse(raw) : { id: "local", bggConnected: false };
}

export function saveProfile(profile: Partial<UserProfile>) {
  const current = getProfile();
  const updated = { ...current, ...profile };
  localStorage.setItem(KEYS.profile, JSON.stringify(updated));
  return updated;
}

export function getUserGames(): UserGame[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(KEYS.games);
  return raw ? JSON.parse(raw) : [];
}

export function saveUserGame(game: BGGGame, opts: { bggOwned?: boolean } = {}): UserGame {
  const games = getUserGames();
  const existing = games.find((g) => g.bggId === game.id);
  if (existing) return existing;

  const userGame: UserGame = {
    id: `ug-${Date.now()}`,
    bggId: game.id,
    userId: "local",
    isFavorite: false,
    hasUploadedRulebook: false,
    uploadedPages: [],
    extractedRules: [],
    game,
    bggOwned: opts.bggOwned ?? false,
  };
  games.push(userGame);
  localStorage.setItem(KEYS.games, JSON.stringify(games));
  return userGame;
}

export function toggleFavorite(bggId: string): boolean {
  const games = getUserGames();
  const idx = games.findIndex((g) => g.bggId === bggId);
  if (idx === -1) return false;
  games[idx].isFavorite = !games[idx].isFavorite;
  localStorage.setItem(KEYS.games, JSON.stringify(games));
  return games[idx].isFavorite;
}

export function addUploadedPages(bggId: string, pages: UploadedPage[]) {
  const games = getUserGames();
  const idx = games.findIndex((g) => g.bggId === bggId);
  if (idx === -1) return;
  games[idx].uploadedPages = [...games[idx].uploadedPages, ...pages];
  games[idx].hasUploadedRulebook = true;
  localStorage.setItem(KEYS.games, JSON.stringify(games));
}

export function saveExtractedRules(bggId: string, rules: Rule[]) {
  const games = getUserGames();
  const idx = games.findIndex((g) => g.bggId === bggId);
  if (idx === -1) return;
  games[idx].extractedRules = rules;
  localStorage.setItem(KEYS.games, JSON.stringify(games));
}

export function getAIConfig(): AIConfig {
  if (typeof window === "undefined") return { provider: "anthropic", apiKey: "" };
  const raw = localStorage.getItem(KEYS.aiConfig);
  return raw ? JSON.parse(raw) : { provider: "anthropic", apiKey: "" };
}

export function saveAIConfig(config: AIConfig) {
  localStorage.setItem(KEYS.aiConfig, JSON.stringify(config));
}

export function importBGGCollection(bggGames: BGGGame[]) {
  const games = getUserGames();
  const existingIds = new Set(games.map((g) => g.bggId));

  for (const game of bggGames) {
    if (!existingIds.has(game.id)) {
      games.push({
        id: `ug-${Date.now()}-${game.id}`,
        bggId: game.id,
        userId: "local",
        isFavorite: false,
        hasUploadedRulebook: false,
        uploadedPages: [],
        extractedRules: [],
        game,
        bggOwned: true,
      });
    }
  }
  localStorage.setItem(KEYS.games, JSON.stringify(games));
}
