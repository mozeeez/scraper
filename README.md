```ansi
  ______ ________________  ______   ___________
 /  ___// ___\_  __ \__  \ \____ \_/ __ \_  __ \
 \___ \\  \___|  | \// __ \|  |_> >  ___/|  | \/
/____  >\___  >__|  (____  /   __/ \___  >__|
     \/     \/           \/|__|        \/
```

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

### WebUntis Scraper

1. Create an `.env` in the project directory with the variables:
   ```bash
   WEBUNTIS_USERNAME="example.name"
   WEBUNTIS_PASSWORD="example1234"
   WEBUNTIS_URL="https://example.webuntis.com/WebUntis/index.do#/basic/login"
   ```
1. Run `npm start` and select `WebUntis`

   or

   From the `scraper` directory, start the WebUntis server:
   ```bash
   node webuntis/server.js
   ```
2. The server will run at:
   ```text
   http://localhost:3000
   ```

## 3. Docker

### Build

```bash
docker compose up --build
```

### Start

```bash
docker compose up
```

### Stop

```bash
docker compose down
```