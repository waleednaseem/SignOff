export const openApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "Signoff API",
    version: "1.0.0",
    description: "Project Agreement & Client Portal REST API",
  },
  servers: [{ url: "/api", description: "Application API" }],
  components: {
    securitySchemes: { cookieAuth: { type: "apiKey", in: "cookie", name: "authjs.session-token" } },
    schemas: {
      ApiSuccess: {
        type: "object",
        properties: { success: { type: "boolean", example: true }, data: { type: "object" } },
      },
      ApiError: {
        type: "object",
        properties: {
          success: { type: "boolean", example: false },
          error: {
            type: "object",
            properties: {
              code: { type: "string", example: "UNAUTHORIZED" },
              message: { type: "string" },
            },
          },
        },
      },
    },
  },
  paths: {
    "/auth/register": {
      post: {
        tags: ["Auth"],
        summary: "Register client account",
        requestBody: {
          content: {
            "application/json": {
              example: { name: "Ada Client", email: "ada@example.com", password: "password1", company: "Ada Co" },
            },
          },
        },
        responses: { "201": { description: "{ success: true, data: { id, email } }" } },
      },
    },
    "/dashboard": { get: { tags: ["Dashboard"], summary: "Role-aware dashboard stats", security: [{ cookieAuth: [] }] } },
    "/clients": {
      get: { tags: ["Clients"], summary: "List clients", security: [{ cookieAuth: [] }] },
      post: { tags: ["Clients"], summary: "Create client", security: [{ cookieAuth: [] }] },
    },
    "/clients/{id}": {
      get: { tags: ["Clients"], summary: "Client detail", security: [{ cookieAuth: [] }] },
      patch: { tags: ["Clients"], summary: "Update client", security: [{ cookieAuth: [] }] },
    },
    "/projects": {
      get: { tags: ["Projects"], summary: "List projects", security: [{ cookieAuth: [] }] },
      post: { tags: ["Projects"], summary: "Create project", security: [{ cookieAuth: [] }] },
    },
    "/projects/{id}": {
      get: { tags: ["Projects"], summary: "Project detail", security: [{ cookieAuth: [] }] },
      patch: { tags: ["Projects"], summary: "Update project", security: [{ cookieAuth: [] }] },
    },
    "/agreements": {
      get: { tags: ["Agreements"], summary: "Search/filter agreements", security: [{ cookieAuth: [] }] },
      post: { tags: ["Agreements"], summary: "Create draft agreement", security: [{ cookieAuth: [] }] },
    },
    "/agreements/{id}": {
      get: { tags: ["Agreements"], summary: "Agreement detail", security: [{ cookieAuth: [] }] },
      patch: { tags: ["Agreements"], summary: "Save draft / create version if sent", security: [{ cookieAuth: [] }] },
    },
    "/agreements/{id}/send": { post: { tags: ["Agreements"], summary: "Send + generate secure link", security: [{ cookieAuth: [] }] } },
    "/agreements/{id}/link": {
      post: { tags: ["Agreements"], summary: "Regenerate token", security: [{ cookieAuth: [] }] },
      delete: { tags: ["Agreements"], summary: "Revoke token", security: [{ cookieAuth: [] }] },
    },
    "/agreements/{id}/versions": {
      get: { tags: ["Versions"], summary: "List versions", security: [{ cookieAuth: [] }] },
      post: { tags: ["Versions"], summary: "Create new version", security: [{ cookieAuth: [] }] },
    },
    "/agreements/{id}/versions/compare": { get: { tags: ["Versions"], summary: "Compare versions ?a=&b=", security: [{ cookieAuth: [] }] } },
    "/agreements/{id}/proposals": {
      get: {
        tags: ["Proposals"],
        summary: "List full-document proposals (client sees own)",
        security: [{ cookieAuth: [] }],
        responses: {
          "200": {
            description:
              "{ success: true, data: [{ id, versionNumber, kind: 'PROPOSAL', proposalStatus, projectTitle, createdAt }] }",
          },
        },
      },
      post: {
        tags: ["Proposals"],
        summary: "Clone current version into a proposal draft (does not change currentVersionId)",
        security: [{ cookieAuth: [] }],
        responses: {
          "201": {
            description:
              "{ success: true, data: { id, versionNumber, kind: 'PROPOSAL', proposalStatus: 'DRAFT_PROPOSAL', projectTitle, requirements, priceItems, milestones, terms, pricing } }",
          },
        },
      },
    },
    "/agreements/{id}/proposals/{versionId}": {
      get: { tags: ["Proposals"], summary: "Load a proposal document (no internal notes)", security: [{ cookieAuth: [] }] },
      patch: {
        tags: ["Proposals"],
        summary: "Save draft proposal (client)",
        security: [{ cookieAuth: [] }],
        requestBody: {
          content: {
            "application/json": {
              example: { projectTitle: "Northstar shop refresh", shortDescription: "Revised scope", currency: "USD" },
            },
          },
        },
      },
    },
    "/agreements/{id}/proposals/{versionId}/submit": {
      post: {
        tags: ["Proposals"],
        summary: "Submit proposal. Unsigned → CHANGES_REQUESTED. Signed → ChangeRequest + snapshot.",
        security: [{ cookieAuth: [] }],
        responses: {
          "200": { description: "{ success: true, data: { id, proposalStatus: 'SUBMITTED' } }" },
        },
      },
    },
    "/agreements/{id}/proposals/{versionId}/approve": {
      post: {
        tags: ["Proposals"],
        summary: "Admin: pre-sign becomes current version; post-sign creates linked SENT agreement",
        security: [{ cookieAuth: [] }],
        responses: {
          "200": {
            description:
              "{ success: true, data: { proposalStatus: 'APPROVED', currentVersionId? , childAgreement?: { id, number }, link } }",
          },
        },
      },
    },
    "/agreements/{id}/proposals/{versionId}/reject": {
      post: {
        tags: ["Proposals"],
        summary: "Admin reject; current/signed version unchanged",
        security: [{ cookieAuth: [] }],
        requestBody: { content: { "application/json": { example: { note: "Keep original pricing" } } } },
        responses: {
          "200": { description: "{ success: true, data: { proposalStatus: 'REJECTED' } }" },
        },
      },
    },
    "/agreements/{id}/comments": {
      get: { tags: ["Comments"], summary: "List comments", security: [{ cookieAuth: [] }] },
      post: { tags: ["Comments"], summary: "Add comment", security: [{ cookieAuth: [] }] },
    },
    "/agreements/{id}/sign": { post: { tags: ["Signature"], summary: "Sign current version", security: [{ cookieAuth: [] }] } },
    "/agreements/{id}/history": { get: { tags: ["Audit"], summary: "Agreement audit trail", security: [{ cookieAuth: [] }] } },
    "/history": {
      get: {
        tags: ["Audit"],
        summary: "Client-scoped agreement history (no admin/internal events)",
        security: [{ cookieAuth: [] }],
        responses: {
          "200": {
            description: "{ success: true, data: [{ id, eventType, label, createdAt, agreement: { id, number } }] }",
          },
        },
      },
    },
    "/agreements/{id}/pdf": { get: { tags: ["PDF"], summary: "Download PDF", security: [{ cookieAuth: [] }] } },
    "/public/agreements/{token}": {
      get: { tags: ["Public"], summary: "Load anonymous agreement (no internal notes)" },
      post: {
        tags: ["Public"],
        summary: "Public actions: view, comment, request_changes, approve, sign, change_request",
        requestBody: { content: { "application/json": { example: { action: "view" } } } },
      },
    },
    "/change-requests": {
      get: { tags: ["Change Requests"], summary: "List change requests", security: [{ cookieAuth: [] }] },
      post: { tags: ["Change Requests"], summary: "Submit change request", security: [{ cookieAuth: [] }] },
      patch: { tags: ["Change Requests"], summary: "Update status (admin)", security: [{ cookieAuth: [] }] },
    },
    "/notifications": {
      get: { tags: ["Notifications"], summary: "List notifications", security: [{ cookieAuth: [] }] },
      post: { tags: ["Notifications"], summary: "Mark read", security: [{ cookieAuth: [] }] },
    },
    "/templates": {
      get: { tags: ["Templates"], summary: "List templates", security: [{ cookieAuth: [] }] },
      post: { tags: ["Templates"], summary: "Create template", security: [{ cookieAuth: [] }] },
    },
    "/settings": {
      get: { tags: ["Settings"], summary: "Get settings", security: [{ cookieAuth: [] }] },
      patch: { tags: ["Settings"], summary: "Update settings", security: [{ cookieAuth: [] }] },
    },
    "/reminders/run": { post: { tags: ["Reminders"], summary: "Process expiry reminders (cron hook)" } },
  },
};
