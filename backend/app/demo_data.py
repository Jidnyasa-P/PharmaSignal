"""Clearly synthetic fixtures for an always-available, no-key demo.

These are scenarios, not research findings about any real pharmaceutical company.
Never remove the synthetic-data warning from demo responses.
"""
from datetime import datetime, timezone
from uuid import uuid4
import re
from .schemas import ResearchResponse, Finding, EvidenceItem, MetricItem, TimelineItem, ResearchStep


def build_demo(company: str, focus: str = "auto") -> ResearchResponse:
    company = company.strip()
    focus_label = {
        "auto": "cross-source signal discovery",
        "regulatory": "regulatory-to-revenue exposure",
        "business_model": "business-model transition",
        "geography": "geographic concentration",
        "financial_quality": "financial quality and cash conversion",
    }.get(focus, "cross-source signal discovery")
    now = datetime.now(timezone.utc).isoformat(timespec="seconds")
    company_key = re.sub(r"[^a-z0-9]+", "-", company.lower()).strip("-")[:28] or "company"
    finding_1 = Finding(
        id=f"{company_key}-demo-reg-001",
        title="A leading indicator may be hiding behind stable headline revenue",
        category="Regulatory → Financial exposure",
        discovery=(
            "ILLUSTRATIVE SCENARIO: a regulatory development could precede financial pressure, "
            "but only if the affected facility is material to the company's business and later financial data corroborates the link."
        ),
        why_it_matters=[
            "Regulatory events can matter before their full financial effect appears in reported results.",
            "The financial link must be tested against facility exposure, timing and competitor performance.",
            "A coincidental event and a revenue change are not proof of causation."
        ],
        confidence="Weak",
        confidence_reason="This is a synthetic teaching scenario with no company-specific evidence attached.",
        evidence=[
            EvidenceItem(title="Sample regulatory notice (synthetic)", published_date="Illustrative timeline", snippet="Example fixture only: an imagined inspection observation is included to demonstrate how the agent would capture an event. No real regulator, facility, or company is being described.", source_type="Synthetic fixture", relevance="Illustrates the event side of a future evidence chain.", is_synthetic=True),
            EvidenceItem(title="Sample quarterly disclosure (synthetic)", published_date="Illustrative timeline", snippet="Example fixture only: an imagined financial disclosure is included to demonstrate timeline comparison. This is not a real reported metric.", source_type="Synthetic fixture", relevance="Illustrates how the analyst would test for a later financial effect.", is_synthetic=True),
        ],
        metrics=[
            MetricItem(label="Facility revenue exposure", value="Not provided", interpretation="Must be established from company disclosures before drawing a materiality conclusion."),
            MetricItem(label="Post-event financial change", value="Not provided", interpretation="Requires comparable pre- and post-event reported figures."),
        ],
        timeline=[
            TimelineItem(date="T−1", label="Baseline", detail="Establish the relevant segment, facility or geography and its financial importance."),
            TimelineItem(date="T0", label="Potential event", detail="Capture a dated regulatory event and confirm the entity/facility match."),
            TimelineItem(date="T+1", label="Financial test", detail="Compare later reported metrics and competitor trends before inferring any link."),
        ],
        counterargument="The company may have diversified production, resolved the issue quickly, or experienced financial changes for unrelated market reasons. A sector-wide shift may explain the same pattern.",
        falsification_condition="Reject or materially downgrade the hypothesis if the relevant facility is immaterial, the issue is resolved without operational impact, subsequent financial metrics remain stable, or peer companies show the same change for a sector-wide reason.",
        evidence_strength_notes="Weak by design: all evidence is synthetic and must be replaced with sourced public evidence in Live Research mode.",
    )
    finding_2 = Finding(
        id=f"{company_key}-demo-business-002",
        title="A business-model transition can be obscured by consolidated growth",
        category="Business-model change",
        discovery=(
            "ILLUSTRATIVE SCENARIO: consolidated growth may conceal a shift between business lines; "
            "segment mix and profitability disclosures are needed to establish whether the change is meaningful."
        ),
        why_it_matters=[
            "Different pharmaceutical business lines can have different growth, margin and investment profiles.",
            "A shift in sales mix may matter even when total revenue appears steady.",
            "The claim must be supported by segment data across multiple reporting periods."
        ],
        confidence="Weak",
        confidence_reason="Synthetic scenario; no factual claim about the selected company is made.",
        evidence=[
            EvidenceItem(title="Sample investor presentation (synthetic)", published_date="Illustrative timeline", snippet="Example fixture only: a fictional segment-mix disclosure demonstrates which fields to compare across periods.", source_type="Synthetic fixture", relevance="Represents the kind of source needed to test a portfolio shift.", is_synthetic=True),
            EvidenceItem(title="Sample annual report segment note (synthetic)", published_date="Illustrative timeline", snippet="Example fixture only: a fictional segment table demonstrates reconciliation between segment and consolidated results.", source_type="Synthetic fixture", relevance="Represents the primary source needed for segment calculations.", is_synthetic=True),
        ],
        metrics=[
            MetricItem(label="Segment share of revenue", value="Not provided", interpretation="Calculate from disclosed segment revenue using a comparable definition and period."),
            MetricItem(label="Segment margin trend", value="Not provided", interpretation="Compare only if segment profit and revenue definitions are consistent."),
        ],
        timeline=[
            TimelineItem(date="Period 1", label="Earlier mix", detail="Extract segment revenue and profit disclosures."),
            TimelineItem(date="Period 2", label="Mix change", detail="Calculate how segment shares change over comparable reporting periods."),
            TimelineItem(date="Period 3", label="Cross-check", detail="Compare management commentary, competitor context and disclosed investment."),
        ],
        counterargument="A segment share may rise because another segment temporarily weakens, accounting definitions change, or a one-off acquisition shifts the mix rather than a durable strategic transition.",
        falsification_condition="Downgrade the hypothesis if the mix change disappears under comparable segment definitions, is explained by a one-off event, or fails to persist in subsequent disclosures.",
        evidence_strength_notes="Weak by design: synthetic evidence only; use as a demonstration of method, not as a company assessment.",
    )
    if focus == "regulatory":
        findings = [finding_1]
    elif focus == "business_model":
        findings = [finding_2]
    else:
        findings = [finding_1, finding_2]

    return ResearchResponse(
        research_id=f"demo-{uuid4().hex[:8]}",
        company=company,
        mode="demo",
        generated_at=now,
        status="complete",
        executive_summary=(
            f"The demo has prepared {len(findings)} synthetic research scenario(s) for {company}. "
            "These illustrate PharmaSignal's investigation method only; they are not real findings about this company. "
            "Run Live Research with API keys to search current public sources."
        ),
        research_question=f"What could be the most consequential {focus_label} signal for {company}, and what evidence would disprove it?",
        research_plan=[
            "Identify plausible research angles from the company and the selected focus.",
            "Gather independent primary and secondary public sources with publication dates.",
            "Compare financial trends before and after relevant events and calculate only supported metrics.",
            "Seek the strongest alternative explanation and evidence that could falsify the leading hypothesis.",
            "Submit the candidate finding for human analyst review before it is treated as validated."
        ],
        research_trail=[
            ResearchStep(label="Research question scoped", status="complete", detail="Selected sector-aware research angles for the requested company."),
            ResearchStep(label="Source retrieval", status="complete", detail="Demo mode does not contact the web; synthetic fixtures are used intentionally."),
            ResearchStep(label="Hypothesis and counterargument", status="complete", detail="Illustrative candidates include counterarguments and falsification conditions."),
            ResearchStep(label="Human review", status="active", detail="Analyst must approve, reject, or request additional evidence."),
        ],
        findings=findings,
        source_count=sum(len(f.evidence) for f in findings),
        recognized_domain_count=0,
        human_review_required=True,
        model_used="Synthetic demo fixtures (no LLM call)",
        warning="DEMO MODE — illustrative synthetic scenarios only. These are not facts or financial analysis about the selected company; no real sources were fetched.",
    )
