import { Suspense } from "react"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ChevronLeft } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { CheckItem, DuelBar, Kpi, NivelBadge } from "@/components/shared"
import { LocaisMap } from "@/components/map/locais-map"
import { BairrosTable } from "@/components/bairros-table"
import { getMunicipio, getResumo, UF_NOMES } from "@/lib/data"
import { getBandeirasUF, getImagensCidade } from "@/lib/imagens"
import { Bandeira, FotoCidade } from "@/components/imagem"
import { FLAVIO, LULA } from "@/lib/colors"
import { fmt, pct, pp } from "@/lib/format"
import { TARDIA } from "@/lib/stats"

export async function generateMetadata({ params }: PageProps<"/cidade/[key]">) {
  const { key } = await params
  const d = await getMunicipio(key)
  return { title: d ? `${d.municipio.nome} (${d.municipio.uf}) · Apuração 2026` : "Cidade" }
}

export default function CidadePage({ params }: PageProps<"/cidade/[key]">) {
  return (
    <Suspense fallback={<div className="py-20 text-center text-sm text-muted-foreground">Carregando cidade…</div>}>
      <Conteudo params={params} />
    </Suspense>
  )
}

async function Conteudo({ params }: { params: PageProps<"/cidade/[key]">["params"] }) {
  const { key } = await params
  const [d, r] = await Promise.all([getMunicipio(key), getResumo()])
  if (!d) notFound()
  const m = d.municipio
  const [img, bandeiras] = await Promise.all([getImagensCidade(m.ibge), getBandeirasUF()])
  const nomes = Object.fromEntries(r.t1.candidatos.map((c) => [c.numero, c.nome]))
  const princ = Object.entries(m.t1.princ)
  const resto = m.t1.outros - princ.reduce((s, [, v]) => s + v, 0)
  const linhas1 = [
    { nome: "Lula", v: m.t1.lula, cor: LULA },
    { nome: "Flávio Bolsonaro", v: m.t1.flavio, cor: FLAVIO },
    ...princ.map(([n, v]) => ({ nome: nomes[n] ?? n, v, cor: "#a3a3a3" })),
    { nome: "Demais candidatos", v: resto, cor: "#d4d4d4" },
  ]
  const share1 = m.t1.lula / (m.t1.lula + m.t1.flavio || 1)
  const tardias = d.locais.flatMap((l) => l.tardias.map((t) => ({ ...t, local: l.nome, bairro: l.bairro, z: l.z }))).sort((a, b) => b.enc.localeCompare(a.enc))

  return (
    <div className="space-y-6">
      <div>
        <Link href="/cidades" className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="size-4" /> Cidades
        </Link>
        {!m.exterior && (
          <div className="mb-4">
            <FotoCidade src={img.foto} nome={m.nome} />
          </div>
        )}
        <div className="flex flex-wrap items-center gap-3">
          {!m.exterior && <Bandeira src={img.bandeira ?? img.brasao} nome={m.nome} className="h-8 w-12" />}
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{m.nome}</h1>
          <span className="inline-flex items-center gap-1.5 text-muted-foreground">
            {!m.exterior && <Bandeira src={bandeiras[m.uf]} nome={UF_NOMES[m.uf]} />}
            {UF_NOMES[m.uf]}
          </span>
          <NivelBadge nivel={m.nivel} />
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {fmt(m.aptos)} eleitores · {fmt(m.bu.secoes2)} seções · {d.locais.length} locais de votação · IBGE {m.ibge || "—"} · TSE {m.key.slice(2)}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Kpi label="Lula 2º turno" value={pct(m.pl2)} sub={`${fmt(m.t2.lula)} votos`} color={LULA} />
        <Kpi label="Flávio 2º turno" value={pct(m.pl2 == null ? null : 1 - m.pl2)} sub={`${fmt(m.t2.flavio)} votos`} color={FLAVIO} />
        <Kpi label="Variação entre os dois" value={pp((m.pl2 ?? 0) - share1)} sub={`Lula tinha ${pct(share1)} entre os dois no 1º turno`} color={(m.pl2 ?? 0) - share1 > 0 ? LULA : FLAVIO} />
        <Kpi label="Comparecimento" value={pct(m.comp2)} sub={`1º turno: ${pct(m.comp1)}`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>1º turno × 2º turno</CardTitle>
            <CardDescription>Votos válidos por candidato</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              {linhas1.map((l) => (
                <div key={l.nome} className="grid grid-cols-[140px_1fr_90px] items-center gap-3 text-sm">
                  <span className="truncate">{l.nome}</span>
                  <div className="h-2 rounded-full bg-muted">
                    <div className="h-2 rounded-full" style={{ width: `${(l.v / (m.t1.validos || 1)) * 100}%`, background: l.cor }} />
                  </div>
                  <span className="text-right tabular-nums">{pct(l.v / (m.t1.validos || 1))}</span>
                </div>
              ))}
            </div>
            <div className="border-t pt-4">
              <div className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">2º turno</div>
              <DuelBar lula={m.t2.lula} flavio={m.t2.flavio} />
            </div>
            <div className="grid grid-cols-3 gap-3 border-t pt-4 text-sm">
              <div>
                <div className="text-xs text-muted-foreground">Lula ganhou</div>
                <div className="font-semibold tabular-nums" style={{ color: LULA }}>+{fmt(m.ganhoLula)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Flávio ganhou</div>
                <div className="font-semibold tabular-nums" style={{ color: FLAVIO }}>{m.ganhoFlavio >= 0 ? "+" : ""}{fmt(m.ganhoFlavio)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Outros no 1º turno</div>
                <div className="font-semibold tabular-nums">{fmt(m.t1.outros)}</div>
              </div>
            </div>
            {m.modelo && (
              <div className="rounded-lg bg-muted/60 p-3 text-sm">
                Pelo 1º turno da própria cidade, o esperado era Lula com <b>{pct(m.modelo.esperado)}</b> no 2º turno. O real foi <b>{pct(m.pl2)}</b>{" "}
                ({pp(m.modelo.residuo)}, z = {m.modelo.z.toLocaleString("pt-BR")}).
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Conferência da cidade</CardTitle>
            <CardDescription>Mesmos critérios para todas as cidades</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {m.checks.map((c) => (
              <CheckItem key={c.id} c={c} />
            ))}
          </CardContent>
        </Card>
      </div>

      {!m.exterior && (
        <Card>
          <CardHeader>
            <CardTitle>Locais de votação</CardTitle>
            <CardDescription>Cada ponto é um local de votação (escola, por exemplo), com o tamanho proporcional ao eleitorado. Coordenadas do cadastro do TSE.</CardDescription>
          </CardHeader>
          <CardContent>
            <LocaisMap ibge={m.ibge} locais={d.locais} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Por bairro</CardTitle>
          <CardDescription>
            O TSE não publica resultado por bairro. Aqui os votos de cada seção foram somados pelo bairro do local de votação, que nem sempre é o bairro onde o eleitor mora.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BairrosTable bairros={d.bairros} locais={d.locais} />
        </CardContent>
      </Card>

      {tardias.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Seções que encerraram depois das {TARDIA} no 2º turno</CardTitle>
            <CardDescription>
              {fmt(tardias.length)} seções. O horário é o de encerramento registrado no boletim de urna (Brasília). O comparecimento inclui todos que votaram no dia, não só depois das 17h.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-h-[480px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Zona/Seção</TableHead>
                    <TableHead>Local</TableHead>
                    <TableHead>Bairro</TableHead>
                    <TableHead className="text-right">Encerrou</TableHead>
                    <TableHead className="text-right">No 1º turno</TableHead>
                    <TableHead className="text-right">Votaram</TableHead>
                    <TableHead className="text-right">Lula</TableHead>
                    <TableHead className="text-right">Flávio</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tardias.slice(0, 400).map((t) => (
                    <TableRow key={`${t.z}-${t.s}`}>
                      <TableCell className="tabular-nums">{t.z}/{t.s}</TableCell>
                      <TableCell className="max-w-56 truncate">{t.local}</TableCell>
                      <TableCell className="max-w-40 truncate text-muted-foreground">{t.bairro}</TableCell>
                      <TableCell className="text-right tabular-nums">{t.enc}</TableCell>
                      <TableCell className="text-right text-muted-foreground tabular-nums">{t.enc1 ?? "—"}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmt(t.c)}</TableCell>
                      <TableCell className="text-right tabular-nums" style={{ color: LULA }}>{fmt(t.l)}</TableCell>
                      <TableCell className="text-right tabular-nums" style={{ color: FLAVIO }}>{fmt(t.f)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {tardias.length > 400 && <p className="mt-2 text-xs text-muted-foreground">Mostrando as 400 que fecharam mais tarde.</p>}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
