"use client"

import { useMemo, useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { FLAVIO, LULA } from "@/lib/colors"
import { fmt, pct, pp } from "@/lib/format"
import type { Local, MunDetalhe } from "@/lib/types"

type Linha = { nome: string; sub?: string; ap: number; l1: number; f1: number; l2: number; f2: number; c1: number; c2: number }

export function BairrosTable({ bairros, locais }: { bairros: MunDetalhe["bairros"]; locais: Local[] }) {
  const [aba, setAba] = useState<"bairros" | "locais">("bairros")
  const [q, setQ] = useState("")
  const [ordem, setOrdem] = useState<"ap" | "var">("ap")

  const linhas: Linha[] = useMemo(() => {
    const base: Linha[] =
      aba === "bairros"
        ? bairros.map((b) => ({ ...b, sub: `${b.locais} local(is)` }))
        : locais.map((l) => ({ ...l, sub: `${l.bairro} · zona ${l.z} · ${l.secoes} seções` }))
    const qq = q.toLowerCase()
    const f = base.filter((x) => !qq || x.nome.toLowerCase().includes(qq) || x.sub?.toLowerCase().includes(qq))
    const v = (x: Linha) => (ordem === "ap" ? x.ap : Math.abs(x.l2 / (x.l2 + x.f2 || 1) - x.l1 / (x.l1 + x.f1 || 1)))
    return f.sort((a, b) => v(b) - v(a))
  }, [aba, bairros, locais, q, ordem])

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <Tabs value={aba} onValueChange={(v) => setAba(v as "bairros" | "locais")}>
          <TabsList>
            <TabsTrigger value="bairros">Bairros ({bairros.length})</TabsTrigger>
            <TabsTrigger value="locais">Locais ({locais.length})</TabsTrigger>
          </TabsList>
        </Tabs>
        <Tabs value={ordem} onValueChange={(v) => setOrdem(v as "ap" | "var")}>
          <TabsList>
            <TabsTrigger value="ap">Maiores</TabsTrigger>
            <TabsTrigger value="var">Maior variação</TabsTrigger>
          </TabsList>
        </Tabs>
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filtrar por nome" className="w-56" />
      </div>
      <div className="max-h-[560px] overflow-auto rounded-lg border">
        <Table>
          <TableHeader className="sticky top-0 bg-background">
            <TableRow>
              <TableHead>{aba === "bairros" ? "Bairro" : "Local"}</TableHead>
              <TableHead className="text-right">Eleitores</TableHead>
              <TableHead className="text-right">Lula 1º t. (entre os 2)</TableHead>
              <TableHead className="text-right">Lula 2º t.</TableHead>
              <TableHead className="text-right">Variação</TableHead>
              <TableHead className="text-right">Lula ganhou</TableHead>
              <TableHead className="text-right">Flávio ganhou</TableHead>
              <TableHead className="text-right">Compar. 1º → 2º</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {linhas.slice(0, 300).map((x, i) => {
              const a = x.l1 / (x.l1 + x.f1 || 1)
              const b = x.l2 / (x.l2 + x.f2 || 1)
              return (
                <TableRow key={`${x.nome}-${i}`}>
                  <TableCell className="max-w-72">
                    <div className="truncate font-medium">{x.nome || "(sem nome)"}</div>
                    {x.sub && <div className="truncate text-xs text-muted-foreground">{x.sub}</div>}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{fmt(x.ap)}</TableCell>
                  <TableCell className="text-right tabular-nums">{pct(a)}</TableCell>
                  <TableCell className="text-right font-medium tabular-nums" style={{ color: b > 0.5 ? LULA : FLAVIO }}>{pct(b)}</TableCell>
                  <TableCell className="text-right tabular-nums" style={{ color: b - a > 0 ? LULA : FLAVIO }}>{pp(b - a)}</TableCell>
                  <TableCell className="text-right tabular-nums">+{fmt(x.l2 - x.l1)}</TableCell>
                  <TableCell className="text-right tabular-nums">{x.f2 - x.f1 >= 0 ? "+" : ""}{fmt(x.f2 - x.f1)}</TableCell>
                  <TableCell className="text-right text-muted-foreground tabular-nums">
                    {pct(x.c1 / (x.ap || 1), 0)} → {pct(x.c2 / (x.ap || 1), 0)}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
      {linhas.length > 300 && <p className="text-xs text-muted-foreground">Mostrando 300 de {fmt(linhas.length)}. Use o filtro para achar um específico.</p>}
    </div>
  )
}
