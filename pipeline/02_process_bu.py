"""Processa os Boletins de Urna (BU na Web) do TSE, 1º e 2º turno, só o cargo Presidente.

Entrada: raw/bu/bweb_2t_<UF>_*.zip e raw/bu1/bweb_1t_<UF>.zip (arquivos oficiais, CSV latin-1)
Saída:   raw/secoes_t1.parquet, raw/secoes_t2.parquet  (uma linha por seção)

Horários: DT_ABERTURA/DT_ENCERRAMENTO/DT_EMISSAO_BU vêm na hora LOCAL da seção.
DT_BU_RECEBIDO vem na hora de Brasília (servidor do TSE). O fuso de cada município é
inferido pela hora de abertura mais comum (a votação abriu às 8h de Brasília em todo o país).
"""
import glob
import os
import zipfile

import duckdb

RAW = os.environ.get("RAW_DIR", os.path.join(os.path.dirname(__file__), "..", "..", "raw"))
TMP = os.path.join(RAW, "tmp")
os.makedirs(TMP, exist_ok=True)


def extract_csv(zpath):
    z = zipfile.ZipFile(zpath)
    name = [n for n in z.namelist() if n.lower().endswith(".csv")][0]
    out = os.path.join(TMP, os.path.basename(name))
    with z.open(name) as src, open(out, "wb") as dst:
        while chunk := src.read(1 << 24):
            dst.write(chunk)
    return out


def process(turno, files):
    con = duckdb.connect()
    con.sql("SET preserve_insertion_order=false")
    parts = []
    for zp in sorted(files):
        uf = os.path.basename(zp).split("_")[2]
        print(f"T{turno} {uf} ...", flush=True)
        csv = extract_csv(zp)
        out = os.path.join(TMP, f"t{turno}_{uf}.parquet")
        con.sql(f"""
        COPY (
          SELECT
            SG_UF uf, CD_MUNICIPIO::INT cd_mun, NM_MUNICIPIO municipio,
            NR_ZONA::INT zona, NR_SECAO::INT secao, NR_LOCAL_VOTACAO::INT local,
            any_value(DS_SECOES_AGREGADAS) agregadas,
            any_value(DS_TIPO_URNA) tipo_urna,
            any_value(QT_APTOS::INT) aptos,
            any_value(QT_COMPARECIMENTO::INT) comparecimento,
            any_value(QT_ABSTENCOES::INT) abstencoes,
            any_value(TRY_CAST(QT_ELEI_BIOM_SEM_HABILITACAO AS INT)) biom_sem_hab,
            sum(CASE WHEN NR_VOTAVEL='13' THEN QT_VOTOS::INT ELSE 0 END) lula,
            sum(CASE WHEN NR_VOTAVEL='22' THEN QT_VOTOS::INT ELSE 0 END) flavio,
            sum(CASE WHEN DS_TIPO_VOTAVEL='Nominal' AND NR_VOTAVEL NOT IN ('13','22') THEN QT_VOTOS::INT ELSE 0 END) outros,
            sum(CASE WHEN DS_TIPO_VOTAVEL='Branco' THEN QT_VOTOS::INT ELSE 0 END) brancos,
            sum(CASE WHEN DS_TIPO_VOTAVEL='Nulo' THEN QT_VOTOS::INT ELSE 0 END) nulos,
            sum(CASE WHEN DS_TIPO_VOTAVEL NOT IN ('Nominal','Branco','Nulo') THEN QT_VOTOS::INT ELSE 0 END) outros_tipos,
            any_value(TRY_STRPTIME(DT_ABERTURA, '%Y-%m-%d %H:%M:%S')) abertura_local,
            any_value(TRY_STRPTIME(DT_ENCERRAMENTO, '%Y-%m-%d %H:%M:%S')) encerramento_local,
            any_value(TRY_STRPTIME(DT_EMISSAO_BU, '%Y-%m-%d %H:%M:%S')) emissao_local,
            any_value(TRY_STRPTIME(DT_BU_RECEBIDO, '%Y-%m-%d %H:%M:%S')) recebido_brt
          FROM read_csv('{csv}', delim=';', header=true, encoding='latin-1', all_varchar=true)
          WHERE CD_CARGO_PERGUNTA = '1'
          GROUP BY ALL
        ) TO '{out}' (FORMAT parquet)""")
        os.remove(csv)
        parts.append(out)
    final = os.path.join(RAW, f"secoes_t{turno}.parquet")
    con.sql(f"""
    COPY (
      WITH s AS (SELECT * FROM read_parquet({parts!r})),
      fuso AS (  -- fuso do município = hora de abertura mais comum - 8h
        SELECT uf, cd_mun, mode(hour(abertura_local)) - 8 AS fuso_h
        FROM s WHERE abertura_local IS NOT NULL GROUP BY ALL
      )
      SELECT s.*, coalesce(f.fuso_h, 0) fuso_h,
        s.abertura_local - to_hours(coalesce(f.fuso_h, 0)) abertura_brt,
        s.encerramento_local - to_hours(coalesce(f.fuso_h, 0)) encerramento_brt,
        s.emissao_local - to_hours(coalesce(f.fuso_h, 0)) emissao_brt
      FROM s LEFT JOIN fuso f USING (uf, cd_mun)
    ) TO '{final}' (FORMAT parquet)""")
    n = con.sql(f"SELECT count(*), sum(lula), sum(flavio) FROM '{final}'").fetchall()[0]
    print(f"T{turno}: {n[0]} seções; Lula={n[1]} Flávio={n[2]}")
    for p in parts:
        os.remove(p)


if __name__ == "__main__":
    import sys
    turnos = [int(x) for x in sys.argv[1:]] or [2, 1]
    for t in turnos:
        pat = os.path.join(RAW, "bu", "bweb_2t_*.zip") if t == 2 else os.path.join(RAW, "bu1", "bweb_1t_*.zip")
        process(t, glob.glob(pat))
