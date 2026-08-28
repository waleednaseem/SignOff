# System patterns

- Next.js App Router fullstack
- Domain modules: clients, projects, agreements, change-requests, notifications
- Agreement content lives on AgreementVersion snapshots
- Signed versions are locked; edits after send create a new version
- Public APIs never return internalNotes
- Email is an EmailService interface with a stub logger
- AuditLog is append-only
