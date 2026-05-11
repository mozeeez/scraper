import { chromium } from 'playwright-extra';
import stealth from 'puppeteer-extra-plugin-stealth';
import dotenv, { parse } from 'dotenv';

dotenv.config();

// Initialize stealth plugin
chromium.use(stealth());

class StepLogger {
  constructor(steps) {
    // steps: Array von Label-Strings, z.B. ['Browser launched', 'New page created', ...]
    this.steps = steps;
    this.states = new Array(steps.length).fill('pending'); // 'pending' | 'active' | 'done'
    this.lineCount = 0;
  }

  _symbol(state) {
    return { pending: '○', active: '◉', done: '●' }[state];
  }

  _render() {
    // Cursor zurück zu Zeilenanfang (vorherige Zeilen überschreiben)
    if (this.lineCount > 0) {
      process.stdout.write(`\x1B[${this.lineCount}A`); // Cursor hoch
    }

    this.steps.forEach((label, i) => {
      const symbol = this._symbol(this.states[i]);
      const num = `${i + 1}/${this.steps.length}`;
      process.stdout.write(`\r${symbol} ${num} ${label}\x1B[K\n`);
    });

    this.lineCount = this.steps.length;
  }

  start(index) {
    // Alle vorherigen als 'done' markieren
    for (let i = 0; i < index; i++) {
      if (this.states[i] === 'active') this.states[i] = 'done';
    }
    this.states[index] = 'active';
    this._render();
  }

  finish(index) {
    this.states[index] = 'done';
    this._render();
  }

  finishAll() {
    this.states = this.states.map(() => 'done');
    this._render();
  }
}

const DEBUG = false;
const TEST_MODE = false;

class Scraper {
  constructor() {
    this.id = Math.random().toString(36).substring(2, 8);
    this.browser = null;
    this.page = null;
    this.count = 0;

    this.DEBUG = DEBUG;
    console.log(`Scraper [${this.id}] initialized with DEBUG=${DEBUG} and TEST_MODE=${TEST_MODE}`);
    this.KEEP_OPEN = true;

    this.startTime = null;

    this.periodSchedule = {
      1:  { start: '07:45', end: '08:30' },
      2:  { start: '08:30', end: '09:15' },
      // Break: 09:15 - 09:30
      3:  { start: '09:30', end: '10:15' },
      4:  { start: '10:15', end: '11:00' },
      // Break: 11:00 - 11:15
      5:  { start: '11:15', end: '12:00' },
      6:  { start: '12:00', end: '12:45' },
      7:  { start: '12:45', end: '13:30' },
      8:  { start: '13:30', end: '14:15' },
      9:  { start: '14:15', end: '15:00' },
      // Break: 15:00 - 15:15
      10: { start: '15:15', end: '16:00' },
      11: { start: '16:00', end: '16:45' },
      12: { start: '16:45', end: '17:30' },
      13: { start: '17:30', end: '18:15' },
    };

    this.timeoutPage = 60000;
    this.timeoutTimetable = 5000;
  }

  async launchBrowser() {
    this.browser = await chromium.launch({
      headless: this.DEBUG ? false : true,
      args: ['--disable-dev-shm-usage'],
    });
  }

  async newPage() {
    if (!this.browser) {
      console.warn('Browser not initialized. Launching browser...');
      await this.launchBrowser();
    }
    this.page = await this.browser.newPage({
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      viewport: { width: 1280, height: 720 },
    });
  }

  async debugScreenshot(name) {
    const time = new Date().toLocaleTimeString(undefined, { hour12: false });

    if (this.DEBUG && this.page) {
      await this.page.screenshot({ path: `debug_${name}_${time}.png` });
    }
  }

  async pageOpen(url) {
    await this.page.goto(url, { waitUntil: 'domcontentloaded', timeout: this.timeoutPage });
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

class WebUntisScraper extends Scraper {
  constructor() {
    super();
    this.sessionWatcher = null;
    this.sessionWatcherInterval = 60000;
    this.sessionWatcherStartTime = null;
    this.sessionWatcherTriggers = ['Session', 'Timeout', 'Sitzung', 'verlängern'];
  }

  async open() {
  this.saveStartTime();

  try {
    console.log('\nOpen WebUntis Page...');

    const username = this.readEnv('WEBUNTIS_USERNAME');
    const password = this.readEnv('WEBUNTIS_PASSWORD');
    const url = this.readEnv('WEBUNTIS_URL');

    if (!username || !password || !url) {
      console.error('Internal error: Missing required environment variables. Please set WEBUNTIS_USERNAME, WEBUNTIS_PASSWORD, and WEBUNTIS_URL.');
      return;
    }

    console.log('-----------------------------');

    const logger = new StepLogger([
      'Browser launched',
      'New page created',
      'Page navigated',
      'Values entered',
      'Login successful',
      'Timetable opened',
    ]);

    logger.start(0);
    await this.launchBrowser();
    logger.finish(0);

    logger.start(1);
    await this.newPage();
    logger.finish(1);

    logger.start(2);
    await this.pageOpen(url);
    logger.finish(2);

    logger.start(3);
    await this.page.waitForSelector('.un-input-group__input');
    await this.page.locator('.un-input-group__input').nth(0).fill(username);
    await this.page.locator('.un-input-group__input').nth(1).fill(password);
    logger.finish(3);

    logger.start(4);
    await this.page.locator('button[type="submit"]').click();
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForSelector('a.Stundenplan', { state: 'visible' });
    logger.finish(4);

    logger.start(5);
    await this.page.locator('a.Stundenplan').click();
    await this.page.waitForLoadState('networkidle');
    logger.finish(5);

    console.log('-----------------------------');
    console.log(`Time: ${new Date().toLocaleString(undefined, { hour12: false })}`);
    const durationSeconds = this.getDurationSeconds();
    console.log(`✅ WebUntis opened successfully in ${durationSeconds} seconds`);
  } catch (error) {
    const durationSeconds = this.getDurationSeconds();
    console.error(`❌ Error occurred after ${durationSeconds}s:\n`, error.message);
    await this.debugScreenshot('open_error');
    // wait 2 seconds
    await new Promise(resolve => setTimeout(resolve, 2000));
    await this.restart();
  } finally {
    if (this.KEEP_OPEN) {
      console.log('Keeping the browser open\n');
      this.startSessionWatcher();
    } else {
      await this.closePage();
      await this.closeBrowser();
      console.log('Browser closed\n');
    }
  }
}

  startSessionWatcher() {
    if (this.sessionWatcher) return;

    this.sessionWatcherStartTime = performance.now();

    this.sessionWatcher = setInterval(async () => {
      try {
        if (!this.page) return;

        const content = await this.page.content();

        const sessionExpired = this.sessionWatcherTriggers.every(
          t => content.includes(t)
        );

        if (sessionExpired) {
          const aliveTime = (
            (performance.now() - this.sessionWatcherStartTime) / 60000
          ).toFixed(2);

          console.log(`⚠️ Session expired after ${aliveTime} minutes → restarting...`);

          this.stopSessionWatcher();
          await this.restart();
        }
      } catch (err) {
        console.error('Internal error: Session watcher:', err.message);
      }
    }, this.sessionWatcherInterval);
  }

  stopSessionWatcher() {
    if (this.sessionWatcher) {
      clearInterval(this.sessionWatcher);
      this.sessionWatcher = null;
      this.sessionWatcherStartTime = null;
    }
  }

  async restart() {
    console.log('Restarting browser session...');

    try {
      await this.stopSessionWatcher();
      await this.closePage();
      await this.closeBrowser();

      await this.open();
      console.log('✅ Restart completed successfully\n');
    } catch (error) {
      console.error('❌ Restart failed:\n', error.message);
    }
  }

  async getDay(weekdayIndex) {
    const startTime = performance.now();
    this.count++;
    console.log(`Attempt #${this.count} - getDay            - ${new Date().toLocaleString(undefined, { hour12: false })}`);

    if (!weekdayIndex) {
      console.error('- Error: Missing required parameter: weekdayIndex');
      return { error: { message: 'Missing required parameter: weekdayIndex' } };
    }

    if (isNaN(parseInt(weekdayIndex))) {
      console.error('- Error: Invalid parameter: weekdayIndex must be a number');
      return { error: { message: 'Invalid parameter: weekdayIndex must be a number' } };
    }

    const result = await this.extract(weekdayIndex);

    const durationSeconds = ((performance.now() - startTime) / 1000).toFixed(2);
    console.log(`- Completed in ${durationSeconds} seconds`);

    return result;
  }

  async getCurrentDay() {
    const startTime = performance.now();;
    this.count++;
    console.log(`Attempt #${this.count} - getCurrentDay     - ${new Date().toLocaleString(undefined, { hour12: false })}`);

    const result = await this.extract(this.getWeekdayIndex());

    const durationSeconds = ((performance.now() - startTime) / 1000).toFixed(2);
    console.log(`- Completed in ${durationSeconds} seconds`);

    return result;
  }

  async getWeek() {
    const startTime = performance.now();
    this.count++;
    console.log(`Attempt #${this.count} - getWeek           - ${new Date().toLocaleString(undefined, { hour12: false })}`);

    const days = [];
    for (let weekdayIndex = 0; weekdayIndex <= 4; weekdayIndex++) {
      days.push(await this.extract(weekdayIndex));
    }

    const week = { 0: days[0], 1: days[1], 2: days[2], 3: days[3], 4: days[4] };

    const durationSeconds = ((performance.now() - startTime) / 1000).toFixed(2);
    console.log(`- Completed in ${durationSeconds} seconds`);

    return week;
  }

  async getCurrent(currentTime = null) {
    const startTime = performance.now();
    this.count++;
    console.log(`Attempt #${this.count} - getCurrent        - ${new Date().toLocaleString(undefined, { hour12: false })}`);

    const currentDay = await this.extract(this.getWeekdayIndex());

    if (currentTime !== null && !this.isValidTime24h(currentTime)) {
      console.error('- Error: Invalid time format. Expected HH:MM in 24-hour format.');
      return { error: { message: 'Invalid time format. Expected HH:MM in 24-hour format.' } };
    }

    let result;
    if (currentDay.warn) {
      result = currentDay;
    } else {
      result = this.extendedExtraction(currentTime, currentDay);
    }

    const durationSeconds = ((performance.now() - startTime) / 1000).toFixed(2);
    console.log(`- Completed in ${durationSeconds} seconds`);

    return result;
  }

  async extract(weekdayIndex) {
    if (weekdayIndex < 0 || weekdayIndex > 4) {
      console.error(`- Internal error: weekdayIndex out of bounds.`);
      return { error: { message: 'Internal error: weekdayIndex out of bounds.' } };
    }

    let date = null;
    let cardData = [];

    let isTimeout = false;

    const appeared = await this.page
      .waitForSelector('.timetable-grid-card', { state: 'visible', timeout: this.timeoutTimetable })
      .catch(() => {
        isTimeout = true;
      });

    if (!appeared) {
      if (isTimeout) {
        console.warn('Timeout while getting timetable cards, skipping.')
      }
      console.warn(`- Warn: No timetable cards found for weekday index ${weekdayIndex}, skipping.`);
      return { warn: { message: 'No timetable data found.' } };
    }

    try {
      const columns = this.page.locator('.timetable-grid--column-container');
      const column = columns.nth(weekdayIndex);

      date = await this.page
        .locator('.column-header-label-text')
        .nth(weekdayIndex)
        .innerText();

      cardData = await column.locator('.timetable-grid-card').evaluateAll((cards) =>
        cards.map((card) => {
          const style = window.getComputedStyle(card);
          const subjectElement = card.querySelector('span');
          const classroomElement = Array.from(card.querySelectorAll('span')).find((span) =>
            /^r\d{3}$/.test(span.innerText.trim())
          );
          return {
            height: style.height,
            top: style.top,
            subject: subjectElement ? subjectElement.innerText.trim() : 'Unknown',
            classroom: classroomElement ? classroomElement.innerText.trim() : 'Unknown',
          };
        })
      );
    } catch (error) {
      console.error('- Internal error: Failed to extract timetable data:', error.message);
      await this.debugScreenshot('extract_error');
      return { error: { message: 'Internal error: Failed to extract timetable data.' } };
    }

    // ── Card px → period mapping ─────────────────
    let lessons = cardData.map((card, i) => {
      const startPx = parseInt(card.top, 10) - 9;
      const endPx = startPx + parseInt(card.height, 10);
      const startPeriod = startPx / 64 + 1;
      const endPeriod = startPeriod + (endPx - startPx + 1) / 64 - 1;
      const lessonTime = this.getLessonTime(startPeriod, endPeriod);

      return {
        i,
        subject: card.subject,
        classroom: card.classroom,
        startTime: lessonTime.start,
        endTime: lessonTime.end,
        startPeriod,
        endPeriod,
        durationPeriods: (endPx - startPx + 1) / 64,
      };
    });

    // ── Split lessons that span breaks ───────────
    const toMinutes = (time) => {
      const [h, m] = time.split(':').map(Number);
      return h * 60 + m;
    };

    const splitLessons = [];
    for (const lesson of lessons) {
      let currentStartPeriod = lesson.startPeriod;

      for (let p = lesson.startPeriod; p <= lesson.endPeriod; p++) {
        const current = this.periodSchedule[p];
        const next = this.periodSchedule[p + 1];
        const hasBreakAfter = next && toMinutes(next.start) > toMinutes(current.end);

        if (hasBreakAfter && p < lesson.endPeriod) {
          splitLessons.push({
            ...lesson,
            startPeriod: currentStartPeriod,
            endPeriod: p,
            startTime: this.periodSchedule[currentStartPeriod].start,
            endTime: current.end,
            durationPeriods: p - currentStartPeriod + 1,
          });
          currentStartPeriod = p + 1;
        }
      }

      splitLessons.push({
        ...lesson,
        startPeriod: currentStartPeriod,
        endPeriod: lesson.endPeriod,
        startTime: this.periodSchedule[currentStartPeriod].start,
        endTime: this.periodSchedule[lesson.endPeriod].end,
        durationPeriods: lesson.endPeriod - currentStartPeriod + 1,
      });
    }

    splitLessons.forEach((l, index) => (l.i = index));
    lessons = splitLessons;

    // ── Build periods array ──────────────────────
    const periods = lessons.flatMap((lesson) => {
      const result = [];
      for (let p = lesson.startPeriod; p <= lesson.endPeriod; p++) {
        const scheduleEntry = this.periodSchedule[p];
        result.push({
          period: p,
          subject: lesson.subject,
          classroom: lesson.classroom,
          startTime: scheduleEntry.start,
          endTime: scheduleEntry.end,
        });
      }
      return result;
    });

    // ── Build breaks array ───────────────────────
    const breaks = [];
    for (let i = 0; i < lessons.length - 1; i++) {
      const curr = lessons[i];
      const next = lessons[i + 1];
      const gap = toMinutes(next.startTime) - toMinutes(curr.endTime);

      if (gap > 0) {
        breaks.push({
          i: breaks.length,
          afterLessonIndex: i,
          beforeLessonIndex: i + 1,
          startTime: curr.endTime,
          endTime: next.startTime,
          startPeriod: curr.endPeriod,
          endPeriod: next.startPeriod,
          durationMinutes: gap,
        });
      }
    }

    return {
      date,
      start: lessons[0]?.startTime ?? null,
      end: lessons[lessons.length - 1]?.endTime ?? null,
      periods,
      lessons,
      breaks,
    };
  }

  extendedExtraction(currentTime, currentDay) {
    const toMinutes = (time) => {
      const [h, m] = time.split(':').map(Number);
      return h * 60 + m;
    };

    const now = currentTime || new Date().toTimeString().slice(0, 5);
    const nowMinutes = toMinutes(now);

    // ── Determine current/prev/next period ───────
    let currentPeriod = null;
    let previousPeriod = null;
    let nextPeriod = null;

    const periodsArr = Object.entries(this.periodSchedule)
      .map(([key, value]) => ({ number: Number(key), start: toMinutes(value.start), end: toMinutes(value.end) }))
      .sort((a, b) => a.start - b.start);

    for (let i = 0; i < periodsArr.length; i++) {
      const p = periodsArr[i];
      if (nowMinutes >= p.start && nowMinutes < p.end) {
        currentPeriod = p.number;
        previousPeriod = periodsArr[i - 1]?.number ?? null;
        nextPeriod = periodsArr[i + 1]?.number ?? null;
        break;
      }
      if (nowMinutes < p.start) {
        previousPeriod = periodsArr[i - 1]?.number ?? null;
        nextPeriod = p.number;
        break;
      }
    }

    const isBefore = nowMinutes < toMinutes(currentDay.start);
    const isOver = nowMinutes >= toMinutes(currentDay.end);

    // ── Match lessons to period slots ────────────
    const findLesson = (period) =>
      period != null
        ? currentDay.lessons.find((l) => l.startPeriod <= period && l.endPeriod >= period) ?? null
        : null;

    let currentPeriodLesson = findLesson(currentPeriod);
    let previousPeriodLesson = findLesson(previousPeriod);
    let nextPeriodLesson = findLesson(nextPeriod);

    const isBreak = !currentPeriodLesson && nextPeriod != null && previousPeriod != null;

    // ── Resolve previous/next lesson ─────────────
    let previousLesson = null;
    let nextLesson = null;

    if (currentPeriodLesson) {
      const idx = currentPeriodLesson.i;
      previousLesson = currentDay.lessons[idx - 1] ?? null;
      nextLesson = currentDay.lessons[idx + 1] ?? null;
    } else if (isBefore) {
      nextLesson = currentDay.lessons[0];
    } else if (isBreak) {
      nextLesson = currentDay.lessons.find((l) => l.startPeriod >= nextPeriod) ?? null;
      previousLesson = [...currentDay.lessons].reverse().find((l) => l.endPeriod <= previousPeriod) ?? null;
    } else if (isOver) {
      previousLesson = currentDay.lessons[currentDay.lessons.length - 1];
    }

    // ── Fallbacks for unmatched prev/next ────────
    if (!previousPeriodLesson && !isBefore) {
      previousLesson = [...currentDay.lessons].reverse().find((l) => toMinutes(l.endTime) <= nowMinutes) ?? null;
      if (previousLesson) previousPeriod = previousLesson.endPeriod;
    } else {
      previousLesson = previousLesson ?? (previousPeriodLesson !== currentPeriodLesson ? previousPeriodLesson : null);
    }

    if (!nextPeriodLesson && !isOver) {
      nextLesson = currentDay.lessons.find((l) => toMinutes(l.startTime) > nowMinutes) ?? null;
      if (nextLesson) nextPeriod = nextLesson.startPeriod;
    } else {
      nextLesson = nextLesson ?? (nextPeriodLesson !== currentPeriodLesson ? nextPeriodLesson : null);
    }

    // ── Build output objects ─────────────────────
    const makePeriodEntry = (period, lesson) => {
      if (!lesson) return undefined;
      const t = this.getPeriodTime(period);
      return {
        period,
        subject: lesson.subject ?? 'None',
        classroom: lesson.classroom ?? 'N/A',
        startTime: t?.start ?? 'N/A',
        endTime: t?.end ?? 'N/A',
      };
    };

    const makeLessonEntry = (lesson) => {
      if (!lesson) return undefined;
      return {
        subject: lesson.subject ?? 'None',
        classroom: lesson.classroom ?? 'N/A',
        durationPeriods: lesson.durationPeriods ?? 'N/A',
        startTime: lesson.startTime ?? 'N/A',
        endTime: lesson.endTime ?? 'N/A',
        startPeriod: lesson.startPeriod ?? 'N/A',
        endPeriod: lesson.endPeriod ?? 'N/A',
      };
    };

    const period = {};
    if (currentPeriodLesson) period.current = makePeriodEntry(currentPeriod, currentPeriodLesson);
    const prevEntry = makePeriodEntry(previousPeriod, previousLesson ?? previousPeriodLesson);
    if (prevEntry) period.previous = prevEntry;
    const nextEntry = makePeriodEntry(nextPeriod, nextLesson ?? nextPeriodLesson);
    if (nextEntry) period.next = nextEntry;

    const lesson = {};
    if (currentPeriodLesson) lesson.current = makeLessonEntry(currentPeriodLesson);
    if (previousLesson) lesson.previous = makeLessonEntry(previousLesson);
    if (nextLesson) lesson.next = makeLessonEntry(nextLesson);


    return {
      now,
      date: currentDay.date,
      start: currentDay.start,
      end: currentDay.end,
      periods: currentDay.periods,
      lessons: currentDay.lessons,
      breaks: currentDay.breaks,
      period,
      lesson,
      isBefore,
      isBreak,
      isOver,
    };
  }

  getWeekdayIndex() {
    const day = new Date().getDay();
    return day >= 1 && day <= 5 ? day - 1 : null;
  }

  getLessonTime(startPeriod, endPeriod) {
    return {
      start: this.periodSchedule[startPeriod].start,
      end: this.periodSchedule[endPeriod].end,
    };
  }

  getPeriodTime(period) {
    return {
      start: period ? this.periodSchedule[period]?.start ?? null : null,
      end: period ? this.periodSchedule[period]?.end ?? null : null,
    };
  }

  isValidTime24h(time) {
    if (typeof time !== 'string') return false;
    if (!/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(time)) return false;
    const [h, m] = time.split(':').map(Number);
    return h >= 0 && h <= 23 && m >= 0 && m <= 59;
  }

  async test(resultLog = this.DEBUG, stringify = true) {
    if (resultLog) {
      
      if (stringify) {
        console.log('getDay:');
        console.log(JSON.stringify(await this.getDay(2), null, 2));

        console.log('getCurrentDay:');
        console.log(JSON.stringify(await this.getCurrentDay(), null, 2));

        console.log('getWeek:');
        console.log(JSON.stringify(await this.getWeek(), null, 2));

        console.log('getCurrent:');
        console.log(JSON.stringify(await this.getCurrent(), null, 2));
      } else {
        console.log('getDay:');
        console.log(await this.getDay(2));

        console.log('getCurrentDay:');
        console.log(await this.getCurrentDay());

        console.log('getWeek:');
        console.log(await this.getWeek());

        console.log('getCurrent:');
        console.log(await this.getCurrent());
      } 
    } else {
      await this.getDay(2);
      await this.getCurrentDay();
      await this.getWeek();
      await this.getCurrent();
    }
  }
}

async function test() {
  const scraper = new WebUntisScraper();
  await scraper.open();
  await scraper.test();
}

export { Scraper, WebUntisScraper };

if (TEST_MODE) test();