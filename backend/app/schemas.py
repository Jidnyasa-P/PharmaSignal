from __future__ import annotations

from typing import Literal
from pydantic import BaseModel, Field


class ResearchRequest(BaseModel):
    company: str = Field(min_length=2, max_length=120)
    mode: Literal["demo", "live"] = "demo"
    focus: Literal["auto", "regulatory", "business_model", "geography", "financial_quality"] = "auto"


class EvidenceItem(BaseModel):
    title: str
    url: str = ""
    published_date: str = "Date not provided"
    snippet: str
    source_type: str = "Public source"
    relevance: str = ""
    is_synthetic: bool = False


class MetricItem(BaseModel):
    label: str
    value: str
    interpretation: str
    formula: str = ""
    is_estimate: bool = False


class TimelineItem(BaseModel):
    date: str
    label: str
    detail: str
    source_url: str = ""


class Finding(BaseModel):
    id: str
    title: str
    category: str
    discovery: str
    why_it_matters: list[str] = Field(default_factory=list)
    confidence: Literal["Strong", "Moderate", "Weak"] = "Moderate"
    confidence_reason: str = ""
    evidence: list[EvidenceItem] = Field(default_factory=list)
    metrics: list[MetricItem] = Field(default_factory=list)
    timeline: list[TimelineItem] = Field(default_factory=list)
    counterargument: str = ""
    falsification_condition: str = ""
    evidence_strength_notes: str = ""
    human_review_status: Literal["pending", "approved", "rejected", "needs_evidence"] = "pending"


class ResearchStep(BaseModel):
    label: str
    status: Literal["complete", "active", "planned"]
    detail: str


class ResearchResponse(BaseModel):
    research_id: str
    company: str
    sector: str = "Track D · Pharma & Healthcare"
    mode: Literal["demo", "live"]
    generated_at: str
    status: Literal["complete", "partial", "failed"] = "complete"
    executive_summary: str
    research_question: str
    research_plan: list[str] = Field(default_factory=list)
    research_trail: list[ResearchStep] = Field(default_factory=list)
    findings: list[Finding] = Field(default_factory=list)
    source_count: int = 0
    recognized_domain_count: int = 0
    human_review_required: bool = True
    model_used: str = "Illustrative demo engine"
    warning: str = ""


class ReviewRequest(BaseModel):
    finding_id: str
    status: Literal["approved", "rejected", "needs_evidence"]
    analyst_note: str = Field(default="", max_length=1200)
    reviewer: str = Field(default="Research analyst", max_length=100)
