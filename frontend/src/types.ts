export type ReviewStatus = 'pending' | 'approved' | 'rejected' | 'needs_evidence'
export type Focus = 'auto' | 'regulatory' | 'business_model' | 'geography' | 'financial_quality'
export type Mode = 'demo' | 'live'

export interface EvidenceItem {
  title: string
  url: string
  published_date: string
  snippet: string
  source_type: string
  relevance: string
  is_synthetic: boolean
}
export interface MetricItem {
  label: string
  value: string
  interpretation: string
  formula: string
  is_estimate: boolean
}
export interface TimelineItem {
  date: string
  label: string
  detail: string
  source_url: string
}
export interface Finding {
  id: string
  title: string
  category: string
  discovery: string
  why_it_matters: string[]
  confidence: 'Strong' | 'Moderate' | 'Weak'
  confidence_reason: string
  evidence: EvidenceItem[]
  metrics: MetricItem[]
  timeline: TimelineItem[]
  counterargument: string
  falsification_condition: string
  evidence_strength_notes: string
  human_review_status: ReviewStatus
}
export interface ResearchStep {
  label: string
  status: 'complete' | 'active' | 'planned'
  detail: string
}
export interface ResearchResponse {
  research_id: string
  company: string
  sector: string
  mode: Mode
  generated_at: string
  status: 'complete' | 'partial' | 'failed'
  executive_summary: string
  research_question: string
  research_plan: string[]
  research_trail: ResearchStep[]
  findings: Finding[]
  source_count: number
  recognized_domain_count: number
  human_review_required: boolean
  model_used: string
  warning: string
}
export interface ApiConfig {
  demo_available: boolean
  live_available: boolean
  search_provider: string | null
  model: string
  human_review_required: boolean
}
export interface ReviewRecord {
  status: ReviewStatus
  note: string
  reviewer: string
  reviewedAt: string
}
