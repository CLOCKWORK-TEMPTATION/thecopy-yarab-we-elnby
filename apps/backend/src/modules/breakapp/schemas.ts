import { z } from "zod";

export const scanQrSchema = z.object({ qr_token: z.string().min(1) });
export const createSessionBodySchema = z.object({
  projectId: z.string().uuid().optional(),
  lat: z.number(),
  lng: z.number(),
});
export const orderItemSchema = z.object({
  menuItemId: z.string().uuid(),
  quantity: z.number().int().positive(),
});
export const createOrderSchema = z.object({
  sessionId: z.string().uuid(),
  items: z.array(orderItemSchema).min(1),
});
export const orderStatusSchema = z.object({
  status: z.enum(["pending", "processing", "completed", "cancelled"]),
});
export const runnerLocationSchema = z.object({
  runnerId: z.string().min(1),
  sessionId: z.string().uuid().optional(),
  lat: z.number().finite(),
  lng: z.number().finite(),
  accuracy: z.number().finite().nonnegative().optional(),
});
export const createMenuItemSchema = z.object({
  vendorId: z.string().uuid().optional(),
  name: z.string().min(1),
  description: z.string().max(500).optional(),
  price: z.number().int().nonnegative().optional(),
  available: z.boolean().optional().default(true),
});
export const updateMenuItemSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().max(500).nullable().optional(),
  price: z.number().int().nonnegative().optional(),
  available: z.boolean().optional(),
});
