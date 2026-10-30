import { Suspense } from "react"
import { PageHeader } from "@/components/shared"
import { CidadesTable } from "@/components/cidades-table"
import { fmt } from "@/lib/format"
import { stats } from "@/lib/stats"

export const metadata = { title: "Cidades · Apuração 2026" }

type SP = Promise<{ uf?: string; nivel?: string; q?: string }>

async function Tabela({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams
  return <CidadesTable initialUf={sp.uf?.toUpperCase() ?? "BR"} initialNivel={sp.nivel ?? "todos"} initialQ={sp.q ?? ""} />
}

export default function CidadesPage({ searchParams }: { searchParams: SP }) {
  return (
    <div>
      <PageHeader title="Cidades">
        Todos os {fmt(stats.localidades.municipios)} municípios e as {fmt(stats.localidades.exterior)} cidades do exterior. Ordene por quem cresceu mais, pelo desvio em relação ao esperado ou pelas seções prorrogadas, e abra cada uma para ver bairros e locais de votação.
      </PageHeader>
      <Suspense fallback={<div className="rounded-xl border bg-background p-10 text-center text-sm text-muted-foreground">Carregando…</div>}>
        <Tabela searchParams={searchParams} />
      </Suspense>
    </div>
  )
}
