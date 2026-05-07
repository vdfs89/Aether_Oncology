"""
research.py
===========
Serviço de busca de evidências científicas via Semantic Scholar API.

Melhorias implementadas:
  - Logging sem f-strings (evita G004 do ruff)
  - Cache de resultados para evitar chamadas repetidas
  - Tratamento de erros mais granular
  - Type hints completos
"""

from __future__ import annotations

import logging
from functools import lru_cache

import requests

log = logging.getLogger(__name__)

# Mapeamento amigável para busca científica
_FEATURE_MAP: dict[str, str] = {
    "radius_mean": "tumor size",
    "texture_mean": "texture",
    "perimeter_mean": "perimeter",
    "area_mean": "area",
    "smoothness_mean": "smoothness",
    "compactness_mean": "compactness",
    "concavity_mean": "concavity",
    "concave_points_mean": "concave points",
    "symmetry_mean": "symmetry",
    "fractal_dimension_mean": "fractal dimension",
}

_BASE_URL = "https://api.semanticscholar.org/graph/v1/paper/search"
_TIMEOUT = 5  # segundos


def _normalize_tldr(paper: dict) -> dict:
    """Normaliza o campo tldr (Semantic Scholar retorna dict {'text': '...'})."""
    tldr = paper.get("tldr")
    if isinstance(tldr, dict):
        paper["tldr"] = tldr.get("text")
    return paper


@lru_cache(maxsize=32)
def fetch_scientific_evidence(top_feature: str) -> list[dict]:
    """
    Busca artigos baseados na feature de maior impacto detectada pelo XAI.

    Args:
        top_feature: Nome da feature (ex.: "radius_mean").

    Returns:
        Lista de dicts com keys: title, url, year, tldr.
        Retorna lista vazia se nenhuma evidência for encontrada.
    """
    search_term = _FEATURE_MAP.get(top_feature, top_feature.replace("_", " "))

    # Queries da mais específica para a mais geral
    queries = [
        f"breast cancer {search_term} diagnostic importance",
        f"breast cancer {search_term}",
        "breast cancer biopsy analysis",
    ]

    for query in queries:
        url = _BASE_URL
        params = {"query": query, "limit": "3", "fields": "title,url,year,tldr"}
        try:
            log.info("Buscando evidência científica (Query: %s)", query)
            response = requests.get(url, params=params, timeout=_TIMEOUT)
            response.raise_for_status()

            data = response.json().get("data", [])
            if data:
                papers = [_normalize_tldr(p) for p in data]
                log.info("Encontrados %d artigos para query: %s", len(papers), query)
                return papers

        except requests.exceptions.Timeout:
            log.warning("Timeout na query '%s' após %ds", query, _TIMEOUT)
        except requests.exceptions.ConnectionError:
            log.warning("Erro de conexão na query '%s'", query)
        except requests.exceptions.RequestException as exc:
            log.warning("Erro na query '%s': %s", query, exc)
        except (ValueError, KeyError) as exc:
            log.warning("Erro ao parsear resposta da query '%s': %s", query, exc)

    return []
