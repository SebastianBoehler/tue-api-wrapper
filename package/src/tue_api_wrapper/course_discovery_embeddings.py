from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Protocol


class EmbeddingProvider(Protocol):
    model_name: str | None

    def embed(self, texts: tuple[str, ...]) -> list[list[float]]:
        ...


@dataclass(frozen=True)
class DisabledEmbeddingProvider:
    reason: str
    model_name: str | None = None

    def embed(self, texts: tuple[str, ...]) -> list[list[float]]:
        raise RuntimeError(self.reason)


class SentenceTransformerEmbeddingProvider:
    def __init__(self, model_name: str) -> None:
        from sentence_transformers import SentenceTransformer

        self.model_name = model_name
        self._model = SentenceTransformer(model_name)

    def embed(self, texts: tuple[str, ...]) -> list[list[float]]:
        vectors = self._model.encode(list(texts), normalize_embeddings=True)
        return [list(map(float, vector)) for vector in vectors]


def build_embedding_provider() -> EmbeddingProvider:
    mode = os.getenv("TUE_DISCOVERY_EMBEDDINGS", "off").strip().lower()
    if mode not in {"local", "sentence-transformers"}:
        return DisabledEmbeddingProvider("Set TUE_DISCOVERY_EMBEDDINGS=local to enable local embeddings.")

    model = os.getenv("TUE_DISCOVERY_MODEL", "sentence-transformers/all-MiniLM-L6-v2")
    try:
        return SentenceTransformerEmbeddingProvider(model)
    except ImportError as error:
        return DisabledEmbeddingProvider(f"Install discovery extras to enable embeddings: {error}")
