"""Baixa o resultado oficial de Presidente (1º e 2º turno) por município,
direto do sistema de divulgação do TSE (resultados.tse.jus.br).

Saída: raw/div/{turno}/{uf}{cd}.json  (arquivos originais, sem alteração)
       raw/div/municipios.json         (cadastro TSE -> IBGE)
"""
import json
import os
import sys
import time
from concurrent.futures import ThreadPoolExecutor

import requests

RAW = os.environ.get("RAW_DIR", os.path.join(os.path.dirname(__file__), "..", "..", "raw"))
BASE = "https://resultados.tse.jus.br/oficial/ele2026"
ELEICOES = {1: "6257", 2: "6258"}

session = requests.Session()


def get(url, tries=5):
    for i in range(tries):
        try:
            r = session.get(url, timeout=30)
            if r.status_code == 200:
                return r.content
            if r.status_code == 404:
                return None
        except requests.RequestException:
            pass
        time.sleep(1 + i * 2)
    raise RuntimeError(f"falha ao baixar {url}")


def main():
    out = os.path.join(RAW, "div")
    os.makedirs(out, exist_ok=True)
    cfg = json.loads(get(f"{BASE}/6258/config/mun-e006258-cm.json"))
    muns = []
    for uf in cfg["abr"]:
        for m in uf["mu"]:
            muns.append({"uf": uf["cd"], "ufNome": uf["ds"], "cd": m["cd"], "ibge": m.get("cdi", ""),
                         "nome": m["nm"], "capital": m.get("c") == "s", "zonas": m.get("z", [])})
    with open(os.path.join(out, "municipios.json"), "w", encoding="utf-8") as f:
        json.dump(muns, f, ensure_ascii=False)
    print(len(muns), "municípios/localidades")

    jobs = []
    for t, e in ELEICOES.items():
        os.makedirs(os.path.join(out, f"t{t}"), exist_ok=True)
        jobs.append((t, e, "br", "br", f"{BASE}/{e}/dados/br/br-c0001-e00{e}-u.json"))
        for uf in {m["uf"] for m in muns}:
            jobs.append((t, e, uf, uf, f"{BASE}/{e}/dados/{uf}/{uf}-c0001-e00{e}-u.json"))
        for m in muns:
            jobs.append((t, e, m["uf"], m["uf"] + m["cd"], f"{BASE}/{e}/dados/{m['uf']}/{m['uf']}{m['cd']}-c0001-e00{e}-u.json"))

    def run(job):
        t, e, uf, key, url = job
        path = os.path.join(out, f"t{t}", f"{key}.json")
        if os.path.exists(path) and os.path.getsize(path) > 0:
            return 0
        data = get(url)
        if data is None:
            print("404", url, file=sys.stderr)
            return 1
        with open(path, "wb") as f:
            f.write(data)
        return 0

    with ThreadPoolExecutor(16) as ex:
        missing = sum(ex.map(run, jobs))
    print("concluído; ausentes:", missing)


if __name__ == "__main__":
    main()
