import { createServer } from "node:http";

const port = Number(process.env.CINE_FIXTURE_PORT || "3901");
const mode = process.env.CINE_FIXTURE_MODE || "success";

/**
 * خادم تجارب فعلي لمسارات السينماتوغرافي.
 *
 * هذا الخادم ليس Mock داخل الاختبار، بل خدمة HTTP معزولة
 * لقياس عقد الربط الحقيقي بين الواجهة وطبقة الـ API proxy.
 */
const server = createServer(async (req, res) => {
  const { method = "GET", url = "/" } = req;

  if (method === "GET" && url === "/health") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: true, mode }));
    return;
  }

  if (method === "POST" && url === "/api/cineai/validate-shot") {
    let raw = "";
    req.setEncoding("utf8");
    req.on("data", (chunk) => {
      raw += chunk;
    });

    req.on("end", () => {
      try {
        if (mode === "fail") {
          res.writeHead(503, { "content-type": "application/json" });
          res.end(
            JSON.stringify({
              success: false,
              error: "Fixture forced failure",
            })
          );
          return;
        }

        const payload = raw ? JSON.parse(raw) : {};
        if (!payload.imageBase64 || !payload.mimeType) {
          res.writeHead(400, { "content-type": "application/json" });
          res.end(
            JSON.stringify({
              success: false,
              error: "Missing imageBase64 or mimeType",
            })
          );
          return;
        }

        const bytes = Buffer.from(payload.imageBase64, "base64").length;
        const score = Math.max(65, Math.min(97, Math.round(60 + bytes / 80)));

        res.writeHead(200, { "content-type": "application/json" });
        res.end(
          JSON.stringify({
            success: true,
            validation: {
              score,
              status: score > 80 ? "excellent" : "good",
              exposure: "Balanced",
              composition: "Strong thirds",
              focus: "Sharp",
              colorBalance: "Neutral",
              suggestions: [
                "استمر على نفس منحنى التعريض.",
                "يمكن إضافة فصل ضوئي بسيط لزيادة العمق.",
              ],
              improvements: ["تحسين بسيط في الفصل الخلفي."],
            },
            source: "cinematography-fixture",
          })
        );
      } catch (error) {
        res.writeHead(500, { "content-type": "application/json" });
        res.end(
          JSON.stringify({
            success: false,
            error:
              error instanceof Error
                ? error.message
                : "Invalid fixture payload",
          })
        );
      }
    });

    return;
  }

  if (method === "POST" && url === "/api/cineai/color-grading") {
    let raw = "";
    req.setEncoding("utf8");
    req.on("data", (chunk) => {
      raw += chunk;
    });

    req.on("end", () => {
      try {
        const payload = raw ? JSON.parse(raw) : {};
        const sceneType = payload.sceneType || "generic";
        res.writeHead(200, { "content-type": "application/json" });
        res.end(
          JSON.stringify({
            success: true,
            sceneType,
            palette: ["#111111", "#3a3a3a", "#7f5f3a", "#c9a56a", "#f4e2b8"],
            source: "cinematography-fixture",
          })
        );
      } catch {
        res.writeHead(500, { "content-type": "application/json" });
        res.end(JSON.stringify({ success: false, error: "Invalid payload" }));
      }
    });

    return;
  }

  res.writeHead(404, { "content-type": "application/json" });
  res.end(JSON.stringify({ success: false, error: "Not found" }));
});

server.listen(port, "127.0.0.1", () => {
  process.stdout.write(
    `[cinematography-fixture] listening on http://127.0.0.1:${port} mode=${mode}\n`
  );
});

const shutdown = () => {
  server.close(() => {
    process.exit(0);
  });
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
