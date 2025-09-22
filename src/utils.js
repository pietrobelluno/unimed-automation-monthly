import { startOfWeek, subWeeks, addDays, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { logger } from './logger.js';

// Map weekday names to numbers (0 = Sunday, 1 = Monday, etc.)
const weekdayMap = {
  'sunday': 0,
  'monday': 1,
  'tuesday': 2,
  'wednesday': 3,
  'thursday': 4,
  'friday': 5,
  'saturday': 6,
  'domingo': 0,
  'segunda': 1,
  'terça': 2,
  'quarta': 3,
  'quinta': 4,
  'sexta': 5,
  'sábado': 6
};

export function getCurrentWeekDate(weekdayName) {
  const targetDay = weekdayMap[weekdayName.toLowerCase()];
  if (targetDay === undefined) {
    logger.error(`Invalid weekday: ${weekdayName}`);
    throw new Error(`Invalid weekday: ${weekdayName}`);
  }

  const today = new Date();
  const currentDay = today.getDay();
  
  // Get the start of the current week (Monday)
  // When running on Sunday, this gives us the Monday of the week that just ended
  const monday = new Date(today);
  const daysFromMonday = currentDay === 0 ? 6 : currentDay - 1; // Sunday is 0, make it 6
  monday.setDate(today.getDate() - daysFromMonday);
  
  // Calculate the target date in the current week
  const targetDate = new Date(monday);
  targetDate.setDate(monday.getDate() + (targetDay === 0 ? 6 : targetDay - 1));
  
  // Format as DD/MM/YYYY (Brazilian format)
  return {
    date: format(targetDate, 'dd/MM/yyyy'),
    dateObj: targetDate,
    isValid: true
  };
}

export function validateProcedureDate(dateInfo, runDate = new Date()) {
  const { dateObj } = dateInfo;
  const runDay = runDate.getDay();
  const runMonth = runDate.getMonth();
  const runYear = runDate.getFullYear();
  const targetMonth = dateObj.getMonth();
  const targetYear = dateObj.getFullYear();
  
  // Check if date is from a previous month (but allow dates from current month even if in past)
  if (targetYear < runYear || (targetYear === runYear && targetMonth < runMonth)) {
    return {
      ...dateInfo,
      isValid: false,
      reason: 'past_month',
      message: `Cannot fill date from previous month: ${dateInfo.date}`
    };
  }
  
  // Check if date is in the future month
  if (targetYear > runYear || (targetYear === runYear && targetMonth > runMonth)) {
    return {
      ...dateInfo,
      isValid: false,
      reason: 'future_month',
      message: `Cannot fill date from future month: ${dateInfo.date}`
    };
  }
  
  // For Sunday runs, we're processing the previous week, so all dates from that week are valid
  if (runDay === 0) {
    // Sunday - processing previous week, all weekdays are valid
    return dateInfo;
  }
  
  // For weekday runs (Monday-Saturday), check if date is in the future
  // Set time to beginning of day for proper date comparison
  const todayStart = new Date(runDate);
  todayStart.setHours(0, 0, 0, 0);
  const targetStart = new Date(dateObj);
  targetStart.setHours(0, 0, 0, 0);
  
  if (targetStart > todayStart) {
    return {
      ...dateInfo,
      isValid: false,
      reason: 'future_date',
      message: `Cannot fill future date: ${dateInfo.date}`
    };
  }
  
  return dateInfo;
}

export async function waitWithTimeout(page, selector, timeout = 30000) {
  try {
    await page.waitForSelector(selector, { timeout });
    return true;
  } catch (error) {
    logger.error(`Timeout waiting for selector: ${selector}`);
    return false;
  }
}

export async function clickAndWait(page, selector, waitForSelector = null, timeout = 30000) {
  try {
    await page.click(selector);
    if (waitForSelector) {
      await page.waitForSelector(waitForSelector, { timeout });
    } else {
      // Wait for navigation or network idle
      await page.waitForLoadState('networkidle', { timeout });
    }
    return true;
  } catch (error) {
    logger.error(`Error clicking ${selector}: ${error.message}`);
    return false;
  }
}

export async function fillInput(page, selector, value, triggerBlur = false) {
  try {
    await page.fill(selector, value);
    
    if (triggerBlur) {
      // Click outside to trigger validation
      await page.evaluate(() => {
        document.body.click();
      });
    }
    
    return true;
  } catch (error) {
    logger.error(`Error filling input ${selector}: ${error.message}`);
    return false;
  }
}

export async function selectOption(page, selector, value) {
  try {
    await page.selectOption(selector, value);
    return true;
  } catch (error) {
    logger.error(`Error selecting option ${value} in ${selector}: ${error.message}`);
    return false;
  }
}

export async function retry(fn, retries = 3, delay = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      logger.warn(`Attempt ${i + 1} failed: ${error.message}`);
      if (i === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

export async function takeScreenshot(page, name) {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const path = `screenshots/${name}_${timestamp}.png`;
    await page.screenshot({ path, fullPage: true });
    logger.info(`Screenshot saved: ${path}`);
    return path;
  } catch (error) {
    logger.error(`Failed to take screenshot: ${error.message}`);
    return null;
  }
}

export async function handleDialog(page, expectedText, buttonSelector) {
  try {
    // Wait for dialog containing expected text
    await page.waitForFunction(
      text => document.body.textContent.includes(text),
      expectedText,
      { timeout: 10000 }
    );
    
    // Click confirmation button
    await page.click(buttonSelector);
    return true;
  } catch (error) {
    logger.error(`Error handling dialog: ${error.message}`);
    return false;
  }
}

export function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}