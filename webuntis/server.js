import { Server } from "../Server.js";
import { WebUntisScraper } from "./scraper.js";

const API_KEY = "API_KEY_HERE"; // Replace with your actual API key or use environment variable

let scraper;

// Initialize scraper ONCE at startup
const start = async () => {
  console.log("\nInitializing WebUntis Scraper...");
  scraper = new WebUntisScraper();
  await scraper.open();

  // Route definitions live here
  const routes = (app) => {
    app.get("/api/webuntis", async (req, res) => {
      res.json({
        success: { message: "WebUntis Scraper API is running" },
      });
    });

    app.get("/api/webuntis/getDay", async (req, res) => {
      try {
        const data = await scraper.getDay(req.query.weekdayIndex);
        res.json(data || { error: { message: "No data found." } });
      } catch (error) {
        res.status(500).json({ error: { message: error.message } });
      }
    });

    app.get("/api/webuntis/getCurrentDay", async (req, res) => {
      try {
        const data = await scraper.getCurrentDay();
        res.json(data || { error: { message: "No data found." } });
      } catch (error) {
        res.status(500).json({ error: { message: error.message } });
      }
    });

    app.get("/api/webuntis/getWeek", async (req, res) => {
      try {
        const data = await scraper.getWeek();
        res.json(data || { error: { message: "No data found." } });
      } catch (error) {
        res.status(500).json({ error: { message: error.message } });
      }
    });

    app.get("/api/webuntis/getCurrent", async (req, res) => {
      try {
        const data = await scraper.getCurrent(req.query.currentTime);
        res.json(data || { error: { message: "No data found." } });
      } catch (error) {
        res.status(500).json({ error: { message: error.message } });
      }
    });
  };

  // Boot server
  const server = new Server({
    port: process.env.WEBUNTIS_PORT || 3000,
    apiKey: process.env.WEBUNTIS_API_KEY || API_KEY,
    routes,
  });

  server.listen(() => {});
};

start();
