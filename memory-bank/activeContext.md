# Active context

MongoDB + Prisma. Compass 27017 is standalone; Prisma writes need a replica set, so the app uses mongodb://127.0.0.1:27018/signoff. Seeded admin: admin@signoff.local / Admin123!

Client portal is a separate shell (cream background, top nav). Clients land on My agreements, draw e-sign with mouse, and see only their own history (`GET /api/history`). Drafts and admin events are hidden.
