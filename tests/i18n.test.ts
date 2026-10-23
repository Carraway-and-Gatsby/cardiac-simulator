import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { resolveLocale, translate } from '../src/i18n/locale.ts';
import { chartLabel, chartLabels } from '../src/i18n/charts.ts';

test('a fresh or invalid preference defaults to English, while explicit Korean persists', () => {
  for (const preference of [null, undefined, '', 'en', 'fr', 'ko-KR', 'KO']) assert.equal(resolveLocale(preference), 'en');
  assert.equal(resolveLocale('ko'), 'ko');
  assert.equal(translate('en', 'Volume', '용적'), 'Volume');
  assert.equal(translate('ko', 'Volume', '용적'), '용적');
});

test('every chart and circuit metadata label has an English translation', () => {
  const source = readFileSync(new URL('../src/components/HemodynamicCharts.tsx', import.meta.url), 'utf8');
  const labels = [...source.matchAll(/(?:label|title|name): '([^']*[가-힣][^']*)'/g)].map(match => match[1]);
  assert.ok(labels.includes('폐순환 저항') && labels.includes('좌심장 판막 유량'));
  for (const korean of labels) {
    assert.ok(chartLabel(korean, 'en').trim());
    assert.doesNotMatch(chartLabel(korean, 'en'), /[가-힣]/);
    assert.equal(chartLabel(korean, 'ko'), korean);
  }
  for (const [korean, english] of Object.entries(chartLabels)) {
    assert.ok(english.length > 0);
    assert.equal(chartLabel(korean, 'en'), english);
  }
  assert.throws(() => chartLabel('missing label', 'en'), /Missing chart translation/);
});
