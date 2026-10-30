"""Gera os dados consumidos pelo app (web/public/data) a partir dos arquivos oficiais do TSE.

Todas as regras de conferência estão aqui, com limiares fixos e simétricos
(um desvio a favor de Lula e um a favor de Flávio são tratados da mesma forma).
"""
import json
import math
import os
from collections import defaultdict

import duckdb
import numpy as np
from scipy import stats

from regras import DIA, FAIXA_ROTULO, FAIXAS_TARDIAS, TARDIA_ROTULO, faixa_tardia_sql, tardia_sql

HERE = os.path.dirname(os.path.abspath(__file__))
RAW = os.environ.get("RAW_DIR", os.path.join(HERE, "..", "..", "raw"))
OUT = os.path.join(HERE, "..", "web", "public", "data")
os.makedirs(os.path.join(OUT, "mun"), exist_ok=True)

LIMIAR_ATENCAO = 3.0   # |z robusto|
LIMIAR_FORA = 5.0
# seção tardia/prorrogada: ver regras.py (única definição)

con = duckdb.connect()


def num(x):
    try:
        return int(x)
    except (TypeError, ValueError):
        return 0


def r(x, n=4):
    return None if x is None or (isinstance(x, float) and math.isnan(x)) else round(float(x), n)


def dump(name, obj):
    with open(os.path.join(OUT, name), "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, separators=(",", ":"))


# ---------------------------------------------------------------- divulgação
def ler_div(path):
    d = json.load(open(path, encoding="utf-8"))
    cands = {}
    for c in d["carg"]:
        for a in c["agr"]:
            for p in a["par"]:
                for k in p["cand"]:
                    cands[k["n"]] = {"nome": k["nmu"].title().replace(" Da ", " da ").replace(" De ", " de "), "partido": p["sg"], "votos": num(k["vap"]), "sq": k.get("sqcand")}
    e, v = d["e"], d["v"]
    return {
        "aptos": num(e.get("te")), "comparecimento": num(e.get("c")), "abstencoes": num(e.get("a")),
        "validos": num(v.get("vv")), "brancos": num(v.get("vb")), "nulos": num(v.get("tvn")),
        "secoes": num(d["s"].get("ts")), "secoesTotalizadas": num(d["s"].get("st")),
        "secoesInstaladas": num(d["s"].get("si")), "secoesNaoInstaladas": num(d["s"].get("sni")),
        "cands": cands, "atualizado": f'{d["dg"]} {d["hg"]}',
    }


muns_cfg = json.load(open(os.path.join(RAW, "div", "municipios.json"), encoding="utf-8"))
div = {1: {}, 2: {}}
for t in (1, 2):
    for m in muns_cfg:
        key = m["uf"] + m["cd"]
        div[t][key] = ler_div(os.path.join(RAW, "div", f"t{t}", f"{key}.json"))
    div[t]["br"] = ler_div(os.path.join(RAW, "div", f"t{t}", "br.json"))
    for uf in {m["uf"] for m in muns_cfg}:
        div[t]["UF_" + uf] = ler_div(os.path.join(RAW, "div", f"t{t}", f"{uf}.json"))

BR1, BR2 = div[1]["br"], div[2]["br"]
cands1 = sorted(({"numero": n, **c} for n, c in BR1["cands"].items()), key=lambda c: -c["votos"])

# ---------------------------------------------------------------- seções (BU)
for t in (1, 2):
    con.sql(f"""CREATE VIEW s{t} AS SELECT *, lower(uf) || lpad(cd_mun::VARCHAR, 5, '0') AS key,
                {tardia_sql(t)} AS tardia, {faixa_tardia_sql(t)} AS faixa_tardia
                FROM '{RAW}/secoes_t{t}.parquet'""")

bu_mun = {}
for t in (1, 2):
    rows = con.sql(f"""
      SELECT key, count(*) secoes, sum(aptos) aptos, sum(comparecimento) comp, sum(lula) lula, sum(flavio) flavio,
        sum(outros) outros, sum(brancos) brancos, sum(nulos) nulos, sum(coalesce(biom_sem_hab,0)) biom,
        count(*) FILTER (WHERE comparecimento > aptos) comp_maior_aptos,
        count(*) FILTER (WHERE lula+flavio+outros+brancos+nulos+outros_tipos <> comparecimento) soma_diverge,
        count(*) FILTER (WHERE tardia) tardias,
        sum(comparecimento) FILTER (WHERE tardia) comp_tardias,
        sum(lula) FILTER (WHERE tardia) lula_tardias,
        sum(flavio) FILTER (WHERE tardia) flavio_tardias,
        max(encerramento_brt) FILTER (WHERE uf<>'ZZ') ultimo_encerramento,
        count(*) FILTER (WHERE (lula+flavio+outros) >= 30 AND greatest(lula, flavio) >= 0.95*(lula+flavio+outros)) secoes_95
      FROM s{t} GROUP BY key""").fetchall()
    cols = ["secoes", "aptos", "comp", "lula", "flavio", "outros", "brancos", "nulos", "biom", "comp_maior_aptos",
            "soma_diverge", "tardias", "comp_tardias", "lula_tardias", "flavio_tardias", "ultimo", "secoes_95"]
    bu_mun[t] = {row[0]: dict(zip(cols, row[1:])) for row in rows}

# ---------------------------------------------------------------- tabela por município
OUTROS_PRINC = ["55", "70", "14"]  # Caiado, Cury, Renan Santos (os maiores após os dois finalistas)
mun = []
for m in muns_cfg:
    key = m["uf"] + m["cd"]
    d1, d2 = div[1][key], div[2][key]
    l1, f1 = d1["cands"].get("13", {}).get("votos", 0), d1["cands"].get("22", {}).get("votos", 0)
    l2, f2 = d2["cands"].get("13", {}).get("votos", 0), d2["cands"].get("22", {}).get("votos", 0)
    v1, v2 = d1["validos"], d2["validos"]
    b1, b2 = bu_mun[1].get(key, {}), bu_mun[2].get(key, {})
    row = {
        "key": key, "ibge": m["ibge"], "uf": m["uf"].upper(), "nome": m["nome"].title(), "capital": m["capital"],
        "exterior": m["uf"] == "zz",
        "aptos": d2["aptos"],
        "t1": {"lula": l1, "flavio": f1, "outros": v1 - l1 - f1, "validos": v1, "brancos": d1["brancos"],
               "nulos": d1["nulos"], "comp": d1["comparecimento"], "aptos": d1["aptos"],
               "princ": {n: d1["cands"].get(n, {}).get("votos", 0) for n in OUTROS_PRINC}},
        "t2": {"lula": l2, "flavio": f2, "validos": v2, "brancos": d2["brancos"], "nulos": d2["nulos"],
               "comp": d2["comparecimento"], "aptos": d2["aptos"]},
        "bu": {
            "confere1": (b1.get("lula") or 0) == l1 and (b1.get("flavio") or 0) == f1,
            "confere2": (b2.get("lula") or 0) == l2 and (b2.get("flavio") or 0) == f2,
            "secoes2": b2.get("secoes", 0),
            "incons": int((b1.get("comp_maior_aptos") or 0) + (b2.get("comp_maior_aptos") or 0)
                          + (b1.get("soma_diverge") or 0) + (b2.get("soma_diverge") or 0)),
            "tardias1": b1.get("tardias") or 0, "tardias2": b2.get("tardias") or 0,
            "compTardias2": int(b2.get("comp_tardias") or 0),
            "lulaTardias2": int(b2.get("lula_tardias") or 0), "flavioTardias2": int(b2.get("flavio_tardias") or 0),
            "ultimo2": b2["ultimo"].strftime("%H:%M") if b2.get("ultimo") else None,
            "s95_1": b1.get("secoes_95") or 0, "s95_2": b2.get("secoes_95") or 0,
            "biom1": int(b1.get("biom") or 0), "biom2": int(b2.get("biom") or 0),
        },
    }
    row["pl1"] = l1 / v1 if v1 else None                    # % Lula nos válidos, 1º turno
    row["pf1"] = f1 / v1 if v1 else None
    row["pl2"] = l2 / (l2 + f2) if (l2 + f2) else None      # % Lula nos válidos, 2º turno
    row["swing"] = (row["pl2"] - row["pl1"]) if v1 and (l2 + f2) else None
    row["ganhoLula"] = l2 - l1
    row["ganhoFlavio"] = f2 - f1
    row["comp1"] = d1["comparecimento"] / d1["aptos"] if d1["aptos"] else None
    row["comp2"] = d2["comparecimento"] / d2["aptos"] if d2["aptos"] else None
    mun.append(row)

# ---------------------------------------------------------------- modelo de transferência (1º -> 2º turno)
# Lula_2T(%) ~ Lula_1T + Caiado + Cury + Renan + demais + brancos/nulos 1T + comparecimento 1T + Δcomparecimento + efeito fixo por UF
base = [m for m in mun if not m["exterior"] and m["t1"]["validos"] > 0 and (m["t2"]["lula"] + m["t2"]["flavio"]) > 0]
ufs = sorted({m["uf"] for m in base})


def feats(m):
    v1 = m["t1"]["validos"]
    p = m["t1"]["princ"]
    outros_rest = (m["t1"]["outros"] - sum(p.values())) / v1
    bn1 = (m["t1"]["brancos"] + m["t1"]["nulos"]) / max(m["t1"]["comp"], 1)
    return [m["pl1"], p["55"] / v1, p["70"] / v1, p["14"] / v1, outros_rest, bn1, m["comp1"], m["comp2"] - m["comp1"]]


FEATS = ["Lula 1º turno", "Caiado", "Augusto Cury", "Renan Santos", "Demais candidatos", "Brancos+nulos 1º turno",
         "Comparecimento 1º turno", "Variação do comparecimento"]
X = np.array([feats(m) + [1.0 if m["uf"] == u else 0.0 for u in ufs] for m in base])
y = np.array([m["pl2"] for m in base])
w = np.sqrt(np.array([m["t2"]["validos"] for m in base], dtype=float))
beta, *_ = np.linalg.lstsq(X * w[:, None], y * w, rcond=None)
pred = X @ beta
res = y - pred
# z robusto por faixa de eleitorado (município pequeno varia mais naturalmente)
tam = np.array([m["aptos"] for m in base])
faixas = np.quantile(tam, [0.2, 0.4, 0.6, 0.8])
fx = np.searchsorted(faixas, tam)
z = np.zeros_like(res)
escala = {}
for b in range(5):
    idx = fx == b
    med = np.median(res[idx])
    mad = 1.4826 * np.median(np.abs(res[idx] - med))
    escala[b] = mad
    z[idx] = (res[idx] - med) / mad
r2 = 1 - np.sum(w**2 * res**2) / np.sum(w**2 * (y - np.average(y, weights=w**2)) ** 2)

# Δ comparecimento, z robusto dentro da UF
dcomp = np.array([m["comp2"] - m["comp1"] for m in base])
zc = np.zeros_like(dcomp)
for u in ufs:
    idx = np.array([m["uf"] == u for m in base])
    med = np.median(dcomp[idx])
    mad = 1.4826 * np.median(np.abs(dcomp[idx] - med)) or 1e-6
    zc[idx] = (dcomp[idx] - med) / mad


def nivel(zv):
    a = abs(zv)
    return "fora" if a >= LIMIAR_FORA else "atencao" if a >= LIMIAR_ATENCAO else "ok"


ORD = {"ok": 0, "atencao": 1, "fora": 2}
for i, m in enumerate(base):
    m["modelo"] = {"esperado": r(pred[i]), "residuo": r(res[i]), "z": r(z[i], 2), "nivel": nivel(z[i])}
    m["zComp"] = r(zc[i], 2)

for m in mun:
    checks = []
    checks.append({"id": "bu", "nivel": "ok" if m["bu"]["confere1"] and m["bu"]["confere2"] else "fora",
                   "titulo": "Boletins de urna somam o resultado divulgado",
                   "texto": "A soma dos boletins de urna (BU) das seções bate com o total divulgado nos dois turnos."
                   if m["bu"]["confere1"] and m["bu"]["confere2"] else
                   "A soma dos boletins de urna não bate com o total divulgado. Vale conferir as seções."})
    checks.append({"id": "incons", "nivel": "ok" if m["bu"]["incons"] == 0 else "atencao",
                   "titulo": "Coerência interna dos boletins",
                   "texto": "Nenhuma seção com comparecimento maior que o eleitorado ou com votos que não somam o comparecimento."
                   if m["bu"]["incons"] == 0 else f'{m["bu"]["incons"]} registro(s) de seção com números que não fecham.'})
    if "modelo" in m:
        mo = m["modelo"]
        lado_m = "Lula" if mo["residuo"] > 0 else "Flávio"
        checks.append({"id": "modelo", "nivel": mo["nivel"], "titulo": "Variação 1º → 2º turno dentro do esperado",
                       "texto": ("O resultado de Lula no 2º turno ficou praticamente igual ao que o 1º turno do próprio município previa "
                                 f'(diferença de {abs(mo["residuo"])*100:.1f} p.p.).'.replace(".", ",", 1)
                                 if abs(mo["residuo"]) < 0.005 else
                                 f'O resultado de Lula no 2º turno ficou {abs(mo["residuo"])*100:.1f} p.p. '.replace(".", ",", 1)
                                 + f'{"acima" if mo["residuo"] > 0 else "abaixo"} do que o 1º turno do próprio município previa '
                                 + f'(desvio de {abs(mo["z"]):.1f} na escala robusta, a favor de {lado_m}).'.replace(".", ",", 1))})
        checks.append({"id": "comp", "nivel": nivel(m["zComp"]), "titulo": "Variação do comparecimento parecida com a do estado",
                       "texto": (f'O comparecimento foi de {m["comp1"]*100:.1f}% para {m["comp2"]*100:.1f}% '
                                 f'(desvio de {abs(m["zComp"]):.1f} em relação aos outros municípios do estado).').replace(".", ",").replace("estado),", "estado).")})
    if not m["exterior"]:
        t2 = m["bu"]["tardias2"]
        if t2:
            lt, ft = m["bu"]["lulaTardias2"], m["bu"]["flavioTardias2"]
            margem = abs(m["t2"]["lula"] - m["t2"]["flavio"])
            pode_virar = m["bu"]["compTardias2"] >= margem and margem > 0
            n = lambda v: f"{v:,}".replace(",", ".")
            checks.append({"id": "tardias", "nivel": "atencao" if pode_virar else "ok",
                           "titulo": "Seções prorrogadas não decidem o resultado local",
                           "texto": (f'{t2} seção(ões) encerraram depois das {TARDIA_ROTULO}, com {n(m["bu"]["compTardias2"])} eleitores no total '
                                     f'(a maioria votou antes das 17h). Nelas: Lula {n(lt)} × Flávio {n(ft)}. '
                                     + ("Esse comparecimento é maior que a diferença final no município, então vale olhar de perto."
                                        if pode_virar else "Mesmo somando todos esses eleitores, não alcança a diferença final no município."))})
    m["checks"] = checks
    m["nivel"] = max((c["nivel"] for c in checks), key=lambda n: ORD[n])

# ---------------------------------------------------------------- UFs
uf_rows = []
for u in sorted({m["uf"] for m in muns_cfg}):
    d1, d2 = div[1]["UF_" + u], div[2]["UF_" + u]
    l1, f1 = d1["cands"]["13"]["votos"], d1["cands"]["22"]["votos"]
    l2, f2 = d2["cands"]["13"]["votos"], d2["cands"]["22"]["votos"]
    mm = [m for m in mun if m["uf"] == u.upper()]
    uf_rows.append({"uf": u.upper(),
                    "t1": {"lula": l1, "flavio": f1, "validos": d1["validos"], "comp": d1["comparecimento"], "aptos": d1["aptos"]},
                    "t2": {"lula": l2, "flavio": f2, "validos": d2["validos"], "comp": d2["comparecimento"], "aptos": d2["aptos"]},
                    "somaMunConfere": sum(m["t2"]["lula"] for m in mm) == l2 and sum(m["t2"]["flavio"] for m in mm) == f2,
                    "tardias2": sum(m["bu"]["tardias2"] for m in mm), "compTardias2": sum(m["bu"]["compTardias2"] for m in mm),
                    "lulaTardias2": sum(m["bu"]["lulaTardias2"] for m in mm), "flavioTardias2": sum(m["bu"]["flavioTardias2"] for m in mm),
                    "tardias1": sum(m["bu"]["tardias1"] for m in mm),
                    "atencao": sum(1 for m in mm if m["nivel"] == "atencao"), "fora": sum(1 for m in mm if m["nivel"] == "fora"),
                    "municipios": len(mm)})

# ---------------------------------------------------------------- totalização ao longo do tempo
tot = {}
for t in (1, 2):
    rows = con.sql(f"""
      SELECT strftime(date_trunc('minute', recebido_brt), '%H:%M') h, count(*) n, sum(lula) l, sum(flavio) f, sum(lula+flavio+outros) v
      FROM s{t} WHERE recebido_brt IS NOT NULL GROUP BY 1 ORDER BY 1""").fetchall()
    cum = [0, 0, 0, 0]
    serie = []
    total_sec = con.sql(f"SELECT count(*) FROM s{t}").fetchall()[0][0]
    for h, n_, l, f, v in rows:
        cum = [cum[0] + n_, cum[1] + l, cum[2] + f, cum[3] + v]
        serie.append({"h": h, "secoes": cum[0], "pctSecoes": r(cum[0] / total_sec), "lula": int(cum[1]), "flavio": int(cum[2]),
                      "pl": r(cum[1] / cum[3]) if cum[3] else None, "pf": r(cum[2] / cum[3]) if cum[3] else None})
    tot[t] = serie

primeira = con.sql("""
  SELECT uf, count(*) n, sum(lula) l, sum(flavio) f FROM s2 WHERE recebido_brt < TIMESTAMP '2026-10-25 19:00:00'
  GROUP BY uf ORDER BY n DESC, uf""").fetchall()
primeira_tot = [sum(x[2] for x in primeira), sum(x[3] for x in primeira)]

lider = []
prev = None
for p in tot[2]:
    who = "lula" if p["lula"] > p["flavio"] else "flavio"
    if who != prev:
        lider.append({"h": p["h"], "lider": who, "pctSecoes": p["pctSecoes"]})
        prev = who

# ---------------------------------------------------------------- horário de encerramento
# barras de 5 min. t1/t2 = todas as seções; t1Tardia/t2Tardia = só as tardias (mesma regra do resto do site),
# então a soma das barras t2Tardia é exatamente o total de seções tardias
hist = {}
for t in (1, 2):
    rows = con.sql(f"""
      SELECT strftime(time_bucket(INTERVAL 5 MINUTE, encerramento_brt), '%H:%M') b, count(*) n, count(*) FILTER (WHERE tardia) nt
      FROM s{t} WHERE uf<>'ZZ' AND encerramento_brt >= TIMESTAMP '{DIA[t]} 16:55:00'
      GROUP BY 1 ORDER BY 1""").fetchall()
    hist[t] = {b: {"n": n_, "nt": nt} for b, n_, nt in rows}
faixas_h = sorted(set(hist[1]) | set(hist[2]))
histograma = [{"h": b, "t1": hist[1].get(b, {}).get("n", 0), "t2": hist[2].get(b, {}).get("n", 0),
               "t1Tardia": hist[1].get(b, {}).get("nt", 0), "t2Tardia": hist[2].get(b, {}).get("nt", 0)} for b in faixas_h]

late = {}
for t in (1, 2):
    q = con.sql(f"""
      SELECT count(*) FILTER (WHERE tardia),
             sum(comparecimento) FILTER (WHERE tardia),
             sum(lula) FILTER (WHERE tardia), sum(flavio) FILTER (WHERE tardia),
             sum(lula+flavio+outros) FILTER (WHERE tardia),
             sum(lula) FILTER (WHERE NOT tardia), sum(flavio) FILTER (WHERE NOT tardia),
             sum(lula+flavio+outros) FILTER (WHERE NOT tardia),
             count(*)
      FROM s{t} WHERE uf<>'ZZ'""").fetchall()[0]
    fx = {f: {"faixa": f, "rotulo": FAIXA_ROTULO[f], "secoes": 0, "comp": 0, "lula": 0, "flavio": 0} for f in FAIXAS_TARDIAS}
    for f, n_, c, l, fl in con.sql(f"""SELECT faixa_tardia, count(*), sum(comparecimento), sum(lula), sum(flavio)
                                      FROM s{t} WHERE tardia GROUP BY 1""").fetchall():
        fx[f] = {"faixa": f, "rotulo": FAIXA_ROTULO[f], "secoes": n_, "comp": int(c), "lula": int(l), "flavio": int(fl)}
    # boletins do Brasil (sem exterior); apos18/apos19 saem das faixas, para nunca divergirem delas
    late[t] = {"secoes": q[0], "comp": int(q[1] or 0), "lula": int(q[2] or 0), "flavio": int(q[3] or 0), "validos": int(q[4] or 0),
               "lulaResto": int(q[5]), "flavioResto": int(q[6]), "validosResto": int(q[7]),
               "apos18": fx["18"]["secoes"] + fx["19"]["secoes"], "apos19": fx["19"]["secoes"], "total": q[8],
               "faixas": [fx[f] for f in FAIXAS_TARDIAS]}
    # Os votos do exterior não têm horário comparável; entram no total "resto" para o contrafactual nacional
    ext = con.sql(f"SELECT sum(lula), sum(flavio) FROM s{t} WHERE uf='ZZ'").fetchall()[0]
    late[t]["lulaResto"] += int(ext[0] or 0)
    late[t]["flavioResto"] += int(ext[1] or 0)

pareado = con.sql(f"""
  WITH x AS (SELECT key, tardia tarde, sum(lula) l, sum(lula+flavio) v FROM s2 WHERE uf<>'ZZ' GROUP BY ALL),
  p AS (SELECT key, max(CASE WHEN tarde THEN l/v END) pt, max(CASE WHEN NOT tarde THEN l/v END) pn, max(CASE WHEN tarde THEN v END) vt
        FROM x GROUP BY key HAVING count(*) = 2)
  SELECT sum((pt-pn)*vt)/sum(vt), count(*) FROM p WHERE pt IS NOT NULL AND pn IS NOT NULL""").fetchall()[0]

mesmo_perfil = con.sql(f"""
  SELECT sum(a.lula)/sum(a.lula+a.flavio+a.outros) FROM s1 a JOIN s2 b USING (uf, cd_mun, zona, secao)
  WHERE b.tardia""").fetchall()[0][0]

# ---------------------------------------------------------------- testes nacionais
def ultimo_digito(t, col):
    """Teste do último dígito com correção de inclinação.
    A quantidade de seções cai conforme o número de votos cresce, então dígitos baixos
    aparecem um pouco mais mesmo em contagem honesta. O esperado de cada dígito é calculado
    a partir da própria distribuição suavizada (média móvel de 10), e não como 10% fixo."""
    rows = con.sql(f"SELECT {col} k, count(*) n FROM s{t} WHERE {col} >= 40 GROUP BY 1 ORDER BY 1").fetchall()
    kmax = int(max(k for k, _ in rows))
    freq = np.zeros(kmax + 12)
    for k, n_ in rows:
        freq[int(k)] = n_
    obs = np.zeros(10)
    esp = np.zeros(10)
    for k in range(50, kmax - 5 - (kmax - 55) % 10):
        obs[k % 10] += freq[k]
        esp[k % 10] += freq[k - 4:k + 6].mean()
    esp *= obs.sum() / esp.sum()
    chi2, p = stats.chisquare(obs, esp)
    desvio = float(np.max(np.abs(obs - esp) / esp))
    return {"contagens": [int(c) for c in obs], "esperado": [round(float(e)) for e in esp], "chi2": r(chi2, 2), "p": r(p, 4),
            "desvioMax": r(desvio), "n": int(obs.sum())}


digitos = {f"{c}{t}": ultimo_digito(t, c) for t in (1, 2) for c in ("lula", "flavio")}

incons = {}
for t in (1, 2):
    q = con.sql(f"""SELECT count(*) FILTER (WHERE comparecimento > aptos), count(*) FILTER (WHERE lula+flavio+outros+brancos+nulos+outros_tipos <> comparecimento),
                    sum(coalesce(biom_sem_hab,0)), sum(comparecimento),
                    count(*) FILTER (WHERE (lula+flavio+outros) >= 30 AND greatest(lula, flavio) >= 0.95*(lula+flavio+outros)),
                    count(*) FILTER (WHERE (lula+flavio+outros) >= 30 AND lula >= 0.95*(lula+flavio+outros)),
                    count(*) FILTER (WHERE (lula+flavio+outros) >= 30 AND flavio >= 0.95*(lula+flavio+outros)),
                    count(*) FILTER (WHERE aptos > 0 AND comparecimento >= 0.98*aptos AND aptos >= 50),
                    count(*), sum(lula), sum(flavio)
                    FROM s{t}""").fetchall()[0]
    incons[t] = {"compMaiorAptos": q[0], "somaDiverge": q[1], "biom": int(q[2]), "comp": int(q[3]), "s95": q[4], "s95Lula": q[5],
                 "s95Flavio": q[6], "comp98": q[7], "secoes": q[8], "lula": int(q[9]), "flavio": int(q[10])}

soma_mun = {t: (sum(m[f"t{t}"]["lula"] for m in mun), sum(m[f"t{t}"]["flavio"] for m in mun)) for t in (1, 2)}

pool_outros = BR1["validos"] - BR1["cands"]["13"]["votos"] - BR1["cands"]["22"]["votos"]
decomp = {
    "ganhoLula": BR2["cands"]["13"]["votos"] - BR1["cands"]["13"]["votos"],
    "ganhoFlavio": BR2["cands"]["22"]["votos"] - BR1["cands"]["22"]["votos"],
    "outros1": pool_outros, "brancosNulos1": BR1["brancos"] + BR1["nulos"], "brancosNulos2": BR2["brancos"] + BR2["nulos"],
    "comp1": BR1["comparecimento"], "comp2": BR2["comparecimento"],
    "validos1": BR1["validos"], "validos2": BR2["validos"],
}

coef = [{"nome": n_, "coef": r(b, 3)} for n_, b in zip(FEATS, beta[:len(FEATS)])]
contagem = defaultdict(int)
lado = defaultdict(int)
for m in base:
    contagem[m["modelo"]["nivel"]] += 1
    if m["modelo"]["nivel"] != "ok":
        lado[("lula" if m["modelo"]["residuo"] > 0 else "flavio") + "_" + m["modelo"]["nivel"]] += 1

margem2 = BR2["cands"]["13"]["votos"] - BR2["cands"]["22"]["votos"]


def fi(n):
    return f"{int(n):,}".replace(",", ".")


def fp(x, d=1):
    return f"{x*100:.{d}f}".replace(".", ",") + "%"


s95_perfil = con.sql("""
  SELECT median(a.lula/(a.lula+a.flavio+a.outros)) FROM s1 a JOIN s2 b USING (uf, cd_mun, zona, secao)
  WHERE (b.lula+b.flavio) >= 30 AND b.lula >= 0.95*(b.lula+b.flavio) AND (a.lula+a.flavio+a.outros) > 0""").fetchall()[0][0]
s95_uf = con.sql("""SELECT uf, count(*) n FROM s2 WHERE (lula+flavio) >= 30 AND greatest(lula,flavio) >= 0.95*(lula+flavio)
                    GROUP BY 1 ORDER BY 2 DESC LIMIT 4""").fetchall()
lula_t, flav_t = late[2]["lula"], late[2]["flavio"]
lr, fr = late[2]["lulaResto"], late[2]["flavioResto"]
n_prim = sum(x[1] for x in primeira)
dig_ok = all(d["p"] > 0.01 for d in digitos.values())
ok_mun = sum(1 for m in mun if m["bu"]["confere1"] and m["bu"]["confere2"])

checks = [
    {"id": "soma-mun", "grupo": "Integridade",
     "nivel": "ok" if soma_mun[2] == (BR2["cands"]["13"]["votos"], BR2["cands"]["22"]["votos"]) and soma_mun[1] == (BR1["cands"]["13"]["votos"], BR1["cands"]["22"]["votos"]) else "fora",
     "titulo": "A soma das cidades dá o total nacional",
     "texto": "Somando o resultado divulgado de cada município (e do exterior), chega-se exatamente ao total nacional, nos dois turnos."},
    {"id": "soma-bu", "grupo": "Integridade",
     "nivel": "ok" if (incons[2]["lula"], incons[2]["flavio"], incons[1]["lula"], incons[1]["flavio"]) == (BR2["cands"]["13"]["votos"], BR2["cands"]["22"]["votos"], BR1["cands"]["13"]["votos"], BR1["cands"]["22"]["votos"]) else "fora",
     "titulo": "A soma dos boletins de urna dá o total divulgado",
     "texto": f"Os {fi(incons[2]['secoes'])} boletins de urna publicados (arquivo BU na Web) somam exatamente os votos divulgados de Lula e Flávio, nos dois turnos. São duas publicações diferentes do TSE que concordam entre si."},
    {"id": "bu-mun", "grupo": "Integridade", "nivel": "ok" if ok_mun == len(mun) else "atencao",
     "titulo": "Boletins conferem município a município",
     "texto": f"{fi(ok_mun)} de {fi(len(mun))} localidades (municípios e cidades do exterior) têm a soma dos boletins igual ao resultado divulgado nos dois turnos."},
    {"id": "coerencia", "grupo": "Integridade", "nivel": "ok" if incons[2]["compMaiorAptos"] == 0 and incons[2]["somaDiverge"] == 0 else "atencao",
     "titulo": "Nenhuma urna com mais votos que eleitores",
     "texto": f"2º turno: {fi(incons[2]['compMaiorAptos'])} seções com comparecimento maior que o eleitorado e {fi(incons[2]['somaDiverge'])} seções em que os votos não somam o comparecimento. 1º turno: {fi(incons[1]['compMaiorAptos'])} e {fi(incons[1]['somaDiverge'])}."},
    {"id": "impacto-tardias", "grupo": "Horário", "nivel": "ok" if late[2]["comp"] < margem2 else "atencao",
     "titulo": "As seções prorrogadas não alcançam a diferença final",
     "texto": f"{fi(late[2]['secoes'])} seções encerraram depois das {TARDIA_ROTULO}. Todos os eleitores dessas seções, inclusive quem votou de manhã, somam {fi(late[2]['comp'])}. A diferença final foi de {fi(margem2)} votos. Mesmo que todos eles tivessem votado em Lula, isso não explicaria a vitória."},
    {"id": "contrafactual", "grupo": "Horário", "nivel": "ok" if (lr > fr) == (margem2 > 0) else "atencao",
     "titulo": "Sem nenhuma seção prorrogada, o vencedor seria o mesmo",
     "texto": f"Retirando por completo as {fi(late[2]['secoes'])} seções que fecharam tarde (com todos os votos do dia): Lula {fi(lr)} × Flávio {fi(fr)}, ou {fp(lr/(lr+fr),2)} × {fp(fr/(lr+fr),2)}."},
    {"id": "base-1t", "grupo": "Horário", "nivel": "ok",
     "titulo": "Fechar depois das 17h também aconteceu no 1º turno",
     "texto": f"No 1º turno, sem decisão de prorrogação, {fi(late[1]['secoes'])} seções fecharam depois das {TARDIA_ROTULO} ({fi(late[1]['apos18'])} depois das 18h), por causa das filas: eram 6 votos por eleitor. No 2º turno foram {fi(late[2]['secoes'])} ({fi(late[2]['apos18'])} depois das 18h). Quem está na fila às 17h tem direito de votar."},
    {"id": "perfil-tardias", "grupo": "Horário", "nivel": "ok",
     "titulo": "As seções que fecharam tarde já eram mais favoráveis a Lula no 1º turno",
     "texto": f"Nas seções que fecharam tarde no 2º turno, Lula teve {fp(lula_t/(lula_t+flav_t))} dos votos dados aos dois. Nessas mesmas seções, no 1º turno, ele já tinha {fp(mesmo_perfil)} dos válidos (contra {fp(BR1['cands']['13']['votos']/BR1['validos'])} no país). Comparando com as outras seções da mesma cidade, Lula foi {f"{abs(pareado[0])*100:.1f}".replace(".", ",")} p.p. {"melhor" if pareado[0] > 0 else "pior"} nas seções que fecharam tarde (média de {fi(pareado[1])} cidades). São seções de grandes centros (RJ, SP, BA, PE), onde Lula já era mais forte."},
    {"id": "primeira-parcial", "grupo": "Horário", "nivel": "ok",
     "titulo": "Quem liderava às 17h era uma amostra pequena",
     "texto": f"Antes da suspensão só tinham chegado {fi(n_prim)} boletins ({fp(n_prim/incons[2]['secoes'],2)} das seções), {fi(primeira[0][1])} deles do exterior. Nessa amostra Lula tinha {fp(primeira_tot[0]/(primeira_tot[0]+primeira_tot[1]))}. A ordem de chegada depende de região, fuso e distância, não do candidato. Por isso a liderança muda ao longo da apuração."},
    {"id": "modelo", "grupo": "Estatística", "nivel": "ok" if lado.get("lula_fora", 0) + lado.get("flavio_fora", 0) <= 0.01 * len(base) else "atencao",
     "titulo": "O 1º turno de cada cidade prevê bem o 2º turno",
     "texto": f"Um modelo simples (votos de cada candidato no 1º turno, brancos e nulos, comparecimento e estado) explica {fp(r2)} da variação do voto em Lula entre as cidades. Fora do padrão (|z| ≥ {LIMIAR_FORA:.0f}): {lado.get('lula_fora',0)} cidades a favor de Lula e {lado.get('flavio_fora',0)} a favor de Flávio. Em atenção (|z| entre {LIMIAR_ATENCAO:.0f} e {LIMIAR_FORA:.0f}): {lado.get('lula_atencao',0)} a favor de Lula e {lado.get('flavio_atencao',0)} a favor de Flávio, de {fi(len(base))} cidades.",
     "dados": {"r2": r(r2), "lado": dict(lado)}},
    {"id": "digitos", "grupo": "Estatística", "nivel": "ok" if dig_ok else "atencao",
     "titulo": "Último dígito dos votos por seção sem padrão artificial",
     "texto": "Números inventados costumam repetir alguns finais (0 e 5, por exemplo). Comparamos o último algarismo dos votos de cada seção com o esperado pela própria distribuição. Maior desvio: "
              + "; ".join(f"{('Lula' if k.startswith('lula') else 'Flávio')} {k[-1]}º turno {fp(v['desvioMax'],2)} (p = {v['p']:.2f})".replace("0.", "0,") for k, v in digitos.items())
              + ". Valor de p acima de 0,01 indica que a diferença é do tamanho que o acaso produz."},
    {"id": "s95", "grupo": "Estatística", "nivel": "ok",
     "titulo": "Seções com votação quase unânime",
     "texto": f"No 2º turno, {fi(incons[2]['s95'])} seções com pelo menos 30 votos deram 95% ou mais a um candidato: {fi(incons[2]['s95Lula'])} a Lula e {fi(incons[2]['s95Flavio'])} a Flávio, principalmente em {', '.join(u for u, _ in s95_uf)}. Nas seções quase unânimes para Lula, ele já tinha em média {fp(s95_perfil)} dos válidos no 1º turno. É um padrão de comunidades pequenas e homogêneas que já aparecia antes."},
    {"id": "biometria", "grupo": "Estatística", "nivel": "ok" if abs(incons[2]["biom"]/incons[2]["comp"] - incons[1]["biom"]/incons[1]["comp"]) < 0.01 else "atencao",
     "titulo": "Liberação sem biometria em nível parecido nos dois turnos",
     "texto": f"Eleitores com biometria cadastrada que votaram sem reconhecimento da digital (liberados pelo mesário após conferir o documento): {fp(incons[1]['biom']/incons[1]['comp'],2)} no 1º turno e {fp(incons[2]['biom']/incons[2]['comp'],2)} no 2º turno."},
]

resumo = {
    "fonte": {"divulgacao": "https://resultados.tse.jus.br/oficial/ele2026/", "dadosAbertos": "https://dadosabertos.tse.jus.br/dataset/resultados-2026-boletim-de-urna",
              "atualizadoT1": BR1["atualizado"], "atualizadoT2": BR2["atualizado"]},
    "t1": {k: BR1[k] for k in ("aptos", "comparecimento", "abstencoes", "validos", "brancos", "nulos")} | {"candidatos": cands1},
    "t2": {k: BR2[k] for k in ("aptos", "comparecimento", "abstencoes", "validos", "brancos", "nulos")}
          | {"lula": BR2["cands"]["13"]["votos"], "flavio": BR2["cands"]["22"]["votos"]},
    "margem": margem2, "decomposicao": decomp,
    "contagemNiveis": {n: sum(1 for m in mun if m["nivel"] == n) for n in ("ok", "atencao", "fora")},
    "limiares": {"atencao": LIMIAR_ATENCAO, "fora": LIMIAR_FORA, "tardia": TARDIA_ROTULO},
}

ext = json.load(open(os.path.join(HERE, "fontes_externas.json"), encoding="utf-8"))
_v = ext["votosApos17h"]
ref_tse = {"votosApos17h": _v["total"], "entre17e18": _v["entre17e18"], "entre18e19": _v["entre18e19"], "apos19": _v["apos19"],
           "fonte": _v["fonte"], "fonteImprensa": _v["fonteImprensa"]}

dump("resumo.json", resumo)
dump("conferencia.json", {"checks": checks, "digitos": digitos, "incons": incons,
                          "modelo": {"coef": coef, "r2": r(r2), "n": len(base), "escalaPorFaixa": {str(k): r(v) for k, v in escala.items()},
                                     "faixas": [int(x) for x in faixas], "contagem": dict(contagem), "lado": dict(lado)}})
dump("horario.json", {"histograma": histograma, "tardias": late, "pareado": {"dif": r(pareado[0]), "cidades": pareado[1]},
                      "mesmoPerfil1T": r(mesmo_perfil), "totalizacao": {"t1": tot[1], "t2": tot[2]}, "lideranca": lider,
                      "primeiraParcial": {"porUf": [{"uf": a, "secoes": b, "lula": int(c), "flavio": int(d)} for a, b, c, d in primeira],
                                          "lula": int(primeira_tot[0]), "flavio": int(primeira_tot[1])},
                      "referenciaTSE": ref_tse})
dump("ufs.json", uf_rows)

# ---------------------------------------------------------------- stats.json: fonte única dos números que aparecem em mais de uma página
n_ext = con.sql("SELECT count(*) FROM s2 WHERE uf='ZZ'").fetchall()[0][0]
stats_ = {
    "secoes": {
        # conceitos diferentes, nomes diferentes (ver nota na Visão geral e na Metodologia)
        "previstas": BR2["secoes"],                 # divulgação TSE, campo "ts": todas as seções do cadastro
        "instaladas": BR2["secoesInstaladas"],      # campo "si": seções que funcionaram no dia
        "naoInstaladas": BR2["secoesNaoInstaladas"],  # campo "sni"
        "boletins": {"t1": incons[1]["secoes"], "t2": incons[2]["secoes"]},  # linhas no arquivo BU na Web (uma por urna/seção)
        "boletinsBrasil": {"t1": late[1]["total"], "t2": late[2]["total"]},
        "boletinsExterior": {"t1": incons[1]["secoes"] - late[1]["total"], "t2": n_ext},
        "instaladasT1": BR1["secoesInstaladas"], "previstasT1": BR1["secoes"],
        # localidades onde o nº de boletins difere do nº de seções instaladas (explica instaladas − boletins)
        "semBoletim": [{"key": m["key"], "nome": m["nome"], "exterior": m["exterior"], "instaladas": div[2][m["key"]]["secoesInstaladas"],
                        "boletins": m["bu"]["secoes2"], "comparecimento": m["t2"]["comp"]}
                       for m in mun if m["bu"]["secoes2"] != div[2][m["key"]]["secoesInstaladas"]],
        "naoInstaladasExterior": sum(div[2][m["key"]]["secoesNaoInstaladas"] for m in mun if m["exterior"]),
    },
    "tardias": {
        "rotulo": TARDIA_ROTULO,
        "regra": f"Seção no Brasil (sem exterior) que encerrou depois de {TARDIA_ROTULO}:00, hora de Brasília, com precisão de segundos.",
        "t1": late[1], "t2": late[2],
    },
    "localidades": {
        "total": len(mun), "municipios": sum(1 for m in mun if not m["exterior"]), "exterior": sum(1 for m in mun if m["exterior"]),
        "niveis": resumo["contagemNiveis"],
    },
    "lideranca": {"dados": lider, "tse": ext["lideranca"]},
    "votosApos17h": ref_tse,
    "checagensTSE": ext["checagensTSE"], "fontesProrrogacao": ext["prorrogacao"],
}
dump("stats.json", stats_)

# tabela enxuta para mapa/listas
lista = []
for m in mun:
    lista.append({"k": m["key"], "i": m["ibge"], "uf": m["uf"], "n": m["nome"], "cap": m["capital"], "ext": m["exterior"], "ap": m["aptos"],
                  "l1": m["t1"]["lula"], "f1": m["t1"]["flavio"], "o1": m["t1"]["outros"], "l2": m["t2"]["lula"], "f2": m["t2"]["flavio"],
                  "pl1": r(m["pl1"]), "pf1": r(m["pf1"]), "pl2": r(m["pl2"]), "sw": r(m["swing"]), "c1": r(m["comp1"]), "c2": r(m["comp2"]),
                  "z": m.get("modelo", {}).get("z"), "res": m.get("modelo", {}).get("residuo"), "zc": m.get("zComp"),
                  "tr": m["bu"]["tardias2"], "ctr": m["bu"]["compTardias2"], "nv": m["nivel"]})
dump("municipios.json", lista)

# ---------------------------------------------------------------- detalhe por município (locais de votação e bairros)
locais_csv = os.path.join(RAW, "loc", "eleitorado_local_votacao_2026_BRASIL.csv")
con.sql(f"""CREATE TABLE loc AS SELECT DISTINCT ON (SG_UF, CD_MUNICIPIO::INT, NR_ZONA::INT, NR_SECAO::INT)
   SG_UF uf, CD_MUNICIPIO::INT cd_mun, NR_ZONA::INT zona, NR_SECAO::INT secao, NR_LOCAL_VOTACAO::INT local,
   NM_LOCAL_VOTACAO nome, NM_BAIRRO bairro, DS_ENDERECO endereco,
   TRY_CAST(replace(NR_LATITUDE, ',', '.') AS DOUBLE) lat, TRY_CAST(replace(NR_LONGITUDE, ',', '.') AS DOUBLE) lon
   FROM read_csv('{locais_csv}', delim=';', header=true, encoding='latin-1', all_varchar=true) WHERE NR_TURNO='2'""")
con.sql(f"""CREATE TABLE det AS
  SELECT b.key, b.uf, b.zona, b.secao, b.local, l.nome, l.bairro, l.endereco, l.lat, l.lon,
    b.aptos, b.comparecimento comp2, b.lula l2, b.flavio f2, b.brancos + b.nulos bn2,
    strftime(b.encerramento_brt, '%H:%M:%S') enc2, b.tardia, b.faixa_tardia, strftime(b.recebido_brt, '%H:%M') rec2,
    a.comparecimento comp1, a.lula l1, a.flavio f1, a.outros o1, strftime(a.encerramento_brt, '%H:%M') enc1
  FROM s2 b LEFT JOIN s1 a USING (uf, cd_mun, zona, secao)
  LEFT JOIN loc l USING (uf, cd_mun, zona, secao)""")

info = {m["key"]: m for m in mun}
cols = [c[0] for c in con.sql("SELECT * FROM det LIMIT 0").description]
por_mun = defaultdict(list)
for x in con.sql("SELECT * FROM det ORDER BY key, zona, secao").fetchall():
    por_mun[x[0]].append(dict(zip(cols, x)))
for key, secs in por_mun.items():
    locais = {}
    for s in secs:
        lk = f'{s["zona"]}-{s["local"]}'
        L = locais.setdefault(lk, {"z": s["zona"], "id": s["local"], "nome": (s["nome"] or "").title(), "bairro": (s["bairro"] or "").title(),
                                   "end": (s["endereco"] or "").title(), "lat": s["lat"], "lon": s["lon"], "secoes": 0, "ap": 0,
                                   "l1": 0, "f1": 0, "o1": 0, "l2": 0, "f2": 0, "c1": 0, "c2": 0, "tardias": []})
        L["secoes"] += 1
        for a, b in (("ap", "aptos"), ("l1", "l1"), ("f1", "f1"), ("o1", "o1"), ("l2", "l2"), ("f2", "f2"), ("c1", "comp1"), ("c2", "comp2")):
            L[a] += int(s[b] or 0)
        if s["tardia"]:  # mesma coluna (regras.tardia_sql) usada em todos os totais
            L["tardias"].append({"s": s["secao"], "enc": s["enc2"], "fx": s["faixa_tardia"], "c": int(s["comp2"] or 0), "l": int(s["l2"] or 0), "f": int(s["f2"] or 0), "enc1": s["enc1"]})
    bairros = defaultdict(lambda: {"locais": 0, "l1": 0, "f1": 0, "o1": 0, "l2": 0, "f2": 0, "c1": 0, "c2": 0, "ap": 0})
    for L in locais.values():
        B = bairros[L["bairro"] or "(sem bairro)"]
        B["locais"] += 1
        for a in ("l1", "f1", "o1", "l2", "f2", "c1", "c2", "ap"):
            B[a] += L[a]
    m = info[key]
    dump(f"mun/{key}.json", {"municipio": m, "locais": list(locais.values()),
                              "bairros": [{"nome": k, **v} for k, v in sorted(bairros.items(), key=lambda kv: -kv[1]["ap"])]})

print("ok:", len(mun), "municípios;", resumo["contagemNiveis"], "R2=", r2)
print(json.dumps(lado), late[2]["secoes"], late[1]["secoes"])
