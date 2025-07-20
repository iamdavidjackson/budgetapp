import { addDays, addWeeks, addMonths, addYears, isBefore, isEqual, parseISO, format, getDay } from 'date-fns';

function getNextDate(date, frequency) {
  switch (frequency) {
    case 'daily': return addDays(date, 1);
    case 'weekly': return addWeeks(date, 1);
    case 'biweekly': return addWeeks(date, 2);
    case 'monthly': return addMonths(date, 1);
    case 'yearly': return addYears(date, 1);
    default: return addMonths(date, 1);
  }
}

function adjustForWeekend(date, policy) {
  const day = getDay(date);
  if (policy === 'next_weekday') {
    if (day === 6) return addDays(date, 2); // Saturday -> Monday
    if (day === 0) return addDays(date, 1); // Sunday -> Monday
  }
  return date;
}

export function generateForecast(recurringItems, endDate) {
  const results = [];
  const targetDate = typeof endDate === 'string' ? parseISO(endDate) : endDate;

  for (const item of recurringItems) {
    const {
      id,
      name,
      amount,
      frequency,
      type,
      category,
      accountId,
      transferToAccountId,
      startDate,
      endDate: itemEndDate,
      weekendPolicy
    } = item;

    let current = parseISO(startDate);
    const lastDate = itemEndDate ? parseISO(itemEndDate) : targetDate;

    while (isBefore(current, targetDate) || isEqual(current, targetDate)) {
      if (isBefore(current, lastDate) || isEqual(current, lastDate)) {
        const adjustedDate = adjustForWeekend(current, weekendPolicy || 'post_on_date');
        results.push({
          id: `${id}-${format(adjustedDate, 'yyyyMMdd')}`,
          name,
          amount,
          date: format(adjustedDate, 'yyyy-MM-dd'),
          type,
          category,
          accountId,
          transferToAccountId,
          sourceRecurringId: id
        });
      }
      current = getNextDate(current, frequency);
    }
  }

  return results;
}