export type Nivel = "ok" | "atencao" | "fora"

/** Linha enxuta por município (public/data/municipios.json) */
export type MunRow = {
  k: string // chave TSE (uf + código TSE), ex.: sp71072
  i: string // código IBGE
  uf: string
  n: string
  cap: boolean
  ext: boolean
  ap: number
  l1: number
  f1: number
  o1: number
  l2: number
  f2: number
  pl1: number | null
  pf1: number | null
  pl2: number | null
  sw: number | null
  c1: number | null
  c2: number | null
  z: number | null
  res: number | null
  zc: number | null
  tr: number
  ctr: number
  nv: Nivel
}

export type Check = {
  id: string
  grupo?: string
  nivel: Nivel
  titulo: string
  texto: string
}

export type Resumo = {
  fonte: { divulgacao: string; dadosAbertos: string; atualizadoT1: string; atualizadoT2: string }
  t1: {
    aptos: number; comparecimento: number; abstencoes: number; validos: number; brancos: number; nulos: number
    candidatos: { numero: string; nome: string; partido: string; votos: number; sq?: string }[]
  }
  t2: {
    aptos: number; comparecimento: number; abstencoes: number; validos: number; brancos: number; nulos: number
    lula: number; flavio: number
  }
  margem: number
  decomposicao: {
    ganhoLula: number; ganhoFlavio: number; outros1: number; brancosNulos1: number; brancosNulos2: number
    comp1: number; comp2: number; validos1: number; validos2: number
  }
  contagemNiveis: Record<Nivel, number>
  limiares: { atencao: number; fora: number; tardia: string }
}

export type Conferencia = {
  checks: Check[]
  digitos: Record<string, { contagens: number[]; esperado: number[]; chi2: number; p: number; desvioMax: number; n: number }>
  modelo: { coef: { nome: string; coef: number }[]; r2: number; n: number; contagem: Record<string, number>; lado: Record<string, number> }
}

export type PontoTotalizacao = { h: string; secoes: number; pctSecoes: number; lula: number; flavio: number; pl: number; pf: number }

export type FaixaTardia = { faixa: "17" | "18" | "19"; rotulo: string; secoes: number; comp: number; lula: number; flavio: number }

/** Totais de seções tardias de um turno. `total` = boletins do Brasil (sem exterior). */
export type Tardias = {
  secoes: number; comp: number; lula: number; flavio: number; validos: number; lulaResto: number; flavioResto: number; validosResto: number
  apos18: number; apos19: number; total: number; faixas: FaixaTardia[]
}

export type ReferenciaTSE = { votosApos17h: number; entre17e18: number; entre18e19: number; apos19: number; fonte: string; fonteImprensa: string }

/** public/data/stats.json: números compartilhados entre páginas */
export type Stats = {
  secoes: {
    previstas: number; instaladas: number; naoInstaladas: number; previstasT1: number; instaladasT1: number
    boletins: { t1: number; t2: number }; boletinsBrasil: { t1: number; t2: number }; boletinsExterior: { t1: number; t2: number }
    semBoletim: { key: string; nome: string; exterior: boolean; instaladas: number; boletins: number; comparecimento: number }[]
    naoInstaladasExterior: number
  }
  tardias: { rotulo: string; regra: string; t1: Tardias; t2: Tardias }
  localidades: { total: number; municipios: number; exterior: number; niveis: Record<Nivel, number> }
  lideranca: { dados: { h: string; lider: "lula" | "flavio"; pctSecoes: number }[]; tse: { flavio: string; lula: string; fonte: string } }
  votosApos17h: ReferenciaTSE
  checagensTSE: { titulo: string; orgao: string; url: string }[]
  fontesProrrogacao: { nome: string; url: string }[]
}

export type Horario = {
  histograma: { h: string; t1: number; t2: number; t1Tardia: number; t2Tardia: number }[]
  tardias: Record<"1" | "2", Tardias>
  pareado: { dif: number; cidades: number }
  mesmoPerfil1T: number
  totalizacao: { t1: PontoTotalizacao[]; t2: PontoTotalizacao[] }
  lideranca: { h: string; lider: "lula" | "flavio"; pctSecoes: number }[]
  primeiraParcial: { porUf: { uf: string; secoes: number; lula: number; flavio: number }[]; lula: number; flavio: number }
  referenciaTSE: ReferenciaTSE
}

export type UfRow = {
  uf: string
  t1: { lula: number; flavio: number; validos: number; comp: number; aptos: number }
  t2: { lula: number; flavio: number; validos: number; comp: number; aptos: number }
  somaMunConfere: boolean
  tardias2: number; compTardias2: number; lulaTardias2: number; flavioTardias2: number; tardias1: number
  atencao: number; fora: number; municipios: number
}

export type Local = {
  z: number; id: number; nome: string; bairro: string; end: string; lat: number | null; lon: number | null
  secoes: number; ap: number; l1: number; f1: number; o1: number; l2: number; f2: number; c1: number; c2: number
  tardias: { s: number; enc: string; fx: "17" | "18" | "19"; c: number; l: number; f: number; enc1: string | null }[]
}

export type MunDetalhe = {
  municipio: {
    key: string; ibge: string; uf: string; nome: string; capital: boolean; exterior: boolean; aptos: number
    t1: { lula: number; flavio: number; outros: number; validos: number; brancos: number; nulos: number; comp: number; aptos: number; princ: Record<string, number> }
    t2: { lula: number; flavio: number; validos: number; brancos: number; nulos: number; comp: number; aptos: number }
    bu: { secoes2: number; tardias1: number; tardias2: number; compTardias2: number; lulaTardias2: number; flavioTardias2: number; ultimo2: string | null; s95_1: number; s95_2: number; biom1: number; biom2: number }
    pl1: number | null; pf1: number | null; pl2: number | null; swing: number | null; ganhoLula: number; ganhoFlavio: number
    comp1: number | null; comp2: number | null
    modelo?: { esperado: number; residuo: number; z: number; nivel: Nivel }
    zComp?: number
    checks: Check[]
    nivel: Nivel
  }
  locais: Local[]
  bairros: { nome: string; locais: number; l1: number; f1: number; o1: number; l2: number; f2: number; c1: number; c2: number; ap: number }[]
}

/** Cenários "e se?" e veredito por tema (public/data/analise.json, gerado por pipeline/04_analise.py) */
export type Cenario = {
  id: string; grupo: string; titulo: string; pergunta: string; premissa: string
  /** conta = limite aritmético; estatistica = teste de padrão */
  tipo: "conta" | "estatistica"
  lula: number; flavio: number; margem: number; vencedor: "lula" | "flavio"; pl: number
}

export type Veredito = { id: string; titulo: string; nivel: Nivel; tipo: "conta" | "estatistica"; texto: string }

export type Analise = {
  margem: number; lula: number; flavio: number
  prorrogacao: Cenario[]
  tse: ReferenciaTSE
  anomalas: Cenario[]
  anomalasResumo: { cidades: number; atencao: number; fora: number; lula: number; flavio: number; excesso: number; excessoLula: number; viradaFrac: number; motivos: Record<string, number> }
  outras: {
    corrCompSwing: number; swingCompSubiu: number | null; swingCompCaiu: number | null
    cresceu: number; cidades: number; swingQuartis: number[]; ufSwing: { uf: string; sw: number }[]
    nVirar: number; apVirar: number; cidadesLula: number
    digital: {
      locais: number; t1: Record<string, number>; t2: Record<string, number>; semHistorico: number
      unanimes: { k: string; mun: string; uf: string; local: string; ap: number; c1: number; c2: number; cand: "lula" | "flavio"; p1: number; p2: number }[]
    }
    simetria: { lula: number; flavio: number; p: number }
    virar: number; urnasEquiv: number
  }
  veredito: Veredito[]
  limites: string[]
}
