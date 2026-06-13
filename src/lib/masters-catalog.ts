import catalog from "./masters/catalog.json";
import type { MasterGame } from "./types";

/** The bundled, build-time-validated iconic games (see scripts/build-masters.mjs). */
export const MASTER_GAMES = catalog as unknown as MasterGame[];

export function getMasterGame(id: string): MasterGame | undefined {
  return MASTER_GAMES.find((g) => g.id === id);
}
