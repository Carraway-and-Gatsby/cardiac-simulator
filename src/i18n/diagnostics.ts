// Keep language out of the numerical engine and worker lifecycle. Translate at
// render time so switching language never repeats or resets a calculation.
type Locale = 'en' | 'ko';

const messages: Record<string, string> = {
  'Periodic equilibration tolerance was not reached; displayed beat is provisional.': '주기 평형 허용 오차에 도달하지 못했습니다. 표시된 주기는 수렴 전 결과입니다.',
  'Passive ventricular pressure exceeds the peak active relation. Activation would reduce pressure at fixed volume: this parameter combination is outside the supported model domain.': '심실의 수동 압력이 최대 능동 압력 관계를 초과합니다. 같은 용적에서 활성화가 압력을 낮추게 되므로 이 매개변수 조합은 지원되는 모델 범위를 벗어납니다.',
  'Simultaneous forward filling and ejection occur. Volume-extremum stroke volume and EF no longer describe all ventricular throughput; this parameter combination is outside the supported interpretation domain.': '전방 충만과 박출이 동시에 발생합니다. 용적 최댓값과 최솟값으로 계산한 박출량·박출률이 심실을 통과하는 전체 유량을 설명하지 못하므로 이 매개변수 조합은 지원되는 해석 범위를 벗어납니다.',
  'Unknown scenario.': '알 수 없는 시나리오입니다.',
  'time must be finite.': '시간은 유한한 수여야 합니다.',
  'Model evaluation produced nonfinite pressure, flow or derivative.': '모델 계산 중 압력·유량·변화율에 유한하지 않은 값이 발생했습니다.',
  'Integration produced nonfinite or nonpositive volume; no clipping or mass correction was applied.': '적분 중 유한하지 않거나 0 이하인 용적이 발생했습니다. 값을 잘라내거나 혈액량을 보정하지 않았습니다.',
  'minCycles must not exceed maxCycles.': '최소 계산 주기 수는 최대 계산 주기 수를 초과할 수 없습니다.',
  'Unable to start the calculation worker. Reload the page and try again.': '계산 작업을 시작하지 못했습니다. 새로고침 후 다시 시도해 주세요.',
  'Simulation failed.': '시뮬레이션 계산에 실패했습니다.',
};
const parameterNames: Record<string, string> = {
  heartRate: '심박수', contractility: '좌심실 수축력', diastolicStiffness: '좌심실 이완기 강성',
  systemicResistance: '전신 혈관 저항', bloodVolume: '총 혈액량', severity: '기전 강도',
  stepSize: '시간 간격', maxCycles: '최대 계산 주기 수', minCycles: '최소 계산 주기 수',
  convergenceTolerance: '수렴 허용 오차', sampleCount: '표본 수',
};
const englishParameterNames: Record<string, string> = {
  heartRate: 'Heart rate', contractility: 'LV contractility', diastolicStiffness: 'LV diastolic stiffness',
  systemicResistance: 'Systemic vascular resistance', bloodVolume: 'Total blood volume', severity: 'Mechanism intensity',
  stepSize: 'Time step', maxCycles: 'Maximum cycle count', minCycles: 'Minimum cycle count',
  convergenceTolerance: 'Convergence tolerance', sampleCount: 'Sample count',
};

export function localizeDiagnostic(message: string, locale: Locale): string {
  if (Object.hasOwn(messages, message)) return locale === 'en' ? message : messages[message];
  const parameterRange = /^(\w+) must be finite and between ([^ ]+) and ([^ ]+)\.$/.exec(message);
  if (parameterRange && Object.hasOwn(parameterNames, parameterRange[1])) {
    const [, name, min, max] = parameterRange;
    return locale === 'en'
      ? `${englishParameterNames[name]} must be finite and between ${min} and ${max}.`
      : `${parameterNames[name]}: ${min}~${max} 범위의 유한한 수여야 합니다.`;
  }
  const optionRange = /^(\w+) must be (an integer )?between ([^ ]+) and ([^ ]+)\.$/.exec(message);
  if (optionRange && Object.hasOwn(parameterNames, optionRange[1])) {
    const [, name, integer, min, max] = optionRange;
    return locale === 'en'
      ? `${englishParameterNames[name]} must be ${integer ? 'an integer ' : ''}between ${min} and ${max}.`
      : `${parameterNames[name]}: ${min}~${max} 범위의 ${integer ? '정수' : '수'}여야 합니다.`;
  }
  // Browser and OS exceptions vary by platform. Do not leak an untranslated
  // browser message into either UI; a localized recovery step is actionable.
  return locale === 'en'
    ? 'The calculation could not be completed. Reload the page or reset the experiment and try again.'
    : '계산을 완료하지 못했습니다. 새로고침하거나 실험을 초기화한 후 다시 시도해 주세요.';
}
