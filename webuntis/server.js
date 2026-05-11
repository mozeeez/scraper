import express from 'express';
import cors from 'cors';
import { WebUntisScraper } from './scraper.js';

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Hardcoded API Key
const API_KEY =
	'lvBÔH@ûQ>t;ºCù\P;t}^ÁØj;)WìvÝÊÔ×$ÔÍê©è±]<ÀGÑ¦So¯¹U4ì¤Á*°5ÍÁÐê\ê¿ÐÈkQx^áÕhTAûªnçÅ¶ÌbMåó#ÊØa¹L(ùçú§ß="ïK»KãTþYo÷ÄR÷9ÿ¿áàÛw;¯|?nã\÷';

// API Key Middleware
app.use((req, res, next) => {
  const clientKey = req.headers['x-api-key'];

  if (!clientKey) {
    return res.status(401).json({ error: { message: 'Server error: Missing API key' } });
  }

  if (clientKey !== API_KEY) {
    return res.status(403).json({ error: { message: 'Server error: Invalid API key' } });
  }

  next();
});

let scraper;

const initScraper = async () => {
  if (!scraper) {
    console.log('\nInitializing WebUntis Scraper...');
    scraper = new WebUntisScraper();
    await scraper.open();
  }
  return scraper;
};

// Routes
app.get('/api/webuntis', async (req, res) => {
  try {
    const scraperInstance = await initScraper();
    res.json({
      success: {
        message: 'WebUntis Scraper API is running'
      }
    });
  } catch (error) {
    res.status(500).json({ error: { message: `Server error: ${error.message}` } });
  }
});

app.get('/api/webuntis/getDay', async (req, res) => {
  try {
    const { weekdayIndex } = req.query;
    const scraperInstance = await initScraper();
    const data = await scraperInstance.getDay(weekdayIndex);
    res.json(data || { error: {message: 'Server error: No data found.' } });
  } catch (error) {
    res.status(500).json({ error: { message: `Server error: ${error.message}` } });
  }
});

app.get('/api/webuntis/getCurrentDay', async (req, res) => {
  try {
    const scraperInstance = await initScraper();
    const data = await scraperInstance.getCurrentDay();
    res.json(data || { error: {message: 'Server error: No data found.' } });
  } catch (error) {
    res.status(500).json({ error: { message: `Server error: ${error.message}` } });
  }
});

app.get('/api/webuntis/getWeek', async (req, res) => {
  try {
    const scraperInstance = await initScraper();
    const data = await scraperInstance.getWeek();
    res.json(data || { error: {message: 'Server error: No data found.' } });
  } catch (error) {
    res.status(500).json({ error: { message: `Server error: ${error.message}` } });
  }
});

app.get('/api/webuntis/getCurrent', async (req, res) => {
  try {
    const { currentTime } = req.query;
    const scraperInstance = await initScraper();
    const data = await scraperInstance.getCurrent(currentTime);
    res.json(data || { error: {message: 'Server error: No data found.' } });
  } catch (error) {
    res.status(500).json({ error: { message: `Server error: ${error.message}` } });
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
      `Server Error: Port ${port} is already in use. Please stop the process using this port or choose a different port.`
    );
    process.exit(1);
  }

  console.error('Server error:', error.message);
  process.exit(1);
});