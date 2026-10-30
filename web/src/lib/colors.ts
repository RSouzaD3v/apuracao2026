import { scaleLinear } from "d3-scale"
import type { Nivel } from "./types"

// Cores dos candidatos (pedido do projeto): vermelho = Lula, azul = Flávio
export const LULA = "#dc2626"
export const FLAVIO = "#2563eb"
export const NEUTRO = "#e5e5e5"

// Status da conferência usa outra família de cor para nunca ser confundido com candidato
export const NIVEL_COR: Record<Nivel, string> = { ok: "#059669", atencao: "#d97706", fora: "#7c3aed" }
export const NIVEL_LABEL: Record<Nivel, string> = { ok: "Verificado", atencao: "Atenção", fora: "Fora do padrão" }

/** Cor por % de Lula entre os dois (0.5 = empate). */
export const corDisputa = scaleLinear<string>()
  .domain([0.2, 0.42, 0.5, 0.58, 0.8])
  .range(["#1e3a8a", "#60a5fa", "#f5f5f4", "#f87171", "#7f1d1d"])
  .clamp(true)

/** Cor para uma diferença com sinal (positivo = a favor de Lula). */
export const corDiferenca = (escala: number) =>
  scaleLinear<string>()
    .domain([-escala, -escala / 3, 0, escala / 3, escala])
    .range(["#1e3a8a", "#93c5fd", "#f5f5f4", "#fca5a5", "#7f1d1d"])
    .clamp(true)
