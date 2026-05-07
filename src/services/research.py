"""
research.py
===========
Serviço de busca de evidências científicas via Semantic Scholar API.
"""

import logging

import requests

log = logging.getLogger(__name__)

def fetch_scientific_evidence(top_feature: str) -> list:
    """
    Busca artigos baseados na feature de maior impacto detectada pelo XAI.
    """
    # Mapeamento amigável para busca científica
    feature_map = {
        "radius_mean": "tumor size",
        "texture_mean": "texture",
        "perimeter_mean": "perimeter",
        "area_mean": "area",
        "smoothness_mean": "smoothness",
        "compactness_mean": "compactness",
        "concavity_mean": "concavity",
        "concave_points_mean": "concave points",
        "symmetry_mean": "symmetry",
        "fractal_dimension_mean": "fractal dimension"
    }

    search_term = feature_map.get(top_feature, top_feature.replace("_", " "))

    # Tentamos queries da mais específica para a mais geral
    queries = [
        f"breast cancer {search_term} diagnostic importance",
        f"breast cancer {search_term}",
        "breast cancer biopsy analysis"
    ]

    for query in queries:
        url = f"https://api.semanticscholar.org/graph/v1/paper/search?query={query}&limit=3&fields=title,url,year,tldr"
        try:
            log.info(f"Buscando evidência científica (Query: {query})")
            response = requests.get(url, timeout=5)
            if response.status_code == 200:
                data = response.json().get('data', [])
                if data:
                    # Normaliza o campo tldr (Semantic Scholar retorna um dict {'text': '...'})
                    for paper in data:
                        tldr = paper.get("tldr")
                        if isinstance(tldr, dict):
                            paper["tldr"] = tldr.get("text")

                    log.info(f"Encontrados {len(data)} artigos para query: {query}")
                    return data
        except Exception as e:
            log.error(f"Erro na query '{query}': {e}")
            continue

    return []
