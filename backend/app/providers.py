from __future__ import annotations

import os
import requests
from typing import Any

TAVILY_ENDPOINT = "https://api.tavily.com/search"
GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"


def search_public_web(query: str, api_key: str, max_results: int = 5) -> list[dict[str, Any]]:
    """Search public web sources through Tavily; return a normalised source list."""
    response = requests.post(
        TAVILY_ENDPOINT,
        json={
            "api_key": api_key,
            "query": query,
            "topic": "general",
            "search_depth": "basic",
            "max_results": max_results,
            "include_answer": False,
            "include_raw_content": False,
        },
        timeout=25,
    )
    response.raise_for_status()
    payload = response.json()
    sources: list[dict[str, Any]] = []
    for item in payload.get("results", []):
        url = str(item.get("url") or "").strip()
        if not url.startswith(("http://", "https://")):
            continue
        sources.append({
            "title": str(item.get("title") or "Untitled source")[:240],
            "url": url,
            "published_date": str(item.get("published_date") or item.get("date") or "Date not provided")[:80],
            "snippet": str(item.get("content") or "No search snippet supplied.")[:1800],
            "score": item.get("score"),
            "source_type": "Public web search",
        })
    return sources


def generate_with_gemini(prompt: str, api_key: str, model: str | None = None) -> str:
    """Call the Gemini generateContent REST endpoint (keeps setup minimal)."""
    model = model or os.getenv("GEMINI_MODEL", "gemini-3.8-flash")
    response = requests.post(
        GEMINI_ENDPOINT.format(model=model),
        headers={"x-goog-api-key": api_key, "Content-Type": "application/json"},
        json={
            "contents": [{"role": "user", "parts": [{"text": prompt}]}],
            "generationConfig": {
                "responseMimeType": "application/json",
                "temperature": 0.2,
                "maxOutputTokens": 6500,
            },
        },
        timeout=75,
    )
    response.raise_for_status()
    payload = response.json()
    candidates = payload.get("candidates") or []
    if not candidates:
        raise ValueError("Gemini returned no candidate text. Try again or change the model in backend/.env.")
    parts = (candidates[0].get("content") or {}).get("parts") or []
    text = "\n".join(str(part.get("text") or "") for part in parts).strip()
    if not text:
        raise ValueError("Gemini returned an empty response. Try again.")
    return text
