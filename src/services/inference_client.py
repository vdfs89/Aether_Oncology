"""
inference_client.py
===================
Enterprise-grade client for decoupled ML inference via Hugging Face API.
Implements reliability patterns: Retry, Timeout, and Circuit Breaker readiness.
"""

import asyncio
import logging
import os
import time
from enum import Enum
from typing import Any, Dict, List

import httpx

logger = logging.getLogger(__name__)


class CircuitState(Enum):
    CLOSED = "CLOSED"  # Normal operation
    OPEN = "OPEN"  # Error state, requests blocked
    HALF_OPEN = "HALF_OPEN"  # Testing if service recovered


class HuggingFaceInferenceClient:
    """
    Enterprise-grade Client for Hugging Face Inference API.

    Implements:
    - Persistent Connection Pooling (httpx)
    - Circuit Breaker Pattern
    - Smart Retries with Backoff
    - Distributed Tracing Support
    """

    def __init__(self, model_id: str = "vdfs89/aether-oncology-v1"):
        self.model_id = model_id
        self.api_url = f"https://api-inference.huggingface.co/models/{model_id}"
        self.api_token = os.getenv("HF_TOKEN")

        # Configuration
        self.timeout = httpx.Timeout(10.0, connect=2.0)
        self.max_retries = 3
        self.client = httpx.AsyncClient(
            timeout=self.timeout,
            limits=httpx.Limits(max_keepalive_connections=10, max_connections=20),
        )

        # Circuit Breaker State
        self.state = CircuitState.CLOSED
        self.failure_count = 0
        self.failure_threshold = 5
        self.recovery_timeout = 30  # Seconds to wait before HALF_OPEN
        self.last_failure_time = 0.0

        if not self.api_token:
            logger.warning("HF_TOKEN missing. Remote inference will fail.")

    def _check_circuit(self):
        """Validates if the circuit is open and if it should transition to half-open."""
        if self.state == CircuitState.OPEN:
            if time.time() - self.last_failure_time > self.recovery_timeout:
                logger.info(f"Circuit for {self.model_id} transitioning to HALF_OPEN")
                self.state = CircuitState.HALF_OPEN
            else:
                raise Exception(
                    "Circuit is OPEN. Inference layer temporarily disabled for stability."
                )

    def _on_success(self):
        """Reset failures on successful call."""
        self.failure_count = 0
        self.state = CircuitState.CLOSED

    def _on_failure(self):
        """Track failures and open circuit if threshold reached."""
        self.failure_count += 1
        self.last_failure_time = time.time()
        if self.failure_count >= self.failure_threshold:
            logger.critical(
                f"CIRCUIT BREAKER OPEN for {self.model_id} after {self.failure_count} failures."
            )
            self.state = CircuitState.OPEN

    async def predict_remote(
        self, inputs: List[List[float]], request_id: str = "internal"
    ) -> Dict[str, Any]:
        """
        Executes remote inference with resilience patterns.
        """
        self._check_circuit()

        headers = {
            "Authorization": f"Bearer {self.api_token}",
            "X-Request-ID": request_id,
            "X-Model-Version": self.model_id.split("/")[-1],
            "Content-Type": "application/json",
        }

        payload = {"inputs": inputs}

        for attempt in range(self.max_retries):
            try:
                start_time = time.perf_counter()
                response = await self.client.post(
                    self.api_url, json=payload, headers=headers
                )
                latency = (time.perf_counter() - start_time) * 1000

                # Success path
                if response.status_code == 200:
                    self._on_success()
                    return {
                        "data": response.json(),
                        "latency_ms": latency,
                        "version": self.model_id,
                        "source": "huggingface",
                    }

                # Model is still loading on HF infrastructure
                if response.status_code == 503:
                    estimated = response.json().get("estimated_time", 20)
                    logger.warning(
                        f"HF [{request_id}]: Model loading ({estimated}s). Attempt {attempt + 1}"
                    )
                    await asyncio.sleep(min(2, estimated))
                    continue

                # Server-side errors or rate limits
                response.raise_for_status()

            except (httpx.RequestError, httpx.HTTPStatusError) as e:
                logger.error(
                    f"HF [{request_id}]: Request failed (attempt {attempt + 1}): {e}"
                )
                if attempt == self.max_retries - 1:
                    self._on_failure()
                    raise Exception(f"Inference gateway error: {e}")

                # Exponential backoff
                await asyncio.sleep(0.5 * (2**attempt))

        raise Exception("Inference failed after max retries.")

    async def check_health(self) -> bool:
        """SRE Probe for remote inference layer."""
        try:
            response = await self.client.get(self.api_url, timeout=2.0)
            return response.status_code != 404
        except Exception:
            return False

    async def shutdown(self):
        """Graceful shutdown of the persistent client."""
        await self.client.aclose()


# Singleton
inference_client = HuggingFaceInferenceClient()
