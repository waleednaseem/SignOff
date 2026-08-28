import { prisma } from "@/lib/db";

export async function nextNumber(key: "AG" | "CR") {
  const existing = await prisma.counter.findUnique({ where: { key } });
  if (!existing) {
    await prisma.counter.create({ data: { key, value: 1 } });
    return `${key}-0001`;
  }
  const counter = await prisma.counter.update({
    where: { key },
    data: { value: { increment: 1 } },
  });
  return `${key}-${String(counter.value).padStart(4, "0")}`;
}
