import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { anatomyLabels, anatomyNotes, structureLabel, structureNote } from '../src/i18n/anatomy.ts';

const { structures } = JSON.parse(readFileSync(new URL('../src/data/heart-hra.json', import.meta.url), 'utf8'));
test('all 44 atlas structures have complete English and preserved Korean display names and caveats', () => {
  assert.equal(structures.length, 44);
  assert.deepEqual(Object.keys(anatomyLabels).sort(), structures.map((item: { id: string }) => item.id).sort());
  assert.deepEqual(Object.keys(anatomyNotes).sort(), Object.keys(anatomyLabels).sort());
  for (const item of structures) {
    for (const text of [structureLabel(item, 'en'), structureNote(item, 'en')]) {
      assert.equal(typeof text, 'string', item.id);
      assert.ok(text.length > 5, item.id);
      assert.doesNotMatch(text, /[가-힣]/, item.id);
    }
    assert.equal(structureLabel(item, 'ko'), item.label);
    assert.equal(structureNote(item, 'ko'), item.note);
  }
});
test('translation preserves unresolved source assignments and does not claim anatomical validation', () => {
  assert.match(anatomyLabels.PM_ANT, /unresolved/);
  assert.match(anatomyNotes.PM_ANT, /FMA:7264/);
  assert.match(anatomyLabels.LAD, /conflict/);
  assert.match(anatomyNotes.LAD, /FMA:8636/);
  assert.match(anatomyNotes.DIAG2, /not been renamed/);
  assert.match(anatomyNotes.LV, /have not been validated/);
});
