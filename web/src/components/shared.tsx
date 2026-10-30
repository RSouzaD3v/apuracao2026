import { CircleAlert, CircleCheck, TriangleAlert } from "lucide-react"
import { cn } from "@/lib/utils"
import { FLAVIO, LULA, NIVEL_COR, NIVEL_LABEL } from "@/lib/colors"
import { fmt, pct } from "@/lib/format"
import type { Check, Nivel } from "@/lib/types"
import { AUTORIA } from "@/lib/autoria"

const ICONE = { ok: CircleCheck, atencao: TriangleAlert, fora: CircleAlert }

export function NivelBadge({ nivel, className }: { nivel: Nivel; className?: string }) {
  const Icon = ICONE[nivel]
  return (
    <span
      className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap", className)}
      style={{ color: NIVEL_COR[nivel], borderColor: `${NIVEL_COR[nivel]}55`, background: `${NIVEL_COR[nivel]}12` }}
    >
      <Icon className="size-3.5" />
      {NIVEL_LABEL[nivel]}
    </span>
  )
}

export function CheckItem({ c }: { c: Check }) {
  const Icon = ICONE[c.nivel]
  return (
    <div className="flex gap-3 rounded-lg border bg-background p-4">
      <Icon className="mt-0.5 size-5 shrink-0" style={{ color: NIVEL_COR[c.nivel] }} />
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium">{c.titulo}</span>
          <NivelBadge nivel={c.nivel} />
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">{c.texto}</p>
      </div>
    </div>
  )
}

/** Barra horizontal Lula × Flávio */
export function DuelBar({ lula, flavio, className, showLabels = true }: { lula: number; flavio: number; className?: string; showLabels?: boolean }) {
  const t = lula + flavio || 1
  const pl = lula / t
  return (
    <div className={cn("space-y-1.5", className)}>
      {showLabels && (
        <div className="flex justify-between text-sm">
          <span className="font-medium" style={{ color: LULA }}>
            Lula {pct(pl, 2)}
          </span>
          <span className="font-medium" style={{ color: FLAVIO }}>
            {pct(1 - pl, 2)} Flávio
          </span>
        </div>
      )}
      <div className="relative flex h-3 overflow-hidden rounded-full">
        <div style={{ width: `${pl * 100}%`, background: LULA }} />
        <div style={{ width: `${(1 - pl) * 100}%`, background: FLAVIO }} />
        <div className="absolute inset-y-0 left-1/2 w-px bg-background/80" />
      </div>
      {showLabels && (
        <div className="flex justify-between text-xs text-muted-foreground tabular-nums">
          <span>{fmt(lula)}</span>
          <span>{fmt(flavio)}</span>
        </div>
      )}
    </div>
  )
}

export function Kpi({ label, value, sub, color }: { label: string; value: React.ReactNode; sub?: React.ReactNode; color?: string }) {
  return (
    <div className="rounded-xl border bg-background p-4">
      <div className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums" style={color ? { color } : undefined}>
        {value}
      </div>
      {sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
    </div>
  )
}

export function PageHeader({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="mb-6 space-y-2">
      <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{title}</h1>
      {children && <div className="max-w-3xl text-muted-foreground">{children}</div>}
    </div>
  )
}

/** Links das fontes oficiais, usados no rodapé e na metodologia. */
export const FONTES = [
  { nome: "Resultados oficiais (divulgação do TSE)", url: "https://resultados.tse.jus.br/oficial/ele2026/" },
  { nome: "Boletins de urna (Portal de Dados Abertos do TSE)", url: "https://dadosabertos.tse.jus.br/dataset/resultados-2026-boletim-de-urna" },
  { nome: "Eleitorado por local de votação 2026 (arquivo do TSE)", url: "https://cdn.tse.jus.br/estatistica/sead/odsele/eleitorado_locais_votacao/eleitorado_local_votacao_2026.zip" },
  { nome: "Portal de Dados Abertos do TSE", url: "https://dadosabertos.tse.jus.br/" },
]

/** Aviso de finalidade: estudo, não laudo. Aparece no topo de todas as páginas. */
export function AvisoPesquisa({ completo = false }: { completo?: boolean }) {
  return (
    <div className="flex gap-3 rounded-lg border border-amber-300/60 bg-amber-50 p-3 text-sm text-amber-950 dark:border-amber-500/30 dark:bg-amber-950/30 dark:text-amber-100">
      <TriangleAlert className="mt-0.5 size-4 shrink-0" />
      <div className="space-y-1.5 leading-relaxed">
        <p>
          <b>Projeto de pesquisa e estudo.</b> Este site analisa dados 100% públicos e oficiais do TSE para ajudar a tirar dúvidas. Ele <b>não prova que houve fraude</b> e{" "}
          <b>não atesta que o resultado está 100% certo</b>. Nada aqui é definitivo, laudo técnico ou perícia.
        </p>
        {completo && (
          <>
            <p>
              Os indicadores dependem de escolhas de método (limiares, modelo, cenários) e podem conter erros. “Verificado” significa apenas que o dado passou numa regra fixa descrita nesta
              página; “Atenção” e “Fora do padrão” significam que vale olhar de perto, não que algo de errado aconteceu.
            </p>
            <p>
              Para resultados oficiais, auditorias e contestações, a referência é sempre a Justiça Eleitoral. Confira os números diretamente nas fontes oficiais, pelos links abaixo.
            </p>
          </>
        )}
      </div>
    </div>
  )
}

/** Bloco "Quem fez": autoria e link do código do pipeline (rodapé e Metodologia). */
export function QuemFez({ className }: { className?: string }) {
  const link = AUTORIA.repositorio.startsWith("http")
  return (
    <div className={cn("space-y-1", className)}>
      <p>
        <b className="text-foreground">Quem fez:</b> {AUTORIA.nome} · Contato:{" "}
        <a href={AUTORIA.contato.url} target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">
          {AUTORIA.contato.texto}
        </a>
      </p>
      <p>
        <b className="text-foreground">Código aberto:</b> o pipeline que baixa os arquivos do TSE e refaz todos os números deste site com um comando está em{" "}
        {link ? (
          <a href={AUTORIA.repositorio} target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">
            {AUTORIA.repositorio}
          </a>
        ) : (
          AUTORIA.repositorio
        )}
        . O README explica o passo a passo.
      </p>
    </div>
  )
}

export function Dot({ color }: { color: string }) {
  return <span className="inline-block size-2.5 rounded-full" style={{ background: color }} />
}
