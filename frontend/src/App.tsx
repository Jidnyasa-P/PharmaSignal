import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Activity, ArrowUpRight, BadgeCheck, Beaker, BookOpenCheck,
  Bot, Check, CheckCircle2, ChevronDown, CircleHelp, Clock3, Download,
  ExternalLink, FileCheck2, FileSearch, FlaskConical, Globe2, HeartPulse,
  Lightbulb, Link2, LoaderCircle, Menu, Microscope, Network,
  RefreshCw, Search, ShieldAlert, ShieldCheck, Sparkles,
  Target, ThumbsDown, ThumbsUp, X, XCircle,
} from 'lucide-react'
import { getConfig, getHealth, runResearch, saveReview } from './api'
import type { ApiConfig, Focus, Mode, ResearchResponse, ReviewRecord, ReviewStatus } from './types'

const COMPANY_PRESETS = [
  'Sun Pharmaceutical Industries',
  'Dr. Reddy’s Laboratories',
  'Cipla',
  'Divi’s Laboratories',
]
const FOCUS_OPTIONS: { value: Focus; label: string }[] = [
  { value: 'auto', label: 'Let PharmaSignal investigate' },
  { value: 'regulatory', label: 'Regulatory → financial exposure' },
  { value: 'business_model', label: 'Business-model transition' },
  { value: 'geography', label: 'Geographic concentration' },
  { value: 'financial_quality', label: 'Financial quality & cash conversion' },
]
const STATUS_LABEL: Record<ReviewStatus, string> = {
  pending: 'Pending review', approved: 'Human approved', rejected: 'Rejected', needs_evidence: 'Needs more evidence',
}
const STATUS_CLASS: Record<ReviewStatus, string> = {
  pending: 'pending', approved: 'approved', rejected: 'rejected', needs_evidence: 'needs-evidence',
}

function readSavedReviews(): Record<string, ReviewRecord> {
  try { return JSON.parse(localStorage.getItem('pharmasignal_reviews_v1') || '{}') as Record<string, ReviewRecord> } catch { return {} }
}
function readSavedResearch(): ResearchResponse | null {
  try {
    const value = localStorage.getItem('pharmasignal_last_research_v1')
    return value ? JSON.parse(value) as ResearchResponse : null
  } catch { return null }
}
function formatDate(value?: string) {
  if (!value) return 'Date not provided'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(date)
}
function safeDownload(filename: string, contents: string, contentType: string) {
  const blob = new Blob([contents], { type: contentType })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
function makeMarkdown(data: ResearchResponse, reviews: Record<string, ReviewRecord>) {
  const lines = [
    `# PharmaSignal Research Note — ${data.company}`,
    `**Track:** ${data.sector}  `,
    `**Mode:** ${data.mode.toUpperCase()}  `,
    `**Generated:** ${formatDate(data.generated_at)}  `,
    `**Model:** ${data.model_used}`,
    '',
    `> ${data.warning}`,
    '',
    '## Executive summary', data.executive_summary, '',
    '## Research question', data.research_question, '',
  ]
  data.findings.forEach((finding, index) => {
    const review = reviews[finding.id]
    lines.push(`## Finding ${index + 1}: ${finding.title}`, '', `**Discovery:** ${finding.discovery}`, '', `**Category:** ${finding.category}  `, `**AI confidence:** ${finding.confidence} — ${finding.confidence_reason}`, `**Human review:** ${review ? STATUS_LABEL[review.status] : 'Pending review'}`, '')
    lines.push('### Why it matters', ...finding.why_it_matters.map(item => `- ${item}`), '', '### Evidence')
    finding.evidence.forEach(item => lines.push(`- **${item.title}** (${item.published_date})${item.url ? ` — ${item.url}` : ''}\n  ${item.snippet}\n  Relevance: ${item.relevance}`))
    lines.push('', '### Metrics')
    finding.metrics.forEach(metric => lines.push(`- **${metric.label}:** ${metric.value}. ${metric.interpretation}${metric.formula ? ` Formula: ${metric.formula}` : ''}`))
    lines.push('', '### Timeline')
    finding.timeline.forEach(event => lines.push(`- **${event.date} — ${event.label}:** ${event.detail}${event.source_url ? ` (${event.source_url})` : ''}`))
    lines.push('', '### Strongest counterargument', finding.counterargument, '', '### Falsification condition', finding.falsification_condition, '', '### Evidence strength', finding.evidence_strength_notes, '')
    if (review) lines.push('### Human analyst review', `**Decision:** ${STATUS_LABEL[review.status]}`, `**Reviewer:** ${review.reviewer}`, `**Reviewed:** ${review.reviewedAt}`, `**Note:** ${review.note || 'No note provided.'}`, '')
    lines.push('---', '')
  })
  lines.push('## Research workflow', ...data.research_trail.map(step => `- **${step.label}** (${step.status}): ${step.detail}`), '', '## Disclaimer', 'PharmaSignal is a research and decision-support prototype. AI-generated findings require human validation and are not investment recommendations. Verify every source and calculation independently.')
  return lines.join('\n')
}

export default function App() {
  const [company, setCompany] = useState('Sun Pharmaceutical Industries')
  const [focus, setFocus] = useState<Focus>('auto')
  const [mode, setMode] = useState<Mode>('demo')
  const [config, setConfig] = useState<ApiConfig | null>(null)
  const [apiOnline, setApiOnline] = useState<boolean | null>(null)
  const [research, setResearch] = useState<ResearchResponse | null>(null)
  const [selectedFindingId, setSelectedFindingId] = useState<string>('')
  const [reviews, setReviews] = useState<Record<string, ReviewRecord>>(readSavedReviews)
  const [reviewer, setReviewer] = useState('Research analyst')
  const [reviewNote, setReviewNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [reviewBusy, setReviewBusy] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  const selectedFinding = useMemo(() => research?.findings.find(item => item.id === selectedFindingId) || research?.findings[0] || null, [research, selectedFindingId])
  const pendingReviews = useMemo(() => (research?.findings || []).filter(finding => !reviews[finding.id] || reviews[finding.id].status === 'pending').length, [research, reviews])
  const approvedReviews = useMemo(() => (research?.findings || []).filter(finding => reviews[finding.id]?.status === 'approved').length, [research, reviews])
  const sourceCount = research?.source_count ?? 0

  const performScan = useCallback(async (nextMode: Mode = mode) => {
    const trimmed = company.trim()
    if (trimmed.length < 2) { setError('Enter a company name with at least two characters.'); return }
    setBusy(true)
    setError('')
    setToast('')
    try {
      const result = await runResearch(trimmed, nextMode, focus)
      setResearch(result)
      setSelectedFindingId(result.findings[0]?.id || '')
      setMode(nextMode)
      setReviewNote('')
      localStorage.setItem('pharmasignal_last_research_v1', JSON.stringify(result))
      setToast(nextMode === 'demo' ? 'Demo scan ready. Synthetic evidence is clearly labelled.' : 'Live scan complete. Review every source before accepting a finding.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The scan could not be completed.')
    } finally { setBusy(false) }
  }, [company, focus, mode])

  useEffect(() => {
    let cancelled = false
    const boot = async () => {
      const saved = readSavedResearch()
      if (saved) {
        setResearch(saved)
        setCompany(saved.company)
        setMode(saved.mode)
        setSelectedFindingId(saved.findings[0]?.id || '')
      }
      try {
        const health = await getHealth()
        if (!cancelled) setApiOnline(health.status === 'ok')
        const cfg = await getConfig()
        if (!cancelled) {
          setConfig(cfg)
          setMode(saved?.mode || 'demo')
        }
      } catch {
        if (!cancelled) {
          setApiOnline(false)
          setError('The backend is not responding. Start the FastAPI server, then refresh the page.')
        }
      }
      if (!saved && !cancelled) {
        try {
          const result = await runResearch('Sun Pharmaceutical Industries', 'demo', 'auto')
          if (!cancelled) {
            setResearch(result)
            setSelectedFindingId(result.findings[0]?.id || '')
            localStorage.setItem('pharmasignal_last_research_v1', JSON.stringify(result))
          }
        } catch (err) {
          if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load the demo research.')
        }
      }
    }
    void boot()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!toast) return
    const timeout = window.setTimeout(() => setToast(''), 4600)
    return () => window.clearTimeout(timeout)
  }, [toast])

  useEffect(() => {
    setReviewNote(selectedFinding ? (reviews[selectedFinding.id]?.note || '') : '')
  }, [selectedFinding?.id]) // preserve saved analyst notes when switching findings

  const handleReview = async (status: Exclude<ReviewStatus, 'pending'>) => {
    if (!selectedFinding) return
    setReviewBusy(true)
    setError('')
    try {
      const result = await saveReview(selectedFinding.id, status, reviewNote.trim(), reviewer.trim() || 'Research analyst')
      const record: ReviewRecord = { status, note: reviewNote.trim(), reviewer: reviewer.trim() || 'Research analyst', reviewedAt: result.reviewed_at || new Date().toISOString() }
      const updated = { ...reviews, [selectedFinding.id]: record }
      setReviews(updated)
      localStorage.setItem('pharmasignal_reviews_v1', JSON.stringify(updated))
      setToast(`Review recorded: ${STATUS_LABEL[status]}.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not record review. Check that the backend is running.')
    } finally { setReviewBusy(false) }
  }

  const exportReport = () => {
    if (!research) return
    const base = `PharmaSignal_${research.company.replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '')}`
    safeDownload(`${base}_research.md`, makeMarkdown(research, reviews), 'text/markdown;charset=utf-8')
    setToast('Research note exported as Markdown.')
  }
  const exportJson = () => {
    if (!research) return
    safeDownload(`PharmaSignal_${research.company.replace(/[^a-z0-9]+/gi, '_')}.json`, JSON.stringify({ research, human_reviews: reviews }, null, 2), 'application/json;charset=utf-8')
    setToast('Research data exported as JSON.')
  }
  const loadPreset = (value: string) => setCompany(value)

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNavOpen ? 'sidebar-open' : ''}`}>
        <div className="brand-lockup">
          <div className="brand-mark"><HeartPulse size={22} strokeWidth={2.2} /></div>
          <div><div className="brand-name">pharma<span>signal</span></div><div className="brand-subtitle">RESEARCH INTELLIGENCE</div></div>
          <button className="icon-button sidebar-close" aria-label="Close navigation" onClick={() => setMobileNavOpen(false)}><X size={18}/></button>
        </div>
        <div className="workspace-label">WORKSPACE</div>
        <button className="nav-link active" onClick={() => { setMobileNavOpen(false); window.scrollTo({ top: 0, behavior: 'smooth' }) }}><Activity size={17}/><span>Signal workspace</span><span className="nav-dot"/></button>
        <button className="nav-link" onClick={() => { setMobileNavOpen(false); document.getElementById('evidence-panel')?.scrollIntoView({ behavior: 'smooth' }) }}><Network size={17}/><span>Evidence graph</span></button>
        <button className="nav-link" onClick={() => { setMobileNavOpen(false); document.getElementById('analyst-review')?.scrollIntoView({ behavior: 'smooth' }) }}><BookOpenCheck size={17}/><span>Analyst review</span>{pendingReviews > 0 && <span className="nav-count">{pendingReviews}</span>}</button>
        <div className="sidebar-divider"/>
        <div className="workspace-label">RESEARCH LENS</div>
        <div className="lens-card">
          <div className="lens-icon"><Microscope size={17}/></div>
          <div><strong>Track D</strong><span>Pharma & Healthcare</span></div>
          <span className="lens-live-dot"/>
        </div>
        <div className="sidebar-note"><div className="note-symbol"><ShieldCheck size={16}/></div><div><strong>Human in the loop</strong><p>AI proposes. Analysts verify. Nothing is approved automatically.</p></div></div>
        <div className="sidebar-bottom">
          <div className="connection-line"><span className={`connection-dot ${apiOnline ? 'online' : apiOnline === false ? 'offline' : ''}`}/><span>{apiOnline ? 'API connected' : apiOnline === false ? 'API unavailable' : 'Checking API…'}</span></div>
          <div className="sidebar-version">PHARMASIGNAL MVP <span>v1.0</span></div>
        </div>
      </aside>
      {mobileNavOpen && <button className="mobile-scrim" aria-label="Close navigation" onClick={() => setMobileNavOpen(false)}/>}

      <main className="main-area">
        <header className="topbar">
          <div className="breadcrumbs"><button className="mobile-menu icon-button" aria-label="Open navigation" onClick={() => setMobileNavOpen(true)}><Menu size={20}/></button><span className="crumb-muted">INTELLIGENCE</span><span className="crumb-slash">/</span><span>RESEARCH WORKSPACE</span></div>
          <div className="topbar-right"><span className="topbar-date"><Clock3 size={14}/>{new Intl.DateTimeFormat('en-IN', { weekday: 'short', day: '2-digit', month: 'short' }).format(new Date())}</span><span className="track-pill"><span/> TRACK D</span><div className="avatar">PS</div></div>
        </header>

        <div className="page-content">
          <section className="hero-section">
            <div className="hero-copy">
              <div className="eyebrow"><span className="eyebrow-line"/> AUTONOMOUS RESEARCH · HUMAN-VERIFIED</div>
              <h1>Find the signal<br/><em>beneath the surface.</em></h1>
              <p className="hero-description">Connect regulatory events, financial disclosures and industry shifts to uncover the story a single report can’t tell.</p>
            </div>
            <div className="hero-visual" aria-hidden="true">
              <div className="orbit orbit-one"/><div className="orbit orbit-two"/><div className="orbit orbit-three"/>
              <div className="orbit-core"><Activity size={31}/></div>
              <div className="orbit-node node-a"><FileSearch size={16}/></div><div className="orbit-node node-b"><FlaskConical size={16}/></div><div className="orbit-node node-c"><Network size={16}/></div>
              <div className="visual-caption"><span className="pulse-dot"/> SIGNAL MAPPING ACTIVE</div>
            </div>
          </section>

          <section className="scan-card" aria-labelledby="scan-title">
            <div className="scan-card-head"><div><div className="section-kicker">01 / DEFINE YOUR INVESTIGATION</div><h2 id="scan-title">Start with a company. Follow the evidence.</h2></div><div className="scan-protocol"><ShieldCheck size={15}/> No auto-approval</div></div>
            <div className="scan-form">
              <div className="field company-field">
                <label htmlFor="company">COMPANY OR TICKER</label>
                <div className="input-wrap"><Search size={17}/><input id="company" value={company} onChange={event => setCompany(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && !busy) void performScan() }} placeholder="e.g. Sun Pharmaceutical Industries" maxLength={120}/><ChevronDown size={15} className="input-chevron"/></div>
                <div className="quick-picks"><span>QUICK SELECT</span>{COMPANY_PRESETS.slice(0, 3).map(item => <button key={item} className={company === item ? 'quick-pick selected' : 'quick-pick'} onClick={() => loadPreset(item)}>{item.split(/\s+/).slice(0, item.startsWith('Dr.') ? 2 : 2).join(' ')}</button>)}</div>
              </div>
              <div className="field focus-field"><label htmlFor="focus">RESEARCH LENS</label><div className="select-wrap"><select id="focus" value={focus} onChange={event => setFocus(event.target.value as Focus)}>{FOCUS_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select><ChevronDown size={16}/></div><p className="field-helper">The agent chooses which angles to investigate.</p></div>
              <div className="field mode-field"><label>RUN MODE</label><div className="mode-switch" role="group" aria-label="Research mode"><button className={mode === 'demo' ? 'mode-option active' : 'mode-option'} onClick={() => setMode('demo')}><Beaker size={15}/>Demo</button><button className={mode === 'live' ? 'mode-option active live-active' : 'mode-option'} onClick={() => setMode('live')}><Globe2 size={15}/>Live</button></div><p className="field-helper">{mode === 'demo' ? 'Instant · no keys needed' : config?.live_available ? 'Web search + Gemini enabled' : 'Requires Tavily + Gemini keys'}</p></div>
              <button className="run-button" disabled={busy || company.trim().length < 2} onClick={() => void performScan()}>{busy ? <><LoaderCircle size={18} className="spin"/> Investigating…</> : <><Sparkles size={17}/> Run intelligence scan <ArrowUpRight size={16}/></>}</button>
            </div>
            {mode === 'live' && !config?.live_available && <div className="inline-hint"><CircleHelp size={15}/><span>Live mode needs <code>TAVILY_API_KEY</code> and <code>GEMINI_API_KEY</code> in <code>backend/.env</code>. Choose Demo to explore the workflow now.</span></div>}
            {error && <div className="alert alert-error" role="alert"><ShieldAlert size={17}/><span>{error}</span><button aria-label="Dismiss error" onClick={() => setError('')}><X size={15}/></button></div>}
          </section>

          {busy && <section className="loading-panel"><div className="loading-mark"><LoaderCircle className="spin" size={26}/></div><div><strong>Following the evidence trail</strong><p>Collecting sources, comparing signals and challenging the first hypothesis…</p></div><div className="loading-bars"><i/><i/><i/></div></section>}

          {research && <>
            {research.warning && <div className={`mode-warning ${research.mode === 'demo' ? 'demo-warning' : 'live-warning'}`}><div className="warning-icon">{research.mode === 'demo' ? <Beaker size={16}/> : <Globe2 size={16}/>}</div><div><strong>{research.mode === 'demo' ? 'Illustrative demo data' : 'Live research · human verification required'}</strong><p>{research.warning}</p></div></div>}

            <section className="stats-grid" aria-label="Research summary metrics">
              <div className="stat-card"><div className="stat-icon mint"><FileSearch size={17}/></div><div className="stat-label">SOURCES RETRIEVED</div><div className="stat-value">{research.mode === 'demo' ? '—' : sourceCount.toString().padStart(2, '0')}<span>{research.mode === 'demo' ? 'not fetched' : 'public sources'}</span></div><div className="stat-foot">{research.mode === 'demo' ? 'Synthetic fixtures only' : `${research.recognized_domain_count} recognised filing/regulatory domain matches`}</div></div>
              <div className="stat-card"><div className="stat-icon lilac"><Lightbulb size={17}/></div><div className="stat-label">CANDIDATE SIGNALS</div><div className="stat-value">{research.findings.length.toString().padStart(2, '0')}<span>to investigate</span></div><div className="stat-foot">AI-generated · not validated</div></div>
              <div className="stat-card"><div className="stat-icon amber"><Clock3 size={17}/></div><div className="stat-label">AWAITING REVIEW</div><div className="stat-value">{pendingReviews.toString().padStart(2, '0')}<span>findings</span></div><div className="stat-foot">Human decision required</div></div>
              <div className="stat-card"><div className="stat-icon blue"><BadgeCheck size={17}/></div><div className="stat-label">HUMAN APPROVED</div><div className="stat-value">{approvedReviews.toString().padStart(2, '0')}<span>findings</span></div><div className="stat-foot">Reviewed in this browser</div></div>
            </section>

            <section className="research-layout" id="findings-panel">
              <div className="panel findings-panel">
                <div className="panel-header"><div><div className="section-kicker">02 / CANDIDATE DISCOVERIES</div><h2>Signals worth a closer look</h2></div><span className="count-chip">{research.findings.length} FOUND</span></div>
                <p className="panel-subtitle">A lead is only as strong as the evidence that survives scrutiny.</p>
                <div className="finding-list">
                  {research.findings.map((finding, index) => {
                    const review = reviews[finding.id]
                    const status: ReviewStatus = review?.status || 'pending'
                    const active = selectedFinding?.id === finding.id
                    return <button key={finding.id} className={`finding-row ${active ? 'selected' : ''}`} onClick={() => setSelectedFindingId(finding.id)}>
                      <div className="finding-index">0{index + 1}</div><div className="finding-row-main"><div className="finding-category">{finding.category}</div><h3>{finding.title}</h3><div className="finding-row-meta"><span className={`confidence-dot confidence-${finding.confidence.toLowerCase()}`}/><span>{finding.confidence} confidence</span><span className="meta-separator">·</span><span className={`review-label ${STATUS_CLASS[status]}`}>{STATUS_LABEL[status]}</span></div></div><ArrowUpRight className="finding-arrow" size={17}/>
                    </button>
                  })}
                  {research.findings.length === 0 && <div className="empty-state"><Search size={24}/><strong>No finding returned</strong><p>Try another lens or rerun after checking API configuration.</p></div>}
                </div>
                <div className="research-question"><div className="rq-icon"><Target size={17}/></div><div><span>QUESTION UNDER INVESTIGATION</span><p>{research.research_question}</p></div></div>
              </div>

              <div className="panel detail-panel">
                <div className="panel-header detail-head"><div><div className="section-kicker">03 / EVIDENCE-LED ANALYSIS</div><h2>Discovery brief</h2></div><button className="subtle-button" disabled={!research} onClick={exportReport}><Download size={15}/> Export note</button></div>
                {selectedFinding ? <>
                  <div className="discovery-heading"><div className="category-chip"><span className="category-chip-dot"/>{selectedFinding.category}</div><h3>{selectedFinding.discovery}</h3><div className="confidence-line"><span className={`confidence-badge confidence-${selectedFinding.confidence.toLowerCase()}`}><span className="confidence-dot"/>{selectedFinding.confidence} confidence</span><span className="confidence-explainer">{selectedFinding.confidence_reason}</span></div></div>
                  <div className="detail-section"><div className="detail-section-title"><span className="section-number">A</span><h4>Why this matters</h4></div><ul className="matter-list">{selectedFinding.why_it_matters.map((item, index) => <li key={`${selectedFinding.id}-matter-${index}`}><span>{String(index + 1).padStart(2, '0')}</span>{item}</li>)}</ul></div>
                  <div className="detail-section" id="evidence-panel"><div className="detail-section-title"><span className="section-number">B</span><h4>Evidence trail</h4><span className="section-trailing">{selectedFinding.evidence.length} SOURCES</span></div>
                    <div className="evidence-list">{selectedFinding.evidence.map((evidence, index) => <article className="evidence-item" key={`${evidence.title}-${index}`}><div className="evidence-icon">{evidence.is_synthetic ? <Beaker size={16}/> : <FileCheck2 size={16}/>}</div><div className="evidence-content"><div className="evidence-meta"><span>{evidence.source_type}</span><span>·</span><span>{evidence.published_date}</span></div><h5>{evidence.title}</h5><p>{evidence.snippet}</p>{evidence.relevance && <div className="evidence-relevance"><Link2 size={13}/>{evidence.relevance}</div>}{evidence.url && <a className="source-link" href={evidence.url} target="_blank" rel="noreferrer">Open original source <ExternalLink size={13}/></a>}</div><span className={`evidence-index ${evidence.is_synthetic ? 'synthetic' : ''}`}>E{String(index + 1).padStart(2, '0')}</span></article>)}</div>
                  </div>
                  <div className="detail-section"><div className="detail-section-title"><span className="section-number">C</span><h4>Numbers to substantiate the signal</h4></div><div className="metrics-grid">{selectedFinding.metrics.map((metric, index) => <div className="metric-box" key={`${metric.label}-${index}`}><span>{metric.label}</span><strong>{metric.value}</strong><p>{metric.interpretation}</p>{metric.formula && <code>{metric.formula}</code>}</div>)}</div></div>
                  <div className="timeline-section"><div className="detail-section-title"><span className="section-number">D</span><h4>Signal timeline</h4></div><div className="timeline-list">{selectedFinding.timeline.map((event, index) => <div className="timeline-item" key={`${event.date}-${index}`}><div className="timeline-marker"><span/></div><div className="timeline-body"><div className="timeline-date">{event.date}</div><strong>{event.label}</strong><p>{event.detail}</p>{event.source_url && <a href={event.source_url} target="_blank" rel="noreferrer">Source <ExternalLink size={12}/></a>}</div></div>)}</div></div>
                </> : <div className="empty-state detail-empty"><FileSearch size={26}/><strong>No candidate selected</strong><p>Choose a candidate from the list to inspect its evidence trail.</p></div>}
              </div>
            </section>

            {selectedFinding && <section className="bottom-grid">
              <div className="panel falsification-panel"><div className="panel-header"><div><div className="section-kicker">04 / TRY TO PROVE IT WRONG</div><h2>Challenge the conclusion</h2></div><div className="challenge-icon"><ShieldAlert size={18}/></div></div><div className="challenge-block counter-block"><div className="challenge-label"><XCircle size={15}/> STRONGEST COUNTERARGUMENT</div><p>{selectedFinding.counterargument || 'No counterargument provided. Ask for more evidence before accepting this finding.'}</p></div><div className="challenge-block falsify-block"><div className="challenge-label"><Target size={15}/> FALSIFICATION CONDITION</div><p>{selectedFinding.falsification_condition || 'Specify what evidence would make this conclusion weaker or invalid.'}</p></div><div className="strength-note"><div className="strength-indicator"><span/><span/><span className={selectedFinding.confidence === 'Strong' ? 'filled' : ''}/></div><div><strong>Evidence strength · {selectedFinding.confidence}</strong><p>{selectedFinding.evidence_strength_notes}</p></div></div></div>

              <div className="panel review-panel" id="analyst-review"><div className="panel-header"><div><div className="section-kicker">05 / HUMAN-IN-THE-LOOP</div><h2>Analyst sign-off</h2></div><div className="human-avatar"><BookOpenCheck size={17}/></div></div><div className="review-principle"><div className="review-principle-icon"><ShieldCheck size={18}/></div><p><strong>AI proposes. You decide.</strong><br/>Review the evidence and counterargument before recording a decision. Approval is never automatic.</p></div><div className="review-fields"><label htmlFor="reviewer">REVIEWER</label><input id="reviewer" value={reviewer} onChange={event => setReviewer(event.target.value)} maxLength={100} placeholder="Analyst name or role"/><label htmlFor="analyst-note">ANALYST NOTE <span>OPTIONAL</span></label><textarea id="analyst-note" value={reviewNote} onChange={event => setReviewNote(event.target.value)} maxLength={1200} placeholder="What did you verify? What is still uncertain?" rows={3}/></div><div className="review-actions"><button className="review-button approve" disabled={reviewBusy || !selectedFinding} onClick={() => void handleReview('approved')}>{reviewBusy ? <LoaderCircle size={15} className="spin"/> : <ThumbsUp size={15}/>} Approve finding</button><button className="review-button reject" disabled={reviewBusy || !selectedFinding} onClick={() => void handleReview('rejected')}><ThumbsDown size={15}/> Reject</button><button className="review-button evidence" disabled={reviewBusy || !selectedFinding} onClick={() => void handleReview('needs_evidence')}><Search size={15}/> Need evidence</button></div>{selectedFinding && reviews[selectedFinding.id] && <div className={`review-saved ${STATUS_CLASS[reviews[selectedFinding.id].status]}`}><CheckCircle2 size={15}/><span><strong>{STATUS_LABEL[reviews[selectedFinding.id].status]}</strong> · saved in this browser</span><button onClick={() => { const updated = { ...reviews }; delete updated[selectedFinding.id]; setReviews(updated); localStorage.setItem('pharmasignal_reviews_v1', JSON.stringify(updated)); setReviewNote(''); setToast('Review reset to pending.') }} title="Reset this review" aria-label="Reset review"><RefreshCw size={13}/></button></div>}</div>
            </section>}

            <section className="workflow-panel"><div className="workflow-head"><div><div className="section-kicker">RESEARCH TRACE</div><h2>How the agent got here</h2></div><div className="workflow-model"><Bot size={15}/>{research.model_used}</div></div><div className="workflow-steps">{research.research_trail.map((step, index) => <div className={`workflow-step ${step.status}`} key={`${step.label}-${index}`}><div className="workflow-step-marker">{step.status === 'complete' ? <Check size={15}/> : step.status === 'active' ? <Activity size={15}/> : <Clock3 size={15}/>}</div><div><div className="workflow-step-status">{step.status.toUpperCase()}</div><strong>{step.label}</strong><p>{step.detail}</p></div>{index < research.research_trail.length - 1 && <div className="workflow-connector"/>}</div>)}</div><div className="workflow-footer"><span><ShieldCheck size={15}/> Human validation required before use</span><div><button className="text-button" onClick={exportJson}><Download size={14}/> Export raw JSON</button><span className="generated-at">Generated {formatDate(research.generated_at)}</span></div></div></section>
          </>}

          {!research && !busy && <section className="welcome-card"><div className="welcome-art"><div className="welcome-ring ring-a"/><div className="welcome-ring ring-b"/><div className="welcome-glyph"><Activity size={38}/></div><span className="welcome-node n1"/><span className="welcome-node n2"/><span className="welcome-node n3"/></div><div className="welcome-copy"><div className="section-kicker">READY WHEN YOU ARE</div><h2>Start with a question.<br/>Leave with a trail of evidence.</h2><p>Run a demo scan to explore the review workflow, or configure live research to retrieve public sources and generate company-specific candidates.</p><button className="run-button" onClick={() => void performScan('demo')}><Sparkles size={17}/> Run illustrative demo <ArrowUpRight size={16}/></button></div></section>}

          <footer className="app-footer"><div className="footer-brand"><HeartPulse size={15}/><span>PHARMASIGNAL</span></div><span>Research assistance, not investment advice.</span><div className="footer-links"><button onClick={exportReport} disabled={!research}><Download size={13}/> Export</button><a href="https://ai.google.dev/gemini-api/docs/models" target="_blank" rel="noreferrer">Model docs <ExternalLink size={12}/></a></div></footer>
        </div>
      </main>
      {toast && <div className="toast" role="status"><CheckCircle2 size={17}/>{toast}<button onClick={() => setToast('')} aria-label="Dismiss notification"><X size={14}/></button></div>}
    </div>
  )
}
