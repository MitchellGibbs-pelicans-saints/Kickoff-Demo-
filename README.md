# Kickoff Demo

A standalone, static demonstration of Kickoff, an internal idea launchpad that helps employees turn an idea they already have into a structured, properly routed, leadership-ready proposal.

## What the demo includes

- Guided employee idea intake with summary confirmation and focused routing questions
- Preliminary proposal generation with routing, Business Impact Score, feasibility, pilot, roadmaps, and analytics metadata
- Automatic primary and supporting department routing inferred from idea context, separate from submitter department
- Approval-stage histories with entered/completed dates, elapsed time, outcomes, and fictional assigned reviewers
- Department approval queues filtered by assigned department scope
- Executive dashboards filtered to approved proposals in assigned scopes
- Executive analytics for ideas created by submitter department, ideas received by routed department, and average approval-stage timing
- Admin role assignment, access revocation, department routing, and mock audit history
- Persona switching, browser-persisted state, and a reset-demo control
- Clearly labeled simulated Microsoft Entra ID and ClickUp integrations

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

## Demo personas

- Adrian Sanchez Jr: Motion Graphics Associate
- Victoria Boldis: Manager of Consumer Insights and Analytics
- James Title: Senior Director of Video Production
- Gayle Benson: mock initial admin
- Mitch Gibbs: revoked executive demonstrating immediate access loss

## Production security boundary

This static site demonstrates behavior, not production security. Browser-side roles, scopes, hidden navigation, and local storage can be modified by an end user.

A production implementation must enforce authentication and authorization on a trusted backend. Microsoft Entra ID sign-in must validate issuer, tenant, object identity, active membership, account state, and a verified primary `pelicans.com` or `saints.com` email. Domain text alone is not proof of employment. Production role and scope records must live server-side, privileged requests must be re-authorized, and ClickUp or agent credentials must never reach browser code. ClickUp writes must require a destination, payload preview, and explicit confirmation immediately before the server performs the write.
