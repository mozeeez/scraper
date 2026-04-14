# scraper

## 1. Installation

1. Make sure Node.js and npm are installed.
   - Recommended: Node.js 18 or newer.
   - Check the installation with:
     ```bash
     node -v
     npm -v
     ```
2. Install all dependencies from the `scraper` directory:
   ```bash
   npm install
   ```
3. Install Playwright browsers (required):
   ```bash
   npx playwright install
   ```

## 2. Start

### WebUntis server

1. From the `scraper` directory, start the WebUntis server:
   ```bash
   node webuntis/server.js
   ```
2. The server will run at:
   ```text
   http://localhost:3000
   ```
