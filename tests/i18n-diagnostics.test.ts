import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { localizeDiagnostic } from '../src/i18n/diagnostics.ts';
import { parameterDefinitions, scenarios } from '../src/simulation/parameters.ts';

const englishFallback = localizeDiagnostic('Unrecognized browser error.', 'en');

test('every literal engine warning and failure has an explicit English and Korean translation', () => {
  const engine = readFileSync(new URL('../src/simulation/engine.ts', import.meta.url), 'utf8');
  const literals = [...engine.matchAll(/(?:throw new (?:RangeError|Error)\(|warnings\.push\(|\? \[\] : \[)'([^']+)'/g)].map(match => match[1]);
  assert.ok(literals.length >= 6, 'The audit must include all known engine failure and warning messages.');
  for (const message of literals) {
    assert.equal(localizeDiagnostic(message, 'en'), message);
    const korean = localizeDiagnostic(message, 'ko');
    assert.match(korean, /[가-힣]/);
    assert.notEqual(korean, localizeDiagnostic('unknown', 'ko'), message);
  }
});

test('bounded-parameter diagnostics preserve the bound values in both languages', () => {
  const message = 'heartRate must be finite and between 50 and 120.';
  assert.equal(localizeDiagnostic(message, 'en'), 'Heart rate must be finite and between 50 and 120.');
  assert.equal(localizeDiagnostic(message, 'ko'), '심박수: 50~120 범위의 유한한 수여야 합니다.');
  const integerMessage = 'sampleCount must be an integer between 50 and 1000.';
  assert.match(localizeDiagnostic(integerMessage, 'en'), /Sample count.*integer.*50.*1000/);
  assert.match(localizeDiagnostic(integerMessage, 'ko'), /표본 수.*50.*1000.*정수/);
});

test('platform-specific exceptions receive localized recovery text without leaking raw messages', () => {
  for (const locale of ['en', 'ko'] as const) {
    const message = localizeDiagnostic('SecurityError: internal browser detail', locale);
    assert.doesNotMatch(message, /SecurityError|internal browser detail/);
    assert.match(message, locale === 'en' ? /Reload.*reset/ : /새로고침.*초기화/);
  }
  assert.notEqual(localizeDiagnostic('Simulation failed.', 'en'), englishFallback);
});

test('all scenario prose and parameter labels are present in English and Korean without changing ranges', () => {
  assert.equal(scenarios.length, 5);
  assert.equal(Object.keys(parameterDefinitions).length, 6);
  for (const scenario of scenarios) {
    for (const field of ['label', 'mechanism', 'limitation'] as const) {
      assert.ok(scenario[field].trim().length > 0);
      assert.doesNotMatch(scenario[field], /[가-힣]/);
    }
    for (const field of ['labelKo', 'mechanismKo', 'limitationKo'] as const) assert.match(scenario[field], /[가-힣]/);
  }
  for (const definition of Object.values(parameterDefinitions)) {
    assert.ok(definition.label.length > 0);
    assert.doesNotMatch(definition.label, /[가-힣]/);
    assert.match(definition.labelKo, /[가-힣]/);
    assert.ok(definition.min < definition.max && definition.step > 0);
  }
});
