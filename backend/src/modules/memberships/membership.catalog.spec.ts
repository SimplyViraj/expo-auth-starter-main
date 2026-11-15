import { describe, expect, it } from '@jest/globals';
import { addCalendarMonths } from './membership.catalog.js';

describe('membership calendar dates', () => {
  it.each([[1, '2027-02-28T09:30:00.000Z'], [2, '2027-03-31T09:30:00.000Z'], [12, '2028-01-31T09:30:00.000Z']])('clamps calendar dates for %s month(s)', (months, expected) => {
    expect(addCalendarMonths(new Date('2027-01-31T09:30:00Z'), months).toISOString()).toBe(expected);
  });
  it('preserves leap-year February', () => {
    expect(addCalendarMonths(new Date('2028-01-31T09:30:00Z'), 1).toISOString()).toBe('2028-02-29T09:30:00.000Z');
  });
});
