import { chromium } from "playwright-extra";
import stealth from "puppeteer-extra-plugin-stealth";
import dotenv, { parse } from "dotenv";

dotenv.config();

// Initialize stealth plugin
chromium.use(stealth());

const DEBUG = process.env.DEBUG === "true";
const TEST_MODE = process.env.TEST_MODE === "true";

class Scraper {
  static DEBUG = DEBUG;
  static TEST_MODE = TEST_MODE;

  constructor() {
    this.id = Math.random().toString(36).substring(2, 8);
    this.browser = null;
    this.page = null;
    this.count = 0;

    console.log(
      `Scraper [${this.id}] initialized with DEBUG=${Scraper.DEBUG} and TEST_MODE=${Scraper.TEST_MODE}`,
    );
    this.KEEP_OPEN = true;

    this.startTime = null;

    this.periodSchedule = {
      1: { start: "07:45", end: "08:30" },
      2: { start: "08:30", end: "09:15" },
      // Break: 09:15 - 09:30
      3: { start: "09:30", end: "10:15" },
      4: { start: "10:15", end: "11:00" },
      // Break: 11:00 - 11:15
      5: { start: "11:15", end: "12:00" },
      6: { start: "12:00", end: "12:45" },
      7: { start: "12:45", end: "13:30" },
      8: { start: "13:30", end: "14:15" },
      9: { start: "14:15", end: "15:00" },
      // Break: 15:00 - 15:15
      10: { start: "15:15", end: "16:00" },
      11: { start: "16:00", end: "16:45" },
      12: { start: "16:45", end: "17:30" },
      13: { start: "17:30", end: "18:15" },
    };

    this.timeoutPage = 60000;
    this.timeoutTimetable = 5000;
  }

  async launchBrowser() {
    this.browser = await chromium.launch({
      headless: Scraper.DEBUG ? false : true,
      args: ["--disable-dev-shm-usage"],
    });
  }

  async newPage() {
    if (!this.browser) {
      console.warn("Browser not initialized. Launching browser...");
      await this.launchBrowser();
    }
    this.page = await this.browser.newPage({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      viewport: { width: 1280, height: 720 },
    });
  }

  async debugScreenshot(name) {
    const time = new Date().toLocaleTimeString(undefined, { hour12: false });

    if (Scraper.DEBUG && this.page) {
      await this.page.screenshot({ path: `debug_${name}_${time}.png` });
    }
  }

  async pageOpen(url) {
    await this.page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: this.timeoutPage,
    });
  }

  saveStartTime() {
    this.startTime = performance.now();
  }

  readEnv(varname) {
    return process.env[varname];
  }

  getDurationSeconds() {
    const endTime = performance.now();
    const durationSeconds = ((endTime - this.startTime) / 1000).toFixed(2);
    this.startTime = null;
    return durationSeconds;
  }

  async closePage() {
    if (this.page) {
      await this.page.close();
      this.page = null;
    }
  }

  async closeBrowser() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}

export { Scraper };
