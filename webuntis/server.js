import express from 'express';
import cors from 'cors';
import { WebUntisScraper } from './webuntis.js';

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Hardcoded API Key
const API_KEY = 'my-secret-api-key-123';

// API Key Middleware
app.use((req, res, next) => {
  const clientKey = req.headers['x-api-key'];

  if (!clientKey) {
    return res.status(401).json({ error: 'Missing API key' });
  }

  if (clientKey !== API_KEY) {
    return res.status(403).json({ error: 'Invalid API key' });
  }

  next();
});

let scraper;

const initScraper = async () => {
  if (!scraper) {
    console.log();
    console.log('Initializing WebUntis Scraper...');
    console.log();
    try {
      scraper = new WebUntisScraper();
      await scraper.init();
      console.log('WebUntis Scraper initialized successfully');
    } catch (error) {
      console.error('Failed to initialize WebUntis Scraper:', error);
      throw error;
    }
    console.log();
  }
  return scraper;
};

const closeScraper = async () => {
  console.log();
  if (scraper) {
    await scraper.close();
    scraper = null;
    console.log('WebUntis Scraper closed successfully');
  } else {
    console.log('No scraper instance to close');
  }
};

// Routes
app.get('/api/webuntis', async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'WebUntis Scraper API is running',
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/webuntis/getDay', async (req, res) => {
  try {
    const { weekdayIndex } = req.query;

    if (!weekdayIndex) {
      return res.status(400).json({
        error: 'Missing required parameter: weekdayIndex',
      });
    }

    const scraperInstance = await initScraper();
    const data = await scraperInstance.getDay(parseInt(weekdayIndex));

    res.json(data || { error: 'No data found' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/webuntis/getCurrentDay', async (req, res) => {
  try {
    const scraperInstance = await initScraper();
    const data = await scraperInstance.getCurrentDay();
    res.json(data || { error: 'No data found' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/webuntis/getWeek', async (req, res) => {
  try {
    const scraperInstance = await initScraper();
    const data = await scraperInstance.getWeek();
    res.json(data || { error: 'No data found' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/webuntis/getCurrent', async (req, res) => {
  try {
    const { currentTime } = req.query;
    const scraperInstance = await initScraper();
    const data = await scraperInstance.getCurrent(currentTime);
    res.json(data || { error: 'No data found' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start server FIRST, then init scraper
const port = process.env.PORT || 3000;

const server = app.listen(port, async () => {
  console.log(`Server running on http://localhost:${port}`);

  await initScraper();
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(
      `Port ${port} is already in use. Please stop the process using this port or choose a different port.`
    );
    process.exit(1);
  }

  console.error('Server error:', error);
  process.exit(1);
});