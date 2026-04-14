import express from 'express';
import cors from 'cors';
import { WebUntisScraper } from './webuntis.js';

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

let scraper;

const initScraper = async () => {
  if (!scraper) {
    console.log();
    scraper = new WebUntisScraper();
    await scraper.init();
  }
  return scraper;
};

initScraper().catch((error) => {
  console.error('Failed to initialize WebUntis Scraper:', error);
  process.exit(1);
});

const closeScraper = async () => {
  if (scraper) {
    await scraper.close();
    scraper = null;
  }
};

app.get('/api/webuntis', async (req, res) => {
  try {
    const data = {
      success: true,
      message: 'WebUntis Scraper API is running',
    };
    res.json(data || { error: 'No data found' });
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

const port = process.env.PORT || 3000;
const server = app.listen(port, () =>
  console.log(`Server running on http://localhost:${port}`)
);

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
