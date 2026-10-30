# Apuração 2026 · conferência independente

Projeto de pesquisa e estudo para comparar o 1º e o 2º turno da eleição presidencial de 2026, cidade por cidade, usando só dados públicos e oficiais do TSE, com checagens automáticas e imparciais.

> **Aviso.** Este projeto serve apenas para pesquisa, estudo e para ajudar a tirar dúvidas. Ele **não prova que houve fraude** e **não atesta que o resultado está 100% certo**; nada aqui é definitivo, laudo ou perícia. Os indicadores apontam onde vale olhar. A referência oficial é sempre a Justiça Eleitoral.

Fontes oficiais: [Resultados (TSE)](https://resultados.tse.jus.br/oficial/ele2026/) · [Boletins de urna (Dados Abertos TSE)](https://dadosabertos.tse.jus.br/dataset/resultados-2026-boletim-de-urna) · [Eleitorado por local de votação 2026](https://cdn.tse.jus.br/estatistica/sead/odsele/eleitorado_locais_votacao/eleitorado_local_votacao_2026.zip) · [Portal de Dados Abertos do TSE](https://dadosabertos.tse.jus.br/)

## Rodar

```bash
cd web
npm install
npm run dev          # http://localhost:3000
```

Os dados já processados estão em `web/public/data`, então o app roda sem baixar nada.

## Refazer todos os números com um comando

Precisa de Python 3.10+, Node 20+, `bash` e `curl` (no Windows, o Git Bash) e cerca de 6 GB livres.

```bash
pip install -r pipeline/requirements.txt
(cd web && npm install)
python pipeline/refazer.py
```

O `refazer.py` roda, em ordem:

| Etapa | O que faz | Baixa de |
|---|---|---|
| `01_fetch_divulgacao.py` | resultado por município, 1º e 2º turno (JSON originais do TSE) | resultados.tse.jus.br |
| `00_download_bu.sh` | boletins de urna (BU na Web) dos dois turnos e locais de votação, ~5 GB | cdn.tse.jus.br |
| `02_process_bu.py` | uma linha por seção, só Presidente (DuckDB → Parquet) | — |
| `03_build.py` | checagens, totais e todos os arquivos de `web/public/data` | — |
| `04_analise.py` | cenários “e se?” da aba Análise (lê só `web/public/data`) | — |
| `npm run check-dados` | confere se as somas batem entre si (falha se não baterem) | — |

Os arquivos brutos ficam em `../raw` (fora do repositório). Para usar outra pasta, defina `RAW_DIR`.
Se os arquivos já estiverem baixados: `python pipeline/refazer.py --sem-download`.

Para conferir sem refazer nada, só rode `cd web && npm run check-dados`.

### Onde cada regra está definida

- `pipeline/regras.py`: o que é uma **seção tardia** (encerrou depois de 17:10:00 em Brasília, com segundos, sem o exterior) e as faixas de horário. Única definição, usada em todas as contas.
- `pipeline/fontes_externas.json`: os únicos números que não saem de arquivo de dados (declarações do TSE: votos depois das 17h, horários da virada), com o link da fonte.
- `web/public/data/stats.json`: gerado pelo `03_build.py`; todos os números que aparecem em mais de uma página saem daqui.
- `web/src/lib/autoria.ts`: nome, contato e link do repositório mostrados no site.

Nenhuma chave ou senha é necessária: todas as fontes são públicas.

## Arquitetura

```
TSE (resultados.tse.jus.br)        TSE (dadosabertos.tse.jus.br)
  JSON por município                 BU por seção · locais de votação
          │                                   │
          ▼                                   ▼
 01_fetch_divulgacao.py            02_process_bu.py (DuckDB → Parquet)
          └──────────────┬────────────────────┘
                         ▼
                   03_build.py
   integridade · modelo 1º→2º turno · horário · testes estatísticos
                         ▼
               web/public/data/*.json
                         ▼
     Next.js 16 (App Router) + shadcn/ui + Recharts + d3-geo
```

| Página | O que mostra |
|---|---|
| `/` | Resultado, de onde vieram os votos novos, resumo da conferência, tabela por estado |
| `/mapa` | Mapa por município: 1º turno, 2º turno, quem cresceu, desvio do esperado, seções prorrogadas, conferência |
| `/cidades` | Todas as cidades, com busca, filtros e ordenação |
| `/cidade/[key]` | Detalhe: candidatos, checagens, mapa dos locais de votação, bairros, seções que fecharam tarde |
| `/horario` | Curva da apuração minuto a minuto, primeira parcial, horários de encerramento 1º × 2º turno |
| `/conferencia` | Todas as checagens nacionais, cidades com maior desvio (dos dois lados), último dígito, modelo |
| `/analise` | Cenários contra o vencedor (só votos até 17h, sem cidades em atenção/fora do padrão, combinados) e veredito por tema: conta fechada × sem indício |
| `/metodologia` | Fontes, regras e limitações |

Cores: vermelho = Lula, azul = Flávio. Status da conferência usa verde/âmbar/roxo, para não confundir com candidato.

## Limitações conhecidas

- O boletim de urna traz a hora de encerramento da seção, não a de cada voto. A contagem voto a voto depois das 17h exige os logs das urnas (`arqurnatot`, dezenas de GB). Esse é o próximo passo natural.
- Bairro é o do local de votação no cadastro do TSE.
- O modelo de transferência é uma inferência ecológica (a partir de diferenças entre cidades), não o voto de cada pessoa.
- A malha de municípios (geodata-br) não tem os municípios mais novos; eles aparecem na tabela, mas não no mapa.

## Quem fez

Rafael F. Souza · [Instagram @rsouzad3v](https://www.instagram.com/rsouzad3v/) · Código: [github.com/RSouzaD3v/apuracao2026](https://github.com/RSouzaD3v/apuracao2026)
