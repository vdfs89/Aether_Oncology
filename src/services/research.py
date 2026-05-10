"""
research.py
===========
Serviço RAG v2.0 — Busca de evidências científicas multi-fonte.

Fontes integradas:
  1. PubMed (via Biopython Entrez) — artigos primários
  2. Cochrane (via PubMed filtro)  — revisões sistemáticas de alta evidência
  3. Semantic Scholar              — TL;DRs automáticos e links DOI

Otimização:
  - Caching persistente via diskcache (sobrevive a restarts do servidor)
  - Fallback em cascata: PubMed → Cochrane → Semantic Scholar
"""

from __future__ import annotations

import logging
import os
import time
from pathlib import Path
from typing import Any

import diskcache
import requests


class CircuitBreaker:
    """
    SRE Pattern: Circuit Breaker
    Prevents cascading failures by stopping requests to an external service
    that is consistently failing.
    """
    def __init__(self, name: str, threshold: int = 3, recovery_time: int = 60):
        self.name = name
        self.threshold = threshold
        self.recovery_time = recovery_time
        self.failures = 0
        self.last_failure_time = 0
        self.state = "CLOSED" # CLOSED, OPEN, HALF-OPEN

    def call(self, fn, *args, **kwargs):
        if self.state == "OPEN":
            if time.time() - self.last_failure_time > self.recovery_time:
                log.info(f"Circuit {self.name} is now HALF-OPEN (testing recovery)")
                self.state = "HALF-OPEN"
            else:
                log.warning(f"Circuit {self.name} is OPEN. Fast-failing request.")
                return []

        try:
            result = fn(*args, **kwargs)
            if self.state in ["OPEN", "HALF-OPEN"]:
                log.info(f"Circuit {self.name} is now CLOSED (recovered)")
            self.state = "CLOSED"
            self.failures = 0
            return result
        except Exception as e:
            self.failures += 1
            self.last_failure_time = time.time()
            log.error(f"Circuit {self.name} failure ({self.failures}/{self.threshold}): {e}")

            if self.failures >= self.threshold:
                self.state = "OPEN"
                log.error(f"Circuit {self.name} is now OPEN.")
            return []

# One circuit per external provider
pubmed_breaker = CircuitBreaker("PubMed", threshold=3)
scholar_breaker = CircuitBreaker("SemanticScholar", threshold=5)

log = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Cache persistente — armazenado em disco para sobreviver a restarts
# ---------------------------------------------------------------------------

_CACHE_DIR = Path(__file__).resolve().parents[2] / ".cache" / "research"
_cache = diskcache.Cache(str(_CACHE_DIR), size_limit=50_000_000)  # 50 MB max

# TTL padrão: 24 horas (86400 s)
_CACHE_TTL = 86_400

# ---------------------------------------------------------------------------
# Mapeamento amigável feature → termo de busca
# ---------------------------------------------------------------------------

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

_TIMEOUT = 8  # segundos por requisição

# ---------------------------------------------------------------------------
# PubMed (Entrez via Biopython)
# ---------------------------------------------------------------------------


def _search_pubmed(
    query: str, max_results: int = 5, journal_filter: str | None = None
) -> list[dict[str, Any]]:
    """
    Busca artigos no PubMed via Entrez (NCBI E-Utilities).

    Args:
        query: Termo de busca livre.
        max_results: Número máximo de artigos.
        journal_filter: Filtro de journal (ex.: "Cochrane Database Syst Rev").

    Returns:
        Lista de dicts com: title, url, year, abstract, source.
    """
    try:
        from Bio import Entrez
    except ImportError:
        log.warning("biopython não instalado — PubMed indisponível")
        return []

    # Configura email (obrigatório para Entrez)
    Entrez.email = os.getenv("ENTREZ_EMAIL", "aether-oncology@placeholder.edu")

    search_term = query
    if journal_filter:
        search_term = f'{query} AND "{journal_filter}"[journal]'

    try:
        log.info("PubMed search: %s", search_term)
        handle = Entrez.esearch(
            db="pubmed",
            term=search_term,
            retmax=max_results,
            sort="relevance",
            retmode="xml",
        )
        id_list = Entrez.read(handle)["IdList"]
        handle.close()

        if not id_list:
            return []

        # Busca detalhes dos artigos
        fetch_handle = Entrez.efetch(
            db="pubmed", id=",".join(id_list), rettype="xml", retmode="xml"
        )
        records = Entrez.read(fetch_handle)
        fetch_handle.close()

        articles: list[dict[str, Any]] = []
        for article in records.get("PubmedArticle", []):
            medline = article["MedlineCitation"]
            art = medline["Article"]
            title = str(art.get("ArticleTitle", ""))
            abstract_parts = art.get("Abstract", {}).get("AbstractText", [])
            abstract = (
                " ".join(str(p) for p in abstract_parts) if abstract_parts else ""
            )
            pub_date = art.get("Journal", {}).get("JournalIssue", {}).get("PubDate", {})
            year_raw = pub_date.get("Year", pub_date.get("MedlineDate", ""))
            year = int(str(year_raw)[:4]) if str(year_raw)[:4].isdigit() else None
            pmid = str(medline.get("PMID", ""))

            articles.append(
                {
                    "title": title,
                    "url": f"https://pubmed.ncbi.nlm.nih.gov/{pmid}/",
                    "year": year,
                    "abstract": abstract[:300] if abstract else None,
                    "tldr": None,
                    "source": "PubMed",
                }
            )

        log.info("PubMed retornou %d artigos", len(articles))
        return articles

    except Exception as exc:  # noqa: BLE001
        log.warning("Erro na busca PubMed: %s", exc)
        return []


# ---------------------------------------------------------------------------
# Cochrane (via PubMed filtro de journal)
# ---------------------------------------------------------------------------


def _search_cochrane(query: str, max_results: int = 3) -> list[dict[str, Any]]:
    """
    Busca revisões sistemáticas da Cochrane via PubMed.

    A Cochrane Database of Systematic Reviews (CDSR) é indexada no PubMed.
    Filtramos pelo journal para obter apenas revisões Cochrane.
    """
    return _search_pubmed(
        query=query,
        max_results=max_results,
        journal_filter="Cochrane Database Syst Rev",
    )


# ---------------------------------------------------------------------------
# Semantic Scholar (mantido como fonte de TL;DR)
# ---------------------------------------------------------------------------

_S2_BASE_URL = "https://api.semanticscholar.org/graph/v1/paper/search"


def _normalize_tldr(paper: dict) -> dict:
    """Normaliza o campo tldr (Semantic Scholar retorna dict {'text': '...'})."""
    tldr = paper.get("tldr")
    if isinstance(tldr, dict):
        paper["tldr"] = tldr.get("text")
    return paper


def _search_semantic_scholar(query: str, limit: int = 3) -> list[dict[str, Any]]:
    """Busca artigos no Semantic Scholar."""
    params = {"query": query, "limit": str(limit), "fields": "title,url,year,tldr"}
    try:
        log.info("Semantic Scholar search: %s", query)
        response = requests.get(_S2_BASE_URL, params=params, timeout=_TIMEOUT)
        response.raise_for_status()
        data = response.json().get("data", [])
        papers = [_normalize_tldr(p) for p in data]
        for p in papers:
            p["source"] = "Semantic Scholar"
        return papers
    except requests.exceptions.Timeout:
        log.warning("Semantic Scholar timeout na query '%s'", query)
    except requests.exceptions.ConnectionError:
        log.warning("Semantic Scholar erro de conexão")
    except requests.exceptions.RequestException as exc:
        log.warning("Semantic Scholar erro: %s", exc)
    except (ValueError, KeyError) as exc:
        log.warning("Semantic Scholar parse error: %s", exc)
    return []


# ---------------------------------------------------------------------------
# Enterprise Vector DB Service (v2.1 — Simulated)
# ---------------------------------------------------------------------------

class VectorDBService:
    """
    Serviço de busca semântica para evidências científicas.
    Simula o comportamento de um banco de vetores (Pinecone/ChromaDB).
    """
    def __init__(self):
        # Em produção, conectaríamos ao endpoint do Pinecone/Milvus
        self.collection_name = "clinical_evidence"
        log.info("Enterprise Vector DB Service initialized (Simulated)")

    def search_semantic(self, query: str, limit: int = 5) -> list[dict[str, Any]]:
        """
        Simula busca por similaridade de cosseno em abstracts vetorializados.
        """
        # Demonstração do paradigma de Enterprise RAG
        log.info("Vector search similarity query: '%s'", query)

        # Mock de resultados "vetoriais" que seriam retornados pelo banco
        return [] # Fallback para busca live por enquanto

vector_db = VectorDBService()


# ---------------------------------------------------------------------------
# Interface pública — RAG com cache
# ---------------------------------------------------------------------------


def fetch_scientific_evidence(top_feature: str) -> list[dict[str, Any]]:
    """
    Busca evidência científica multi-fonte para a feature de maior impacto (XAI).

    Fluxo:
      1. Verifica cache persistente (diskcache)
      2. Busca PubMed (artigos primários)
      3. Busca Cochrane (revisões sistemáticas — nível mais alto de evidência)
      4. Busca Semantic Scholar (TL;DRs automáticos)
      5. Consolida e cacheia resultados

    Args:
        top_feature: Feature WDBC (ex.: "radius_mean", "concavity_mean").

    Returns:
        Lista de dicts com: title, url, year, abstract/tldr, source.
    """
    # 0. Semantic Search (Enterprise RAG Gate)
    # Tenta buscar no banco de vetores interno primeiro (mais rápido e curado)
    vector_results = vector_db.search_semantic(top_feature, limit=3)
    if vector_results:
        return vector_results

    # 1. Verifica cache
    cache_key = f"evidence:{top_feature}"
    cached = _cache.get(cache_key)
    if cached is not None:
        log.info("Cache hit para feature '%s'", top_feature)
        return cached

    search_term = _FEATURE_MAP.get(top_feature, top_feature.replace("_", " "))
    base_query = f"breast cancer {search_term}"

    results: list[dict[str, Any]] = []
    seen_urls: set[str] = set()

    # 2. PubMed (artigos primários)
    pubmed_articles = pubmed_breaker.call(_search_pubmed, base_query, max_results=3)
    for art in pubmed_articles:
        if art["url"] not in seen_urls:
            results.append(art)
            seen_urls.add(art["url"])

    # 3. Cochrane (revisões sistemáticas)
    cochrane_articles = pubmed_breaker.call(_search_cochrane, base_query, max_results=2)
    for art in cochrane_articles:
        if art["url"] not in seen_urls:
            art["source"] = "Cochrane"
            results.append(art)
            seen_urls.add(art["url"])

    # 4. Semantic Scholar (fallback + TL;DRs)
    if len(results) < 3:
        s2_query = f"breast cancer {search_term} diagnostic importance"
        s2_papers = scholar_breaker.call(_search_semantic_scholar, s2_query, limit=3)
        for p in s2_papers:
            url = p.get("url", "")
            if url and url not in seen_urls:
                results.append(p)
                seen_urls.add(url)

    # 5. Fallback final — query genérica
    if not results:
        s2_papers = _search_semantic_scholar("breast cancer biopsy analysis", limit=3)
        for p in s2_papers:
            results.append(p)

    log.info(
        "Total de %d evidências para '%s' (PubMed=%d, Cochrane=%d)",
        len(results),
        top_feature,
        len(pubmed_articles),
        len(cochrane_articles),
    )

    # Cacheia resultado (TTL 24h)
    if results:
        _cache.set(cache_key, results, expire=_CACHE_TTL)

    return results
