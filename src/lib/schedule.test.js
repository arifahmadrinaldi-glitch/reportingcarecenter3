import { describe, expect, test } from 'bun:test';
import { scheduleStats, shiftCount, workExcelFormula, initializeSchedule, rosterCode, businessCode, CYCLE } from './schedule';

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

describe('Care Center PPSSMLL roster', () => {
  test('both teams use the seven-day PPSSMLL cycle', () => {
    expect(CYCLE.join('')).toBe('PPSSMLL');
    for (const getCode of [rosterCode, businessCode]) {
      expect(Array.from({ length: 14 }, (_, i) => getCode(0, 2026, 10, i + 1)).join('')).toBe('PPSSMLLPPSSMLL');
    }
  });
  test('both teams have seven people in reference order with exact NIKs', () => {
    const data = initializeSchedule();
    expect(data.members).toEqual(['Ahmad Hidayah', 'Opi Ul Umam', 'Andriansyah', 'Avian Dwi Nofyanto', 'Muhammad Faishal Rayyan', 'Ferdi Arsy Bahtiariyanza', 'Rachmat Dwi Ramdani']);
    expect(data.niks).toEqual(['9818001', '91210131', '9416031', '9119008', '02250398', '94210087', '9717053']);
    expect(data.business.members).toEqual(['Randretya Davit Anugrah', 'Ari Awaludin Muslim', 'Rangga Putra Rimba', 'Raihan Fachrudiansyah', 'Indra Nurrahman', 'Muhammad Dicky Chairudin', 'Algyan Gufarira']);
    expect(data.business.niks).toEqual(['99210193', '1230315', '9215020', '2230414', '94210128', '93210167', '92210124']);
  });
  test('staggered teams provide two morning, two day, one night and two off each day', () => {
    for (let d = 1; d <= 30; d++) {
      for (const getCode of [rosterCode, businessCode]) {
        const codes = Array.from({ length: 7 }, (_, m) => getCode(m, 2026, 10, d));
        expect(codes.filter(c => c === 'P')).toHaveLength(2);
        expect(codes.filter(c => c === 'S')).toHaveLength(2);
        expect(codes.filter(c => c === 'M')).toHaveLength(1);
        expect(codes.filter(c => c === 'L')).toHaveLength(2);
      }
    }
  });
  test('legacy saved schedules are not mutated and regular overrides remain', () => {
    const old = { members: ['Old'], cells: { '-1': { '1': { code: 'CT' } }, '0': { '1': { code: 'PS' } } }, business: { members: ['Old business'], cells: {}, regular: { nik: '1', name: 'Reguler', phone: '2' } } };
    const data = initializeSchedule(old);
    expect(data.members).toHaveLength(7);
    expect(data.business.members).toHaveLength(7);
    expect(data.cells[-1][1].code).toBe('CT');
    expect(old.members).toEqual(['Old']);
    expect(old.cells[0][1].code).toBe('PS');
  });
  test('normal patterns continue across months without carrying leave or backup in either team', () => {
    const source = initializeSchedule();
    for (const team of [source, source.business]) {
      team.cells[0] = { 30: { code: 'CT', originalCode: 'P' } };
      team.normalCells[0] = { 30: { code: 'P' } };
      team.cells[1] = { 30: { code: 'PS', originalCode: 'S', covered: 'P', backupFor: 'Other' } };
    }
    const next = initializeSchedule(undefined, { period: '2026-11', data: source });
    for (const team of [next, next.business]) {
      expect(team.cells).toEqual({});
      expect(team.patterns[0]).toHaveLength(7);
      expect(rosterCode(0, 2026, 11, 1, team)).toBe(rosterCode(0, 2026, 11, 1, source));
    }
  });
  test('new roster retains work, leave, backup and buffer accounting', () => {
    expect(scheduleStats(d => ({ code: rosterCode(0, 2026, 10, d) }), 7, 5)).toEqual({ work: 5, ct: 0, bk: 0, buffer: 0 });
    expect(scheduleStats(d => d === 1 ? { code: 'CT' } : { code: rosterCode(0, 2026, 10, d) }, 7, 5)).toEqual({ work: 4, ct: 1, bk: 0, buffer: -1 });
  });
});
