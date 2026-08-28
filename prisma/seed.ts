import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { DEFAULT_TERMS } from "../lib/terms";

const prisma = new PrismaClient();

const TEMPLATE_DEFS = [
  {
    name: "Website Development",
    type: "website",
    description: "Marketing or brochure website with CMS-ready pages.",
    requirements: [
      { title: "Information architecture", category: "Discovery", inclusion: "INCLUDED" as const },
      { title: "Responsive website build", category: "Development", inclusion: "INCLUDED" as const },
      { title: "CMS setup", category: "Development", inclusion: "INCLUDED" as const },
      { title: "Contact form", category: "Features", inclusion: "INCLUDED" as const },
      { title: "Blog", category: "Features", inclusion: "OPTIONAL" as const },
    ],
    priceItems: [
      { label: "Design", amount: 800, type: "INCLUDED" as const },
      { label: "Development", amount: 2200, type: "INCLUDED" as const },
      { label: "Blog module", amount: 400, type: "OPTIONAL" as const },
    ],
  },
  {
    name: "Mobile App",
    type: "mobile",
    description: "Cross-platform mobile application.",
    requirements: [
      { title: "App wireframes", category: "Design", inclusion: "INCLUDED" as const },
      { title: "Core user flows", category: "Development", inclusion: "INCLUDED" as const },
      { title: "Push notifications", category: "Features", inclusion: "OPTIONAL" as const },
    ],
    priceItems: [
      { label: "Mobile development", amount: 5000, type: "INCLUDED" as const },
      { label: "Push notifications", amount: 600, type: "OPTIONAL" as const },
    ],
  },
  {
    name: "E-commerce",
    type: "ecommerce",
    description: "Storefront, catalog, checkout and order management.",
    requirements: [
      { title: "Product catalog", category: "Commerce", inclusion: "INCLUDED" as const },
      { title: "Checkout", category: "Commerce", inclusion: "INCLUDED" as const },
      { title: "Payment gateway", category: "Commerce", inclusion: "INCLUDED" as const },
    ],
    priceItems: [{ label: "E-commerce build", amount: 4500, type: "INCLUDED" as const }],
  },
  {
    name: "SaaS",
    type: "saas",
    description: "Multi-tenant web application with billing-ready architecture.",
    requirements: [
      { title: "Authentication", category: "Platform", inclusion: "INCLUDED" as const },
      { title: "Core modules", category: "Platform", inclusion: "INCLUDED" as const },
    ],
    priceItems: [{ label: "SaaS MVP", amount: 8000, type: "INCLUDED" as const }],
  },
  {
    name: "UI/UX Design",
    type: "design",
    description: "Research, wireframes and high-fidelity UI.",
    requirements: [
      { title: "User flows", category: "UX", inclusion: "INCLUDED" as const },
      { title: "High-fidelity screens", category: "UI", inclusion: "INCLUDED" as const },
    ],
    priceItems: [{ label: "UI/UX design", amount: 1800, type: "INCLUDED" as const }],
  },
  {
    name: "Maintenance",
    type: "maintenance",
    description: "Monthly care plan for updates, backups and small changes.",
    requirements: [
      { title: "Monthly updates", category: "Support", inclusion: "INCLUDED" as const },
      { title: "Backup monitoring", category: "Support", inclusion: "INCLUDED" as const },
    ],
    priceItems: [{ label: "Monthly retainer", amount: 250, type: "INCLUDED" as const }],
  },
  {
    name: "Custom Software",
    type: "custom",
    description: "Bespoke software scoped around unique business workflows.",
    requirements: [
      { title: "Discovery workshop", category: "Discovery", inclusion: "INCLUDED" as const },
      { title: "Custom build", category: "Development", inclusion: "INCLUDED" as const },
    ],
    priceItems: [{ label: "Custom development", amount: 6000, type: "INCLUDED" as const }],
  },
];

async function main() {
  const settings = await prisma.appSettings.findUnique({ where: { id: "default" } });
  if (!settings) {
    await prisma.appSettings.create({
      data: {
        id: "default",
        companyName: "Signoff",
        companyEmail: "hello@signoff.local",
        defaultCurrency: "USD",
      },
    });
  }

  const passwordHash = await bcrypt.hash("Admin123!", 12);
  const admin = await prisma.user.findUnique({ where: { email: "admin@signoff.local" } });
  if (!admin) {
    await prisma.user.create({
      data: {
        email: "admin@signoff.local",
        name: "Signoff Admin",
        passwordHash,
        role: "ADMIN",
      },
    });
  }

  const existingTemplates = await prisma.agreementTemplate.count();
  if (existingTemplates === 0) {
    for (const template of TEMPLATE_DEFS) {
      const created = await prisma.agreementTemplate.create({
        data: {
          name: template.name,
          type: template.type,
          description: template.description,
        },
      });
      await prisma.templateRequirement.createMany({
        data: template.requirements.map((item, order) => ({ ...item, order, templateId: created.id })),
      });
      await prisma.templatePriceItem.createMany({
        data: template.priceItems.map((item, order) => ({ ...item, order, templateId: created.id })),
      });
      await prisma.templateMilestone.createMany({
        data: [
          {
            templateId: created.id,
            order: 0,
            name: "Kickoff",
            description: "Discovery, access and project plan.",
            amount: 0,
            deliverables: "Kickoff notes",
          },
          {
            templateId: created.id,
            order: 1,
            name: "Delivery",
            description: "Final delivery and handover.",
            amount: 0,
            deliverables: "Production-ready delivery",
          },
        ],
      });
      await prisma.templateTerm.createMany({
        data: DEFAULT_TERMS.map((term, order) => ({ ...term, order, templateId: created.id })),
      });
    }
  }

  console.log("Seed complete. Admin login: admin@signoff.local / Admin123!");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
