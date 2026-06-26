import express from "express";
import cors from "cors";

class Server {
  constructor({ port = 3000, apiKey, routes }) {
    this.port = port;
    this.apiKey = apiKey;
    this.routes = routes;

    this.app = express();
    this.server = null;

    this.scraper = null;

    this._setupMiddleware();
    this._setupRoutes();
  }

  _setupMiddleware() {
    this.app.use(cors());
    this.app.use(express.json());
    this.app.use(express.static("public"));

    // API Key Middleware
    this.app.use((req, res, next) => {
      const clientKey = req.headers["x-api-key"];

      if (!clientKey) {
        return res
          .status(401)
          .json({ error: { message: "Server error: Missing API key" } });
      }

      if (clientKey !== this.apiKey) {
        return res
          .status(403)
          .json({ error: { message: "Server error: Invalid API key" } });
      }

      next();
    });
  }

  _setupRoutes() {
    if (typeof this.routes === "function") {
      this.routes(this.app, this);
    }
  }

  listen(callback) {
    this.server = this.app.listen(this.port, () => {
      console.log(`Server running on http://localhost:${this.port}`);
      if (callback) callback();
    });

    this.server.on("error", (error) => {
      if (error.code === "EADDRINUSE") {
        console.error(`Port ${this.port} is already in use. Pick another one.`);
        process.exit(1);
      }

      console.error("Server error:", error.message);
      process.exit(1);
    });

    return this.server;
  }

  getApp() {
    return this.app;
  }
}

export { Server };
