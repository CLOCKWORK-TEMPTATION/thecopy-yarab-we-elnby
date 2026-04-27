import { Router, Request, Response } from "express";
import { pluginManager } from "../core/PluginManager";
import { getRequestBody } from "./route-utils";

export function registerVirtualProductionRoutes(router: Router): void {
    // =====================================================
    // Virtual Production Engine endpoints
    // محرك الإنتاج الافتراضي والتصور المسبق
    // =====================================================

    router.post(
        "/virtual-production/create",
        async (req: Request, res: Response) => {
            const result = await pluginManager.executePlugin(
                "virtual-production-engine",
                {
                    type: "create-production",
                    data: getRequestBody(req),
                }
            );
            res.json(result);
        }
    );

    router.post(
        "/virtual-production/led-wall",
        async (req: Request, res: Response) => {
            const result = await pluginManager.executePlugin(
                "virtual-production-engine",
                {
                    type: "setup-led-wall",
                    data: getRequestBody(req),
                }
            );
            res.json(result);
        }
    );

    router.post(
        "/virtual-production/camera",
        async (req: Request, res: Response) => {
            const result = await pluginManager.executePlugin(
                "virtual-production-engine",
                {
                    type: "configure-camera",
                    data: getRequestBody(req),
                }
            );
            res.json(result);
        }
    );

    router.post(
        "/virtual-production/tracking",
        async (req: Request, res: Response) => {
            const result = await pluginManager.executePlugin(
                "virtual-production-engine",
                {
                    type: "start-tracking",
                    data: getRequestBody(req),
                }
            );
            res.json(result);
        }
    );

    router.post(
        "/virtual-production/frustum",
        async (req: Request, res: Response) => {
            const result = await pluginManager.executePlugin(
                "virtual-production-engine",
                {
                    type: "calculate-frustum",
                    data: getRequestBody(req),
                }
            );
            res.json(result);
        }
    );

    router.post(
        "/virtual-production/scene",
        async (req: Request, res: Response) => {
            const result = await pluginManager.executePlugin(
                "virtual-production-engine",
                {
                    type: "setup-scene",
                    data: getRequestBody(req),
                }
            );
            res.json(result);
        }
    );

    router.post(
        "/virtual-production/illusion",
        async (req: Request, res: Response) => {
            const result = await pluginManager.executePlugin(
                "virtual-production-engine",
                {
                    type: "calculate-illusion",
                    data: getRequestBody(req),
                }
            );
            res.json(result);
        }
    );

    router.get(
        "/virtual-production/illusions",
        async (_req: Request, res: Response) => {
            const result = await pluginManager.executePlugin(
                "virtual-production-engine",
                {
                    type: "list-illusions",
                    data: {},
                }
            );
            res.json(result);
        }
    );

    router.post("/virtual-production/vfx", async (req: Request, res: Response) => {
        const result = await pluginManager.executePlugin(
            "virtual-production-engine",
            {
                type: "add-vfx",
                data: getRequestBody(req),
            }
        );
        res.json(result);
    });

    router.post(
        "/virtual-production/calibrate",
        async (req: Request, res: Response) => {
            const result = await pluginManager.executePlugin(
                "virtual-production-engine",
                {
                    type: "calibrate-system",
                    data: getRequestBody(req),
                }
            );
            res.json(result);
        }
    );

    router.post(
        "/virtual-production/composite",
        async (req: Request, res: Response) => {
            const result = await pluginManager.executePlugin(
                "virtual-production-engine",
                {
                    type: "real-time-composite",
                    data: getRequestBody(req),
                }
            );
            res.json(result);
        }
    );

    router.post(
        "/virtual-production/export",
        async (req: Request, res: Response) => {
            const result = await pluginManager.executePlugin(
                "virtual-production-engine",
                {
                    type: "export-previz",
                    data: getRequestBody(req),
                }
            );
            res.json(result);
        }
    );

    router.get(
        "/virtual-production/list",
        async (_req: Request, res: Response) => {
            const result = await pluginManager.executePlugin(
                "virtual-production-engine",
                {
                    type: "list-productions",
                    data: {},
                }
            );
            res.json(result);
        }
    );
}