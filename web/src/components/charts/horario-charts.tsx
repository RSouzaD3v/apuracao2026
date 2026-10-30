"use client"

import { useState } from "react"
import { Area, Bar, BarChart, CartesianGrid, ComposedChart, Line, ReferenceArea, ReferenceLine, XAxis, YAxis } from "recharts"
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FLAVIO, LULA } from "@/lib/colors"
import type { Horario } from "@/lib/types"
import { TARDIA } from "@/lib/stats"

const cfgTot = {
  pl: { label: "Lula", color: LULA },
  pf: { label: "Flávio", color: FLAVIO },
  pctSecoes: { label: "Seções apuradas", color: "#a3a3a3" },
} satisfies ChartConfig

export function TotalizacaoChart({ data }: { data: Horario["totalizacao"] }) {
  const [t, setT] = useState<"t2" | "t1">("t2")
  const toMin = (h: string) => Number(h.slice(0, 2)) * 60 + Number(h.slice(3, 5))
  const fromMin = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(Math.round(m % 60)).padStart(2, "0")}`
  const serie = data[t].filter((p) => p.h >= "17:00" && p.h <= "23:59").map((p) => ({ ...p, m: toMin(p.h) }))
  const ticks = Array.from({ length: 14 }, (_, i) => 17 * 60 + i * 30).filter((m) => m <= (serie.at(-1)?.m ?? 0) + 30)
  return (
    <div className="space-y-3">
      <Tabs value={t} onValueChange={(v) => setT(v as "t1" | "t2")}>
        <TabsList>
          <TabsTrigger value="t2">2º turno</TabsTrigger>
          <TabsTrigger value="t1">1º turno</TabsTrigger>
        </TabsList>
      </Tabs>
      <ChartContainer config={cfgTot} className="aspect-auto h-80 w-full">
        <ComposedChart data={serie} margin={{ left: 0, right: 12, top: 8 }}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="m" type="number" domain={[17 * 60, "dataMax"]} ticks={ticks} tickFormatter={fromMin} tickLine={false} axisLine={false} />
          <YAxis yAxisId="p" domain={[0.3, 0.7]} tickFormatter={(v) => `${Math.round(v * 100)}%`} tickLine={false} axisLine={false} width={40} />
          <YAxis yAxisId="s" orientation="right" domain={[0, 1]} hide />
          {t === "t2" && <ReferenceArea yAxisId="p" x1={17 * 60 + 8} x2={19 * 60 + 2} fill="#a3a3a3" fillOpacity={0.15} label={{ value: "totalização suspensa (17h08–19h)", position: "insideTop", fontSize: 11, fill: "#737373" }} />}
          <ReferenceLine yAxisId="p" y={0.5} stroke="#737373" strokeDasharray="4 4" />
          <Area yAxisId="s" dataKey="pctSecoes" type="stepAfter" fill="#d4d4d4" fillOpacity={0.35} stroke="none" isAnimationActive={false} />
          <Line yAxisId="p" dataKey="pl" stroke={LULA} strokeWidth={2} dot={false} isAnimationActive={false} connectNulls />
          <Line yAxisId="p" dataKey="pf" stroke={FLAVIO} strokeWidth={2} dot={false} isAnimationActive={false} connectNulls />
          <ChartTooltip
            content={
              <ChartTooltipContent
                labelFormatter={(_, p) => `Às ${p?.[0]?.payload?.h ?? ""}`}
                formatter={(v, n) => [`${(Number(v) * 100).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`, cfgTot[n as keyof typeof cfgTot]?.label]}
              />
            }
          />
          <ChartLegend content={<ChartLegendContent />} />
        </ComposedChart>
      </ChartContainer>
      <p className="text-xs text-muted-foreground">
        Reconstruído a partir do horário em que cada boletim de urna foi recebido pelo TSE (campo DT_BU_RECEBIDO). Percentual sobre os votos válidos já apurados naquele minuto; a área cinza é a parte das seções já apurada.
      </p>
    </div>
  )
}

const cfgHist = {
  t1: { label: "1º turno", color: "#a3a3a3" },
  t2: { label: "2º turno", color: "#171717" },
} satisfies ChartConfig

export function EncerramentoChart({ data }: { data: Horario["histograma"] }) {
  const [escala, setEscala] = useState<"todas" | "tarde">("tarde")
  // "tarde": só as seções tardias (mesma regra do resto do site), então as barras somam o total de seções tardias
  const serie =
    escala === "tarde" ? data.filter((d) => d.t1Tardia + d.t2Tardia > 0).map((d) => ({ h: d.h, t1: d.t1Tardia, t2: d.t2Tardia })) : data.map((d) => ({ h: d.h, t1: d.t1, t2: d.t2 }))
  return (
    <div className="space-y-3">
      <Tabs value={escala} onValueChange={(v) => setEscala(v as "todas" | "tarde")}>
        <TabsList>
          <TabsTrigger value="tarde">Depois das {TARDIA}</TabsTrigger>
          <TabsTrigger value="todas">Todas</TabsTrigger>
        </TabsList>
      </Tabs>
      <ChartContainer config={cfgHist} className="aspect-auto h-72 w-full">
        <BarChart data={serie} margin={{ left: 0, right: 8 }}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="h" tickLine={false} axisLine={false} minTickGap={24} />
          <YAxis tickLine={false} axisLine={false} width={52} tickFormatter={(v) => Number(v).toLocaleString("pt-BR")} />
          <ChartTooltip content={<ChartTooltipContent labelFormatter={(l) => `Encerraram entre ${l} e +5 min`} formatter={(v, n) => [`${Number(v).toLocaleString("pt-BR")} seções`, cfgHist[n as keyof typeof cfgHist]?.label]} />} />
          <ChartLegend content={<ChartLegendContent />} />
          <Bar dataKey="t1" fill="var(--color-t1)" radius={[2, 2, 0, 0]} />
          <Bar dataKey="t2" fill="var(--color-t2)" radius={[2, 2, 0, 0]} />
        </BarChart>
      </ChartContainer>
    </div>
  )
}
