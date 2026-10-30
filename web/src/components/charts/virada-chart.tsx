"use client"

import { Bar, BarChart, CartesianGrid, Cell, LabelList, XAxis, YAxis } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { compact } from "@/lib/format"

const config = {
  t1: { label: "Votos no 1º turno", color: "#a3a3a3" },
  ganho: { label: "Ganho no 2º turno", color: "#525252" },
} satisfies ChartConfig

export function ViradaChart({ data }: { data: { nome: string; t1: number; ganho: number; cor: string }[] }) {
  return (
    <ChartContainer config={config} className="aspect-auto h-44 w-full">
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 56 }}>
        <CartesianGrid horizontal={false} />
        <YAxis dataKey="nome" type="category" tickLine={false} axisLine={false} width={52} />
        <XAxis type="number" tickFormatter={(v) => compact(v)} tickLine={false} axisLine={false} />
        <ChartTooltip content={<ChartTooltipContent formatter={(v, n) => [Number(v).toLocaleString("pt-BR"), config[n as keyof typeof config]?.label]} />} />
        <Bar dataKey="t1" stackId="a" radius={[4, 0, 0, 4]}>
          {data.map((d) => (
            <Cell key={d.nome} fill={d.cor} fillOpacity={0.45} />
          ))}
        </Bar>
        <Bar dataKey="ganho" stackId="a" radius={[0, 4, 4, 0]}>
          {data.map((d) => (
            <Cell key={d.nome} fill={d.cor} />
          ))}
          <LabelList dataKey="ganho" position="right" formatter={(v) => `+${compact(Number(v))}`} className="fill-foreground text-xs" />
        </Bar>
      </BarChart>
    </ChartContainer>
  )
}
