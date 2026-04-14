import { chromium } from 'playwright-extra';
import stealth from 'puppeteer-extra-plugin-stealth';
import dotenv from 'dotenv';

dotenv.config();

// Initialize stealth plugin
chromium.use(stealth());

const DEBUG = false;
let count = 0;

class WebUntisScraper {
  constructor() {
    this.browser = null;
    this.page = null;
  }

  async init() {
    const startTime = performance.now();

    try {
      console.log('\nInitializing WebUntis Scraper...\n');

      const username = process.env.WEBUNTIS_USERNAME;
      const password = process.env.WEBUNTIS_PASSWORD;
      const url = process.env.WEBUNTIS_URL;

      if (!username || !password || !url) {
        throw new Error(
          'Missing credentials. Please check your .env file (WEBUNTIS_USERNAME, WEBUNTIS_PASSWORD, WEBUNTIS_URL).'
        );
      }

      console.log('1/5 Launching browser...');

      this.browser = await chromium.launch({ headless: DEBUG ? false : true });

      const context = await this.browser.newContext({
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        viewport: { width: 1280, height: 720 },
      });

      this.page = await context.newPage();

      await this.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
      console.log('2/5 Page loaded');

      // Wait
      await this.page.waitForSelector('.un-input-group__input');
      await this.page.locator('.un-input-group__input').nth(0).fill(username);
      await this.page.locator('.un-input-group__input').nth(1).fill(password);
      console.log('3/5 Values entered');
      await this.page.locator('button[type="submit"]').click();

      // Wait
      await this.page.waitForLoadState('networkidle');

      // Timetable
      await this.page.waitForSelector('a.Stundenplan', { state: 'visible' });
      console.log('4/5 Login successful');
      await this.page.locator('a.Stundenplan').click();

      // Wait
      await this.page.waitForLoadState('networkidle');
      console.log('5/5 Timetable opened');

      const endTime = performance.now();
      const durationSeconds = ((endTime - startTime) / 1000).toFixed(2);
      console.log(`\n✅ WebUntis Scraper initialized successfully in ${durationSeconds} seconds\n`);
    } catch (error) {
      const endTime = performance.now();
      const durationSeconds = ((endTime - startTime) / 1000).toFixed(2);
      console.error(`\n❌ Error occurred after ${durationSeconds}s:\n`, error.message);
      await scraper.page.screenshot({ path: 'debug_error__init.png' });
    } finally {
      if (DEBUG) {
        console.log('Debug mode is ON. Keeping the browser open for inspection.\n');
        return;
      }
    }
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  async getCurrentDay(shared = false) {
    let startTime;
    if (!shared) {
      count++;
      console.log(
        `Attempt #${count} - getCurrentDay     - ${new Date().toLocaleString()}`
      );
      startTime = performance.now();
    }

    const result = await this.getDay(getWeekdayIndex(), true);
    if (!shared) {
      const endTime = performance.now();
      const durationSeconds = ((endTime - startTime) / 1000).toFixed(2);
      console.log(`- Completed in ${durationSeconds} seconds`);
    }

    return result;
  }

  async getWeek() {
    const startTime = performance.now();
    count++;
    console.log(`Attempt #${count} - getWeek           - ${new Date().toLocaleString()}`);

    let days = [];
    for (let weekdayIndex = 0; weekdayIndex <= 4; weekdayIndex++) {
      const day = await this.getDay(weekdayIndex, true);
      days.push(day);
    }
    const week = {
      0: days[0],
      1: days[1],
      2: days[2],
      3: days[3],
      4: days[4],
    };

    const endTime = performance.now();
    const durationSeconds = ((endTime - startTime) / 1000).toFixed(2);
    console.log(`- Completed in ${durationSeconds} seconds`);

    return week;
  }

  async getDay(weekdayIndex, shared = false) {
    let startTime;
    if (!shared) {
      count++;
      console.log(
        `Attempt #${count} - getDay            - ${new Date().toLocaleString()}`
      ); 
      startTime = performance.now();
    }

    if (weekdayIndex < 0 || weekdayIndex > 4) {
      return { error: { message: 'Not a weekday.' } };
    }

    let date = null;
    let cardData = [];
    
    try {
      await this.page.waitForSelector('.timetable-grid-card', {
        state: 'attached',
      });
      await this.page.waitForTimeout(500);

      const columns = this.page.locator('.timetable-grid--column-container');
      const column = columns.nth(weekdayIndex);

      date = await this.page
        .locator('.column-header-label-text')
        .nth(weekdayIndex)
        .innerText();

      cardData = await column
        .locator('.timetable-grid-card')
        .evaluateAll((cards) => {
          return cards.map((card) => {
            const style = window.getComputedStyle(card);
            const subjectElement = card.querySelector('span');
            const classroomElement = Array.from(
              card.querySelectorAll('span')
            ).find((span) => /^r\d{3}$/.test(span.innerText.trim()));

            return {
              height: style.height,
              top: style.top,
              subject: subjectElement
                ? subjectElement.innerText.trim()
                : 'Unknown',
              classroom: classroomElement
                ? classroomElement.innerText.trim()
                : 'Unknown',
            };
          });
        });
    } catch (error) {
      console.log('Failed to extract timetable data:', error.message);
      await this.page.screenshot({ path: 'debug_error__extract.png' });
    }

    let lessons = [];

    cardData.forEach((card, i) => {
      const startPx = parseInt(card.top, 10) - 9;
      const endPx = startPx + parseInt(card.height, 10);
      const durationPx = endPx - startPx;

      const durationPeriods = (durationPx + 1) / 64;
      const startPeriod = startPx / 64 + 1;
      const endPeriod = startPeriod + durationPeriods - 1;

      const lessonTime = getLessonTime(startPeriod, endPeriod);

      const lesson = {
        i,
        subject: card.subject,
        classroom: card.classroom,
        startTime: lessonTime.start,
        endTime: lessonTime.end,
        startPeriod: startPeriod,
        endPeriod: endPeriod,
        durationPeriods: durationPeriods,
      };

      lessons.push(lesson);
    });

    const splitLessons = [];

    const toMinutes = (time) => {
      const [h, m] = time.split(':').map(Number);
      return h * 60 + m;
    };

    for (const lesson of lessons) {
      let currentStartPeriod = lesson.startPeriod;

      for (let p = lesson.startPeriod; p <= lesson.endPeriod; p++) {
        const current = periodSchedule[p];
        const next = periodSchedule[p + 1];

        const currentEnd = toMinutes(current.end);
        const nextStart = next ? toMinutes(next.start) : null;

        const hasBreakAfter = next && nextStart > currentEnd;

        if (hasBreakAfter && p < lesson.endPeriod) {
          splitLessons.push({
            ...lesson,
            startPeriod: currentStartPeriod,
            endPeriod: p,
            startTime: periodSchedule[currentStartPeriod].start,
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
        startTime: periodSchedule[currentStartPeriod].start,
        endTime: periodSchedule[lesson.endPeriod].end,
        durationPeriods: lesson.endPeriod - currentStartPeriod + 1,
      });
    }

    splitLessons.forEach((l, index) => (l.i = index));

    lessons = splitLessons;

    let periods = [];

    for (const lesson of lessons) {
      for (let p = lesson.startPeriod; p <= lesson.endPeriod; p++) {
        const scheduleEntry = periodSchedule[p];
        periods.push({
          period: p,
          subject: lesson.subject,
          classroom: lesson.classroom,
          startTime: scheduleEntry.start,
          endTime: scheduleEntry.end,
        });
      }
    }

    let breaks = [];

    for (let i = 0; i < lessons.length - 1; i++) {
      const currentLesson = lessons[i];
      const nextLesson = lessons[i + 1];

      const currentEnd = toMinutes(currentLesson.endTime);
      const nextStart = toMinutes(nextLesson.startTime);

      if (nextStart > currentEnd) {
        breaks.push({
          i: breaks.length,
          afterLessonIndex: i,
          beforeLessonIndex: i + 1,
          startTime: currentLesson.endTime,
          endTime: nextLesson.startTime,
          startPeriod: currentLesson.endPeriod,
          endPeriod: nextLesson.startPeriod,
          durationMinutes: nextStart - currentEnd,
        });
      }
    }

    const start = lessons[0].startTime;
    const end = lessons[lessons.length - 1].endTime;

    if (!shared) {
      const endTime = performance.now();
      const durationSeconds = ((endTime - startTime) / 1000).toFixed(2);
      console.log(`- Completed in ${durationSeconds} seconds`);
    }

    return {
      date,
      start,
      end,
      lessons,
      periods,
      breaks,
    };
  }

  async getCurrent(currentTime = null) {
    const startTime = performance.now();
    count++;
    console.log(
      `Attempt #${count} - getCurrent        - ${new Date().toLocaleString()}`
    );

    const currentDay = await this.getCurrentDay(true);
    if (currentDay.error) {
      return currentDay;
    }

    if (currentTime !== null && !isValidTime24h(currentTime)) {
      return {
        error: {
          message: `Invalid time format.`,
        },
      };
    }

    const now = currentTime || new Date().toTimeString().slice(0, 5);

    const toMinutes = (time) => {
      const [h, m] = time.split(':').map(Number);
      return h * 60 + m;
    };

    const nowMinutes = toMinutes(now);

    let currentPeriod = null;
    let previousPeriod = null;
    let nextPeriod = null;

    let currentPeriodLesson = null;
    let nextPeriodLesson = null;
    let previousPeriodLesson = null;

    let previousLesson = null;
    let nextLesson = null;

    const periods = Object.entries(periodSchedule)
      .map(([key, value]) => ({
        number: Number(key),
        start: toMinutes(value.start),
        end: toMinutes(value.end),
      }))
      .sort((a, b) => a.start - b.start);

    for (let i = 0; i < periods.length; i++) {
      const lesson = periods[i];

      if (nowMinutes >= lesson.start && nowMinutes < lesson.end) {
        currentPeriod = lesson.number;
        previousPeriod = periods[i - 1]?.number || null;
        nextPeriod = periods[i + 1]?.number || null;
        break;
      }

      if (nowMinutes < lesson.start) {
        previousPeriod = periods[i - 1]?.number || null;
        nextPeriod = lesson.number;
        break;
      }
    }

    let isBefore = false;
    if (nowMinutes < toMinutes(currentDay.start)) {
      isBefore = true;
    }

    let isOver = false;
    if (nowMinutes >= toMinutes(currentDay.end)) {
      isOver = true;
    }

    for (let lesson of currentDay.lessons) {
      if (
        currentPeriod &&
        lesson.startPeriod <= currentPeriod &&
        lesson.endPeriod >= currentPeriod
      ) {
        currentPeriodLesson = lesson;
      }
      if (
        previousPeriod &&
        lesson.startPeriod <= previousPeriod &&
        lesson.endPeriod >= previousPeriod
      ) {
        previousPeriodLesson = lesson;
      }
      if (
        nextPeriod &&
        lesson.startPeriod <= nextPeriod &&
        lesson.endPeriod >= nextPeriod
      ) {
        nextPeriodLesson = lesson;
      }
    }

    let isBreak = false;
    if (!currentPeriodLesson && nextPeriod && previousPeriod) {
      isBreak = true;
    }

    if (currentPeriodLesson) {
      const idx = currentPeriodLesson.i;
      previousLesson = currentDay.lessons[idx - 1] ?? null;
      nextLesson = currentDay.lessons[idx + 1] ?? null;
    } else {
      if (isBefore) {
        nextLesson = currentDay.lessons[0];
      } else if (isBreak) {
        nextLesson = currentDay.lessons.find(
          (l) => l.startPeriod >= nextPeriod
        );
        previousLesson = [...currentDay.lessons]
          .reverse()
          .find((l) => l.endPeriod <= previousPeriod);
      } else if (isOver) {
        previousLesson = currentDay.lessons[currentDay.lessons.length - 1];
      }
    }

    const currentPeriodTime = getPeriodTime(currentPeriod);
    const previousPeriodTime = getPeriodTime(previousPeriod);
    const nextPeriodTime = getPeriodTime(nextPeriod);

    const period = {};
    const lesson = {};

    if (currentPeriodLesson) {
      period.current = {
        period: currentPeriod,
        subject: currentPeriodLesson?.subject ?? 'None',
        classroom: currentPeriodLesson?.classroom ?? 'N/A',
        startTime: currentPeriodTime?.start ?? 'N/A',
        endTime: currentPeriodTime?.end ?? 'N/A',
      };
    }

    if (!previousPeriodLesson && !isBefore) {
      previousLesson = [...currentDay.lessons]
        .reverse()
        .find((l) => toMinutes(l.endTime) <= nowMinutes);

      if (previousLesson) {
        previousPeriod = previousLesson.endPeriod;
        const previousPeriodTime = getPeriodTime(previousPeriod);

        period.previous = {
          period: previousPeriod,
          subject: previousLesson.subject,
          classroom: previousLesson.classroom,
          startTime: previousPeriodTime.start,
          endTime: previousPeriodTime.end,
        };
      }
    } else if (previousPeriodLesson) {
      period.previous = {
        period: previousPeriod,
        subject: previousPeriodLesson?.subject ?? 'None',
        classroom: previousPeriodLesson?.classroom ?? 'N/A',
        startTime: previousPeriodTime?.start ?? 'N/A',
        endTime: previousPeriodTime?.end ?? 'N/A',
      };
    }

    if (!nextPeriodLesson && !isOver) {
      nextLesson = currentDay.lessons.find(
        (l) => toMinutes(l.startTime) > nowMinutes
      );

      if (nextLesson) {
        nextPeriod = nextLesson.startPeriod;
        const nextPeriodTime = getPeriodTime(nextPeriod);

        period.next = {
          period: nextPeriod,
          subject: nextLesson.subject,
          classroom: nextLesson.classroom,
          startTime: nextPeriodTime.start,
          endTime: nextPeriodTime.end,
        };
      }
    } else if (nextPeriodLesson) {
      period.next = {
        period: nextPeriod,
        subject: nextPeriodLesson?.subject ?? 'None',
        classroom: nextPeriodLesson?.classroom ?? 'N/A',
        startTime: nextPeriodTime?.start ?? 'N/A',
        endTime: nextPeriodTime?.end ?? 'N/A',
      };
    }

    if (currentPeriodLesson) {
      lesson.current = {
        subject: currentPeriodLesson?.subject ?? 'None',
        classroom: currentPeriodLesson?.classroom ?? 'N/A',
        durationPeriods: currentPeriodLesson?.durationPeriods ?? 'N/A',
        startTime: currentPeriodLesson?.startTime ?? 'N/A',
        endTime: currentPeriodLesson?.endTime ?? 'N/A',
        startPeriod: currentPeriodLesson?.startPeriod ?? 'N/A',
        endPeriod: currentPeriodLesson?.endPeriod ?? 'N/A',
      };
    }

    if (previousLesson) {
      lesson.previous = {
        subject: previousLesson?.subject ?? 'None',
        classroom: previousLesson?.classroom ?? 'N/A',
        durationPeriods: previousLesson?.durationPeriods ?? 'N/A',
        startTime: previousLesson?.startTime ?? 'N/A',
        endTime: previousLesson?.endTime ?? 'N/A',
        startPeriod: previousLesson?.startPeriod ?? 'N/A',
        endPeriod: previousLesson?.endPeriod ?? 'N/A',
      };
    }

    if (nextLesson) {
      lesson.next = {
        subject: nextLesson?.subject ?? 'None',
        classroom: nextLesson?.classroom ?? 'N/A',
        durationPeriods: nextLesson?.durationPeriods ?? 'N/A',
        startTime: nextLesson?.startTime ?? 'N/A',
        endTime: nextLesson?.endTime ?? 'N/A',
        startPeriod: nextLesson?.startPeriod ?? 'N/A',
        endPeriod: nextLesson?.endPeriod ?? 'N/A',
      };
    }

    const endTime = performance.now();
    const durationSeconds = ((endTime - startTime) / 1000).toFixed(2);
    console.log(`- Completed in ${durationSeconds} seconds`);

    return {
      now,
      date: currentDay.date,
      start: currentDay.start,
      end: currentDay.end,
      lessons: currentDay.lessons,
      periods: currentDay.periods,
      breaks: currentDay.breaks,
      period: period,
      lesson: lesson,
      isBefore: isBefore,
      isBreak: isBreak,
      isOver: isOver,
    };
  }
}

function getWeekdayIndex() {
  const today = new Date().getDay();

  switch (today) {
    case 1: return 0;
    case 2: return 1;
    case 3: return 2;
    case 4: return 3;
    case 5: return 4;
    default: return null;
  }
}

function getLessonTime(startPeriod, endPeriod) {
  const lessonStartTime = periodSchedule[startPeriod].start;
  const lessonEndTime = periodSchedule[endPeriod].end;

  return { start: lessonStartTime, end: lessonEndTime };
}

const periodSchedule = {
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

function getPeriodTime(period) {
  const periodStartTime = period ? periodSchedule[period]?.start : null;
  const periodEndTime = period ? periodSchedule[period]?.end : null;

  return { start: periodStartTime, end: periodEndTime };
}

function isValidTime24h(time) {
  if (typeof time !== 'string') return false;

  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
  if (!timeRegex.test(time)) return false;

  const [hours, minutes] = time.split(':').map(Number);
  return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59;
}

async function test() {
  const scraper = new WebUntisScraper();
  await scraper.init();

  console.log('getDay:');
  const day = await scraper.getDay(2);
  console.log(JSON.stringify(day, null, 2));

  console.log('getCurrentDay:');
  const currentDay = await scraper.getCurrentDay();
  console.log(JSON.stringify(currentDay, null, 2));

  console.log('getWeek:');
  const week = await scraper.getWeek();
  console.log(JSON.stringify(week, null, 2));

  console.log('getCurrent:');
  const current = await scraper.getCurrent();
  console.log(JSON.stringify(current, null, 2));
}

export { WebUntisScraper };

//test();