import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { logger } from './logger.js';

export function getMonthlyDate(dayNumber, emulateDate = null) {
  if (dayNumber < 1 || dayNumber > 31) {
    logger.error(`Invalid day number: ${dayNumber}`);
    throw new Error(`Invalid day number: ${dayNumber}`);
  }

  // Use emulated date if provided, otherwise use current date
  let today = new Date();
  if (emulateDate) {
    // Parse emulateDate string (format: "YYYY-MM-DD")
    const [year, month, day] = emulateDate.split('-').map(num => parseInt(num));
    today = new Date(year, month - 1, day); // month is 0-indexed
    logger.info(`Using emulated date: ${format(today, 'dd/MM/yyyy')}`);
  }

  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth(); // 0-indexed

  // Create the target date with the specified day number in the current month
  const targetDate = new Date(currentYear, currentMonth, dayNumber);

  // Check if the date is valid (e.g., Feb 30 would become Mar 2)
  if (targetDate.getMonth() !== currentMonth) {
    return {
      date: null,
      dateObj: null,
      isValid: false,
      reason: 'invalid_day_for_month',
      message: `Day ${dayNumber} does not exist in current month`
    };
  }

  // Format as DD/MM/YYYY (Brazilian format)
  return {
    date: format(targetDate, 'dd/MM/yyyy'),
    dateObj: targetDate,
    dayNumber: dayNumber,
    isValid: true
  };
}

export function validateProcedureDate(dateInfo, emulateDate = null) {
  if (!dateInfo || !dateInfo.dateObj) {
    return {
      ...dateInfo,
      isValid: false,
      reason: 'invalid_date',
      message: 'Invalid date information'
    };
  }

  const { dateObj } = dateInfo;

  // Use emulated date if provided, otherwise use current date
  let runDate = new Date();
  if (emulateDate) {
    // Parse emulateDate string (format: "YYYY-MM-DD")
    const [year, month, day] = emulateDate.split('-').map(num => parseInt(num));
    runDate = new Date(year, month - 1, day); // month is 0-indexed
  }

  const runMonth = runDate.getMonth();
  const runYear = runDate.getFullYear();
  const targetMonth = dateObj.getMonth();
  const targetYear = dateObj.getFullYear();

  // Only allow dates from the current month
  if (targetYear !== runYear || targetMonth !== runMonth) {
    return {
      ...dateInfo,
      isValid: false,
      reason: 'wrong_month',
      message: `Date must be in current month (${format(runDate, 'MM/yyyy')}): ${dateInfo.date}`
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