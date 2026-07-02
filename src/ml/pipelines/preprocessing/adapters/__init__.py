"""
src/ml/pipelines/preprocessing/adapters
========================================
Dataset-schema adapters for the preprocessing pipeline.

Each adapter knows how to:
  - Detect whether a DataFrame matches its schema
  - Normalize column names (alias mapping)
  - Prepare X, y for the corresponding preprocessing pipeline
  - Report its canonical feature order and target column

The facade in ``src.features.preprocessor`` uses ``detect_adapter`` to
route incoming data to the correct adapter, logging telemetry so the
team can track migration progress and eventually retire the legacy path.
"""

from __future__ import annotations

from typing import Protocol

import pandas as pd

from src.ml.pipelines.preprocessing.adapters import legacy, oral


class PreprocessingAdapter(Protocol):
    """Protocol every adapter must satisfy."""

    @staticmethod
    def detect(df: pd.DataFrame) -> bool: ...

    @staticmethod
    def normalize_columns(df: pd.DataFrame) -> pd.DataFrame: ...

    @staticmethod
    def prepare(df: pd.DataFrame) -> tuple[pd.DataFrame, "np.ndarray"]: ...

    @staticmethod
    def get_feature_order() -> list[str]: ...

    @staticmethod
    def get_target() -> str: ...


class AmbiguousSchemaError(ValueError):
    """Raised when the dataset matches both adapters or neither."""

    def __init__(self, message: str, *, oral_match: bool, legacy_match: bool):
        self.oral_match = oral_match
        self.legacy_match = legacy_match
        super().__init__(message)


def detect_adapter(df: pd.DataFrame) -> type[PreprocessingAdapter]:
    """
    Inspects ``df`` and returns the matching adapter module.

    Raises ``AmbiguousSchemaError`` when both or neither adapters match,
    listing the conflicting/missing columns so the caller can fix the
    dataset instead of silently picking the wrong pipeline.
    """
    import numpy as np  # noqa: F401 — for Protocol return type

    oral_match = oral.detect(df)
    legacy_match = legacy.detect(df)

    if oral_match and not legacy_match:
        return oral

    if legacy_match and not oral_match:
        return legacy

    # Ambiguous or unrecognised
    if oral_match and legacy_match:
        raise AmbiguousSchemaError(
            "Dataset matches BOTH oral-cancer and legacy schemas. "
            f"Columns present: {sorted(df.columns.tolist())}. "
            "Remove either `Oral_Cancer` or `Diagnosis_Stage` to disambiguate.",
            oral_match=True,
            legacy_match=True,
        )

    raise AmbiguousSchemaError(
        "Dataset matches NEITHER oral-cancer nor legacy schema. "
        f"Expected `Oral_Cancer` (new) or `Diagnosis_Stage` (legacy). "
        f"Columns found: {sorted(df.columns.tolist())}.",
        oral_match=False,
        legacy_match=False,
    )


__all__ = [
    "AmbiguousSchemaError",
    "PreprocessingAdapter",
    "detect_adapter",
    "legacy",
    "oral",
]