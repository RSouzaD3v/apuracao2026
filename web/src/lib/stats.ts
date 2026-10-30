import dados from "../../public/data/stats.json"
import type { Stats } from "./types"

/**
 * Fonte única dos números que aparecem em mais de uma página (gerada por pipeline/03_build.py).
 * Importado direto (e não lido do disco) para servir também aos componentes de cliente.
 */
export const stats = dados as Stats

/** Rótulo do corte das seções tardias no formato "HHhMM". A regra em si está em pipeline/regras.py. */
export const TARDIA = stats.tardias.rotulo.replace(":", "h")
