import { prisma } from "@/lib/db";
import { handleRouteError, jsonOk, requireAdmin, requireUser } from "@/lib/api";

async function getOrCreateSettings() {
  const existing = await prisma.appSettings.findUnique({ where: { id: "default" } });
  if (existing) return existing;
  return prisma.appSettings.create({
    data: { id: "default", companyName: "Signoff" },
  });
}

export async function GET() {
  try {
    await requireUser();
    return jsonOk(await getOrCreateSettings());
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    await requireAdmin();
    const body = await request.json();
    await getOrCreateSettings();
    const settings = await prisma.appSettings.update({
      where: { id: "default" },
      data: {
        companyName: body.companyName,
        companyEmail: body.companyEmail,
        companyAddress: body.companyAddress,
        defaultCurrency: body.defaultCurrency,
        reminderEnabled: body.reminderEnabled,
      },
    });
    return jsonOk(settings);
  } catch (error) {
    return handleRouteError(error);
  }
}
