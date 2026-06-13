/**
 * Board color themes — ported from the chess-game project (lib/chess-themes.ts).
 * "classic" is the default; the user picks a theme in Settings.
 */
export interface BoardTheme {
  id: string;
  name: string;
  lightSquare: string;
  darkSquare: string;
  selectedLight: string;
  selectedDark: string;
  lastMoveLight: string;
  lastMoveDark: string;
}

export const BOARD_THEMES: BoardTheme[] = [
  { id: "classic", name: "Classique", lightSquare: "#ebecd0", darkSquare: "#739552", selectedLight: "#f6f669", selectedDark: "#baca44", lastMoveLight: "#cdd26a", lastMoveDark: "#aaa23a" },
  { id: "brown", name: "Bois", lightSquare: "#f0d9b5", darkSquare: "#b58863", selectedLight: "#f6f669", selectedDark: "#baca44", lastMoveLight: "#cdd26a", lastMoveDark: "#aaa23a" },
  { id: "blue", name: "Océan", lightSquare: "#dee3e6", darkSquare: "#8ca2ad", selectedLight: "#aae7ff", selectedDark: "#6fb3d2", lastMoveLight: "#9cc9d4", lastMoveDark: "#6d97a8" },
  { id: "green", name: "Forêt", lightSquare: "#ffffdd", darkSquare: "#86a666", selectedLight: "#f6f669", selectedDark: "#9bb05c", lastMoveLight: "#d0e080", lastMoveDark: "#7a9350" },
  { id: "purple", name: "Améthyste", lightSquare: "#e8e7f2", darkSquare: "#9f90b0", selectedLight: "#d4c4e8", selectedDark: "#8c7b9c", lastMoveLight: "#c7b5db", lastMoveDark: "#7d6d8a" },
  { id: "grey", name: "Minimaliste", lightSquare: "#ffffff", darkSquare: "#b0b0b0", selectedLight: "#e8e8e8", selectedDark: "#999999", lastMoveLight: "#d0d0d0", lastMoveDark: "#909090" },
  { id: "charcoal", name: "Charbon", lightSquare: "#b8b8b8", darkSquare: "#5a5a5a", selectedLight: "#d0d0d0", selectedDark: "#707070", lastMoveLight: "#c0c0c0", lastMoveDark: "#656565" },
  { id: "slate", name: "Ardoise", lightSquare: "#cfd8dc", darkSquare: "#607d8b", selectedLight: "#e0e7eb", selectedDark: "#708d9b", lastMoveLight: "#bfc8cc", lastMoveDark: "#506d7b" },
  { id: "wood-dark", name: "Acajou", lightSquare: "#deb887", darkSquare: "#8b4513", selectedLight: "#f4d7a8", selectedDark: "#a0542a", lastMoveLight: "#e5c898", lastMoveDark: "#904a1a" },
  { id: "tournament", name: "Tournoi", lightSquare: "#f3f3f3", darkSquare: "#4a90e2", selectedLight: "#e8e8e8", selectedDark: "#3a80d2", lastMoveLight: "#dadada", lastMoveDark: "#2f70c2" },
  { id: "marble", name: "Marbre", lightSquare: "#f5f5f0", darkSquare: "#7d8796", selectedLight: "#ebebd8", selectedDark: "#6d7786", lastMoveLight: "#dcdcc8", lastMoveDark: "#5d6776" },
  { id: "emerald", name: "Émeraude", lightSquare: "#d0e9da", darkSquare: "#4a9d6f", selectedLight: "#e0f3e7", selectedDark: "#5aad7f", lastMoveLight: "#c0dcc8", lastMoveDark: "#3a8d5f" },
];

export function getBoardTheme(id: string): BoardTheme {
  return BOARD_THEMES.find((t) => t.id === id) ?? BOARD_THEMES[0];
}
