import express, { type Express } from "express";
import cors from "cors";
import path from "path";
import pinoHttp from "pino-http";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./auth";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

app.use((req, res, next) => {
  if (req.url.startsWith("/api/auth")) {
    return toNodeHandler(auth)(req, res);
  }
  next();
});

app.use(cors({ credentials: true, origin: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

// In production, serve the frontend static files from dist/public
// (Vite build output is copied here by the Dockerfile)
if (process.env.NODE_ENV === "production") {
  const staticDir = path.join(__dirname, "public");
  app.use(express.static(staticDir));
  // SPA fallback — any non-API route serves index.html (Express 5 wildcard syntax)
  app.get("/{*splat}", (_req, res) => {
    res.sendFile(path.join(staticDir, "index.html"));
  });
}

export default app;
