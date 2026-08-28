import { prisma } from "@/lib/db";
import { handleRouteError, jsonError, jsonOk, requireAdmin } from "@/lib/api";
import { templateSchema } from "@/lib/validators";
import { notDeleted } from "@/lib/soft-delete";

export async function GET() {
  try {
    await requireAdmin();
    const templates = await prisma.agreementTemplate.findMany({
      where: notDeleted,
      include: {
        requirements: { orderBy: { order: "asc" } },
        priceItems: { orderBy: { order: "asc" } },
        milestones: { orderBy: { order: "asc" } },
        terms: { orderBy: { order: "asc" } },
      },
      orderBy: { name: "asc" },
    });
    return jsonOk(templates);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const body = templateSchema.parse(await request.json());
    const template = await prisma.agreementTemplate.create({
      data: {
        name: body.name,
        type: body.type,
        description: body.description,
      },
    });
    if (body.requirements?.length) {
      await prisma.templateRequirement.createMany({
        data: body.requirements.map((item, order) => ({ ...item, order, templateId: template.id })),
      });
    }
    if (body.priceItems?.length) {
      await prisma.templatePriceItem.createMany({
        data: body.priceItems.map((item, order) => ({ ...item, order, templateId: template.id })),
      });
    }
    if (body.milestones?.length) {
      await prisma.templateMilestone.createMany({
        data: body.milestones.map((item, order) => ({ ...item, order, templateId: template.id })),
      });
    }
    if (body.terms?.length) {
      await prisma.templateTerm.createMany({
        data: body.terms.map((item, order) => ({ ...item, order, templateId: template.id })),
      });
    }
    return jsonOk(template, 201);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    await requireAdmin();
    const body = await request.json();
    if (!body.id) return jsonError("MISSING_FIELDS", "Template id is required.", 400);
    if (body.duplicate) {
      const source = await prisma.agreementTemplate.findUnique({
        where: { id: body.id },
        include: { requirements: true, priceItems: true, milestones: true, terms: true },
      });
      if (!source) return jsonError("NOT_FOUND", "Template not found.", 404);
      const copy = await prisma.agreementTemplate.create({
        data: {
          name: `${source.name} copy`,
          type: source.type,
          description: source.description,
        },
      });
      if (source.requirements.length) {
        await prisma.templateRequirement.createMany({
          data: source.requirements.map(({ id: _id, templateId: _t, createdAt: _c, updatedAt: _u, ...item }) => ({
            ...item,
            templateId: copy.id,
          })),
        });
      }
      if (source.priceItems.length) {
        await prisma.templatePriceItem.createMany({
          data: source.priceItems.map(({ id: _id, templateId: _t, createdAt: _c, updatedAt: _u, ...item }) => ({
            ...item,
            templateId: copy.id,
          })),
        });
      }
      if (source.milestones.length) {
        await prisma.templateMilestone.createMany({
          data: source.milestones.map(({ id: _id, templateId: _t, createdAt: _c, updatedAt: _u, ...item }) => ({
            ...item,
            templateId: copy.id,
          })),
        });
      }
      if (source.terms.length) {
        await prisma.templateTerm.createMany({
          data: source.terms.map(({ id: _id, templateId: _t, createdAt: _c, updatedAt: _u, ...item }) => ({
            ...item,
            templateId: copy.id,
          })),
        });
      }
      return jsonOk(copy, 201);
    }
    const parsed = templateSchema.partial().parse(body);
    const template = await prisma.agreementTemplate.update({
      where: { id: body.id },
      data: { name: parsed.name, type: parsed.type, description: parsed.description },
    });
    return jsonOk(template);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    await requireAdmin();
    const { id } = await request.json();
    await prisma.agreementTemplate.update({ where: { id }, data: { deletedAt: new Date() } });
    return jsonOk({ id });
  } catch (error) {
    return handleRouteError(error);
  }
}
