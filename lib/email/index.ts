export type EmailPayload = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

export interface EmailService {
  send(payload: EmailPayload): Promise<void>;
}

class StubEmailService implements EmailService {
  async send(payload: EmailPayload) {
    console.info("[email:stub]", {
      to: payload.to,
      subject: payload.subject,
      preview: payload.text ?? payload.html.slice(0, 180),
    });
  }
}

export const emailService: EmailService = new StubEmailService();

export const EMAIL_TEMPLATES = {
  agreementReceived: (agreementNumber: string, link: string) => ({
    subject: `Agreement ${agreementNumber} is ready for review`,
    html: wrap(`
      <h1>You have a new agreement to review</h1>
      <p>Agreement <strong>${agreementNumber}</strong> has been sent to you.</p>
      <p><a href="${link}">Open agreement</a></p>
    `),
  }),
  agreementUpdated: (agreementNumber: string, link: string) => ({
    subject: `Agreement ${agreementNumber} has been updated`,
    html: wrap(`
      <h1>A new version is ready</h1>
      <p>Please review the latest version of agreement <strong>${agreementNumber}</strong>.</p>
      <p><a href="${link}">Review changes</a></p>
    `),
  }),
  agreementViewed: (agreementNumber: string) => ({
    subject: `Client viewed agreement ${agreementNumber}`,
    html: wrap(`<p>A client opened agreement <strong>${agreementNumber}</strong>.</p>`),
  }),
  changesRequested: (agreementNumber: string) => ({
    subject: `Changes requested on ${agreementNumber}`,
    html: wrap(`<p>The client requested changes to agreement <strong>${agreementNumber}</strong>.</p>`),
  }),
  adminResponded: (agreementNumber: string, link: string) => ({
    subject: `Update on agreement ${agreementNumber}`,
    html: wrap(`<p>There is a new response on agreement <strong>${agreementNumber}</strong>.</p><p><a href="${link}">View agreement</a></p>`),
  }),
  signatureReminder: (agreementNumber: string, link: string) => ({
    subject: `Reminder: sign agreement ${agreementNumber}`,
    html: wrap(`<p>Agreement <strong>${agreementNumber}</strong> is waiting for your signature.</p><p><a href="${link}">Sign now</a></p>`),
  }),
  agreementSignedAdmin: (agreementNumber: string) => ({
    subject: `Agreement ${agreementNumber} has been signed`,
    html: wrap(`<p>The client signed agreement <strong>${agreementNumber}</strong>.</p>`),
  }),
  agreementSignedClient: (agreementNumber: string) => ({
    subject: `Your signed copy of ${agreementNumber}`,
    html: wrap(`<p>Thank you. Agreement <strong>${agreementNumber}</strong> is now signed. A copy is available in your portal.</p>`),
  }),
  changeRequestSubmitted: (number: string) => ({
    subject: `Change request ${number} submitted`,
    html: wrap(`<p>A new change request <strong>${number}</strong> was submitted.</p>`),
  }),
  changeRequestResponse: (number: string, status: string) => ({
    subject: `Change request ${number} is ${status}`,
    html: wrap(`<p>Change request <strong>${number}</strong> is now <strong>${status}</strong>.</p>`),
  }),
  expiryReminder: (agreementNumber: string, days: number, link: string) => ({
    subject: `Agreement ${agreementNumber} expires in ${days} day${days === 1 ? "" : "s"}`,
    html: wrap(`<p>Agreement <strong>${agreementNumber}</strong> expires soon.</p><p><a href="${link}">Open agreement</a></p>`),
  }),
  expired: (agreementNumber: string) => ({
    subject: `Agreement ${agreementNumber} has expired`,
    html: wrap(`<p>Agreement <strong>${agreementNumber}</strong> is no longer available for signature.</p>`),
  }),
};

function wrap(body: string) {
  return `<!doctype html><html><body style="font-family:Georgia,serif;color:#0f172a;line-height:1.6;padding:24px">${body}<hr/><p style="color:#64748b;font-size:12px">Sent by Signoff</p></body></html>`;
}

export async function sendTemplatedEmail(to: string, template: { subject: string; html: string }) {
  await emailService.send({ to, ...template, text: template.html.replace(/<[^>]+>/g, " ") });
}
