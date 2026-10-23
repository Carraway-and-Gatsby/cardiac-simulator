import { Component, lazy, Suspense, useEffect, useRef, useState, type ReactNode } from 'react';
import { defaultParameters, parameterDefinitions, parametersForScenario, scenarios } from './simulation/parameters';
import type { ScenarioId, SimulationParameters, SimulationResult, SimulationSample } from './simulation/types';
import { useSimulation } from './hooks/useSimulation';
import { CirculationDiagram, HemodynamicCharts } from './components/HemodynamicCharts';
import { useI18n } from './i18n';
import { localizeDiagnostic } from './i18n/diagnostics';
import './lab.css';

const AnatomyViewer = lazy(() => import('./AnatomyViewer'));
type ParameterKey = keyof typeof parameterDefinitions;
const parameterKeys = Object.keys(parameterDefinitions) as ParameterKey[];
const number = (value: number, digits = 1) => value.toFixed(digits);

class AnatomyBoundary extends Component<{ children: ReactNode; message: string }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    return this.state.failed
      ? <p className="calculation-error" role="alert">{this.props.message}</p>
      : this.props.children;
  }
}

function phaseLabel(sample: SimulationSample, previous: SimulationSample, next: SimulationSample, t: (en: string, ko: string) => string) {
  if (sample.flows.aortic > 0 && sample.flows.mitral > 0) return t('Simultaneous filling and ejection · atypical state', '동시 충만·박출 · 비전형적 상태');
  if (sample.flows.aortic > 0) return sample.flows.mitral < 0 ? t('LV ejection + mitral regurgitation', '좌심실 박출 + 승모판 역류') : t('LV ejection', '좌심실 박출');
  if (sample.flows.mitral > 0) return t('LV filling', '좌심실 충만');
  if (sample.flows.mitral < 0) return t('Mitral regurgitation · forward valves closed', '승모판 역류 · 전방 판막 닫힘');
  const slope = next.pressures.LV - previous.pressures.LV;
  return Math.abs(slope) < 1e-8 ? t('Valve transition / no flow', '판막 전환 / 정체') : slope > 0 ? t('Isovolumic contraction / transition', '등용적 수축 / 전환') : t('Isovolumic relaxation / transition', '등용적 이완 / 전환');
}

function Results({ result, playing, setPlaying }: { result: SimulationResult; playing: boolean; setPlaying: (value: boolean) => void }) {
  const { locale, t } = useI18n();
  const [playbackFrame, setPlaybackFrame] = useState({ index: 0, cycle: 0, result });
  const [inspectionRevision, setInspectionRevision] = useState(0);
  const cursor = useRef(0);
  const elapsed = useRef(0);
  const [speed, setSpeed] = useState(0.5);
  const { samples, metrics, diagnostics } = result;
  const selectedIndex = Math.min(playbackFrame.index, samples.length - 1);
  const sample = samples[selectedIndex] ?? samples[0];
  // The tracer clock travels with the same committed React snapshot as its pose.
  // A pending RAF update can never move particles ahead of the heart/valves.
  const elapsedSeconds = (playbackFrame.result === result ? playbackFrame.cycle : 0) * result.period + sample.time;
  useEffect(() => {
    // Keep the inspection phase on a new experiment, but discard the old beat's
    // accumulated particle travel. No old flow integral crosses model results.
    elapsed.current = samples[Math.min(selectedIndex, samples.length - 1)].time;
    cursor.current = Math.min(selectedIndex, samples.length - 1);
    // A result replacement is the reset boundary, not each selected sample.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result]);
  useEffect(() => {
    if (!playing) return;
    let frame = 0;
    let last = 0;
    const advance = (now: number) => {
      if (last) elapsed.current += Math.min(now - last, 100) / 1000 * speed;
      const cycle = Math.floor(elapsed.current / result.period);
      cursor.current = (elapsed.current / result.period - cycle) * (samples.length - 1);
      const index = Math.min(samples.length - 2, Math.floor(cursor.current));
      // The renderer, charts and numbers use exactly the same recorded sample.
      // Retain the cycle count so tracer positions are continuous at beat wrap.
      last = now;
      setPlaybackFrame(previous => previous.index === index && previous.cycle === cycle && previous.result === result
        ? previous : { index, cycle, result });
      frame = requestAnimationFrame(advance);
    };
    frame = requestAnimationFrame(advance);
    return () => cancelAnimationFrame(frame);
  }, [playing, speed, result]);
  function inspect(index: number) {
    setPlaying(false); cursor.current = index; elapsed.current = samples[index].time;
    setPlaybackFrame({ index, cycle: 0, result });
    setInspectionRevision(revision => revision + 1);
  }
  return <>
    <div className="metric-grid" aria-label={t('Computed metrics for one cardiac cycle', '계산된 한 주기 지표')}>
      <Metric label={t('Forward cardiac output', '전방 심박출량')} value={number(metrics.cardiacOutput, 2)} unit="L/min" detail={t('Integrated forward aortic flow', '대동맥 전방 유량 적분')} />
      <Metric label={t('LV ejection fraction', '좌심실 박출률')} value={number(metrics.ejectionFraction * 100)} unit="%" detail="(EDV − ESV) / EDV" />
      <Metric label={t('LV stroke volume', '좌심실 박출량')} value={number(metrics.strokeVolume)} unit="mL" detail={`${t('Forward stroke volume', '전방 박출량')} ${number(metrics.forwardStrokeVolume)} mL`} />
      <Metric label={t('Arterial pressure · systolic / diastolic', '동맥압 · 수축기 / 이완기')} value={`${number(metrics.systolicPressure, 0)} / ${number(metrics.diastolicPressure, 0)}`} unit="mmHg" detail={`${t('Mean', '평균')} ${number(metrics.meanArterialPressure)} mmHg`} />
      <Metric label={t('Mean left atrial pressure', '평균 좌심방압')} value={number(metrics.meanLaPressure)} unit="mmHg" detail={`${t('LV end-diastolic pressure', '좌심실 충만말기압')} ${number(metrics.lvEndDiastolicPressure)} mmHg`} />
      <Metric label={t('Mitral regurgitant fraction', '승모판 역류 분율')} value={number(metrics.regurgitantFraction * 100)} unit="%" detail={`${t('Regurgitant volume', '역류')} ${number(metrics.regurgitantVolume)} mL/beat`} />
    </div>
    <section className="transport" aria-label={t('Cardiac cycle controls', '심장 주기 제어')}>
      <button className="play-button" onClick={() => setPlaying(!playing)}>{playing ? t('Pause', '일시정지') : t('Play', '재생')}</button>
      <div className="cycle-scrubber"><label htmlFor="cycle-time">{phaseLabel(sample, samples[selectedIndex > 0 ? selectedIndex - 1 : samples.length - 2], samples[selectedIndex < samples.length - 1 ? selectedIndex + 1 : 1], t)} <output>{number(sample.time * 1000, 0)} / {number(result.period * 1000, 0)} ms</output></label>
        <input id="cycle-time" aria-label={t('Cardiac cycle time', '심장 주기 시점')} type="range" min="0" max={samples.length - 1} step="1" value={selectedIndex} onChange={event => inspect(Number(event.target.value))} /></div>
      <label className="speed-control">{t('Playback speed', '재생 속도')} <select value={speed} onChange={event => setSpeed(Number(event.target.value))}><option value="0.25">0.25×</option><option value="0.5">0.5×</option><option value="1">1×</option></select></label>
      <button className="quiet-button" onClick={() => inspect(0)}>{t('Start of cycle', '주기 처음')}</button>
    </section>
    <p className="cycle-caption">{diagnostics.converged ? t('One converged cardiac cycle repeats.', '평형에 도달한 한 주기를 반복 재생합니다.') : t('The last unconverged cardiac cycle repeats.', '수렴 전 마지막 한 주기를 반복 재생합니다.')} {t('Select a time on the slider or chart to pause every view at the same computed instant.', '시간 슬라이더나 그래프를 선택하면 모든 표시가 같은 계산 시점에 멈춥니다.')}</p>
    <div className="analysis-grid">
      <AnatomyBoundary message={t('The 3D viewer could not load. Calculations, charts and time controls remain available. Reload the page to retry loading the viewer.', '3D 뷰어를 불러오지 못했습니다. 계산·그래프·시간 제어는 계속 사용할 수 있습니다. 새로고침하면 뷰어 로딩을 다시 시도합니다.')}><Suspense fallback={<p className="calculation-state">{t('Preparing the 3D viewer…', '3D 뷰어 준비 중…')}</p>}><AnatomyViewer sample={sample} result={result} elapsedSeconds={elapsedSeconds} playing={playing} setPlaying={setPlaying} inspectionRevision={inspectionRevision} onInspect={inspect} /></Suspense></AnatomyBoundary>
      <HemodynamicCharts samples={samples} selectedIndex={selectedIndex} onSelectIndex={inspect} />
    </div>
    <div className="mechanism-grid">
      <CirculationDiagram sample={sample} />
      <section className="instant-panel" aria-label={t('Current computed state', '현재 계산 상태')}><p className="eyebrow">{t('SAME TIME / COMPUTED STATE', '동일 시점 / 계산 상태')}</p><h2>{t('Hemodynamics at the selected instant', '선택한 순간의 혈역학')}</h2>
        <dl className="instant-values"><div><dt>{t('LV volume', '좌심실 용적')}</dt><dd>{number(sample.volumes.LV)} <small>mL</small></dd></div><div><dt>{t('LV pressure', '좌심실 압력')}</dt><dd>{number(sample.pressures.LV)} <small>mmHg</small></dd></div><div><dt>{t('Forward aortic valve flow', '대동맥판 전방 유량')}</dt><dd>{number(sample.flows.aortic)} <small>mL/s</small></dd></div><div><dt>{t('Mitral valve flow', '승모판 유량')}</dt><dd>{number(sample.flows.mitral)} <small>mL/s</small></dd></div></dl>
        <p>{t('Negative mitral flow indicates regurgitation from the LV to the left atrium. With regurgitation, not all of the LV volume change contributes to systemic circulation.', '승모판 유량의 음수는 좌심실 → 좌심방 역류입니다. 역류가 있으면 좌심실의 용적 변화 전체가 전신 순환으로 전달되지 않습니다.')}</p>
        <p className="gradient-note">{t('Mean aortic valve gradient during ejection', '박출 중 평균 대동맥판 압력차')} <strong>{number(metrics.meanAorticGradient)} mmHg</strong> · {t('peak', '최고')} {number(metrics.peakAorticGradient)} mmHg</p>
      </section>
    </div>
    <details className="model-details"><summary>{t('Methods · convergence · limitations', '계산 방법 · 수렴 상태 · 한계')}</summary><div>
      <p>{t('An eight-compartment closed circulation with time-varying ventricular elastance, exponential passive pressure, pressure-driven resistive flow and fixed-step RK4 integration. Units: mmHg, mL and s.', '8개 구획의 폐쇄 순환 · 시간 가변 심실 엘라스턴스 + 지수형 수동 압력 · 압력차에 따른 저항성 흐름 · 고정 보폭 RK4. 단위는 mmHg, mL, s입니다.')}</p>
      <p>{t('Numerical periodic convergence', '수치적 주기 수렴')}: {diagnostics.converged ? t('reached', '확인') : t('not reached', '미달')} · {diagnostics.cycles} {t('cycles', '주기')} · {t('residual', '잔차')} {diagnostics.periodicResidualMl.toExponential(2)} mL · {t('blood volume conservation error', '혈액량 보존 오차')} {diagnostics.volumeErrorMl.toExponential(2)} mL · {t('time step', '시간 간격')} {number(diagnostics.stepSizeSeconds * 1000, 3)} ms.</p>
      {diagnostics.warnings.map(warning => <p role="status" key={warning}>{localizeDiagnostic(warning, locale)}</p>)}
      <p>{t('Parameters are educational estimates based on published equation forms. Clinical validation, patient-specific prediction, electrophysiology, autonomic compensation and myocardial mechanics are not included. No ECG is calculated.', '매개변수는 문헌의 방정식 형태에 근거한 교육용 추정값입니다. 임상 검증·환자별 예측·전기생리·자율신경 보상·심근 역학을 포함하지 않습니다. ECG는 계산하지 않습니다.')}</p>
      <p><a href="https://doi.org/10.1016/j.jbiomech.2005.06.016" target="_blank" rel="noreferrer">Korakianitis &amp; Shi, 2006</a> · <a href="https://doi.org/10.1371/journal.pcbi.1012377" target="_blank" rel="noreferrer">Tlalka et al., 2025</a> · {t('Equations, full constants and validation scope: repository docs/physiology-model.md', '방정식·전체 상수·검증 범위: 저장소 docs/physiology-model.md')}</p>
    </div></details>
  </>;
}

function Metric({ label, value, unit, detail }: { label: string; value: string; unit: string; detail: string }) {
  return <article className="metric"><h2>{label}</h2><p><strong>{value}</strong><span>{unit}</span></p><small>{detail}</small></article>;
}

export default function App() {
  const { locale, setLocale, t } = useI18n();
  const [parameters, setParameters] = useState<SimulationParameters>(defaultParameters);
  const [playing, setPlaying] = useState(() => !window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const { result, retainedResult, pending, error } = useSimulation(parameters);
  const scenario = scenarios.find(item => item.id === parameters.scenario)!;
  function update(key: ParameterKey, value: number) { setPlaying(false); setParameters(previous => ({ ...previous, [key]: value })); }
  function chooseScenario(id: ScenarioId) { setPlaying(false); setParameters(parametersForScenario(id)); }
  return <main className="physiology-lab">
    <header><a className="brand" href={import.meta.env.BASE_URL}>CARDIO<span>LAB</span></a><span className="eyebrow">{t('COMPUTATIONAL PHYSIOLOGY / 0D LAB', '계산 생리학 / 0D 실험실')}</span><span className="review-badge">{t('Educational approximation · not clinically validated', '교육용 근사 모델 · 임상 미검증')}</span><div className="language-switch" role="group" aria-label={t('Interface language', '화면 언어')}><button type="button" lang="en" aria-label={t('Switch to English', '영어로 전환')} aria-pressed={locale === 'en'} onClick={() => setLocale('en')}>EN</button><button type="button" lang="ko" aria-label={t('Switch to Korean', '한국어로 전환')} aria-pressed={locale === 'ko'} onClick={() => setLocale('ko')}>KO</button></div></header>
    <section className="lab-intro"><div><p className="eyebrow">{t('ANATOMY · PRESSURE · VOLUME · FLOW', '해부학 · 압력 · 용적 · 혈류')}</p><h1>{t('Follow the flow.', '심장을 통과하는 흐름,')}<br />{t('Explore the beating heart.', '그 안의 생리 기전을 탐구하세요.')}</h1></div><p>{t('Explore contraction, relaxation, valve motion and blood flow at the same instant.', '수축·이완, 판막 개폐와 혈류를 같은 시점에서 살펴봅니다.')}<br /><span>{t('Educational deformations and reconstructed leaflets animate the HRA source using a 0D model.', 'HRA 원본에 0D 계산값으로 움직이는 교육용 변형·판막엽을 적용합니다.')}<br />{t('The atlas and computational model have not been medically validated in this project.', '아틀라스와 계산 모델은 이 프로젝트에서 의학적으로 검증되지 않았습니다.')}</span></p></section>
    <section className="experiment-panel" aria-label={t('Physiology experiment settings', '생리 실험 설정')}><div className="panel-heading"><div><p className="eyebrow">{t('01 / EXPERIMENT', '01 / 실험')}</p><h2>{t('Choose a mechanism to explore', '비교할 기전을 선택하세요')}</h2></div><button className="quiet-button" onClick={() => chooseScenario('normal')}>{t('Reset experiment', '실험 초기화')}</button></div>
      <div className="scenario-options" role="group" aria-label={t('Disease mechanisms', '질환 기전')}>{scenarios.map(item => <button key={item.id} aria-pressed={parameters.scenario === item.id} onClick={() => chooseScenario(item.id)}>{t(item.label, item.labelKo)}</button>)}</div>
      <div className="scenario-explanation"><strong>{t(scenario.mechanism, scenario.mechanismKo)}</strong><p>{t(scenario.limitation, scenario.limitationKo)}</p></div>
      <div className="parameter-grid">{parameterKeys.map(key => { const definition = parameterDefinitions[key]; return <label key={key} className="parameter-control" htmlFor={`parameter-${key}`}><span>{t(definition.label, definition.labelKo)}<output>{number(parameters[key], key === 'heartRate' || key === 'bloodVolume' ? 0 : 2)} {definition.unit}</output></span><input id={`parameter-${key}`} type="range" min={definition.min} max={definition.max} step={definition.step} value={parameters[key]} disabled={key === 'severity' && parameters.scenario === 'normal'} onChange={event => update(key, Number(event.target.value))} /></label>; })}</div>
      <p className="parameter-note">{t('Selecting a scenario restores the reference parameters. Multipliers apply in addition to the selected mechanism; “mechanism intensity” is not a clinical severity grade. A change in blood volume sets the initial condition of a new closed circulation.', '시나리오 선택은 매개변수를 기준값으로 복원합니다. 배수는 해당 기전에 추가 적용되며 ‘기전 강도’는 임상 중증도 등급이 아닙니다. 혈액량 변화는 새로운 폐쇄 순환의 초기 조건입니다.')}</p>
    </section>
    {pending ? <section className="calculation-state" role="status">{t('Calculating periodic equilibrium with the new parameters…', '새 매개변수로 주기 평형을 계산하는 중…')}</section> : null}
    {error ? <section className="calculation-error" role="alert">{t('Calculation failed', '계산 실패')}: {localizeDiagnostic(error, locale)}</section> : null}
    {result && !result.diagnostics.modelWithinDomain ? <section className="calculation-error" role="alert"><strong>{t('This combination is outside the model’s supported physiological interpretation range.', '이 조합은 모델의 생리학적 해석 범위를 벗어납니다.')}</strong><p>{t('Numerical convergence alone does not establish a valid physiological state. Result charts are hidden. Adjust the parameters toward their reference values or reset the experiment.', '수치 수렴만으로 유효한 생리 상태가 되지는 않습니다. 결과 그래프를 표시하지 않습니다. 매개변수를 완화하거나 실험을 초기화해 주세요.')}</p>{result.diagnostics.warnings.map(warning => <p key={warning}>{localizeDiagnostic(warning, locale)}</p>)}</section> : null}
    {result?.diagnostics.modelWithinDomain ? <>
      {!result.diagnostics.converged ? <p className="calculation-error" role="alert">{t('Periodic equilibrium was not reached. The values below are provisional and must not be interpreted as a steady state.', '주기 평형에 도달하지 못했습니다. 아래 값은 수렴 전 결과이며 정상 상태 해석에 사용하지 마세요.')}</p> : null}
      {result.diagnostics.warnings.map(warning => <p className="calculation-error" role="status" key={warning}>{localizeDiagnostic(warning, locale)}</p>)}
    </> : null}
    {/* Keep camera, visibility, chart tab, speed and inspection phase across experiments.
        Previous numerical output is never visible while a new calculation is pending/invalid. */}
    {retainedResult ? <div hidden={pending || !!error || !result?.diagnostics.modelWithinDomain}>
      <Results result={retainedResult} playing={playing && !!result?.diagnostics.modelWithinDomain && !pending} setPlaying={setPlaying} />
    </div> : null}
    <footer><span>{t('CardioLab · education and research portfolio · anatomy awaiting review', 'CardioLab · 교육·연구 포트폴리오 · 검수 전 해부학')}<br /><a href="https://github.com/Carraway-and-Gatsby/cardio-simulator" target="_blank" rel="noreferrer">{t('Open source on GitHub', 'GitHub 오픈소스')}</a> · <a href="https://github.com/Carraway-and-Gatsby/cardio-simulator/blob/main/THIRD_PARTY_NOTICES.md" target="_blank" rel="noreferrer">{t('Licenses & attribution', '라이선스 및 출처')}</a></span><span>{t('Do not use for diagnosis, treatment decisions or individual medical predictions.', '진단·치료 판단 또는 개인별 의학적 예측에 사용하지 마세요.')}</span></footer>
  </main>;
}
