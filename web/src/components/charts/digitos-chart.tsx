"use client"

import { Bar, CartesianGrid, Line, ComposedChart, XAxis, YAxis } from "recharts"
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { FLAVIO, LULA } from "@/lib/colors"

type D = { contagens: number[]; esperado: number[]; p: number; desvioMax: number }

const cfg = {
  lula: { label: "Lula (observado)", color: LULA },
  flavio: { label: "Flávio (observado)", color: FLAVIO },
  el: { label: "Esperado", color: "#171717" },
} satisfies ChartConfig

export function DigitosChart({ lula, flavio }: { lula: D; flavio: D }) {
  const norm = (d: D, i: number) => d.contagens[i] / d.contagens.reduce((a, b) => a + b, 0)
  const normE = (d: D, i: number) => d.esperado[i] / d.esperado.reduce((a, b) => a + b, 0)
  const data = Array.from({ length: 10 }, (_, i) => ({ d: String(i), lula: norm(lula, i), flavio: norm(flavio, i), el: (normE(lula, i) + normE(flavio, i)) / 2 }))
  return (
    <div className="space-y-2">
      <ChartContainer config={cfg} className="aspect-auto h-64 w-full">
        <ComposedChart data={data} margin={{ left: 0, right: 8 }}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="d" tickLine={false} axisLine={false} />
          <YAxis domain={[0.09, 0.105]} tickFormatter={(v) => `${(v * 100).toFixed(1)}%`} tickLine={false} axisLine={false} width={44} />
          <ChartTooltip content={<ChartTooltipContent formatter={(v, n) => [`${(Number(v) * 100).toFixed(2)}%`, cfg[n as keyof typeof cfg]?.label]} />} />
          <ChartLegend content={<ChartLegendContent />} />
          <Bar dataKey="lula" fill="var(--color-lula)" radius={[2, 2, 0, 0]} />
          <Bar dataKey="flavio" fill="var(--color-flavio)" radius={[2, 2, 0, 0]} />
          <Line dataKey="el" stroke="var(--color-el)" strokeDasharray="4 3" dot={false} />
        </ComposedChart>
      </ChartContainer>
      <p className="text-xs text-muted-foreground">
        Eixo vertical ampliado (9% a 10,5%) para mostrar diferenças pequenas. Maior desvio: Lula {(lula.desvioMax * 100).toFixed(2)}% (p = {lula.p.toFixed(2)}), Flávio{" "}
        {(flavio.desvioMax * 100).toFixed(2)}% (p = {flavio.p.toFixed(2)}).
      </p>
    </div>
  )
}
