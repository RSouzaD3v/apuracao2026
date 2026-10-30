"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { geoMercator, geoPath } from "d3-geo"
import { select } from "d3-selection"
import { zoom, zoomIdentity, type ZoomBehavior } from "d3-zoom"
import { feature } from "topojson-client"
import type { Feature, FeatureCollection, Geometry } from "geojson"
import type { Topology } from "topojson-specification"
import { Minus, Plus, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { NivelBadge, DuelBar } from "@/components/shared"
import { corDiferenca, corDisputa, FLAVIO, LULA, NIVEL_COR, NIVEL_LABEL } from "@/lib/colors"
import { fmt, pct, pp } from "@/lib/format"
import { TARDIA } from "@/lib/stats"
import { UF_NOMES } from "@/lib/ufs"
import { corrigirOrientacao } from "@/lib/geo"
import type { MunRow } from "@/lib/types"

type Props = { id: string; name: string; uf: string }
type Modo = "v2" | "v1" | "var" | "desvio" | "tardias" | "nivel"

const MODOS: { v: Modo; label: string; desc: string }[] = [
  { v: "v2", label: "2º turno", desc: "Percentual de Lula entre os votos dados aos dois. Vermelho = Lula, azul = Flávio." },
  { v: "v1", label: "1º turno", desc: "Mesma medida no 1º turno, considerando só os votos de Lula e Flávio." },
  { v: "var", label: "Quem cresceu", desc: "Quanto a fatia de Lula entre os dois mudou do 1º para o 2º turno. Vermelho: Lula cresceu mais. Azul: Flávio cresceu mais." },
  { v: "desvio", label: "Desvio do esperado", desc: "Diferença entre o 2º turno real e o previsto a partir do 1º turno da própria cidade, em escala robusta (z). Cores fortes só a partir de |z| ≥ 3." },
  { v: "tardias", label: "Seções prorrogadas", desc: `Parte do eleitorado da cidade que estava em seções que encerraram depois das ${TARDIA} no 2º turno.` },
  { v: "nivel", label: "Conferência", desc: "Resultado das checagens automáticas da cidade." },
]

const varCor = corDiferenca(0.12)
const zCor = corDiferenca(6)

function cor(m: MunRow | undefined, modo: Modo): string {
  if (!m) return "#d4d4d4"
  switch (modo) {
    case "v2":
      return m.pl2 == null ? "#d4d4d4" : corDisputa(m.pl2)
    case "v1":
      return m.l1 + m.f1 ? corDisputa(m.l1 / (m.l1 + m.f1)) : "#d4d4d4"
    case "var": {
      const a = m.l1 / (m.l1 + m.f1)
      return m.pl2 == null ? "#d4d4d4" : varCor(m.pl2 - a)
    }
    case "desvio":
      if (m.z == null) return "#d4d4d4"
      return Math.abs(m.z) < 3 ? "#f5f5f4" : zCor(m.z)
    case "tardias": {
      const t = m.ap ? m.ctr / m.ap : 0
      if (t === 0) return "#f5f5f4"
      return t < 0.05 ? "#fde68a" : t < 0.15 ? "#f59e0b" : t < 0.3 ? "#b45309" : "#78350f"
    }
    case "nivel":
      return m.nv === "ok" ? "#d1fae5" : NIVEL_COR[m.nv]
  }
}

function Legenda({ modo }: { modo: Modo }) {
  const grad = (stops: string[], left: string, right: string, mid?: string) => (
    <div className="space-y-1">
      <div className="h-2.5 rounded-full" style={{ background: `linear-gradient(90deg, ${stops.join(",")})` }} />
      <div className="flex justify-between text-[11px] text-muted-foreground">
        <span>{left}</span>
        {mid && <span>{mid}</span>}
        <span>{right}</span>
      </div>
    </div>
  )
  if (modo === "v1" || modo === "v2")
    return grad(["#1e3a8a", "#60a5fa", "#f5f5f4", "#f87171", "#7f1d1d"], "Flávio 80%", "Lula 80%", "50%")
  if (modo === "var") return grad(["#1e3a8a", "#93c5fd", "#f5f5f4", "#fca5a5", "#7f1d1d"], "Flávio +12 p.p.", "Lula +12 p.p.", "0")
  if (modo === "desvio") return grad(["#1e3a8a", "#93c5fd", "#f5f5f4", "#fca5a5", "#7f1d1d"], "z −6 (a favor de Flávio)", "z +6 (a favor de Lula)", "|z| < 3")
  if (modo === "tardias")
    return (
      <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground">
        {[["#f5f5f4", "nenhuma"], ["#fde68a", "< 5%"], ["#f59e0b", "5–15%"], ["#b45309", "15–30%"], ["#78350f", "> 30%"]].map(([c, l]) => (
          <span key={l} className="flex items-center gap-1">
            <span className="size-3 rounded-sm border" style={{ background: c }} />
            {l}
          </span>
        ))}
      </div>
    )
  return (
    <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground">
      {(["ok", "atencao", "fora"] as const).map((n) => (
        <span key={n} className="flex items-center gap-1">
          <span className="size-3 rounded-sm border" style={{ background: n === "ok" ? "#d1fae5" : NIVEL_COR[n] }} />
          {NIVEL_LABEL[n]}
        </span>
      ))}
    </div>
  )
}

export function BrazilMap() {
  const [geo, setGeo] = useState<FeatureCollection<Geometry, Props> | null>(null)
  const [ufGeo, setUfGeo] = useState<FeatureCollection<Geometry, { uf: string }> | null>(null)
  const [rows, setRows] = useState<MunRow[]>([])
  const [modo, setModo] = useState<Modo>("v2")
  const [uf, setUf] = useState<string>("BR")
  const [hover, setHover] = useState<{ m?: MunRow; nome: string; x: number; y: number } | null>(null)
  const [sel, setSel] = useState<MunRow | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const gRef = useRef<SVGGElement>(null)
  const zoomRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null)
  const W = 900
  const H = 860

  useEffect(() => {
    Promise.all([
      fetch("/data/mun.topo.json").then((r) => r.json()),
      fetch("/data/uf.topo.json").then((r) => r.json()),
      fetch("/data/municipios.json").then((r) => r.json()),
    ]).then(([t, u, m]: [Topology, Topology, MunRow[]]) => {
      const g = feature(t, t.objects.mun) as unknown as FeatureCollection<Geometry, Props>
      const ug = feature(u, u.objects.mun) as unknown as FeatureCollection<Geometry, { uf: string }>
      setGeo({ ...g, features: g.features.map(corrigirOrientacao) })
      setUfGeo({ ...ug, features: ug.features.map(corrigirOrientacao) })
      setRows(m)
    })
  }, [])

  const porIbge = useMemo(() => new Map(rows.filter((r) => !r.ext).map((r) => [r.i, r])), [rows])
  const ufCodigo = useMemo(() => {
    const m = new Map<string, string>()
    rows.forEach((r) => !r.ext && m.set(r.i.slice(0, 2), r.uf))
    return m
  }, [rows])

  const feats = useMemo(() => {
    if (!geo) return []
    return uf === "BR" ? geo.features : geo.features.filter((f) => ufCodigo.get(String(f.properties.id).slice(0, 2)) === uf)
  }, [geo, uf, ufCodigo])

  const { paths, bordas } = useMemo(() => {
    if (!feats.length) return { paths: [] as { id: string; d: string; nome: string }[], bordas: [] as { d: string; key: string }[] }
    const proj = geoMercator().fitExtent([[10, 10], [W - 10, H - 10]], { type: "FeatureCollection", features: feats } as FeatureCollection)
    const gp = geoPath(proj)
    const paths = feats.map((f: Feature<Geometry, Props>) => ({ id: String(f.properties.id), d: gp(f) ?? "", nome: f.properties.name }))
    const bordas =
      ufGeo?.features
        .filter((f) => uf === "BR" || ufCodigo.get(String(f.properties.uf)) === uf)
        .map((f) => ({ d: gp(f) ?? "", key: String(f.properties.uf) })) ?? []
    return { paths, bordas }
  }, [feats, ufGeo, uf, ufCodigo])

  useEffect(() => {
    if (!svgRef.current || !gRef.current) return
    const g = select(gRef.current)
    const z = zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, 40])
      .on("zoom", (e) => {
        g.attr("transform", e.transform.toString())
        g.selectAll<SVGPathElement, unknown>("path.mun").attr("stroke-width", 0.25 / e.transform.k)
        g.selectAll<SVGPathElement, unknown>("path.uf").attr("stroke-width", 1 / e.transform.k)
      })
    zoomRef.current = z
    select(svgRef.current).call(z)
  }, [paths.length])

  useEffect(() => {
    if (svgRef.current && zoomRef.current) select(svgRef.current).call(zoomRef.current.transform, zoomIdentity)
  }, [uf])

  const zoomBy = (k: number) => svgRef.current && zoomRef.current && select(svgRef.current).call(zoomRef.current.scaleBy, k)

  const ranking = useMemo(() => {
    const base = rows.filter((r) => !r.ext && (uf === "BR" || r.uf === uf))
    const val = (m: MunRow): number => {
      switch (modo) {
        case "v2":
          return m.pl2 ?? 0
        case "v1":
          return m.l1 / (m.l1 + m.f1 || 1)
        case "var":
          return (m.pl2 ?? 0) - m.l1 / (m.l1 + m.f1 || 1)
        case "desvio":
          return Math.abs(m.z ?? 0)
        case "tardias":
          return m.ap ? m.ctr / m.ap : 0
        case "nivel":
          return m.nv === "fora" ? 2e9 + Math.abs(m.z ?? 0) : m.nv === "atencao" ? 1e9 + Math.abs(m.z ?? 0) : 0
      }
    }
    return [...base].sort((a, b) => val(b) - val(a)).slice(0, 12).map((m) => ({ m, v: val(m) }))
  }, [rows, uf, modo])

  const modoInfo = MODOS.find((m) => m.v === modo)!
  const loading = !geo || !rows.length

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
      <div className="overflow-hidden rounded-xl border bg-background">
        <div className="flex flex-wrap items-center gap-3 border-b p-3">
          <ToggleGroup value={[modo]} onValueChange={(v) => v[0] && setModo(v[0] as Modo)} variant="outline" size="sm" spacing={0}>
            {MODOS.map((m) => (
              <ToggleGroupItem key={m.v} value={m.v} className="px-2.5 text-xs">
                {m.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <Select value={uf} onValueChange={(v) => v && setUf(v)} items={[{ value: "BR", label: "Brasil inteiro" }, ...Object.entries(UF_NOMES).filter(([k]) => k !== "ZZ").map(([k, v]) => ({ value: k, label: v }))]}>
            <SelectTrigger size="sm" className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="BR">Brasil inteiro</SelectItem>
              {Object.entries(UF_NOMES)
                .filter(([k]) => k !== "ZZ")
                .sort((a, b) => a[1].localeCompare(b[1]))
                .map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    {v}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
        <div className="relative">
          {loading && <div className="absolute inset-0 grid place-items-center text-sm text-muted-foreground">Carregando mapa…</div>}
          <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className="block h-[70vh] min-h-[420px] w-full cursor-grab touch-none active:cursor-grabbing" onMouseLeave={() => setHover(null)}>
            <g ref={gRef}>
              {paths.map((p) => {
                const m = porIbge.get(p.id)
                return (
                  <path
                    key={p.id}
                    className="mun"
                    d={p.d}
                    fill={cor(m, modo)}
                    stroke="#ffffff"
                    strokeWidth={0.25}
                    onMouseMove={(e) => {
                      const box = svgRef.current!.getBoundingClientRect()
                      setHover({ m, nome: p.nome, x: e.clientX - box.left, y: e.clientY - box.top })
                    }}
                    onClick={() => m && setSel(m)}
                    style={{ cursor: m ? "pointer" : "default", outline: sel?.i === p.id ? "none" : undefined }}
                  />
                )
              })}
              {bordas.map((b) => (
                <path key={b.key} className="uf pointer-events-none" d={b.d} fill="none" stroke="#525252" strokeWidth={1} />
              ))}
              {sel &&
                paths
                  .filter((p) => p.id === sel.i)
                  .map((p) => <path key="sel" d={p.d} fill="none" stroke="#0a0a0a" strokeWidth={1.5} className="pointer-events-none" />)}
            </g>
          </svg>
          <div className="absolute top-3 right-3 flex flex-col gap-1">
            <Button size="icon-sm" variant="outline" onClick={() => zoomBy(1.6)} aria-label="Aproximar">
              <Plus />
            </Button>
            <Button size="icon-sm" variant="outline" onClick={() => zoomBy(1 / 1.6)} aria-label="Afastar">
              <Minus />
            </Button>
            <Button size="icon-sm" variant="outline" onClick={() => svgRef.current && zoomRef.current && select(svgRef.current).call(zoomRef.current.transform, zoomIdentity)} aria-label="Reiniciar">
              <RotateCcw />
            </Button>
          </div>
          {hover && (
            <div className="pointer-events-none absolute z-10 w-60 rounded-lg border bg-popover p-3 text-xs shadow-lg" style={{ left: Math.min(hover.x + 14, W), top: hover.y + 14 }}>
              <div className="mb-1 font-medium">
                {hover.m?.n ?? hover.nome} {hover.m && <span className="text-muted-foreground">· {hover.m.uf}</span>}
              </div>
              {hover.m ? (
                <div className="space-y-1.5">
                  <DuelBar lula={hover.m.l2} flavio={hover.m.f2} showLabels={false} />
                  <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 tabular-nums">
                    <span className="text-muted-foreground">Lula 2º t.</span>
                    <span style={{ color: LULA }}>{pct(hover.m.pl2)}</span>
                    <span className="text-muted-foreground">Lula 1º t. (entre os 2)</span>
                    <span>{pct(hover.m.l1 / (hover.m.l1 + hover.m.f1))}</span>
                    <span className="text-muted-foreground">Variação</span>
                    <span>{pp((hover.m.pl2 ?? 0) - hover.m.l1 / (hover.m.l1 + hover.m.f1))}</span>
                    <span className="text-muted-foreground">Desvio (z)</span>
                    <span>{hover.m.z?.toLocaleString("pt-BR") ?? "—"}</span>
                  </div>
                  <NivelBadge nivel={hover.m.nv} />
                </div>
              ) : (
                <div className="text-muted-foreground">Sem dados para este polígono</div>
              )}
            </div>
          )}
        </div>
        <div className="space-y-2 border-t p-3">
          <Legenda modo={modo} />
          <p className="text-xs text-muted-foreground">{modoInfo.desc} Arraste para mover, use a roda do mouse para aproximar e clique numa cidade.</p>
        </div>
      </div>

      <div className="space-y-4">
        {sel ? (
          <div className="space-y-3 rounded-xl border bg-background p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-semibold">{sel.n}</div>
                <div className="text-xs text-muted-foreground">
                  {UF_NOMES[sel.uf]} · {fmt(sel.ap)} eleitores
                </div>
              </div>
              <NivelBadge nivel={sel.nv} />
            </div>
            <div>
              <div className="mb-1 text-xs text-muted-foreground">2º turno</div>
              <DuelBar lula={sel.l2} flavio={sel.f2} />
            </div>
            <div>
              <div className="mb-1 text-xs text-muted-foreground">1º turno, contando só os votos de Lula e Flávio (sem os demais candidatos)</div>
              <DuelBar lula={sel.l1} flavio={sel.f1} />
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-md bg-muted p-2">
                <div className="text-muted-foreground">Lula ganhou</div>
                <div className="font-semibold tabular-nums" style={{ color: LULA }}>+{fmt(sel.l2 - sel.l1)}</div>
              </div>
              <div className="rounded-md bg-muted p-2">
                <div className="text-muted-foreground">Flávio ganhou</div>
                <div className="font-semibold tabular-nums" style={{ color: FLAVIO }}>
                  {sel.f2 - sel.f1 >= 0 ? "+" : ""}
                  {fmt(sel.f2 - sel.f1)}
                </div>
              </div>
            </div>
            <Link href={`/cidade/${sel.k}`} className="block rounded-md bg-foreground px-3 py-2 text-center text-sm font-medium text-background hover:opacity-90">
              Abrir conferência da cidade
            </Link>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed bg-background p-4 text-sm text-muted-foreground">Clique numa cidade para ver o resumo aqui.</div>
        )}
        <div className="rounded-xl border bg-background">
          <div className="border-b p-3 text-sm font-medium">
            Destaques · {modoInfo.label} · {uf === "BR" ? "Brasil" : UF_NOMES[uf]}
          </div>
          <ul className="divide-y text-sm">
            {ranking.map(({ m, v }) => (
              <li key={m.k}>
                <button onClick={() => setSel(m)} className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left hover:bg-muted">
                  <span className="truncate">
                    {m.n} <span className="text-xs text-muted-foreground">{m.uf}</span>
                  </span>
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                    {modo === "desvio" ? `z ${m.z?.toLocaleString("pt-BR")}` : modo === "var" ? pp(v) : modo === "nivel" ? <NivelBadge nivel={m.nv} /> : pct(v)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
