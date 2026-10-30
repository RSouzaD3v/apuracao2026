#!/usr/bin/env bash
# Baixa os boletins de urna (BU na Web) dos dois turnos e o cadastro de locais de votação.
set -e
RAW="${RAW_DIR:-$(dirname "$0")/../../raw}"
mkdir -p "$RAW/bu" "$RAW/bu1" "$RAW/loc"
B=https://cdn.tse.jus.br/estatistica/sead/eleicoes/eleicoes2026/buweb
UFS="AC AL AM AP BA CE DF ES GO MA MG MS MT PA PB PE PI PR RJ RN RO RR RS SC SE SP TO ZZ"
for uf in $UFS; do
  curl -sf -o "$RAW/bu/bweb_2t_${uf}_261020260742.zip" "$B/bweb_2t_${uf}_261020260742.zip" || echo "falhou 2t $uf"
  curl -sf -o "$RAW/bu1/bweb_1t_${uf}.zip" "$B/bweb_1t_${uf}_051020261403.zip" || echo "falhou 1t $uf"
done
curl -sf -o "$RAW/loc/locais.zip" https://cdn.tse.jus.br/estatistica/sead/odsele/eleitorado_locais_votacao/eleitorado_local_votacao_2026.zip
(cd "$RAW/loc" && unzip -o -q locais.zip)
echo "ok"
