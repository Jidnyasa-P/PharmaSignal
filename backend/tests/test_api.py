from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health_returns_ok():
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_config_always_supports_demo():
    response = client.get("/api/config")
    assert response.status_code == 200
    assert response.json()["demo_available"] is True
    assert response.json()["human_review_required"] is True


def test_demo_research_marks_synthetic_content():
    response = client.post("/api/research", json={"company": "Sun Pharmaceutical Industries", "mode": "demo", "focus": "auto"})
    assert response.status_code == 200
    data = response.json()
    assert data["mode"] == "demo"
    assert data["human_review_required"] is True
    assert "synthetic" in data["warning"].lower()
    assert len(data["findings"]) >= 1
    assert all(item["human_review_status"] == "pending" for item in data["findings"])
    assert all(evidence["is_synthetic"] for finding in data["findings"] for evidence in finding["evidence"])


def test_research_rejects_too_short_company_name():
    response = client.post("/api/research", json={"company": "x", "mode": "demo"})
    assert response.status_code == 422


def test_review_acknowledges_human_decision():
    response = client.post("/api/review", json={"finding_id": "demo-reg-001", "status": "needs_evidence", "analyst_note": "Check official filing first."})
    assert response.status_code == 200
    data = response.json()
    assert data["saved"] is True
    assert data["status"] == "needs_evidence"


def test_live_mode_explains_missing_provider_keys(monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "")
    monkeypatch.setenv("TAVILY_API_KEY", "")
    response = client.post("/api/research", json={"company": "Example Pharma", "mode": "live", "focus": "auto"})
    assert response.status_code == 400
    assert "TAVILY_API_KEY" in response.json()["detail"]


def test_demo_ids_are_scoped_to_company():
    first = client.post("/api/research", json={"company": "Company Alpha", "mode": "demo"}).json()
    second = client.post("/api/research", json={"company": "Company Beta", "mode": "demo"}).json()
    assert first["findings"][0]["id"] != second["findings"][0]["id"]


def test_live_research_pipeline_with_stubbed_providers(monkeypatch):
    import json
    import re
    from app import research as research_module

    monkeypatch.setenv("GEMINI_API_KEY", "test-gemini-key")
    monkeypatch.setenv("TAVILY_API_KEY", "test-tavily-key")

    def fake_search(query, api_key, max_results=5):
        slug = re.sub(r"[^a-z0-9]+", "-", query.lower()).strip("-")[:55]
        return [{
            "title": f"Public source for {slug}",
            "url": f"https://example.org/research/{slug}",
            "published_date": "2026-09-01",
            "snippet": "A fictional test snippet. No real company financial facts are represented.",
            "source_type": "Public source",
        }]

    monkeypatch.setattr(research_module, "search_public_web", fake_search)
    monkeypatch.setattr(research_module, "_plan_followup_queries", lambda company, focus, sources, api_key, model: [
        f"{company} primary historical filing", f"{company} competitor contradiction search", f"{company} official regulatory timeline"
    ])
    final_payload = {
        "executive_summary": "A synthetic test candidate generated from mocked source snippets.",
        "research_question": "Does this test company have a signal worth validating?",
        "findings": [{
            "title": "Test candidate — not a real finding",
            "category": "Financial quality",
            "discovery": "This is a mocked discovery used only to test that the pipeline maps evidence to retrieved sources.",
            "why_it_matters": ["Checks pipeline mapping.", "Checks conservative review status."],
            "confidence": "Moderate",
            "confidence_reason": "The fixture is synthetic and confidence is illustrative.",
            "evidence": [{"source_index": 0, "relevance": "First mock source"}, {"source_index": 1, "relevance": "Second mock source"}],
            "metrics": [{"label": "Reported metric", "value": "Not available", "interpretation": "Mock data has no real numbers."}],
            "timeline": [{"date": "2026-09-01", "label": "Test event", "detail": "Mock event", "source_index": 1}],
            "counterargument": "Mock source snippets could be incomplete.",
            "falsification_condition": "Replace the fixtures with real evidence before accepting this result.",
            "evidence_strength_notes": "Test fixture only.",
        }],
    }
    monkeypatch.setattr(research_module, "generate_with_gemini", lambda prompt, api_key, model=None: json.dumps(final_payload))
    result = research_module.run_live_research("Test Pharma Company", "auto")
    assert result.mode == "live"
    assert result.source_count >= 3
    assert result.findings[0].human_review_status == "pending"
    assert len(result.findings[0].evidence) == 2
    assert result.findings[0].evidence[0].url.startswith("https://example.org/research/")
    assert any("follow-up" in step.label.lower() for step in result.research_trail)
