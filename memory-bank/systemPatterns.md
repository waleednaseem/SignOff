# System patterns

- Next.js App Router fullstack
- Domain modules: clients, projects, agreements, change-requests, notifications
- Agreement content lives on AgreementVersion snapshots
- Signed versions are locked; edits after send create a new version
- Client negotiate clones current into a PROPOSAL version; currentVersionId is unchanged until admin approve (pre-sign) or a new child agreement is created (post-sign)
- Public APIs never return internalNotes
- Email is an EmailService interface with a stub logger
- AuditLog is append-only
