import { Router } from "express";

import { breakappService } from "./service";
import { protectedLimiter, requireAuth } from "./middlewares";

export function registerGeoVendorRoutes(router: Router): void {
  router.get(
    "/geo/vendors/nearby",
    protectedLimiter,
    requireAuth,
    async (req, res) => {
      try {
        const lat = Number(req.query["lat"]);
        const lng = Number(req.query["lng"]);
        const radius = Number(req.query["radius"] ?? 3000);

        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
          res
            .status(400)
            .json({ success: false, error: "خط العرض والطول مطلوبان" });
          return;
        }

        const vendors = await breakappService.getNearbyVendors(lat, lng, radius);
        res.json(vendors);
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : "فشل جلب الموردين",
        });
      }
    },
  );

  router.get("/vendors", protectedLimiter, requireAuth, async (_req, res) => {
    try {
      const vendors = await breakappService.getVendors();
      res.json(vendors);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "فشل جلب الموردين",
      });
    }
  });

  router.get(
    "/vendors/:id/menu",
    protectedLimiter,
    requireAuth,
    async (req, res) => {
      try {
        const vendorId = req.params["id"];
        if (typeof vendorId !== "string" || !vendorId) {
          res.status(400).json({ success: false, error: "معرف المورد مطلوب" });
          return;
        }
        const menu = await breakappService.getVendorMenu(vendorId);
        res.json(menu);
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : "فشل جلب القائمة",
        });
      }
    },
  );
}
