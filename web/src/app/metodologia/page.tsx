import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AvisoPesquisa, FONTES, PageHeader, QuemFez } from "@/components/shared"
import { getHorario, getResumo } from "@/lib/data"
import { fmt } from "@/lib/format"
import { stats } from "@/lib/stats"

export const metadata = { title: "Metodologia · Apuração 2026" }

function Secao({ id, titulo, children }: { id?: string; titulo: string; children: React.ReactNode }) {
  return (
    <Card id={id} className="scroll-mt-20">
      <CardHeader>
        <CardTitle>{titulo}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm leading-relaxed text-muted-foreground [&_b]:text-foreground [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:text-foreground">
        {children}
      </CardContent>
    </Card>
  )
}

export default async function Metodologia() {
  const [r, h] = await Promise.all([getResumo(), getHorario()])
  return (
    <div className="space-y-4">
      <PageHeader title="Metodologia">Como os dados foram obtidos, o que cada checagem mede e o que ela não consegue dizer.</PageHeader>

      <Secao titulo="Finalidade e aviso">
        <AvisoPesquisa completo />
        <p>
          Este é um trabalho de pesquisa e estudo. Ele não substitui a totalização oficial, as auditorias da Justiça Eleitoral nem a fiscalização feita por partidos e entidades. Nenhuma
          conclusão deste site deve ser lida como prova de fraude ou como certificado de que não houve nenhum problema.
        </p>
      </Secao>

      <Secao titulo="Fontes oficiais">
        <p>
          <b>Resultado divulgado por município</b>: arquivos JSON do sistema de divulgação do TSE (
          <a href={r.fonte.divulgacao} target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">
            {r.fonte.divulgacao}
          </a>
          ), eleições 6257 (1º turno) e 6258 (2º turno), cargo Presidente. Última atualização: {r.fonte.atualizadoT1} e {r.fonte.atualizadoT2}.
        </p>
        <p>
          <b>Boletins de urna</b> (BU na Web), um registro por seção com votos, eleitorado, horários de abertura, encerramento, emissão e recebimento, no Portal de Dados Abertos do TSE (
          <a href={r.fonte.dadosAbertos} target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">
            {r.fonte.dadosAbertos}
          </a>
          ).
        </p>
        <p>
          <b>Locais de votação</b>: “Eleitorado por local de votação 2026”, do TSE, com nome, endereço, bairro e coordenadas de cada local.
        </p>
        <p>
          <b>Contornos dos municípios</b>: malha do IBGE simplificada (projeto{" "}
          <a href="https://github.com/tbrugz/geodata-br" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">
            geodata-br
          </a>
          ). Não é dado eleitoral; serve só para desenhar o mapa.
        </p>
        <p>
          <b>Imagens</b>: as fotos dos candidatos vêm do sistema de divulgação do TSE. Bandeiras dos estados e das cidades e fotos das cidades vêm do{" "}
          <a href="https://www.wikidata.org/" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">
            Wikidata
          </a>{" "}
          e do{" "}
          <a href="https://commons.wikimedia.org/" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">
            Wikimedia Commons
          </a>{" "}
          (autoria e licença de cada imagem estão na página do arquivo no Commons). As imagens são carregadas direto dessas fontes, não ficam guardadas aqui, e são só ilustrativas: quando
          uma imagem não existe ou não carrega, aparece um ícone no lugar.
        </p>
        <p>
          <b>Votos depois das 17h no 2º turno e horários da virada na apuração</b>: números divulgados pelo TSE (
          <a href={h.referenciaTSE.fonte} target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">
            notícia do TSE
          </a>
          ,{" "}
          <a href={h.referenciaTSE.fonteImprensa} target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">
            reportagem
          </a>
          ,{" "}
          <a href={stats.lideranca.tse.fonte} target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">
            checagem do TSE
          </a>
          ). São os únicos números do site que não vêm de um arquivo de dados, e sim de declarações do TSE. Ficam num só arquivo do pipeline (
          <code>pipeline/fontes_externas.json</code>), com a fonte ao lado.
        </p>
        <p>Todos os outros números foram calculados a partir desses arquivos, sem digitação manual. Links diretos:</p>
        <ul className="list-disc space-y-1 pl-5">
          {FONTES.map((f) => (
            <li key={f.url}>
              <a href={f.url} target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">
                {f.nome}
              </a>
            </li>
          ))}
        </ul>
      </Secao>

      <Secao id="secoes" titulo="Quantas seções? Três números, três conceitos">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <b>{fmt(stats.secoes.previstas)} seções previstas</b>: todas as seções do cadastro, como aparece no sistema de divulgação do TSE (campo “total de seções”).
          </li>
          <li>
            <b>{fmt(stats.secoes.instaladas)} seções instaladas</b>: as que funcionaram no dia, segundo o mesmo sistema. A diferença ({fmt(stats.secoes.naoInstaladas)}) são seções
            previstas que não foram instaladas.
          </li>
          <li>
            <b>{fmt(stats.secoes.boletins.t2)} boletins de urna</b> no arquivo “BU na Web” do 2º turno ({fmt(stats.secoes.boletins.t1)} no 1º): é o que este site soma um a um. São{" "}
            {fmt(stats.secoes.boletinsBrasil.t2)} no Brasil e {fmt(stats.secoes.boletinsExterior.t2)} no exterior.
          </li>
        </ul>
        <p>
          Das {fmt(stats.secoes.naoInstaladas)} seções não instaladas, {fmt(stats.secoes.naoInstaladasExterior)} são do exterior. A diferença entre instaladas e boletins (
          {fmt(stats.secoes.instaladas - stats.secoes.boletins.t2)}) vem de seções instaladas em que ninguém votou no 2º turno, e que por isso não têm boletim no arquivo:{" "}
          {stats.secoes.semBoletim.map((x, i) => (
            <span key={x.key}>
              {i > 0 && (i === stats.secoes.semBoletim.length - 1 ? " e " : ", ")}
              {x.nome} ({x.exterior ? "exterior" : x.key.slice(0, 2).toUpperCase()}: {fmt(x.instaladas)} instalada, {fmt(x.boletins)} boletim, {fmt(x.comparecimento)} votantes)
            </span>
          ))}
          . Não falta nenhum voto: a soma dos boletins dá exatamente o total divulgado.
        </p>
      </Secao>

      <Secao titulo="Integridade: as fontes concordam entre si?">
        <p>
          O sistema de divulgação e os boletins de urna são publicações separadas. Somamos os {fmt(stats.secoes.boletins.t2)} boletins e comparamos com o divulgado, cidade por cidade e no
          total, nos dois turnos. Também conferimos dentro de cada boletim se o comparecimento não passa do eleitorado e se brancos + nulos + votos nominais somam o comparecimento.
        </p>
        <p>
          O que isso <b>não</b> prova: que o boletim reflete o que cada eleitor digitou. Para isso existem auditorias como o teste de integridade, a conferência das assinaturas digitais e o
          Registro Digital do Voto (RDV), que ficam fora deste app.
        </p>
      </Secao>

      <Secao id="modelo" titulo="Modelo 1º turno → 2º turno">
        <p>
          Para cada cidade, a variável prevista é a fatia de Lula nos votos válidos do 2º turno. As explicativas vêm do 1º turno da mesma cidade: fatia de Lula, Caiado, Augusto Cury, Renan
          Santos e demais candidatos nos válidos, brancos + nulos, comparecimento, variação do comparecimento, mais um efeito fixo por estado. Regressão por mínimos quadrados ponderada pela raiz
          dos votos válidos.
        </p>
        <p>
          O <b>resíduo</b> é real − previsto. Para comparar cidades de tamanhos diferentes, o resíduo é dividido pela dispersão robusta (1,4826 × desvio absoluto mediano) de cidades da mesma faixa de
          eleitorado (5 faixas). Esse é o <b>z</b>. Limiares fixos e simétricos: |z| ≥ {r.limiares.atencao} vira <b>Atenção</b>, |z| ≥ {r.limiares.fora} vira <b>Fora do padrão</b>.
        </p>
        <p>
          Os coeficientes dos candidatos podem ser lidos como “quanto do eleitorado de cada um foi para Lula”, mas é uma estimativa a partir de diferenças entre cidades (inferência ecológica), com
          margem de erro e sujeita a viés quando o comportamento muda de uma cidade para outra.
        </p>
        <p>
          Por que uma cidade pode ficar fora do padrão sem nada de errado: cidades pequenas com poucos votos, apoio de prefeito ou liderança local para um dos lados, mudança de local de votação,
          eleição local muito disputada no mesmo dia (governador) ou erro de cadastro. O app aponta, você investiga.
        </p>
      </Secao>

      <Secao titulo="Comparecimento">
        <p>Variação do comparecimento (2º − 1º turno) de cada cidade, comparada com as outras cidades do mesmo estado em escala robusta. Mesmos limiares do modelo.</p>
      </Secao>

      <Secao titulo="Horário de votação e seções prorrogadas">
        <p>
          Os horários de abertura e encerramento do boletim vêm na hora local da seção. Convertemos para Brasília usando o fuso do município, inferido pela hora de abertura mais comum (a votação
          abriu às 8h de Brasília em todo o país). O horário de recebimento já vem em Brasília. Seções do exterior ficam fora dessa análise, porque lá a votação segue o horário local.
        </p>
        <p>
          Uma seção é considerada <b>prorrogada</b> (ou tardia) por uma regra única, usada em todas as páginas: {stats.tardias.regra} No 2º turno são{" "}
          {fmt(stats.tardias.t2.secoes)} seções:{" "}
          {stats.tardias.t2.faixas.map((f, i) => (
            <span key={f.faixa}>
              {i > 0 && (i === stats.tardias.t2.faixas.length - 1 ? " e " : ", ")}
              {fmt(f.secoes)} {f.rotulo}
            </span>
          ))}
          . O boletim não diz a hora de cada voto, então o comparecimento dessas seções é um
          <b> teto</b>: inclui todo mundo que votou desde a manhã. A conta voto a voto depende dos logs das urnas (arquivos “Arquivos transmitidos para totalização”, dezenas de GB), que não foram
          usados aqui.
        </p>
        <p>
          A curva da apuração usa o horário em que cada boletim chegou ao TSE. Ela mostra a ordem de chegada, que depende de região, fuso horário, transmissão e da suspensão entre 17h e 19h no
          2º turno. Por isso a liderança pode mudar sem que nenhum voto mude.
        </p>
      </Secao>

      <Secao titulo="Testes estatísticos e seus limites">
        <p>
          <b>Último dígito</b>: em contagens grandes, o último algarismo tende a se distribuir de forma quase uniforme. Como há mais seções com poucos votos do que com muitos, os dígitos baixos
          aparecem um pouco mais mesmo em contagem honesta; por isso o esperado é calculado a partir da própria distribuição (média móvel de 10 valores), e não como 10% fixo. Usamos contagens
          a partir de 50 votos.
        </p>
        <p>
          <b>Lei de Benford</b> não foi usada como alarme. Em seções eleitorais, o tamanho é limitado (algumas centenas de eleitores), e a literatura mostra que Benford no primeiro dígito gera
          falsos alarmes nesse tipo de dado.
        </p>
        <p>
          <b>Votação quase unânime</b>: contamos seções com 95% ou mais para um candidato e conferimos se o mesmo perfil já existia no 1º turno.
        </p>
      </Secao>

      <Secao id="quem-fez" titulo="Quem fez e código aberto">
        <QuemFez />
        <p>
          Nenhum número do site é digitado à mão: todos saem do pipeline, que grava os arquivos em <code>web/public/data</code>. Os números que aparecem em mais de uma página vêm de um só
          arquivo (<code>stats.json</code>). O comando <code>npm run check-dados</code> confere se as somas batem entre si antes de publicar.
        </p>
      </Secao>

      <Secao titulo="Bairros">
        <p>
          O TSE não publica resultado por bairro. O app soma os votos de cada seção pelo bairro do local de votação informado no cadastro do TSE. O eleitor vota onde está inscrito, que pode não
          ser o bairro onde mora hoje, e o nome do bairro vem como foi digitado no cadastro.
        </p>
      </Secao>
    </div>
  )
}
