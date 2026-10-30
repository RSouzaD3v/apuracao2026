import { useId } from "react"
import { cn } from "@/lib/utils"

/** Cores oficiais da bandeira (Lei 5.700/1971, valores usuais em RGB). Usadas só na identidade do site, nunca para candidato. */
export const BRASIL = { verde: "#009c3b", amarelo: "#ffdf00", azul: "#002776" }

// Estrelas do círculo (posição aproximada, proporção 10:7). Só para dar a textura da bandeira no tamanho de logo.
const ESTRELAS: [number, number, number][] = [
  [41, 44, 1], [45, 48, 0.8], [50, 46, 1.1], [55, 48.5, 0.8], [59, 44.5, 1], [47, 41.5, 0.7], [54, 41, 0.7],
  [44, 38.5, 0.6], [57, 37.5, 0.6], [50, 51.5, 0.9], [62, 40, 0.6], [39, 40, 0.6], [53.5, 26.5, 0.8],
]

/** Bandeira do Brasil em SVG, desenhada no próprio site (sem imagem externa). */
export function BandeiraBrasil({ className, titulo = "Bandeira do Brasil" }: { className?: string; titulo?: string }) {
  const id = useId().replace(/:/g, "")
  return (
    <svg
      viewBox="0 0 100 70"
      {...(titulo ? { role: "img", "aria-label": titulo } : { "aria-hidden": true })}
      className={cn("h-5 w-auto shrink-0", className)}
    >
      {titulo && <title>{titulo}</title>}
      <defs>
        <clipPath id={`${id}-borda`}>
          <rect width="100" height="70" rx="7" />
        </clipPath>
        <clipPath id={`${id}-esfera`}>
          <circle cx="50" cy="35" r="17.5" />
        </clipPath>
        <linearGradient id={`${id}-brilho`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.22" />
          <stop offset="0.55" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.12" />
        </linearGradient>
      </defs>
      <g clipPath={`url(#${id}-borda)`}>
        <rect width="100" height="70" fill={BRASIL.verde} />
        <polygon points="8.5,35 50,6 91.5,35 50,64" fill={BRASIL.amarelo} />
        <circle cx="50" cy="35" r="17.5" fill={BRASIL.azul} />
        <g clipPath={`url(#${id}-esfera)`}>
          <path d="M28 33.2 Q50 23.5 72 37.8 L72 41.6 Q50 27.6 28 37 Z" fill="#fff" />
          {ESTRELAS.map(([x, y, r]) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r={r} fill="#fff" />
          ))}
        </g>
        <rect width="100" height="70" fill={`url(#${id}-brilho)`} />
      </g>
      <rect x="0.5" y="0.5" width="99" height="69" rx="6.5" fill="none" stroke="#000" strokeOpacity="0.12" />
    </svg>
  )
}

/** Faixa fina verde-amarela-azul, usada no topo do cabeçalho. */
export function FaixaBrasil({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("h-1 w-full", className)}
      style={{ background: `linear-gradient(90deg, ${BRASIL.verde} 0 45%, ${BRASIL.amarelo} 45% 72%, ${BRASIL.azul} 72% 100%)` }}
    />
  )
}

/** Selo "Brasil" com a bandeira, para títulos e rodapé. */
export function SeloBrasil({ texto = "Brasil", className }: { texto?: string; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border bg-background px-2.5 py-0.5 text-xs font-medium text-foreground", className)}>
      <BandeiraBrasil className="h-3" titulo="" />
      {texto}
    </span>
  )
}
