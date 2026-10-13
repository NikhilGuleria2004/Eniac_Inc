export function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export function formatMonthShort(month: number): string {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return months[month] ?? "";
}

export interface BillingPeriod {
  period: 1 | 2;
  start: string;
  end: string;
  label: string;
}

export function getBillingPeriodsForMonth(year: number, month: number) {
  const mm = pad2(month + 1);
  const period1Start = `${year}-${mm}-01`;
  const period1End = `${year}-${mm}-15`;
  const lastDay = new Date(year, month + 1, 0).getDate();
  const period2Start = `${year}-${mm}-16`;
  const period2End = `${year}-${mm}-${pad2(lastDay)}`;
  return {
    period1: { start: period1Start, end: period1End },
    period2: { start: period2Start, end: period2End },
  };
}

export function getCurrentBillingPeriod(date: Date = new Date()): BillingPeriod {
  const day = date.getDate();
  const year = date.getFullYear();
  const month = date.getMonth();
  if (day <= 15) {
    return {
      period: 1,
      start: `${year}-${pad2(month + 1)}-01`,
      end: `${year}-${pad2(month + 1)}-15`,
      label: `${formatMonthShort(month)} 1-15, ${year}`,
    };
  }
  const lastDay = new Date(year, month + 1, 0).getDate();
  return {
    period: 2,
    start: `${year}-${pad2(month + 1)}-16`,
    end: `${year}-${pad2(month + 1)}-${pad2(lastDay)}`,
    label: `${formatMonthShort(month)} 16-${lastDay}, ${year}`,
  };
}

export function getPreviousBillingPeriods(count = 6, date?: Date): BillingPeriod[] {
  const periods: BillingPeriod[] = [];
  const ref = date ?? new Date();
  const cur = getCurrentBillingPeriod(ref);
  let year = Number(cur.start.slice(0, 4));
  let month = Number(cur.start.slice(5, 7)) - 1;
  let period: 1 | 2 = cur.period;
  for (let i = 0; i < count; i++) {
    const info = getBillingPeriodsForMonth(year, month);
    const bounds = period === 1 ? info.period1 : info.period2;
    const startDay = Number(bounds.start.slice(8, 10));
    const endDay = Number(bounds.end.slice(8, 10));
    periods.push({
      period,
      start: bounds.start,
      end: bounds.end,
      label: `${formatMonthShort(month)} ${startDay}-${endDay}, ${year}`,
    });
    if (period === 1) {
      period = 2;
      month -= 1;
      if (month < 0) {
        month = 11;
        year -= 1;
      }
    } else {
      period = 1;
    }
  }
  return periods;
}
