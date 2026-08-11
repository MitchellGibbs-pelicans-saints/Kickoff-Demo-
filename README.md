# Kickoff Demo

A standalone, static demonstration of Kickoff, an internal idea launchpad that helps employees turn an idea they already have into a structured, properly routed, leadership-ready proposal.

## What the demo includes

- Guided employee idea intake with summary confirmation and focused routing questions
- Preliminary proposal generation with routing, Business Impact Score, feasibility, pilot, roadmaps, and analytics metadata
- Configurable, evidence-based routing across department remits, verified responsibilities and skills, proposal subjects, cross-department dependencies, permissions, confidence, and ambiguity thresholds
- Exactly one evidence-supported primary department when available, collaborating departments, a permission-eligible responsible reviewer, and human-review fallback without forced assignments
- Employee-visible controlled status, next action, reviewer questions, permission-safe feedback, and assignment history
- Append-only routing, assignment, transfer, permission, feedback, and status audit events
- Approval-stage histories with entered/completed dates, elapsed time, outcomes, and fictional assigned reviewers
- Department approval queues filtered by assigned department scope
- Executive dashboards filtered to approved proposals in assigned scopes
- Executive analytics for ideas created by submitter department, ideas received by routed department, and average approval-stage timing
- Admin role assignment, access revocation, department remits, routing thresholds, rule versions, fallback configuration, and immutable mock audit history
- Persona switching, browser-persisted state, and a reset-demo control
- Clearly labeled simulated Microsoft Entra ID and ClickUp integrations
- Routing, workflow, permission, feedback, transfer, stale-review, duplicate-event, and integration-boundary tests

All people, proposals, departments, metrics, and integration events in this demo are fictional or illustrative. The static application does not contain credentials and does not connect to company systems.

## Local development

```bash
npm install
npm run dev
```

Then open the local URL shown by Vite.

## Validation

```bash
npm run lint
npm test
npm run typecheck
npm run build
npm run preview
```

## GitHub Pages deployment

The Vite base is configured for `/Kickoff-Demo-/`. Pushing to `main` runs `.github/workflows/deploy.yml` and deploys the `dist` artifact through GitHub Actions.

For a new repository, open **Settings → Pages → Build and deployment → Source** and select **GitHub Actions** once. The expected site URL is:

`https://mitchellgibbs-pelicans-saints.github.io/Kickoff-Demo-/`

## Routing model

The static demo permission-filters reviewer candidates before ranking them. It scores administrator-maintained department remits and subjects together with fresh responsibility and skill evidence, supported collaborators, and versioned routing weights. A low-confidence or ambiguous recommendation, missing reviewer-fit evidence, a permission mismatch, stale evidence, or absent department evidence leaves the primary department and responsible reviewer unassigned and moves the proposal to the configured human-routing queue. The strongest candidate remains visible as a suggestion for the authorized fallback reviewer; the demo never silently substitutes a department or employee.

Admins can simulate remit, threshold, fallback, and rule-version changes in the browser. Every change appends an audit event. These controls demonstrate the intended experience only; production configuration, permissions, queues, notifications, audit retention, and enforcement require trusted backend services.

## Demo personas

- Mitch Gibbs: mock initial admin and human-routing fallback
- Avery Laurent: employee and proposal submitter
- Rowan Price: permission-scoped Operations and Technology reviewer
- Jordan Marchand: scoped executive
- Riley Patel: permission-scoped Partnerships and Marketing reviewer
- Cameron Ellis: revoked executive demonstrating immediate access loss

## Production security boundary

This static site demonstrates behavior, not production security. Browser-side roles, scopes, hidden navigation, and local storage can be modified by an end user.

A production implementation must enforce authentication and authorization on a trusted backend. Microsoft Entra ID sign-in must validate issuer, tenant, object identity, active membership, account state, and a verified primary `pelicans.com` or `saints.com` email. Domain text alone is not proof of employment. Production role and scope records must live server-side, privileged requests must be re-authorized, and ClickUp or agent credentials must never reach browser code. ClickUp writes must require a destination, payload preview, and explicit confirmation immediately before the server performs the write.
