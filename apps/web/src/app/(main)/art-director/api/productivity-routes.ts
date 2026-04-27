import { Router, Request, Response } from "express";
import { pluginManager } from "../core/PluginManager";
import { getRequestBody } from "./route-utils";

export function registerProductivityRoutes(router: Router): void {
    // Productivity Analyzer endpoints
    router.post("/productivity/log-time", async (req: Request, res: Response) => {
        const result = await pluginManager.executePlugin("productivity-analyzer", {
            type: "log-time",
            data: getRequestBody(req),
        });
        res.json(result);
    });

    router.post(
        "/productivity/report-delay",
        async (req: Request, res: Response) => {
            const result = await pluginManager.executePlugin("productivity-analyzer", {
                type: "report-delay",
                data: getRequestBody(req),
            });
            res.json(result);
        }
    );

    router.post(
        "/productivity/recommendations",
        async (req: Request, res: Response) => {
            const result = await pluginManager.executePlugin("productivity-analyzer", {
                type: "recommendations",
                data: getRequestBody(req),
            });
            res.json(result);
        }
    );
}