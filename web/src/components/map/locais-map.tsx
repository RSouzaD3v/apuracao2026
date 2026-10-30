"use client"

import { useEffect, useMemo, useState } from "react"
import { geoMercator, geoPath } from "d3-geo"
import { scaleSqrt } from "d3-scale"
import { feature } from "topojson-client"
import type { Feature, FeatureCollection, Geometry } from "geojson"
import type { Topology } from "topojson-specification"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { corDiferenca, corDisputa, FLAVIO, LULA } from "@/lib/colors"
import { fmt, pct, pp } from "@/lib/format"
import { TARDIA } from "@/lib/stats"
import type { Local } from "@/lib/types"
import { corrigirOrientacao } from "@/lib/geo"

type Modo = "v2" | "v1" | "var"
const varCor = corDiferenca(0.12)

export function LocaisMap({ ibge, locais }: { ibge: string; locais: Local[] }) {
  const [shape, setShape] = useState<Feature<Geometry> | null>(null)
  const [modo, setModo] = useState<Modo>("v2")
  const [hover, setHover] = useState<Local | null>(null)
  const W = 800
  const H = 560

  useEffect(() => {
    fetch("/data/mun.topo.json")
      .then((r) => r.json())
      .then((t: Topology) => {
        const fc = feature(t, t.objects.mun) as unknown as FeatureCollection<Geometry, { id: string }>
        const f = fc.features.find((x) => String(x.properties.id) === ibge)
        setShape(f ? corrigirOrientacao(f) : null)
      })
  }, [ibge])

  const { pontos, d } = useMemo(() => {
    const comCoord = locais.filter((l) => l.lat != null && l.lon != null && Math.abs(l.lat) > 0.01)
    if (!shape && !comCoord.length) return { pontos: [], d: "" }
    const proj = geoMercator()
    const gp = geoPath(proj)
    // Usa o contorno da cidade quando disponível; descarta coordenadas obviamente fora dele (erros de cadastro)
    let validos = comCoord
    if (shape) {
      proj.fitExtent([[16, 16], [W - 16, H - 16]], shape)
      const [[x0, y0], [x1, y1]] = gp.bounds(shape)
      const mx = (x1 - x0) * 0.15
      const my = (y1 - y0) * 0.15
      validos = comCoord.filter((l) => {
        const p = proj([l.lon!, l.lat!])
        return p && p[0] >= x0 - mx && p[0] <= x1 + mx && p[1] >= y0 - my && p[1] <= y1 + my
      })
    } else {
      proj.fitExtent([[16, 16], [W - 16, H - 16]], {
        type: "MultiPoint",
        coordinates: comCoord.map((l) => [l.lon!, l.lat!]),
      })
    }
    const r = scaleSqrt().domain([0, Math.max(...validos.map((l) => l.ap), 1)]).range([2, 14])
    const pontos = validos
      .map((l) => {
        const [x, y] = proj([l.lon!, l.lat!])!
        return { l, x, y, r: r(l.ap) }
      })
      .sort((a, b) => b.r - a.r)
    return { pontos, d: shape ? gp(shape) ?? "" : "" }
  }, [shape, locais])

  const cor = (l: Local) => {
    const a = l.l1 / (l.l1 + l.f1 || 1)
    const b = l.l2 / (l.l2 + l.f2 || 1)
    return modo === "v2" ? corDisputa(b) : modo === "v1" ? corDisputa(a) : varCor(b - a)
  }
  const semCoord = locais.length - pontos.length

  return (
    <div className="space-y-3">
      <ToggleGroup value={[modo]} onValueChange={(v) => v[0] && setModo(v[0] as Modo)} variant="outline" size="sm" spacing={0}>
        <ToggleGroupItem value="v2" className="text-xs">2º turno</ToggleGroupItem>
        <ToggleGroupItem value="v1" className="text-xs">1º turno</ToggleGroupItem>
        <ToggleGroupItem value="var" className="text-xs">Quem cresceu</ToggleGroupItem>
      </ToggleGroup>
      <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full rounded-lg border bg-muted/30">
          {d && <path d={d} fill="#fafaf9" stroke="#a3a3a3" strokeWidth={1} />}
          {pontos.map(({ l, x, y, r }) => (
            <circle
              key={`${l.z}-${l.id}`}
              cx={x.toFixed(2)}
              cy={y.toFixed(2)}
              r={r.toFixed(2)}
              fill={cor(l)}
              stroke={hover === l ? "#0a0a0a" : "#ffffff"}
              strokeWidth={hover === l ? 2 : 0.8}
              fillOpacity={0.9}
              onMouseEnter={() => setHover(l)}
              className="cursor-pointer"
            />
          ))}
        </svg>
        <div className="rounded-lg border p-3 text-sm">
          {hover ? (
            <div className="space-y-2">
              <div className="font-medium">{hover.nome}</div>
              <div className="text-xs text-muted-foreground">
                {hover.bairro} · {hover.end}
              </div>
              <div className="text-xs text-muted-foreground">
                Zona {hover.z} · {hover.secoes} seções · {fmt(hover.ap)} eleitores
              </div>
              <div className="grid grid-cols-2 gap-1 pt-2 text-xs tabular-nums">
                <span className="text-muted-foreground">Lula 1º / 2º</span>
                <span style={{ color: LULA }}>
                  {fmt(hover.l1)} → {fmt(hover.l2)}
                </span>
                <span className="text-muted-foreground">Flávio 1º / 2º</span>
                <span style={{ color: FLAVIO }}>
                  {fmt(hover.f1)} → {fmt(hover.f2)}
                </span>
                <span className="text-muted-foreground">Lula entre os 2</span>
                <span>
                  {pct(hover.l1 / (hover.l1 + hover.f1 || 1))} → {pct(hover.l2 / (hover.l2 + hover.f2 || 1))}
                </span>
                <span className="text-muted-foreground">Variação</span>
                <span>{pp(hover.l2 / (hover.l2 + hover.f2 || 1) - hover.l1 / (hover.l1 + hover.f1 || 1))}</span>
                <span className="text-muted-foreground">Seções após {TARDIA}</span>
                <span>{hover.tardias.length}</span>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground">Passe o mouse sobre um ponto para ver o local.</p>
          )}
          {semCoord > 0 && <p className="mt-3 border-t pt-2 text-xs text-muted-foreground">{semCoord} local(is) sem coordenada válida no cadastro não aparecem no mapa.</p>}
        </div>
      </div>
    </div>
  )
}
