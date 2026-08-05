import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Link, Navigate, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  Activity, ArrowLeft, BarChart3, Check, CheckCircle2, ChevronDown, ClipboardCheck,
  ExternalLink, FileText, History, Home, Info, LayoutDashboard, LockKeyhole, LogOut,
  Menu, Plus, RefreshCw, RotateCcw, Search, Send, Settings2, ShieldCheck, Sparkles, Users, X,
  XCircle,
} from 'lucide-react'
import { departments, makeSeedState } from './seed'
import { approvalProposals, canManageRoles, canOpenExecutive, executiveProposals, isRoleActive } from './security'
import type { DemoState, Department, Proposal, ProposalStatus, Role, User } from './types'

const STORAGE_KEY = 'kickoff-demo-state-v1'
const roleLabels: Record<Role, string> = { employee: 'Employee', approver: 'Department approver', executive: 'Executive', admin: 'Admin' }
const statusTone: Record<ProposalStatus, string> = { Draft: 'neutral', 'Department review': 'warning', Approved: 'success', Rejected: 'danger', Pilot: 'info' }

function loadState(): DemoState {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : makeSeedState()
  } catch {
    return makeSeedState()
  }
}

export default function App() {
  const [state, setState] = useState<DemoState>(loadState)
  const [navOpen, setNavOpen] = useState(false)
  useEffect(() => localStorage.setItem(STORAGE_KEY, JSON.stringify(state)), [state])
  const currentUser = state.users.find((user) => user.id === state.currentUserId) ?? state.users[0]

  const switchPersona = (userId: string) => setState((current) => ({ ...current, currentUserId: userId }))
  const resetDemo = () => {
    if (window.confirm('Reset all demo proposals, roles, approvals, and audit events?')) setState(makeSeedState())
  }
  const updateState = (updater: (current: DemoState) => DemoState) => setState(updater)

  return (
    <div className="app-shell">
      <div className="demo-banner"><Info size={14} /> Demo mode: fictional data · Microsoft Entra ID and ClickUp are simulated · Browser-side access controls are not production security</div>
      <Sidebar user={currentUser} open={navOpen} onClose={() => setNavOpen(false)} onReset={resetDemo} />
      <div className="main-column">
        <Header users={state.users} currentUser={currentUser} onSwitch={switchPersona} onMenu={() => setNavOpen(true)} />
        <main className="workspace">
          <Routes>
            <Route path="/" element={<Navigate to="/home" replace />} />
            <Route path="/login" element={<LoginPage users={state.users} onSwitch={switchPersona} />} />
            <Route path="/home" element={<HomePage user={currentUser} proposals={state.proposals} />} />
            <Route path="/ideas/new" element={<IdeaIntake state={state} updateState={updateState} />} />
            <Route path="/proposals/:id" element={<ProposalPage state={state} />} />
            <Route path="/approvals" element={<ApprovalsPage user={currentUser} state={state} updateState={updateState} />} />
            <Route path="/executive" element={<ExecutivePage user={currentUser} proposals={state.proposals} />} />
            <Route path="/admin/users" element={<AdminUsers user={currentUser} state={state} updateState={updateState} />} />
            <Route path="/admin/departments" element={<AdminDepartments user={currentUser} users={state.users} />} />
            <Route path="/admin/audit" element={<AdminAudit user={currentUser} state={state} />} />
            <Route path="*" element={<Navigate to="/home" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}

function Sidebar({ user, open, onClose, onReset }: { user: User; open: boolean; onClose: () => void; onReset: () => void }) {
  const location = useLocation()
  const links = [
    { to: '/home', label: 'Workspace', icon: Home, show: true },
    { to: '/ideas/new', label: 'Submit an idea', icon: Plus, show: true },
    { to: '/approvals', label: 'Department approvals', icon: ClipboardCheck, show: isRoleActive(user, 'approver') || isRoleActive(user, 'admin') },
    { to: '/executive', label: 'Executive dashboard', icon: BarChart3, show: canOpenExecutive(user) },
    { to: '/admin/users', label: 'Role management', icon: Users, show: canManageRoles(user) },
    { to: '/admin/departments', label: 'Departments & scopes', icon: Settings2, show: canManageRoles(user) },
    { to: '/admin/audit', label: 'Audit log', icon: History, show: canManageRoles(user) },
  ]
  return <>
    {open && <button className="nav-scrim" onClick={onClose} aria-label="Close navigation" />}
    <aside className={`sidebar ${open ? 'open' : ''}`}>
      <div className="brand"><div className="brand-mark"><Sparkles size={20} /></div><div><strong>Kickoff</strong><span>Idea launchpad</span></div><button className="icon-button close-nav" onClick={onClose}><X size={18} /></button></div>
      <nav>{links.filter((link) => link.show).map((link) => <Link key={link.to} to={link.to} onClick={onClose} className={location.pathname === link.to ? 'active' : ''}><link.icon size={18} /><span>{link.label}</span></Link>)}</nav>
      <div className="sidebar-bottom">
        <div className="integration-line"><span className="status-dot" /> Entra ID <b>Simulated</b></div>
        <div className="integration-line"><span className="status-dot" /> ClickUp <b>Simulated</b></div>
        <button className="reset-button" onClick={onReset}><RotateCcw size={16} /> Reset demo data</button>
      </div>
    </aside>
  </>
}

function Header({ users, currentUser, onSwitch, onMenu }: { users: User[]; currentUser: User; onSwitch: (id: string) => void; onMenu: () => void }) {
  return <header className="topbar">
    <button className="icon-button menu-button" onClick={onMenu} aria-label="Open navigation"><Menu size={20} /></button>
    <div className="search-box"><Search size={17} /><span>Search proposals, people, or departments</span><kbd>⌘ K</kbd></div>
    <label className="persona-select"><span>Viewing as</span><select aria-label="Switch demo persona" value={currentUser.id} onChange={(event) => onSwitch(event.target.value)}>{users.map((user) => <option key={user.id} value={user.id}>{user.name}{!user.active ? ' (revoked)' : ''}</option>)}</select><ChevronDown size={15} /></label>
    <div className="avatar" title={currentUser.name}>{currentUser.name.split(' ').map((part) => part[0]).join('')}</div>
  </header>
}

function PageHeader({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: ReactNode }) {
  return <div className="page-header"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{description}</p></div>{action}</div>
}

function HomePage({ user, proposals }: { user: User; proposals: Proposal[] }) {
  const mine = proposals.filter((proposal) => proposal.submitterId === user.id)
  const reviewCount = approvalProposals(user, proposals).length
  const executiveCount = executiveProposals(user, proposals).length
  return <div className="view-enter">
    <PageHeader eyebrow="Workspace" title={`Good afternoon, ${user.name.split(' ')[0]}`} description="Move an idea from rough thought to a decision-ready proposal." action={<Link className="primary-button" to="/ideas/new"><Plus size={17} /> New idea</Link>} />
    {!user.active && <AccessNotice title="This persona has been revoked" text="Assigned roles no longer grant access. Switch personas to continue the demo." />}
    <section className="metric-strip">
      <Metric label="My proposals" value={mine.length} detail="Created by this persona" />
      <Metric label="Awaiting review" value={reviewCount} detail="Within assigned scope" />
      <Metric label="Executive records" value={executiveCount} detail="Approved and in scope" />
      <Metric label="Active role grants" value={user.active ? user.roles.length : 0} detail={user.active ? user.roles.map((role) => roleLabels[role]).join(', ') : 'Access revoked'} />
    </section>
    <section className="section-block">
      <div className="section-title"><div><h2>Your proposal activity</h2><p>Fictional records for the selected demo persona.</p></div><span className="count-label">{mine.length} records</span></div>
      {mine.length ? <ProposalTable proposals={mine} /> : <EmptyState icon={<FileText size={24} />} title="No proposals yet" text="Start with an idea you already have. Kickoff will confirm it before building a proposal." action={<Link className="secondary-button" to="/ideas/new">Submit an idea</Link>} />}
    </section>
    <section className="workflow-rail">
      {['Idea captured', 'Summary confirmed', 'Proposal drafted', 'Department review', 'Pilot decision'].map((label, index) => <div key={label}><span>{index + 1}</span><p>{label}</p></div>)}
    </section>
  </div>
}

function Metric({ label, value, detail }: { label: string; value: number; detail: string }) {
  return <div className="metric"><span>{label}</span><strong>{value}</strong><small>{detail}</small></div>
}

function ProposalTable({ proposals }: { proposals: Proposal[] }) {
  return <div className="table-wrap"><table><thead><tr><th>Proposal</th><th>Primary department</th><th>Impact</th><th>Feasibility</th><th>Status</th><th /></tr></thead><tbody>{proposals.map((proposal) => <tr key={proposal.id}><td><strong>{proposal.title}</strong><span>Updated {proposal.updatedAt} · v{proposal.version}</span></td><td>{proposal.primaryDepartment}</td><td><Score value={proposal.score} /></td><td>{proposal.feasibility}</td><td><Status status={proposal.status} /></td><td><Link className="row-link" to={`/proposals/${proposal.id}`} aria-label={`Open ${proposal.title}`}><ExternalLink size={16} /></Link></td></tr>)}</tbody></table></div>
}

function Score({ value }: { value: number }) { return <span className="score"><b>{value}</b>/100</span> }
function Status({ status }: { status: ProposalStatus }) { return <span className={`status ${statusTone[status]}`}><span />{status}</span> }

function IdeaIntake({ state, updateState }: { state: DemoState; updateState: (updater: (current: DemoState) => DemoState) => void }) {
  const navigate = useNavigate()
  const user = state.users.find((item) => item.id === state.currentUserId)!
  const [step, setStep] = useState(1)
  const [idea, setIdea] = useState('')
  const [department, setDepartment] = useState<Department>('Operations')
  const [outcome, setOutcome] = useState('')
  const summary = idea ? `Create a focused pilot to ${idea.trim().replace(/[.]+$/, '').toLowerCase()}, then measure whether it improves the intended experience or operation.` : ''
  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (step < 4) return setStep(step + 1)
    const id = `p${Date.now()}`
    const title = idea.split(/\s+/).slice(0, 6).join(' ').replace(/^./, (char) => char.toUpperCase())
    const proposal: Proposal = { id, title, summary, submitterId: user.id, submitterDepartment: department, problem: `The current experience around ${idea.toLowerCase()} has not been consistently addressed.`, solution: `Run a limited pilot to ${idea.toLowerCase()}.`, audience: outcome || 'Requires department input', primaryDepartment: department, supportingDepartments: department === 'Technology' ? ['Operations'] : ['Technology'], values: ['Excellence', 'Teamwork'], businessValue: ['Operational improvement', 'Time savings'], score: 72, scoreRationale: 'Preliminary score reflects a focused opportunity and a pilotable approach; measurable impact needs validation.', feasibility: 'Moderate', feasibilityRationale: 'The pilot is bounded, but department ownership, resourcing, and baseline data require validation.', status: 'Draft', risk: 'Scope, owner, and baseline assumptions require department input.', pilot: 'A four-week, single-team pilot with a defined baseline and review checkpoint.', measures: ['Participation', 'Cycle time', 'Stakeholder feedback'], version: 1, updatedAt: '2026-08-05' }
    updateState((current) => ({ ...current, proposals: [proposal, ...current.proposals], audit: [{ id: `a${Date.now()}`, actor: user.name, action: 'Created proposal draft', target: title, at: '2026-08-05 12:32' }, ...current.audit] }))
    navigate(`/proposals/${id}`)
  }
  return <div className="intake-layout view-enter">
    <section className="intake-main">
      <PageHeader eyebrow="New submission" title="Shape your idea" description="One focused question at a time. Unknown details can stay unknown." />
      <div className="stepper">{['Idea', 'Confirm', 'Context', 'Draft'].map((label, index) => <div key={label} className={step >= index + 1 ? 'active' : ''}><span>{step > index + 1 ? <Check size={14} /> : index + 1}</span><b>{label}</b></div>)}</div>
      <form className="intake-form" onSubmit={submit}>
        {step === 1 && <div className="form-stage"><div className="kickoff-prompt"><div className="prompt-mark"><Sparkles size={18} /></div><div><b>Welcome to Kickoff.</b><p>Bring me an idea you already have, even if it is rough, and I’ll help turn it into a structured business proposal. What is your idea?</p></div></div><label>Describe your idea in your own words<textarea autoFocus value={idea} onChange={(event) => setIdea(event.target.value)} placeholder="Example: I want to pilot..." rows={6} required /></label><p className="form-help">Kickoff develops ideas you bring; it does not generate the starting idea.</p></div>}
        {step === 2 && <div className="form-stage"><h2>Confirm the idea summary</h2><p className="lead">Here is the working summary. Confirm it or go back to refine your wording.</p><div className="summary-panel"><Sparkles size={20} /><p>{summary}</p></div><label className="check-row"><input type="checkbox" required /> This summary accurately reflects my idea.</label></div>}
        {step === 3 && <div className="form-stage"><h2>Add the routing context</h2><p className="lead">These two details materially affect the recommended owner and pilot.</p><label>Submitter department<select value={department} onChange={(event) => setDepartment(event.target.value as Department)}>{departments.map((item) => <option key={item}>{item}</option>)}</select></label><label>Who should benefit, or what outcome should change?<textarea value={outcome} onChange={(event) => setOutcome(event.target.value)} placeholder="Guests entering the venue, event-day staff, processing time..." rows={4} required /></label></div>}
        {step === 4 && <div className="form-stage"><h2>Ready for a preliminary proposal</h2><p className="lead">Kickoff will clearly label assumptions and send unresolved operational details to department review.</p><div className="draft-preview"><div><span>Submitter department</span><b>{department}</b></div><div><span>Primary route</span><b>{department} · Preliminary</b></div><div><span>Intake questions</span><b>2 material questions</b></div><div><span>Unknowns</span><b>Requires department input</b></div></div></div>}
        <div className="form-actions">{step > 1 && <button type="button" className="text-button" onClick={() => setStep(step - 1)}><ArrowLeft size={16} /> Back</button>}<button className="primary-button" disabled={!idea.trim()}>{step === 4 ? <><Sparkles size={17} /> Generate proposal</> : <>Continue <Send size={16} /></>}</button></div>
      </form>
    </section>
    <aside className="intake-aside"><div className="aside-sticky"><div className="aside-icon"><ShieldCheck size={20} /></div><h3>What happens next</h3><p>A preliminary proposal will include department routing, an impact score, feasibility, a pilot, an essential-person roadmap, and open questions.</p><hr /><span className="micro-label">Evidence standard</span><p>Names, projections, and official approval authority are never invented.</p></div></aside>
  </div>
}

function ProposalPage({ state }: { state: DemoState }) {
  const { id } = useParams()
  const proposal = state.proposals.find((item) => item.id === id)
  const [tab, setTab] = useState('Proposal')
  if (!proposal) return <AccessNotice title="Proposal not found" text="This fictional record may have been removed when demo data was reset." />
  return <div className="view-enter">
    <Link className="back-link" to="/home"><ArrowLeft size={16} /> Back to workspace</Link>
    <div className="proposal-heading"><div><div className="eyebrow">Proposal {proposal.id.toUpperCase()} · Version {proposal.version}</div><h1>{proposal.title}</h1><p>{proposal.summary}</p><div className="tag-row"><Status status={proposal.status} /><span className="plain-tag">{proposal.primaryDepartment}</span><span className="plain-tag">Updated {proposal.updatedAt}</span></div></div><div className="proposal-actions"><button className="secondary-button"><FileText size={16} /> Executive summary</button><button className="primary-button"><Send size={16} /> Submit for review</button></div></div>
    <div className="tab-bar">{['Proposal', 'Roadmap', 'Analytics', 'ClickUp preview'].map((item) => <button key={item} className={tab === item ? 'active' : ''} onClick={() => setTab(item)}>{item}</button>)}</div>
    {tab === 'Proposal' && <div className="proposal-grid"><article className="proposal-body"><Section title="Problem or opportunity"><p>{proposal.problem}</p></Section><Section title="Proposed solution"><p>{proposal.solution}</p></Section><Section title="Target audience or beneficiaries"><p>{proposal.audience}</p></Section><Section title="Expected business value"><TagList values={proposal.businessValue} /></Section><Section title="Organizational-values alignment"><TagList values={proposal.values} /><p className="muted">Preliminary alignment based on the described behavior and intended outcome.</p></Section><Section title="Recommended pilot"><p>{proposal.pilot}</p></Section><Section title="Risks, dependencies, and open questions"><p>{proposal.risk}</p></Section><Section title="Measures of success"><ul>{proposal.measures.map((item) => <li key={item}>{item}</li>)}</ul></Section></article><aside className="proposal-inspector"><div className="score-panel"><span>Business Impact Score</span><strong>{proposal.score}<small>/100</small></strong><p>{proposal.scoreRationale}</p><em>Preliminary, not an official decision or forecast</em></div><div className="inspector-block"><span>Feasibility</span><b>{proposal.feasibility}</b><p>{proposal.feasibilityRationale}</p></div><div className="inspector-block"><span>Department routing</span><b>{proposal.primaryDepartment}</b><p>Primary · High confidence</p>{proposal.supportingDepartments.map((item) => <p key={item}>{item} · Supporting</p>)}</div></aside></div>}
    {tab === 'Roadmap' && <Roadmap proposal={proposal} />}
    {tab === 'Analytics' && <Analytics proposal={proposal} />}
    {tab === 'ClickUp preview' && <ClickUpPreview proposal={proposal} />}
  </div>
}

function Section({ title, children }: { title: string; children: ReactNode }) { return <section><h2>{title}</h2>{children}</section> }
function TagList({ values }: { values: string[] }) { return <div className="tag-list">{values.map((value) => <span key={value}>{value}</span>)}</div> }

function Roadmap({ proposal }: { proposal: Proposal }) {
  const steps = [
    ['1', 'Validate requirements', `${proposal.primaryDepartment} owner · Requires verification`, 'Confirm scope, baseline, staffing, and operational constraints.'],
    ['2', 'Review dependencies', `${proposal.supportingDepartments.join(' + ')} validators`, 'Review technology, data, communication, and cross-team requirements.'],
    ['3', 'Leadership pilot decision', 'Essential decision-maker · Requires verification', 'Approve, revise, or stop the proposed limited pilot.'],
    ['4', 'Run and measure pilot', 'Pilot owner + measurement lead', proposal.pilot],
    ['5', 'Scale decision', 'Leadership reviewer · Requires verification', 'Compare results with success measures and decide whether to stop, revise, continue, or scale.'],
  ]
  return <div className="roadmap-layout view-enter"><section><h2>Proposed approval roadmap</h2><p className="lead">This is a proposal-specific path, not an official company workflow.</p><div className="timeline">{steps.map(([number, title, owner, text]) => <div key={number}><span>{number}</span><article><small>{owner}</small><h3>{title}</h3><p>{text}</p></article></div>)}</div></section><aside><h3>Essential-person roadmap</h3><RoadmapRole label="Required decision-maker" role={`${proposal.primaryDepartment} pilot sponsor`} stage="Pilot decision, scale decision" /><RoadmapRole label="Required implementer / validator" role={`${proposal.primaryDepartment} operational owner`} stage="Validation, pilot" /><RoadmapRole label="Required implementer / validator" role={`${proposal.supportingDepartments[0]} representative`} stage="Dependency review" /><RoadmapRole label="Optional adviser" role="Measurement or finance partner" stage="Measurement design" /><p className="fine-print">All individual ownership requires verification. Broad distribution lists are excluded.</p></aside></div>
}
function RoadmapRole({ label, role, stage }: { label: string; role: string; stage: string }) { return <div className="roadmap-role"><span>{label}</span><b>{role}</b><small>{stage} · Requires verification</small></div> }

function Analytics({ proposal }: { proposal: Proposal }) {
  const fields: [string, string][] = [['Idea title', proposal.title], ['Submission date', proposal.updatedAt], ['Submitter department', proposal.submitterDepartment], ['Primary department', proposal.primaryDepartment], ['Supporting departments', proposal.supportingDepartments.join(', ')], ['Idea category', 'Process improvement'], ['Business-value categories', proposal.businessValue.join(', ')], ['Target audience', proposal.audience], ['Geographic target', 'Not provided'], ['Strategic theme', 'Experience and operational effectiveness'], ['Core values supported', proposal.values.join(', ')], ['Revenue potential', proposal.businessValue.includes('Revenue generation') ? 'Needs validation' : 'Not identified'], ['Fan impact', proposal.businessValue.includes('Fan experience') ? 'Potentially material' : 'Needs validation'], ['Employee impact', proposal.businessValue.includes('Employee experience') ? 'Potentially material' : 'Needs validation'], ['Operational impact', proposal.businessValue.includes('Operational improvement') ? 'Potentially material' : 'Needs validation'], ['Estimated impact level', proposal.score >= 80 ? 'High preliminary potential' : 'Moderate preliminary potential'], ['Feasibility level', proposal.feasibility], ['Idea maturity', proposal.status === 'Draft' ? 'Concept' : 'Developing'], ['Current status', proposal.status], ['Keywords and concepts detected', proposal.businessValue.join(', ')], ['Potential success metrics', proposal.measures.join(', ')], ['Similar or related initiatives', 'Needs validation'], ['Departments frequently working together', 'Needs validation']]
  return <div className="analytics-sheet view-enter"><div className="section-title"><div><h2>Standardized analytics data</h2><p>Controlled labels support future cross-proposal analysis.</p></div><button className="secondary-button"><ExternalLink size={16} /> Export simulated CSV</button></div>{fields.map(([label, value]) => <div key={label}><span>{label}</span><b>{value}</b></div>)}</div>
}

function ClickUpPreview({ proposal }: { proposal: Proposal }) {
  const [list, setList] = useState('')
  const [previewed, setPreviewed] = useState(false)
  const [created, setCreated] = useState(false)
  return <div className="integration-preview view-enter"><div className="simulated-label"><Activity size={16} /> Simulated ClickUp integration</div><h2>Preview a ClickUp-ready task</h2><p>No live ClickUp connection is used. The destination must be chosen and the final action separately confirmed.</p><label>Destination List<select value={list} onChange={(event) => { setList(event.target.value); setPreviewed(false); setCreated(false) }}><option value="">Choose a simulated List</option><option>Proposal Review Demo</option><option>Executive Records Demo</option></select></label><button className="secondary-button" disabled={!list} onClick={() => setPreviewed(true)}><FileText size={16} /> Preview task</button>{previewed && <div className="task-preview"><span>Destination: {list}</span><h3>{proposal.title}</h3><p>{proposal.summary}</p><dl><dt>Impact score</dt><dd>{proposal.score}/100</dd><dt>Feasibility</dt><dd>{proposal.feasibility}</dd><dt>Status</dt><dd>{proposal.status}</dd></dl><button className="primary-button" onClick={() => { if (window.confirm('Confirm this simulated ClickUp task creation?')) setCreated(true) }}><CheckCircle2 size={17} /> Confirm simulated creation</button></div>}{created && <div className="success-note"><CheckCircle2 size={18} /> Simulated task created locally. No external data was changed.</div>}</div>
}

function ApprovalsPage({ user, state, updateState }: { user: User; state: DemoState; updateState: (updater: (current: DemoState) => DemoState) => void }) {
  const queue = approvalProposals(user, state.proposals)
  const decide = (proposal: Proposal, status: ProposalStatus) => updateState((current) => ({ ...current, proposals: current.proposals.map((item) => item.id === proposal.id ? { ...item, status, updatedAt: '2026-08-05', version: item.version + 1 } : item), audit: [{ id: `a${Date.now()}`, actor: user.name, action: status === 'Approved' ? 'Approved proposal' : status === 'Rejected' ? 'Rejected proposal' : 'Requested changes', target: proposal.title, at: '2026-08-05 12:32' }, ...current.audit] }))
  if (!isRoleActive(user, 'approver') && !isRoleActive(user, 'admin')) return <AccessNotice title="Department approval access required" text="This persona has no active department approver scope." />
  return <div className="view-enter"><PageHeader eyebrow="Department approvals" title="Review queue" description={`Showing only proposals in ${isRoleActive(user, 'admin') ? 'all active' : user.departmentScopes.join(', ')} approval scope.`} /><div className="scope-bar"><ShieldCheck size={17} /><b>Scope enforced</b><span>{user.active ? 'Only assigned departments appear in this queue.' : 'This account is inactive.'}</span></div>{queue.length ? <div className="review-list">{queue.map((proposal) => <article key={proposal.id}><div className="review-meta"><Status status={proposal.status} /><span>{proposal.primaryDepartment}</span><span>Impact {proposal.score}/100</span></div><h2>{proposal.title}</h2><p>{proposal.summary}</p><div className="review-facts"><div><span>Key risk</span><b>{proposal.risk}</b></div><div><span>Recommended pilot</span><b>{proposal.pilot}</b></div></div><div className="review-actions"><Link className="text-button" to={`/proposals/${proposal.id}`}>Open full proposal</Link><button className="secondary-button danger-text" onClick={() => decide(proposal, 'Rejected')}><XCircle size={16} /> Reject</button><button className="secondary-button" onClick={() => decide(proposal, 'Draft')}><RefreshCw size={16} /> Request changes</button><button className="primary-button" onClick={() => decide(proposal, 'Approved')}><CheckCircle2 size={16} /> Approve</button></div></article>)}</div> : <EmptyState icon={<ClipboardCheck size={24} />} title="Queue is clear" text="There are no proposals awaiting review in this persona’s assigned departments." />}</div>
}

function ExecutivePage({ user, proposals }: { user: User; proposals: Proposal[] }) {
  if (!canOpenExecutive(user)) return <AccessNotice title="Executive access required" text="Submitting an idea does not grant executive dashboard access. An active admin-assigned executive scope is required." />
  const scoped = executiveProposals(user, proposals)
  const average = scoped.length ? Math.round(scoped.reduce((sum, proposal) => sum + proposal.score, 0) / scoped.length) : 0
  return <div className="view-enter"><PageHeader eyebrow="Executive view" title="Approved proposal portfolio" description={`Scoped to ${isRoleActive(user, 'admin') ? 'all departments (admin)' : user.executiveScopes.join(', ') || 'no assigned departments'}.`} action={<button className="secondary-button"><ExternalLink size={16} /> Export scoped view</button>} /><div className="scope-bar"><LockKeyhole size={17} /><b>Executive scope active</b><span>Exports apply the same simulated department filter as this dashboard.</span></div><section className="metric-strip"><Metric label="Visible proposals" value={scoped.length} detail="Approved or pilot" /><Metric label="Average impact" value={average} detail="Preliminary score" /><Metric label="Active pilots" value={scoped.filter((item) => item.status === 'Pilot').length} detail="Within scope" /><Metric label="Open key risks" value={scoped.length} detail="One per proposal" /></section><div className="executive-layout"><section><div className="section-title"><div><h2>Decision queue</h2><p>Approved records visible to this persona.</p></div></div>{scoped.length ? <ProposalTable proposals={scoped} /> : <EmptyState icon={<LayoutDashboard size={24} />} title="No records in scope" text="This persona has no approved proposals in an assigned executive department scope." />}</section><aside className="impact-distribution"><h3>Impact distribution</h3>{[['80–100', scoped.filter((p) => p.score >= 80).length], ['65–79', scoped.filter((p) => p.score >= 65 && p.score < 80).length], ['Below 65', scoped.filter((p) => p.score < 65).length]].map(([label, count]) => <div key={label}><span>{label}</span><div><i style={{ width: `${scoped.length ? (Number(count) / scoped.length) * 100 : 0}%` }} /></div><b>{count}</b></div>)}<hr /><h3>Portfolio note</h3><p>Submission volume alone is not evidence of departmental performance. Review underlying proposals before drawing conclusions.</p></aside></div></div>
}

function AdminUsers({ user, state, updateState }: { user: User; state: DemoState; updateState: (updater: (current: DemoState) => DemoState) => void }) {
  if (!canManageRoles(user)) return <AccessNotice title="Admin access required" text="Only an active administrator can manage roles and scopes." />
  const toggleActive = (target: User) => updateState((current) => ({ ...current, users: current.users.map((item) => item.id === target.id ? { ...item, active: !item.active } : item), audit: [{ id: `a${Date.now()}`, actor: user.name, action: target.active ? 'Revoked demo access' : 'Restored demo access', target: target.name, at: '2026-08-05 12:32' }, ...current.audit] }))
  const toggleRole = (target: User, role: Role) => updateState((current) => ({ ...current, users: current.users.map((item) => item.id === target.id ? { ...item, roles: item.roles.includes(role) ? item.roles.filter((itemRole) => itemRole !== role) : [...item.roles, role] } : item), audit: [{ id: `a${Date.now()}`, actor: user.name, action: target.roles.includes(role) ? `Removed ${role} role` : `Assigned ${role} role`, target: target.name, at: '2026-08-05 12:32' }, ...current.audit] }))
  return <div className="view-enter"><PageHeader eyebrow="Administration" title="Role management" description="Changes take effect immediately in this browser and are added to the mock audit log." action={<button className="primary-button"><Plus size={16} /> Add fictional user</button>} /><div className="scope-bar warning-bar"><Info size={17} /><b>Demo authorization only</b><span>Production roles must be enforced by a trusted backend, never browser state or typed email domains.</span></div><div className="user-list">{state.users.map((target) => <article key={target.id}><div className="avatar large">{target.name.split(' ').map((part) => part[0]).join('')}</div><div className="user-identity"><h3>{target.name}</h3><p>{target.email} · {target.title}</p></div><div className="role-toggles">{(['employee', 'approver', 'executive', 'admin'] as Role[]).map((role) => <button key={role} className={target.roles.includes(role) ? 'on' : ''} disabled={target.id === 'u1' && role === 'admin'} onClick={() => toggleRole(target, role)}>{target.roles.includes(role) && <Check size={13} />}{roleLabels[role]}</button>)}</div><button className={`status-toggle ${target.active ? '' : 'inactive'}`} onClick={() => toggleActive(target)} disabled={target.id === user.id}>{target.active ? 'Active' : 'Revoked'}</button></article>)}</div></div>
}

function AdminDepartments({ user, users }: { user: User; users: User[] }) {
  if (!canManageRoles(user)) return <AccessNotice title="Admin access required" text="Only an active administrator can configure departments and access scopes." />
  return <div className="view-enter"><PageHeader eyebrow="Administration" title="Departments & scopes" description="Review the fictional routing configuration used by this static demo." /><div className="department-grid">{departments.map((department) => { const approvers = users.filter((item) => item.active && item.roles.includes('approver') && item.departmentScopes.includes(department)); const executives = users.filter((item) => item.active && item.roles.includes('executive') && item.executiveScopes.includes(department)); return <article key={department}><div className="department-heading"><div className="department-icon">{department.slice(0, 2).toUpperCase()}</div><div><h2>{department}</h2><span>Active routing scope</span></div></div><ScopePeople title="Department approvers" users={approvers} empty="Requires verification" /><ScopePeople title="Executive viewers" users={executives} empty="No assigned viewers" /><button className="text-button"><Settings2 size={15} /> Edit simulated scope</button></article> })}</div></div>
}
function ScopePeople({ title, users, empty }: { title: string; users: User[]; empty: string }) { return <div className="scope-people"><span>{title}</span>{users.length ? users.map((person) => <b key={person.id}>{person.name}</b>) : <em>{empty}</em>}</div> }

function AdminAudit({ user, state }: { user: User; state: DemoState }) {
  if (!canManageRoles(user)) return <AccessNotice title="Admin access required" text="The privileged audit history is visible only to active administrators." />
  return <div className="view-enter"><PageHeader eyebrow="Administration" title="Audit log" description="Simulated privileged actions recorded in browser-persisted demo state." /><div className="audit-list">{state.audit.map((event) => <article key={event.id}><div className="audit-icon"><History size={17} /></div><div><h3>{event.action}</h3><p><b>{event.actor}</b> · {event.target}</p></div><time>{event.at}</time></article>)}</div></div>
}

function LoginPage({ users, onSwitch }: { users: User[]; onSwitch: (id: string) => void }) {
  const navigate = useNavigate()
  return <div className="login-view view-enter"><div className="login-brand"><div className="brand-mark"><Sparkles size={24} /></div><span>Kickoff</span></div><h1>Choose a demo persona</h1><p>Each persona demonstrates a different server-authorized role and data scope.</p><div className="persona-grid">{users.filter((user) => ['u1', 'u2', 'u3', 'u4', 'u6'].includes(user.id)).map((user) => <button key={user.id} onClick={() => { onSwitch(user.id); navigate('/home') }}><div className="avatar large">{user.name.split(' ').map((part) => part[0]).join('')}</div><b>{user.name}</b><span>{user.active ? user.roles.map((role) => roleLabels[role]).join(' · ') : 'Revoked access'}</span><small>{user.departmentScopes.length ? `Approves: ${user.departmentScopes.join(', ')}` : user.executiveScopes.length ? `Executive: ${user.executiveScopes.join(', ')}` : user.title}</small></button>)}</div><button className="entra-button" disabled><LogOut size={17} /> Sign in with Microsoft Entra ID <span>Production only</span></button><p className="security-note"><LockKeyhole size={15} /> In production, a trusted backend must validate active tenant membership, issuer, account status, object ID, and verified primary email.</p></div>
}

function AccessNotice({ title, text }: { title: string; text: string }) { return <div className="access-notice view-enter"><div><LockKeyhole size={27} /></div><h1>{title}</h1><p>{text}</p><Link className="secondary-button" to="/login">Switch demo persona</Link></div> }
function EmptyState({ icon, title, text, action }: { icon: ReactNode; title: string; text: string; action?: ReactNode }) { return <div className="empty-state"><div>{icon}</div><h3>{title}</h3><p>{text}</p>{action}</div> }
