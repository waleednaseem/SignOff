import { jsonError, jsonOk } from "@/lib/api";
import { processAgreementReminders } from "@/lib/reminders";

export async function POST(request: Request) {
  const url = new URL(request.url);
  const secret = url.searchParams.get("secret") ?? request.headers.get("x-reminder-secret");
  if (process.env.REMINDER_SECRET && secret !== process.env.REMINDER_SECRET) {
    return jsonError("FORBIDDEN", "Invalid reminder secret.", 403);
  }
  const result = await processAgreementReminders();
  return jsonOk(result);
}

export async function GET(request: Request) {
  return POST(request);
}
