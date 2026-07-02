"""
src/features/preprocessor.py
============================
Compatibility facade for Aether Oncology clinical preprocessing.

This module is a **stable bridge** — it preserves the legacy API consumed
by ``src/train.py``, notebooks, and older scripts, while delegating the
actual work to isolated adapters under
``src.ml.pipelines.preprocessing.adapters``.

Routing rules:
  - If the dataset has the Sprint 3 columnage (``Oral_Cancer`` target +
    25-feature schema), the **oral** adapter is used.
  - If the dataset has the legacy columnage (``Diagnosis_Stage`` target +
    8-feature schema), the **legacy** adapter is used and a deprecation
    warning is emitted.
  - If both or neither match, an explicit ``AmbiguousSchemaError`` is
    raised listing the conflicting/missing columns.

Telemetry:
  - Every ``load_and_prepare`` call logs which adapter was selected.
  - Legacy calls are counted via ``_MigrationTelemetry`` so the team can
    track when ``src.features.preprocessor`` can be safely retired.
"""

from __future__ import annotations

import logging
import warnings
from collections import Counter

import numpy as np
import pandas as pd

from src.ml.pipelines.preprocessing.adapters import (
    AmbiguousSchemaError,  # noqa: F401 — re-exported for callers
    detect_adapter,
)
from src.ml.pipelines.preprocessing.adapters import legacy as legacy_adapter
from src.ml.pipelines.preprocessing.adapters import oral as oral_adapter
from src.ml.pipelines.preprocessing.preprocessing import (
    CATEGORICAL_FEATURES as CLINICAL_CATEGORICAL,
)
from src.ml.pipelines.preprocessing.preprocessing import (
    NUMERIC_FEATURES as CLINICAL_NUMERIC,
)
from src.ml.pipelines.preprocessing.preprocessing import (
    PASSTHROUGH_FEATURES as CLINICAL_PASS,
)
from src.ml.pipelines.preprocessing.preprocessing import TARGET_COLUMN
from src.ml.pipelines.preprocessing.preprocessing import (
    build_clinical_preprocessor as build_preprocessor,  # noqa: F401
)

logger = logging.getLogger("aether.preprocessor")


# ---------------------------------------------------------------------------
# Migration telemetry — counts adapter usage so we know when to retire
# the legacy path. Accessible via ``get_migration_stats()``.
# ---------------------------------------------------------------------------


class _MigrationTelemetry:
    """Lightweight in-process counter for adapter usage."""

    def __init__(self) -> None:
        self._counts: Counter[str] = Counter()

    def record(self, adapter: str) -> None:
        self._counts[adapter] += 1

    def stats(self) -> dict[str, int]:
        return dict(self._counts)

    def reset(self) -> None:
        self._counts.clear()


_telemetry = _MigrationTelemetry()


def get_migration_stats() -> dict[str, int]:
    """Returns a snapshot of how many times each adapter was used."""
    return _telemetry.stats()


def reset_migration_stats() -> None:
    """Resets the telemetry counters (useful for tests)."""
    _telemetry.reset()


# ---------------------------------------------------------------------------
# Legacy facade constants — preserved for backward compatibility.
# ---------------------------------------------------------------------------

# Legacy 11-feature contract (oral_cancer_top30.csv).
NUMERIC_FEATURES = ["Age", "Survival_Rate", "risk_index"]
CATEGORICAL_FEATURES = [
    "Country",
    "Gender",
    "Socioeconomic_Status",
    "Treatment_Type",
    "age_bucket",
]
BINARY_FEATURES = ["high_incidence_country", "Tobacco_Use", "Alcohol_Use"]

# Sprint 3 25-feature contract (oral_cancer_prediction.csv).
SPRINT3_NUMERIC_FEATURES = CLINICAL_NUMERIC
SPRINT3_CATEGORICAL_FEATURES = CLINICAL_CATEGORICAL
SPRINT3_BINARY_FEATURES = CLINICAL_PASS

# Legacy target used by src/train.py with oral_cancer_top30.csv.
TARGET = legacy_adapter.TARGET
ORAL_CANCER_TARGET = TARGET_COLUMN


# ---------------------------------------------------------------------------
# Public API — load_and_prepare
# ---------------------------------------------------------------------------


def load_and_prepare(path: str) -> tuple[pd.DataFrame, np.ndarray]:
    """
    Loads a raw CSV and prepares X/y via the appropriate adapter.

    The adapter is selected automatically by inspecting the dataset
    columns after normalization:

      - ``Oral_Cancer`` present + 25-feature schema -> oral adapter
      - ``Diagnosis_Stage`` present + 8-feature schema -> legacy adapter
        (emits a ``DeprecationWarning``)
      - Ambiguous or unrecognised -> ``AmbiguousSchemaError``

    Telemetry is recorded on every call so the team can track migration
    progress via ``get_migration_stats()``.

    Parameters
    ----------
    path:
        Path to the CSV file.

    Returns
    -------
    tuple[pd.DataFrame, np.ndarray]
        ``(X, y)`` where ``X`` has the canonical feature order for the
        selected adapter and ``y`` is a 1-D integer array.
    """
    df = pd.read_csv(path)
    logger.info("Dataset loaded: %s  shape=%s", path, str(df.shape))
    return load_and_prepare_df(df)


def load_and_prepare_df(
    df: pd.DataFrame,
) -> tuple[pd.DataFrame, np.ndarray]:
    """
    Prepares X/y from an already-loaded DataFrame.

    This is the core routing function. ``load_and_prepare`` delegates
    here after reading the CSV, and tests can call it directly with a
    synthetic DataFrame.
    """
    adapter = detect_adapter(df)
    adapter_name = adapter.__name__.split(".")[-1]

    _telemetry.record(adapter_name)
    logger.info(
        "Adapter selected: %s  (oral=%s, legacy=%s)",
        adapter_name,
        oral_adapter.detect(df),
        legacy_adapter.detect(df),
    )

    if adapter is legacy_adapter:
        warnings.warn(
            "Dataset detected as legacy (oral_cancer_top30). "
            "The legacy adapter is deprecated. Migrate to the "
            "Sprint 3 oral_cancer_prediction dataset (25 features). "
            "See docs/CRISP_DM.md for migration guidance.",
            DeprecationWarning,
            stacklevel=2,
        )
        logger.warning(
            "DEPRECATION: legacy adapter used for dataset with "
            "columns: %s",
            sorted(df.columns.tolist()),
        )

    X, y = adapter.prepare(df)
    logger.info(
        "Prepared: X.shape=%s  y.shape=%s  features=%s",
        str(X.shape),
        str(y.shape),
        adapter.get_feature_order(),
    )
    return X, y
