import type { Response } from 'express';

import { websocketService } from '@/services/websocket.service';

import { breakappService } from './service';
import { breakappGateway } from './gateway';
import * as repo from './repository';
import type { AuthenticatedRequest } from './middlewares';
import { createSessionBodySchema, createOrderSchema, orderStatusSchema, runnerLocationSchema, createMenuItemSchema, updateMenuItemSchema } from './schemas';

export async function handleCreateSession(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const body = createSessionBodySchema.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({
        success: false,
        error: 'بيانات غير صالحة',
        details: body.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      });
      return;
    }

    const auth = req.breakappAuth;
    if (!auth) {
      res.status(401).json({ success: false, error: 'غير مصرح' });
      return;
    }

    const projectId = body.data.projectId ?? auth.projectId;
    const session = await breakappService.createSession({
      projectId,
      lat: body.data.lat,
      lng: body.data.lng,
      createdBy: auth.sub,
    });

    breakappGateway.emitSessionStarted(session.id, projectId);

    res.json({ id: session.id });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'فشل إنشاء الجلسة',
    });
  }
}

export async function handleGetOrders(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const auth = req.breakappAuth;
    if (!auth) {
      res.status(401).json({ success: false, error: 'غير مصرح' });
      return;
    }

    const orders = await breakappService.getMyOrders(auth.sub);
    res.json({ success: true, data: { orders } });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'فشل جلب الطلبات',
    });
  }
}

export async function handleCreateOrder(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const body = createOrderSchema.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({
        success: false,
        error: 'بيانات غير صالحة',
        details: body.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      });
      return;
    }

    const auth = req.breakappAuth;
    if (!auth) {
      res.status(401).json({ success: false, error: 'غير مصرح' });
      return;
    }

    const order = await breakappService.createOrder({
      sessionId: body.data.sessionId,
      userId: auth.sub,
      items: body.data.items,
    });

    const vendor = await repo.getVendorById(order.vendorId);
    const totalItems = order.items.reduce((sum, item) => sum + item.quantity, 0);
    websocketService.emitCustom('task:new', {
      id: order.id,
      vendorId: order.vendorId,
      vendorName: vendor?.name ?? order.vendorId,
      items: totalItems,
      status: 'pending',
    });
    breakappGateway.emitTaskNew({
      id: order.id,
      vendorId: order.vendorId,
      vendorName: vendor?.name ?? order.vendorId,
      items: totalItems,
      sessionId: order.sessionId,
    });

    res.status(201).json(order);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'فشل إنشاء الطلب',
    });
  }
}

export async function handleGetOrder(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const orderId = req.params['id'];
    if (typeof orderId !== 'string' || !orderId) {
      res.status(400).json({ success: false, error: 'معرف الطلب مطلوب' });
      return;
    }

    const order = await breakappService.getOrder(orderId);
    if (!order) {
      res.status(404).json({ success: false, error: 'الطلب غير موجود' });
      return;
    }

    res.json({ success: true, data: { order } });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'فشل جلب الطلب',
    });
  }
}