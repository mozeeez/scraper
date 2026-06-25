```ansi
  ______ ________________  ______   ___________
 /  ___// ___\_  __ \__  \ \____ \_/ __ \_  __ \
 \___ \\  \___|  | \// __ \|  |_> >  ___/|  | \/
/____  >\___  >__|  (____  /   __/ \___  >__|
     \/     \/           \/|__|        \/
```

# scraper

A lightweight local scraper for retrieving WebUntis timetable data and exposing it via a local API.

## What is WebUntis?

WebUntis is a web-based school management platform used by many schools to provide students, teachers, and parents with access to timetables, substitutions, room changes, and other school-related information.

This project retrieves timetable data from a user's WebUntis account and makes it available through a local API for personal use.

---

### ⚠️ Disclaimer

This project is an unofficial tool and is not affiliated with, endorsed by, or connected to WebUntis or its operators.

It is intended for personal, educational, and non-commercial use only.

The scraper interacts with publicly accessible endpoints of WebUntis using user-provided credentials in order to retrieve timetable data and expose it via a local API.

Users are responsible for ensuring that their use of this software complies with:

- the terms of service of WebUntis
- applicable school or institutional policies
- local laws and regulations

This project does not bypass authentication mechanisms, security measures, or access restrictions. It only accesses data that the authenticated user already has permission to view through the official WebUntis interface.

The maintainers assume no liability for misuse, data loss, account restrictions, or any consequences arising from the use of this software.

### 🧾 Warranty

This software is provided "as is", without warranty of any kind, express or implied.  
Use it at your own risk.

### 🎯 Intended Use

This tool is designed to run locally and provide a personal API for timetable access.

It is not intended for:

- public redistribution of WebUntis data
- bypassing institutional restrictions
- commercial use
- high-frequency automated scraping

### 🔐 Security Notice

Users must provide their own WebUntis credentials via environment variables.

Example `.env`:

```bash
WEBUNTIS_USERNAME="your.username"
WEBUNTIS_PASSWORD="your.password"
WEBUNTIS_URL="https://example.webuntis.com/WebUntis/index.do#/basic/login"
```

---

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

1. The server will run at:
   ```text
   http://localhost:3000
   ```

## 3. Docker

#### Build

```bash
docker compose up --build
```

#### Start

```bash
docker compose up
```

#### Stop

```bash
docker compose down
```
