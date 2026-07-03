import { shouldApplyIncoming, splitChanges } from './merge.util';

describe('shouldApplyIncoming (last-write-wins)', () => {
  const older = new Date('2026-07-01T10:00:00Z');
  const newer = new Date('2026-07-03T10:00:00Z');

  it('aplica si no existe en el servidor', () => {
    expect(shouldApplyIncoming(null, newer)).toBe(true);
  });
  it('aplica si el entrante es más reciente', () => {
    expect(shouldApplyIncoming(older, newer)).toBe(true);
  });
  it('NO aplica si el servidor es más reciente', () => {
    expect(shouldApplyIncoming(newer, older)).toBe(false);
  });
  it('NO aplica sin marca temporal entrante', () => {
    expect(shouldApplyIncoming(older, undefined)).toBe(false);
  });
});

describe('splitChanges', () => {
  it('separa upserted de deleted', () => {
    const rows = [
      { id: 'a', deletedAt: null },
      { id: 'b', deletedAt: new Date() },
      { id: 'c', deletedAt: null },
    ];
    const { upserted, deleted } = splitChanges(rows);
    expect(upserted.map((r) => r.id)).toEqual(['a', 'c']);
    expect(deleted).toEqual(['b']);
  });
});
