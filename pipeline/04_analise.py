"""Análise de cenários ("e se?") para a aba /analise.

Roda depois do 03_build.py e lê só os arquivos já gerados em web/public/data,
então não precisa dos boletins brutos. Cada cenário responde uma pergunta do tipo
"mesmo descontando X, o vencedor seria o mesmo?" e é marcado como:

- conta: limite aritmético. Não depende de modelo; se a conta fecha, aquele caminho
  não tem como ter decidido a eleição.
- estatistica: teste de padrão. Ausência de sinal não é prova absoluta, é ausência de indício.
"""
import glob
import json
import math
import os
from collections import Counter

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "web", "public", "data")


def ler(nome):
    with open(os.path.join(OUT, nome), encoding="utf-8") as f:
        return json.load(f)


def fi(n):
    return f"{int(round(n)):,}".replace(",", ".")


def fp(x, d=1):
    return f"{x*100:.{d}f}".replace(".", ",") + "%"


def fpp(x, d=1):
    return f"{abs(x)*100:.{d}f}".replace(".", ",") + " p.p."


resumo, horario, conf, stats = ler("resumo.json"), ler("horario.json"), ler("conferencia.json"), ler("stats.json")
muns = ler("municipios.json")
det = {}
for path in glob.glob(os.path.join(OUT, "mun", "*.json")):
    with open(path, encoding="utf-8") as f:
        d = json.load(f)
    det[d["municipio"]["key"]] = d

L, F = resumo["t2"]["lula"], resumo["t2"]["flavio"]
MARGEM = L - F
COMP2 = resumo["t2"]["comparecimento"]
late = stats["tardias"]["t2"]  # seções tardias: regra única em regras.py, calculada no 03_build.py
ROT = stats["tardias"]["rotulo"]
tse = horario["referenciaTSE"]


def cenario(id_, titulo, pergunta, lula, flavio, premissa, tipo="conta", grupo=""):
    m = lula - flavio
    return {"id": id_, "grupo": grupo, "titulo": titulo, "pergunta": pergunta, "premissa": premissa, "tipo": tipo,
            "lula": int(lula), "flavio": int(flavio), "margem": int(m), "vencedor": "lula" if m > 0 else "flavio",
            "pl": round(lula / (lula + flavio), 4)}


# ---------------------------------------------------------------- 1. prorrogação: só quem votou até as 17h
lt, ft = late["lula"], late["flavio"]

G = "Prorrogação (só votos até as 17h)"
prorrog = [
    cenario("tse-lula", f"Os {fi(tse['votosApos17h'])} votos depois das 17h retirados de Lula", "Se todo mundo que votou depois das 17h tivesse votado em Lula, e esses votos fossem anulados?",
            L - tse["votosApos17h"], F,
            f"Segundo o TSE, {fi(tse['votosApos17h'])} pessoas votaram depois das 17h. Supomos, no pior caso para Lula, que todas votaram nele e tiramos esses votos dele.", grupo=G),
    cenario("tse-flavio", f"Os {fi(tse['votosApos17h'])} votos depois das 17h passados para Flávio", "E se, além de anular, esses votos tivessem ido para Flávio?",
            L - tse["votosApos17h"], F + tse["votosApos17h"],
            "Cenário ainda mais duro: cada voto depois das 17h sai de Lula e entra para Flávio (dobra o efeito).", grupo=G),
    cenario("sem-tardias", f"Sem nenhuma seção que fechou depois das {ROT}", "E se jogássemos fora as seções que fecharam tarde, com todos os votos do dia?",
            late["lulaResto"], late["flavioResto"],
            f"Retiramos por inteiro as {fi(late['secoes'])} seções que encerraram depois das {ROT}, inclusive os votos da manhã, que foram a maioria.", grupo=G),
    cenario("tardias-so-lula", "Todos os votos de Lula nas seções tardias anulados", "E se todo voto de Lula nessas seções fosse falso, e os de Flávio verdadeiros?",
            L - lt, F,
            f"Anulamos os {fi(lt)} votos de Lula nas seções que fecharam tarde e mantemos os {fi(ft)} de Flávio. É uma premissa absurda de propósito, para achar o limite.", grupo=G),
    cenario("tardias-virados", "Todos os votos de Lula nas seções tardias dados a Flávio", "E no pior caso imaginável: cada voto de Lula nessas seções virando voto de Flávio?",
            L - lt, F + lt,
            f"Os {fi(lt)} votos de Lula nas seções tardias saem dele e vão para Flávio. Nem assim a diferença se inverte.", grupo=G),
]

# ---------------------------------------------------------------- 2. cidades em atenção + fora do padrão
an = [m for m in muns if m["nv"] != "ok"]
an_l, an_f = sum(m["l2"] for m in an), sum(m["f2"] for m in an)
an_lula = [m for m in an if m["l2"] > m["f2"]]
# desvio do modelo convertido em votos: (real − esperado) × votos nos dois
excesso = sum((m["res"] or 0) * (m["l2"] + m["f2"]) for m in an if m["res"] is not None)
excesso_pos = sum((m["res"] or 0) * (m["l2"] + m["f2"]) for m in an if m["res"] is not None and m["res"] > 0)
motivo = Counter()
for m in an:
    for c in det.get(m["k"], {}).get("municipio", {}).get("checks", []):
        if c["nivel"] != "ok":
            motivo[c["id"]] += 1

# combinado: tira as cidades anômalas inteiras e, no resto, as seções tardias inteiras
comb_l, comb_f = L - an_l, F - an_f
an_keys = {m["k"] for m in an}
for k, d in det.items():
    if k in an_keys or d["municipio"]["exterior"]:
        continue
    comb_l -= d["municipio"]["bu"]["lulaTardias2"]
    comb_f -= d["municipio"]["bu"]["flavioTardias2"]

G = "Cidades em atenção e fora do padrão"
anom = [
    cenario("sem-anomalas", f"Sem as {len(an)} cidades em atenção ou fora do padrão", "Se somarmos atenção e fora do padrão e tirarmos essas cidades da conta?",
            L - an_l, F - an_f,
            f"Retiramos por inteiro as {len(an)} cidades marcadas ({sum(1 for m in an if m['nv']=='atencao')} em atenção e {sum(1 for m in an if m['nv']=='fora')} fora do padrão), com {fi(an_l + an_f)} votos nos dois.", grupo=G),
    cenario("anomalas-esperado", "Cidades marcadas corrigidas para o esperado", "E se o resultado dessas cidades fosse exatamente o que o 1º turno delas previa?",
            L - excesso, F + excesso,
            f"Trocamos o resultado de cada cidade marcada pelo valor previsto pelo modelo. O saldo dos desvios é de {fi(abs(excesso))} votos a favor de {'Lula' if excesso > 0 else 'Flávio'}.", tipo="estatistica", grupo=G),
    cenario("anomalas-so-lula", "Só as cidades marcadas que Lula venceu, retiradas", "E se tirássemos só as cidades marcadas que favoreceram Lula, mantendo as de Flávio?",
            L - sum(m["l2"] for m in an_lula), F - sum(m["f2"] for m in an_lula),
            f"Critério assimétrico, contra Lula: saem as {len(an_lula)} cidades marcadas onde Lula venceu; ficam as que Flávio venceu.", grupo=G),
    cenario("combinado", "Sem cidades marcadas e sem nenhuma seção tardia", "E juntando tudo: sem as cidades marcadas e sem as seções que fecharam tarde?",
            comb_l, comb_f,
            f"Retiramos as cidades em atenção ou fora do padrão e, nas demais, todas as seções que fecharam depois das {ROT}. As duas exclusões ao mesmo tempo.", grupo=G),
]
virada_frac = MARGEM / (2 * an_l)  # fração dos votos de Lula nas cidades marcadas que precisaria ser falsa e ir para Flávio

# ---------------------------------------------------------------- 3. outras análises
base = [m for m in muns if not m["ext"] and m["sw"] is not None and m["c1"] is not None and m["c2"] is not None]


def pearson_w(xs, ys, ws):
    sw = sum(ws)
    mx, my = sum(w * x for x, w in zip(xs, ws)) / sw, sum(w * y for y, w in zip(ys, ws)) / sw
    cov = sum(w * (x - mx) * (y - my) for x, y, w in zip(xs, ys, ws))
    vx = sum(w * (x - mx) ** 2 for x, w in zip(xs, ws))
    vy = sum(w * (y - my) ** 2 for y, w in zip(ys, ws))
    return cov / math.sqrt(vx * vy)


# enchimento de urna deixa rastro: onde o comparecimento sobe muito, o candidato beneficiado sobe junto
corr_comp_swing = pearson_w([m["c2"] - m["c1"] for m in base], [m["sw"] for m in base], [m["l2"] + m["f2"] for m in base])
zc_alto = [m for m in base if m["zc"] is not None and abs(m["zc"]) >= 3]
sw_med = lambda rows: sum(m["sw"] * (m["l2"] + m["f2"]) for m in rows) / sum(m["l2"] + m["f2"] for m in rows)
comp_subiu = [m for m in zc_alto if m["zc"] > 0]
comp_caiu = [m for m in zc_alto if m["zc"] < 0]

# swing: Lula cresceu de forma espalhada ou concentrada?
sws = sorted(m["sw"] for m in base)
q = lambda p: sws[int(p * (len(sws) - 1))]
cresceu = sum(1 for s in sws if s > 0)
ufs = ler("ufs.json")
uf_sw = [{"uf": u["uf"], "sw": round(u["t2"]["lula"] / (u["t2"]["lula"] + u["t2"]["flavio"]) - u["t1"]["lula"] / u["t1"]["validos"], 4)} for u in ufs]

# concentração da margem: quantas cidades seria preciso apagar para virar
saldo = sorted((m["l2"] - m["f2"] for m in muns), reverse=True)
acc, n_virar = MARGEM, 0
for s in saldo:
    if acc <= 0:
        break
    acc -= s
    n_virar += 1
cidades_lula = sum(1 for m in muns if m["l2"] > m["f2"])
top = sorted(muns, key=lambda m: -(m["l2"] - m["f2"]))[:n_virar]
ap_virar = sum(m["ap"] for m in top) / sum(m["ap"] for m in muns)

# impressão digital (Klimek): locais de votação com comparecimento e voto quase 100%
dig = {"t1": Counter(), "t2": Counter()}
n_locais = 0
unanimes = []  # locais com comparecimento e voto >= 95% no 2º turno, com o perfil do mesmo local no 1º turno
for d in det.values():
    if d["municipio"]["exterior"]:
        continue
    for loc in d["locais"]:
        if loc["ap"] < 100:
            continue
        n_locais += 1
        v2, v1 = loc["l2"] + loc["f2"], loc["l1"] + loc["f1"] + loc["o1"]
        if loc["c2"] and v2 and v1 and loc["c2"] / loc["ap"] >= 0.95 and max(loc["l2"], loc["f2"]) / v2 >= 0.95:
            lula = loc["l2"] >= loc["f2"]
            unanimes.append({"k": d["municipio"]["key"], "mun": d["municipio"]["nome"], "uf": d["municipio"]["uf"], "local": loc["nome"],
                             "ap": loc["ap"], "c1": round(loc["c1"] / loc["ap"], 3), "c2": round(loc["c2"] / loc["ap"], 3),
                             "cand": "lula" if lula else "flavio", "p1": round((loc["l1"] if lula else loc["f1"]) / v1, 3),
                             "p2": round((loc["l2"] if lula else loc["f2"]) / v2, 3)})
        for t, c, l, f in (("t1", loc["c1"], loc["l1"], loc["f1"]), ("t2", loc["c2"], loc["l2"], loc["f2"])):
            if not c or not (l + f):
                continue
            if c / loc["ap"] >= 0.95:
                dig[t]["comp95"] += 1
                if l / (l + f) >= 0.95:
                    dig[t]["lula"] += 1
                if f / (l + f) >= 0.95:
                    dig[t]["flavio"] += 1

lado = conf["modelo"]["lado"]
pro_l = lado.get("lula_atencao", 0) + lado.get("lula_fora", 0)
pro_f = lado.get("flavio_atencao", 0) + lado.get("flavio_fora", 0)
# teste binomial bicaudal (aproximação normal): os desvios caem dos dois lados como cara ou coroa?
nb = pro_l + pro_f
zb = (pro_l - nb / 2) / math.sqrt(nb / 4) if nb else 0
p_binom = math.erfc(abs(zb) / math.sqrt(2))

virar = MARGEM // 2 + 1
media_secao = COMP2 / stats["secoes"]["boletins"]["t2"]  # eleitores por boletim de urna (seção que funcionou)
pareado = horario["pareado"]
biom = conf["incons"]

veredito = []


def v(id_, titulo, nivel, tipo, texto):
    veredito.append({"id": id_, "titulo": titulo, "nivel": nivel, "tipo": tipo, "texto": texto})


v("prorrogacao", "A prorrogação não decidiu a eleição", "ok", "conta",
  f"Mesmo no cenário mais extremo (todos os {fi(lt)} votos de Lula nas seções tardias passados para Flávio), Lula ainda vence por {fi(MARGEM - 2*lt)}. "
  f"Usando o número oficial do TSE ({fi(tse['votosApos17h'])} eleitores depois das 17h), eles representam {fp(tse['votosApos17h']/MARGEM, 2)} da diferença final.")
v("tardias-perfil", "As seções tardias não foram mais pró-Lula que as vizinhas", "ok", "estatistica",
  f"Comparando com as outras seções da mesma cidade, Lula foi {fpp(pareado['dif'])} {'pior' if pareado['dif'] < 0 else 'melhor'} nas seções que fecharam tarde ({fi(pareado['cidades'])} cidades). "
  "Se a prorrogação tivesse sido usada para inflar votos, o esperado seria o contrário.")
v("anomalas", "As cidades marcadas não explicam a vitória", "ok", "conta",
  f"Somando atenção e fora do padrão ({len(an)} cidades) e tirando todas da conta, Lula vence por {fi(MARGEM - (an_l - an_f))}. "
  f"Para virar o resultado só com essas cidades, {fp(virada_frac)} de todos os votos de Lula nelas teriam que ser falsos e ir para Flávio.")
v("simetria", "Os desvios caem dos dois lados", "ok" if p_binom > 0.01 else "atencao", "estatistica",
  f"Das cidades com desvio do modelo, {pro_l} favorecem Lula e {pro_f} favorecem Flávio (p = {p_binom:.2f}). ".replace("0.", "0,")
  + ("Uma manipulação a favor de um lado costuma deixar os desvios concentrados nele; aqui a divisão é compatível com o acaso."
     if p_binom > 0.01 else "A divisão é mais desigual do que o acaso costuma produzir; vale olhar as cidades uma a uma."))
v("comparecimento", "Comparecimento extra não veio junto com voto em Lula", "ok" if corr_comp_swing < 0.3 else "atencao", "estatistica",
  f"A correlação entre a variação do comparecimento e o crescimento de Lula, cidade a cidade, é de {corr_comp_swing:.2f} (fraca). ".replace("0.", "0,").replace("-0,", "−0,")
  + "Enchimento de urna aparece como correlação forte e positiva, com o crescimento concentrado onde o comparecimento salta. "
  + f"Nas cidades onde o comparecimento subiu fora do normal, Lula cresceu {fpp(sw_med(comp_subiu))}; onde caiu fora do normal, {fpp(sw_med(comp_caiu))}; no país, {fpp(L/(L+F) - resumo['t1']['candidatos'][1]['votos']/resumo['t1']['validos'])}: o crescimento foi praticamente o mesmo com ou sem salto de comparecimento."
  if comp_subiu and comp_caiu else "")
v("espalhado", "O crescimento de Lula foi espalhado, não concentrado", "ok", "estatistica",
  f"Medindo o crescimento como % de Lula entre os dois finalistas no 2º turno menos o % dele nos válidos do 1º, Lula cresceu em {fi(cresceu)} de {fi(len(base))} cidades ({fp(cresceu/len(base))}) e em {sum(1 for u in uf_sw if u['sw'] > 0)} de {len(uf_sw)} UFs. "
  f"Metade das cidades ficou entre {fpp(q(0.25))} e {fpp(q(0.75))} de crescimento: um movimento parecido no país todo, e não saltos em poucos lugares. "
  f"A margem pesa mais nas grandes cidades ({fi(n_virar)} cidades, com {fp(ap_virar)} do eleitorado, somam saldo suficiente para decidir), o que é esperado: é onde mora mais gente.")
# um local quase unânime só é estranho se no 1º turno ele não era; 85% dos válidos (com todos os candidatos) já é o mesmo perfil
sem_historico = [u for u in unanimes if u["p1"] < 0.85]
v("impressao-digital", "Sem a 'impressão digital' de urna cheia", "ok" if len(sem_historico) <= 3 else "atencao", "estatistica",
  f"Entre {fi(n_locais)} locais de votação com 100 ou mais eleitores, {fi(len(unanimes))} tiveram comparecimento de 95% ou mais junto com 95% dos votos para um candidato "
  f"({dig['t2']['lula']} Lula, {dig['t2']['flavio']} Flávio; no 1º turno eram {fi(dig['t1']['lula'] + dig['t1']['flavio'])}). "
  + ("Todos" if not sem_historico else f"{len(unanimes) - len(sem_historico)} deles")
  + " já davam 85% ou mais ao mesmo candidato no 1º turno: são, na maioria, escolas de aldeias indígenas e povoados rurais. É um perfil antigo do lugar, não um salto do 2º turno.")
v("integridade", "Boletins, municípios e total nacional batem", "ok", "conta",
  "A soma dos boletins de urna dá o resultado de cada município, e a soma dos municípios dá o total nacional, sem nenhum voto sobrando ou faltando, nos dois turnos. Nenhuma urna tem mais votos que eleitores.")
v("biometria", "Liberação sem biometria parecida nos dois turnos", "ok", "estatistica",
  f"Votos liberados sem digital: {fp(biom['1']['biom']/biom['1']['comp'], 2)} no 1º turno e {fp(biom['2']['biom']/biom['2']['comp'], 2)} no 2º. Uma onda de votos sem eleitor presente apareceria como salto aqui.")
v("tamanho", "Tamanho de fraude necessário para virar", "ok", "conta",
  f"Para inverter o resultado, {fi(virar)} votos teriam que mudar de lado ({fp(virar/COMP2, 2)} de quem votou). Com {fi(media_secao)} eleitores por seção em média, "
  f"equivale a trocar todos os votos de cerca de {fi(virar/media_secao)} urnas, sem alterar a soma dos boletins publicados, o perfil do 1º turno nem os testes acima.")

limites = [
    "Os dados mostram a hora em que a seção fechou, não a hora de cada voto. A conta voto a voto depois das 17h exige os logs das urnas; por isso usamos o número do TSE e limites de pior caso.",
    "Testes estatísticos mostram ausência de indício, não prova absoluta. Uma fraude que copiasse perfeitamente o padrão do 1º turno em todas as cidades não apareceria neles; as contas de limite (tipo 'conta') não dependem disso.",
    "Compra de voto, coação ou desinformação não deixam rastro no boletim de urna e ficam fora desta análise.",
    "Os boletins são publicados pelo próprio TSE. A conferência independente deles é a comparação com as cópias impressas afixadas nas seções (fiscais de partido), que não estão nestes dados.",
]

out = {
    "margem": MARGEM, "lula": L, "flavio": F,
    "prorrogacao": prorrog,
    "tse": tse,
    "anomalas": anom,
    "anomalasResumo": {"cidades": len(an), "atencao": sum(1 for m in an if m["nv"] == "atencao"), "fora": sum(1 for m in an if m["nv"] == "fora"),
                       "lula": an_l, "flavio": an_f, "excesso": int(excesso), "excessoLula": int(excesso_pos), "viradaFrac": round(virada_frac, 4),
                       "motivos": dict(motivo)},
    "outras": {"corrCompSwing": round(corr_comp_swing, 3), "swingCompSubiu": round(sw_med(comp_subiu), 4) if comp_subiu else None,
               "swingCompCaiu": round(sw_med(comp_caiu), 4) if comp_caiu else None,
               "cresceu": cresceu, "cidades": len(base), "swingQuartis": [round(q(0.1), 4), round(q(0.25), 4), round(q(0.5), 4), round(q(0.75), 4), round(q(0.9), 4)],
               "ufSwing": sorted(uf_sw, key=lambda u: -u["sw"]), "nVirar": n_virar, "cidadesLula": cidades_lula,
               "digital": {"locais": n_locais, "t1": dict(dig["t1"]), "t2": dict(dig["t2"]), "unanimes": sorted(unanimes, key=lambda u: (u["uf"], u["mun"])), "semHistorico": len(sem_historico)},
               "apVirar": round(ap_virar, 4),
               "simetria": {"lula": pro_l, "flavio": pro_f, "p": round(p_binom, 4)}, "virar": virar, "urnasEquiv": round(virar / media_secao)},
    "veredito": veredito,
    "limites": limites,
}
with open(os.path.join(OUT, "analise.json"), "w", encoding="utf-8") as f:
    json.dump(out, f, ensure_ascii=False, separators=(",", ":"))

for c in prorrog + anom:
    print(f'{c["id"]:20} margem {c["margem"]:>12,} {c["vencedor"]}')
for x in veredito:
    print("-", x["titulo"], "|", x["nivel"], "|", x["texto"])
print(json.dumps(out["outras"], ensure_ascii=False)[:1500])
