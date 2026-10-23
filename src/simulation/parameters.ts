import type { ScenarioId, SimulationParameters } from './types.ts';

export const defaultParameters: SimulationParameters = {
  scenario: 'normal', heartRate: 75, contractility: 1, diastolicStiffness: 1,
  systemicResistance: 1, bloodVolume: 5000, severity: 0.7,
};

export const parameterDefinitions = {
  heartRate: { label: 'Heart rate', labelKo: '심박수', unit: 'bpm', min: 50, max: 120, step: 5 },
  contractility: { label: 'LV contractility', labelKo: '좌심실 수축력', unit: '×', min: 0.6, max: 1.4, step: 0.05 },
  diastolicStiffness: { label: 'LV diastolic stiffness', labelKo: '좌심실 이완기 강성', unit: '×', min: 0.7, max: 1.5, step: 0.05 },
  systemicResistance: { label: 'Systemic vascular resistance', labelKo: '전신 혈관 저항', unit: '×', min: 0.6, max: 1.6, step: 0.05 },
  bloodVolume: { label: 'Total blood volume', labelKo: '총 혈액량', unit: 'mL', min: 4500, max: 5500, step: 50 },
  severity: { label: 'Mechanism intensity', labelKo: '기전 강도', unit: '', min: 0, max: 1, step: 0.05 },
} as const;

export const scenarios: { id: ScenarioId; label: string; labelKo: string; mechanism: string; mechanismKo: string; limitation: string; limitationKo: string }[] = [
  {
    id: 'normal', label: 'Reference state', labelKo: '기준 상태',
    mechanism: 'A reference model of four heart chambers and the pulmonary and systemic circulations, sharing a conserved total blood volume.',
    mechanismKo: '같은 혈액량을 공유하는 네 심장 방과 폐·전신 순환의 기준 모델입니다.',
    limitation: 'An educational reference state with estimated parameters; it does not define a normal range for an individual.',
    limitationKo: '추정 매개변수의 교육용 기준 상태이며 개인의 정상 범위를 뜻하지 않습니다.',
  },
  {
    id: 'hfref', label: 'HFrEF · reduced contractility', labelKo: 'HFrEF · 수축력 감소',
    mechanism: 'Reducing peak LV elastance increases the volume remaining after contraction and reduces ejection fraction and forward cardiac output.',
    mechanismKo: '좌심실 최대 엘라스턴스를 낮추면 수축 후 남는 혈액량이 증가하고 박출률과 전방 심박출량이 감소합니다.',
    limitation: 'Only the mechanism of impaired contraction is represented. Chronic remodeling and neurohormonal compensation are not included.',
    limitationKo: '수축 기능 저하 기전만 다룹니다. 만성 재형성·신경호르몬 보상은 포함하지 않습니다.',
  },
  {
    id: 'hfpef', label: 'HFpEF · stiffness phenotype', labelKo: 'HFpEF · 강성 표현형',
    mechanism: 'Increasing the exponential stiffness of the passive LV pressure–volume relation changes filling pressure and volume.',
    mechanismKo: '좌심실 수동 압력–용적 곡선의 지수 강성을 높여 충만 압력과 충만량의 변화를 계산합니다.',
    limitation: 'An approximation of a diastolic stiffness phenotype. It does not reproduce HFpEF as a whole or delayed active relaxation.',
    limitationKo: '이완기 강성 표현형의 근사입니다. HFpEF 전체 질환이나 능동 이완 지연을 재현하지 않습니다.',
  },
  {
    id: 'aortic-stenosis', label: 'Aortic stenosis · increased resistance', labelKo: '대동맥판 협착 · 저항 증가',
    mechanism: 'Increasing forward aortic valve resistance creates a pressure gradient between the LV and systemic arteries during ejection.',
    mechanismKo: '대동맥판 전방 저항을 높여 박출 중 좌심실과 전신 동맥 사이의 압력차를 만듭니다.',
    limitation: 'A linear resistance model of obstruction. Valve area, jet velocity and clinical severity are not calculated.',
    limitationKo: '선형 저항성 폐색 모델입니다. 판구 면적·제트 속도·임상 중증도를 계산하지 않습니다.',
  },
  {
    id: 'mitral-regurgitation', label: 'Mitral regurgitation', labelKo: '승모판 역류',
    mechanism: 'Reverse conductance allows blood to return to the left atrium when LV pressure exceeds left atrial pressure.',
    mechanismKo: '좌심실 압력이 좌심방보다 높을 때 역방향 전도도를 허용해 혈액이 좌심방으로 되돌아갑니다.',
    limitation: 'A simple leak model that conserves regurgitant volume. The numerical model does not include leaflet mechanics, regurgitant jets or chronic remodeling.',
    limitationKo: '역류 부피를 보존하는 단순 누출 모델입니다. 수치 모델에 판엽 역학·역류 제트·만성 재형성은 포함하지 않습니다.',
  },
];

export function parametersForScenario(scenario: ScenarioId): SimulationParameters {
  return { ...defaultParameters, scenario };
}

export function validateParameters(parameters: SimulationParameters): void {
  if (!scenarios.some(scenario => scenario.id === parameters.scenario)) throw new RangeError('Unknown scenario.');
  for (const key of Object.keys(parameterDefinitions) as (keyof typeof parameterDefinitions)[]) {
    const { min, max } = parameterDefinitions[key];
    const value = parameters[key];
    if (!Number.isFinite(value) || value < min || value > max) {
      throw new RangeError(`${key} must be finite and between ${min} and ${max}.`);
    }
  }
}
