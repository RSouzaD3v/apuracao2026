"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ArrowDown, ArrowUp, Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { NivelBadge } from "@/components/shared"
import { FLAVIO, LULA } from "@/lib/colors"
import { fmt, pct, pp } from "@/lib/format"
import { TARDIA } from "@/lib/stats"
import { UF_NOMES } from "@/lib/ufs"
import type { MunRow } from "@/lib/types"

type Col = "n" | "ap" | "pl1" | "pl2" | "var" | "gl" | "gf" | "z" | "zc" | "ctr" | "nv"
const NIVEL_ORD = { ok: 0, atencao: 1, fora: 2 }
const POR_PAGINA = 50

const share1 = (m: MunRow) => m.l1 / (m.l1 + m.f1 || 1)

function valor(m: MunRow, c: Col): number | string {
  switch (c) {
    case "n": return m.n
    case "ap": return m.ap
    case "pl1": return share1(m)
    case "pl2": return m.pl2 ?? 0
    case "var": return (m.pl2 ?? 0) - share1(m)
    case "gl": return m.l2 - m.l1
    case "gf": return m.f2 - m.f1
    case "z": return m.z ?? 0
    case "zc": return Math.abs(m.zc ?? 0)
    case "ctr": return m.ap ? m.ctr / m.ap : 0
    case "nv": return NIVEL_ORD[m.nv] * 100 + Math.abs(m.z ?? 0)
  }
}

export function CidadesTable({ initialUf, initialNivel, initialQ }: { initialUf: string; initialNivel: string; initialQ: string }) {
  const [rows, setRows] = useState<MunRow[]>([])
  const [uf, setUf] = useState(initialUf)
  const [nivel, setNivel] = useState(initialNivel)
  const [q, setQ] = useState(initialQ)
  const [sort, setSort] = useState<{ c: Col; desc: boolean }>({ c: initialNivel !== "todos" ? "nv" : "ap", desc: true })
  const [pagina, setPagina] = useState(0)

  useEffect(() => {
    fetch("/data/municipios.json").then((r) => r.json()).then(setRows)
  }, [])

  const filtradas = useMemo(() => {
    const norm = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase()
    const qq = norm(q.trim())
    const out = rows.filter(
      (m) => (uf === "BR" || m.uf === uf) && (nivel === "todos" || m.nv === nivel) && (!qq || norm(m.n).includes(qq)),
    )
    out.sort((a, b) => {
      const va = valor(a, sort.c)
      const vb = valor(b, sort.c)
      const d = typeof va === "string" ? va.localeCompare(vb as string) : (va as number) - (vb as number)
      return sort.desc ? -d : d
    })
    return out
  }, [rows, uf, nivel, q, sort])

  const totais = useMemo(() => {
    const t = { l1: 0, f1: 0, l2: 0, f2: 0 }
    filtradas.forEach((m) => {
      t.l1 += m.l1
      t.f1 += m.f1
      t.l2 += m.l2
      t.f2 += m.f2
    })
    return t
  }, [filtradas])

  const onSort = (c: Col) => {
    setSort((s) => ({ c, desc: s.c === c ? !s.desc : true }))
    setPagina(0)
  }
  const pag = filtradas.slice(pagina * POR_PAGINA, (pagina + 1) * POR_PAGINA)
  const nPag = Math.ceil(filtradas.length / POR_PAGINA)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-background p-3">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => { setQ(e.target.value); setPagina(0) }} placeholder="Buscar cidade" className="w-56 pl-8" />
        </div>
        <Select value={uf} onValueChange={(v) => { if (v) { setUf(v); setPagina(0) } }} items={[{ value: "BR", label: "Todos os estados" }, ...Object.entries(UF_NOMES).map(([value, label]) => ({ value, label }))]}>
          <SelectTrigger className="w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="BR">Todos os estados</SelectItem>
            {Object.entries(UF_NOMES)
              .sort((a, b) => a[1].localeCompare(b[1]))
              .map(([k, v]) => (
                <SelectItem key={k} value={k}>
                  {v}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
        <Select
          value={nivel}
          onValueChange={(v) => { if (v) { setNivel(v); setPagina(0) } }}
          items={[{ value: "todos", label: "Todas as situações" }, { value: "ok", label: "Verificado" }, { value: "atencao", label: "Atenção" }, { value: "fora", label: "Fora do padrão" }]}
        >
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas as situações</SelectItem>
            <SelectItem value="ok">Verificado</SelectItem>
            <SelectItem value="atencao">Atenção</SelectItem>
            <SelectItem value="fora">Fora do padrão</SelectItem>
          </SelectContent>
        </Select>
        <div className="ml-auto text-sm text-muted-foreground tabular-nums">
          {fmt(filtradas.length)} cidades · Lula {pct(totais.l2 / (totais.l2 + totais.f2 || 1))} no 2º turno ({pct(totais.l1 / (totais.l1 + totais.f1 || 1))} no 1º, entre os dois)
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <SortHead sort={sort} onSort={onSort} c="n" right={false}>Cidade</SortHead>
              <SortHead sort={sort} onSort={onSort} c="ap">Eleitores</SortHead>
              <SortHead sort={sort} onSort={onSort} c="pl1" title="% de Lula entre os votos dos dois finalistas no 1º turno">Lula 1º t.</SortHead>
              <SortHead sort={sort} onSort={onSort} c="pl2">Lula 2º t.</SortHead>
              <SortHead sort={sort} onSort={onSort} c="var" title="Variação da fatia de Lula entre os dois">Variação</SortHead>
              <SortHead sort={sort} onSort={onSort} c="gl">Lula ganhou</SortHead>
              <SortHead sort={sort} onSort={onSort} c="gf">Flávio ganhou</SortHead>
              <SortHead sort={sort} onSort={onSort} c="z" title="Desvio do resultado em relação ao previsto pelo 1º turno (z robusto). Positivo = a favor de Lula">Desvio (z)</SortHead>
              <SortHead sort={sort} onSort={onSort} c="ctr" title={`% do eleitorado em seções que fecharam após ${TARDIA}`}>Prorrogadas</SortHead>
              <SortHead sort={sort} onSort={onSort} c="nv">Conferência</SortHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!rows.length && (
              <TableRow>
                <TableCell colSpan={10} className="py-10 text-center text-muted-foreground">
                  Carregando…
                </TableCell>
              </TableRow>
            )}
            {pag.map((m) => {
              const v = (m.pl2 ?? 0) - share1(m)
              return (
                <TableRow key={m.k}>
                  <TableCell>
                    <Link href={`/cidade/${m.k}`} className="font-medium hover:underline">
                      {m.n}
                    </Link>{" "}
                    <span className="text-xs text-muted-foreground">{m.uf}</span>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{fmt(m.ap)}</TableCell>
                  <TableCell className="text-right tabular-nums">{pct(share1(m))}</TableCell>
                  <TableCell className="text-right font-medium tabular-nums" style={{ color: (m.pl2 ?? 0) > 0.5 ? LULA : FLAVIO }}>
                    {pct(m.pl2)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums" style={{ color: v > 0 ? LULA : FLAVIO }}>
                    {pp(v)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">+{fmt(m.l2 - m.l1)}</TableCell>
                  <TableCell className="text-right tabular-nums">{m.f2 - m.f1 >= 0 ? "+" : ""}{fmt(m.f2 - m.f1)}</TableCell>
                  <TableCell className="text-right tabular-nums">{m.z == null ? "—" : m.z.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</TableCell>
                  <TableCell className="text-right tabular-nums">{m.ctr ? pct(m.ctr / m.ap) : "—"}</TableCell>
                  <TableCell className="text-right">
                    <NivelBadge nivel={m.nv} />
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
      {nPag > 1 && (
        <div className="flex items-center justify-end gap-2 text-sm">
          <span className="text-muted-foreground tabular-nums">
            Página {pagina + 1} de {nPag}
          </span>
          <Button variant="outline" size="sm" disabled={pagina === 0} onClick={() => setPagina((p) => p - 1)}>
            Anterior
          </Button>
          <Button variant="outline" size="sm" disabled={pagina >= nPag - 1} onClick={() => setPagina((p) => p + 1)}>
            Próxima
          </Button>
        </div>
      )}
    </div>
  )
}

function SortHead({ c, children, right = true, title, sort, onSort }: { c: Col; children: React.ReactNode; right?: boolean; title?: string; sort: { c: Col; desc: boolean }; onSort: (c: Col) => void }) {
  return (
    <TableHead className={right ? "text-right" : ""} title={title}>
      <button className="inline-flex items-center gap-1 hover:text-foreground" onClick={() => onSort(c)}>
        {children}
        {sort.c === c && (sort.desc ? <ArrowDown className="size-3" /> : <ArrowUp className="size-3" />)}
      </button>
    </TableHead>
  )
}
