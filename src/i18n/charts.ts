import type { Locale } from './locale.ts';

export const chartLabels = {
  '압력': 'Pressure', '용적': 'Volume', '유량': 'Flow',
  '심장과 동맥의 압력': 'Cardiac and arterial pressures',
  '좌·우심실 용적': 'Left and right ventricular volumes',
  '좌심장 판막 유량': 'Left-heart valve flow',
  '좌심실 LV': 'Left ventricle · LV', '좌심방 LA': 'Left atrium · LA',
  '우심실 RV': 'Right ventricle · RV', '체동맥 SA': 'Systemic arteries · SA',
  '대동맥판 LV → SA': 'Aortic · LV → SA', '승모판 LA → LV': 'Mitral · LA → LV',
  '폐정맥': 'Pulmonary veins', '좌심방': 'Left atrium', '좌심실': 'Left ventricle',
  '체동맥': 'Systemic arteries', '체정맥': 'Systemic veins', '우심방': 'Right atrium',
  '우심실': 'Right ventricle', '폐동맥': 'Pulmonary arteries',
  '폐정맥 환류': 'Pulmonary venous return', '체정맥 환류': 'Systemic venous return',
  '승모판': 'Mitral', '대동맥판': 'Aortic', '삼첨판': 'Tricuspid', '폐동맥판': 'Pulmonary',
  '체순환 저항': 'Systemic resistance', '폐순환 저항': 'Pulmonary resistance',
  '역류': 'Reverse flow', '열림': 'Open', '닫힘': 'Closed',
} as const;

export function chartLabel(korean: string, locale: Locale): string {
  if (locale === 'ko') return korean;
  const translated = chartLabels[korean as keyof typeof chartLabels];
  if (!translated) throw new Error(`Missing chart translation: ${korean}`);
  return translated;
}
