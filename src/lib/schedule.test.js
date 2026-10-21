import { describe, expect, test } from 'bun:test';
import { scheduleStats, shiftCount, workExcelFormula } from './schedule';

describe('schedule shift accounting', () => {
  for (const code of ['PS', 'SM', 'MP', 'PM']) {
    test(`${code} counts as two shifts`, () => expect(shiftCount(code)).toBe(2));
  }
  test('PSM counts as three shifts', () => expect(shiftCount('PSM')).toBe(3));
  test('buffer subtracts regular work', () => {
    expect(scheduleStats(() => ({ code: 'PS' }), 10, 15).buffer).toBe(5);
  });
  test('buffer preserves negative values', () => {
    expect(scheduleStats(() => ({ code: 'P' }), 10, 15).buffer).toBe(-5);
  });
  test('leave removes work and backup adds covered shifts even when codes overlap', () => {
    expect(scheduleStats(() => ({ code: 'CT' }), 1).work).toBe(0);
    expect(scheduleStats(() => ({ code: 'PS', originalCode: 'PS', covered: 'P', backupFor: 'Team' }), 1).work).toBe(3);
  });
  test('legacy combined backup cells still count combined shifts', () => {
    expect(scheduleStats(() => ({ code: 'SM', backupFor: 'Team' }), 1).work).toBe(2);
  });
  test('Excel formula weights exact combinations without double counting backup', () => {
    const formula = workExcelFormula('D3:AH3');
    expect(formula).toContain('2*COUNTIF(D3:AH3,"PS")');
    expect(formula).toContain('3*COUNTIF(D3:AH3,"PSM")');
    expect(formula).toContain('2*COUNTIF(D3:AH3,"MP (BK *)")');
    expect(formula).not.toContain('"P*"');
  });
});
