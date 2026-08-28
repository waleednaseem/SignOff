import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  company: z.string().optional(),
});

export const clientSchema = z.object({
  fullName: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional().nullable(),
  company: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  status: z.enum(["ACTIVE", "DISABLED"]).optional(),
});

export const projectSchema = z.object({
  clientId: z.string().min(1),
  name: z.string().min(2),
  description: z.string().optional().nullable(),
  status: z.enum(["PLANNING", "ACTIVE", "ON_HOLD", "COMPLETED", "CANCELLED"]).optional(),
  startDate: z.string().optional().nullable(),
  expectedCompletion: z.string().optional().nullable(),
  internalNotes: z.string().optional().nullable(),
});

export const requirementSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  inclusion: z.enum(["INCLUDED", "EXCLUDED", "OPTIONAL"]).default("INCLUDED"),
  estimatedEffort: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const priceItemSchema = z.object({
  id: z.string().optional(),
  label: z.string().min(1),
  amount: z.coerce.number(),
  type: z.enum(["INCLUDED", "OPTIONAL", "ADDITIONAL", "DISCOUNT", "TAX"]).default("INCLUDED"),
});

export const milestoneSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
  amount: z.coerce.number().default(0),
  deliverables: z.string().optional().nullable(),
});

export const termSchema = z.object({
  id: z.string().optional(),
  key: z.string().min(1),
  title: z.string().min(1),
  content: z.string().min(1),
});

export const agreementDraftSchema = z.object({
  clientId: z.string().min(1).optional(),
  projectId: z.string().min(1).optional(),
  templateId: z.string().optional().nullable(),
  expiresAt: z.string().optional().nullable(),
  internalNotes: z.string().optional().nullable(),
  projectTitle: z.string().optional(),
  shortDescription: z.string().optional().nullable(),
  detailedDescription: z.string().optional().nullable(),
  objectives: z.string().optional().nullable(),
  startDate: z.string().optional().nullable(),
  estimatedCompletion: z.string().optional().nullable(),
  timelineDisclaimer: z.string().optional().nullable(),
  currency: z.string().optional(),
  discountAmount: z.coerce.number().optional(),
  taxPercent: z.coerce.number().optional(),
  requirements: z.array(requirementSchema).optional(),
  priceItems: z.array(priceItemSchema).optional(),
  milestones: z.array(milestoneSchema).optional(),
  terms: z.array(termSchema).optional(),
  reasonForChange: z.string().optional(),
  changesSummary: z.string().optional(),
});

export const commentSchema = z.object({
  requirementId: z.string().optional().nullable(),
  parentId: z.string().optional().nullable(),
  text: z.string().min(1),
  authorName: z.string().optional(),
  authorEmail: z.string().email().optional(),
});

export const changeRequestSchema = z.object({
  agreementId: z.string().min(1),
  title: z.string().min(2),
  description: z.string().min(2),
  additionalCost: z.coerce.number().default(0),
  additionalTimeDays: z.coerce.number().default(0),
  requesterName: z.string().optional(),
  requesterEmail: z.string().email().optional(),
});

export const signSchema = z.object({
  versionId: z.string().min(1),
  signerName: z.string().min(2),
  email: z.string().email(),
  typedName: z.string().min(2),
  imageData: z.string().min(20),
  confirmed: z.literal(true),
  createAccount: z.boolean().optional(),
  password: z.string().min(8).optional(),
});

export const templateSchema = z.object({
  name: z.string().min(2),
  type: z.string().min(2),
  description: z.string().optional().nullable(),
  requirements: z.array(requirementSchema).optional(),
  priceItems: z.array(priceItemSchema).optional(),
  milestones: z.array(milestoneSchema).optional(),
  terms: z.array(termSchema).optional(),
});
