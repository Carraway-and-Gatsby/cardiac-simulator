import { useI18n } from './i18n';
import { structureLabel, structureNote } from './i18n/anatomy';
import { Component, Suspense, memo, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei/core/OrbitControls';
import { useProgress } from '@react-three/drei/core/Progress';
import { DoubleSide, MOUSE, Vector3 } from 'three';
import HeartModel from './HeartModel';
import BloodFlow from './BloodFlow';
import AnimatedValves from './AnimatedValves';
import { createMotionReference, evaluateCardiacMotion, type MotionWeights } from './motion/cardiac-motion';
import { createValveMotionContext, getValveMotionState, valveDefinitions, valveIds, type ValveId } from './motion/valve-model';
import { bloodFlowPaths } from './flow/paths';
import type { SimulationResult, SimulationSample } from './simulation/types';
import { cameraViews, displayScale, isVisible, sourceCenter, sourceSpec, structures, structureById,
  type CameraView, type MaterialMode, type ViewMode } from './heart-model';
import './anatomy.css';

type Clip = { axis: 'none' | 'x' | 'y' | 'z'; position: number; flip: boolean };
const restMotion: MotionWeights = [0, 0, 0, 0, 0, 0];
const valveInspection = Object.fromEntries(valveIds.map(id => {
  const valve = valveDefinitions[id], radius = Math.max(valve.radiusU, valve.radiusV) * 1.45;
  return [id, { bounds: { min: valve.center.map(value => value - radius), max: valve.center.map(value => value + radius) },
    preset: { direction: valve.forward.map(value => -value), up: valve.v } }];
}));
class ViewportBoundary extends Component<{ children: ReactNode; errorMessage: string }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    return this.state.failed
      ? <p className="fallback" role="alert">{this.props.errorMessage}</p>
      : this.props.children;
  }
}

function ModelLoading() {
  const { t } = useI18n();
  const { active } = useProgress();
  return active ? <span className="model-loading" role="status">{t('Loading HRA atlas…', 'HRA 아틀라스 불러오는 중…')}</span> : null;
}
const CameraRig = memo(function CameraRig({ view, focus, revision, pan, motionEnabled }: { view: CameraView; focus: string | null; revision: number; pan: boolean; motionEnabled: boolean }) {
  const { camera, invalidate, size } = useThree();
  const valveFocus = motionEnabled && focus ? valveInspection[focus] : undefined;
  const bounds = valveFocus?.bounds ?? (focus ? structureById.get(focus)!.sourceBoundsMetres : sourceSpec.sourceBoundsMetres);
  const target = bounds.min.map((v, i) => ((v + bounds.max[i]) / 2 - sourceCenter[i]) * displayScale) as [number, number, number];
  const preset = valveFocus?.preset ?? cameraViews[view];
  // Fit all eight source-bound corners in the chosen camera basis. A sphere fit
  // wastes most of a narrow mobile viewport around this elongated anatomy.
  const direction = new Vector3(...preset.direction).normalize();
  const right = new Vector3(...preset.up).cross(direction).normalize();
  const screenUp = direction.clone().cross(right);
  const tangent = Math.tan(38 * Math.PI / 360);
  const halfExtent = bounds.min.map((v, i) => (bounds.max[i] - v) * displayScale / 2);
  let distance = .65;
  for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) {
    const corner = new Vector3(x * halfExtent[0], y * halfExtent[1], z * halfExtent[2]);
    distance = Math.max(distance, corner.dot(direction) + 1.12 * Math.max(
      Math.abs(corner.dot(right)) / (tangent * size.width / size.height),
      Math.abs(corner.dot(screenUp)) / tangent));
  }
  useEffect(() => {
    const centre = new Vector3(...bounds.min.map((v, i) => ((v + bounds.max[i]) / 2 - sourceCenter[i]) * displayScale));
    camera.up.set(preset.up[0], preset.up[1], preset.up[2]);
    camera.position.copy(new Vector3(...preset.direction).normalize().multiplyScalar(distance).add(centre));
    camera.lookAt(centre); camera.updateMatrixWorld(); invalidate();
    // Camera refits only for explicit view/focus/reset or viewport changes, never for cardiac samples.
  }, [camera, invalidate, preset, bounds, distance, revision]);
  return <OrbitControls key={`${view}-${focus}-${revision}`} makeDefault target={target} enableDamping={false}
    minDistance={.25} maxDistance={30} enablePan mouseButtons={{ LEFT: pan ? MOUSE.PAN : MOUSE.ROTATE, MIDDLE: MOUSE.DOLLY, RIGHT: MOUSE.PAN }} />;
});
function SectionIndicator({ clip }: { clip: Clip }) {
  if (clip.axis === 'none') return null;
  const position: [number, number, number] = [0, 0, 0];
  position[['x', 'y', 'z'].indexOf(clip.axis)] = clip.position;
  return <mesh position={position} rotation={clip.axis === 'x' ? [0, Math.PI / 2, 0] : clip.axis === 'y' ? [Math.PI / 2, 0, 0] : [0, 0, 0]}>
    <planeGeometry args={[6, 6]} /><meshBasicMaterial color="#dcc8a2" transparent opacity={.16} wireframe side={DoubleSide} depthWrite={false} />
  </mesh>;
}
const groups = [
  ['chambers', 'Four chambers', '네 방'], ['myocardium', 'Septum', '중격'], ['valves', 'Valves', '판막'],
  ['muscles', 'Papillary muscles', '유두근'], ['vessels', 'Great vessels', '대혈관'], ['coronary', 'Coronary vessels', '관상혈관'],
] as const;
const valveFlows = { MV: 'mitral', TV: 'tricuspid', AV: 'aortic', PVvalve: 'pulmonary' } as const;
type Group = typeof groups[number][0];
type Props = { sample: SimulationSample; result: SimulationResult; elapsedSeconds: number;
  playing: boolean; setPlaying: (playing: boolean) => void; inspectionRevision: number; onInspect: (index: number) => void };

export default function AnatomyViewer({ sample, result, elapsedSeconds, playing, setPlaying, inspectionRevision, onInspect }: Props) {
  const { locale, t } = useI18n();
  const [motionEnabled, setMotionEnabled] = useState(true);
  const [flowEnabled, setFlowEnabled] = useState(true);
  const [flowSide, setFlowSide] = useState<'all' | 'right' | 'left'>('all');
  const [flowContext, setFlowContext] = useState(true);
  const [flowGuides, setFlowGuides] = useState(true);
  const [flowDensity, setFlowDensity] = useState(1);
  const [mode, setMode] = useState<ViewMode>('surface');
  const [category, setCategory] = useState<Group>('chambers');
  const [selected, setSelected] = useState('LV');
  const [hidden, setHidden] = useState<string[]>([]);
  const [opacity, setOpacity] = useState(1);
  const [revision, setRevision] = useState(0);
  const [view, setView] = useState<CameraView>('oblique');
  const [focus, setFocus] = useState<string | null>(null);
  const [material, setMaterial] = useState<MaterialMode>('tissue');
  const [labels, setLabels] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [clip, setClip] = useState<Clip>({ axis: 'none', position: 0, flip: false });
  const [planeVisible, setPlaneVisible] = useState(true);
  const [pan, setPan] = useState(false);
  const motionReference = useMemo(() => createMotionReference(result), [result]);
  const motionWeights = motionEnabled ? evaluateCardiacMotion(sample, motionReference).weights : restMotion;
  const valveContext = useMemo(() => createValveMotionContext(result), [result]);
  const extremalSamples = useMemo(() => {
    let full = 0, empty = 0;
    result.samples.forEach((item, i) => {
      if (item.volumes.LV > result.samples[full].volumes.LV) full = i;
      if (item.volumes.LV < result.samples[empty].volumes.LV) empty = i;
    });
    return { full, empty };
  }, [result]);
  const flowPaths = useMemo(() => bloodFlowPaths.filter(path => mode !== 'coronary' && !focus
    && (flowSide === 'all' || path.side === flowSide) && !path.structures.some(id => hidden.includes(id))),
  [mode, focus, flowSide, hidden]);
  const hasFlow = flowEnabled && flowPaths.length > 0;
  const active = structureById.get(selected)!;
  const visibleCount = structures.filter(item => isVisible(item, mode, hidden)).length;
  const vesselIds = structures.filter(item => item.group === 'vessels').map(item => item.id);
  const vesselsVisible = vesselIds.some(id => isVisible(structureById.get(id)!, mode, hidden));
  const chamberVolume = sample?.volumes[selected as keyof typeof sample.volumes];
  const chamberPressure = sample?.pressures[selected as keyof typeof sample.pressures];
  const valveKey = valveFlows[selected as keyof typeof valveFlows];
  const valveFlow = valveKey && sample ? sample.flows[valveKey] : undefined;
  const select = useCallback((id: string) => {
    const item = structureById.get(id)!;
    setSelected(id); setCategory(item.group as Group);
  }, []);
  function show(id: string, checked: boolean) {
    if (checked) { setMode('surface'); setFocus(null); }
    setHidden(previous => checked ? previous.filter(value => value !== id) : [...new Set([...previous, id])]);
  }
  function isolate(ids: string[]) {
    setMode('surface'); setFocus(null); setHidden(structures.filter(item => !ids.includes(item.id)).map(item => item.id));
  }
  function reset() {
    setMode('surface'); setHidden([]); setOpacity(1); setView('oblique'); setFocus(null); setPan(false);
    setClip({ axis: 'none', position: 0, flip: false }); setRevision(value => value + 1);
    setFlowSide('all');
  }
  function focusStructure(id: string) {
    select(id); isolate([id]); setClip({ axis: 'none', position: 0, flip: false });
    setFocus(id); setRevision(value => value + 1);
  }
  return <section className={`anatomy-viewer source-anatomy ${expanded ? 'is-expanded' : ''}`} aria-label={t('Explore 3D anatomy', '3D 구조 탐색')}>
    <div className="panel-heading"><div><p className="eyebrow">{t('HUMAN REFERENCE ATLAS / CARDIAC MOTION', '인체 참조 아틀라스 / 심장 움직임')}</p><h2>{t('Explore the heartbeat and blood flow together', '박동과 혈류를 함께 살펴보세요')}</h2></div>
      <button className="quiet-button" onClick={() => setExpanded(value => !value)}>{expanded ? t('Side-by-side view', '나란히 보기') : t('Expand view', '크게 보기')}</button></div>
    <p className="source-caption">{t('Adult male atlas based on the Visible Human · 44 structures', 'Visible Human 기반 성인 남성 아틀라스 · 44개 구조')} · {motionEnabled ? t('Educational myocardial deformation and reconstructed leaflets', '교육용 심근 변형·판막엽 재구성') : t('Original static geometry', '원본 정적 형상')} · <span>{t('Anatomical review pending', '해부학 검수 전')}</span></p>
    <div className="flow-controls" aria-label={t('Blood-flow animation settings', '혈류 애니메이션 설정')}>
      <button className="flow-play" onClick={() => setPlaying(!playing)}>{playing ? t('Pause cardiac cycle', '심장 주기 일시정지') : t('Play cardiac cycle', '심장 주기 재생')}<span aria-hidden="true">{playing ? 'Ⅱ' : '▶'}</span></button>
      <label><input type="checkbox" checked={flowEnabled} onChange={event => setFlowEnabled(event.target.checked)} />{t('Show blood flow', '혈류 표시')}</label>
      <div className="flow-side" role="group" aria-label={t('Choose circulation', '혈류 순환 선택')}>{([['all', t('Full circulation', '전체 순환')], ['right', t('Right heart', '우심계')], ['left', t('Left heart', '좌심계')]] as const).map(([id, label]) =>
        <button key={id} aria-pressed={flowSide === id} onClick={() => setFlowSide(id)}>{label}</button>)}</div>
      <label><input type="checkbox" checked={flowContext} disabled={!flowEnabled} onChange={event => setFlowContext(event.target.checked)} />{t('See-through view', '투시 보기')}</label>
      <label><input type="checkbox" checked={flowGuides} disabled={!flowEnabled} onChange={event => setFlowGuides(event.target.checked)} />{t('Path guides', '경로 가이드')}</label>
      <label className="flow-density">{t('Particle density', '입자 밀도')} <input aria-label={t('Blood-flow particle density', '혈류 입자 밀도')} type="range" min=".5" max="1.5" step=".25" value={flowDensity} disabled={!flowEnabled} onChange={event => setFlowDensity(Number(event.target.value))} /></label>
    </div>
    <div className="flow-legend"><span><i className="flow-dot right" />{t('Lower-oxygen blood · shown in teal', '산소가 적은 혈액 · 청록 표기')}</span><span><i className="flow-dot left" />{t('Higher-oxygen blood · shown in red', '산소가 많은 혈액 · 적색 표기')}</span><span>{t('Same time as the charts', '그래프와 같은 시점')} · {(sample.time * 1000).toFixed(0)} ms</span></div>
    <div className="motion-controls" aria-label={t('Heart and valve motion settings', '심장 및 판막 움직임 설정')}>
      <label><input type="checkbox" checked={motionEnabled} onChange={event => setMotionEnabled(event.target.checked)} />{t('Heart and valve motion', '심장·판막 움직임')}</label>
      <span>{motionEnabled ? t('Contraction and relaxation use the same calculated time as blood flow.', '혈류와 같은 계산 시점에 수축·이완합니다.') : t('Original atlas geometry restored.', '원본 아틀라스 형상으로 복원했습니다.')}</span>
      <div><button onClick={() => onInspect(extremalSamples.full)}>{t('LV end of filling', '좌심실 충만 끝')}</button><button onClick={() => onInspect(extremalSamples.empty)}>{t('LV end of ejection', '좌심실 박출 끝')}</button>
        <button onClick={() => { setMode('interior'); setHidden([]); setFocus(null); setMotionEnabled(true); }}>{t('Inspect valve motion', '판막 움직임 보기')}</button></div>
    </div>
    <div className="anatomy-toolbar">
      <div className="view-options" role="group" aria-label={t('Model view', '모델 보기')}>{([['surface', t('Full surface', '전체 표면')], ['interior', t('Internal structures', '내부 구조')], ['coronary', t('Coronary vessels', '관상혈관')]] as const).map(([id, label]) =>
        <button key={id} aria-pressed={mode === id} onClick={() => { setMode(id); setHidden([]); setFocus(null); }}>{label}</button>)}</div>
      <label>{t('Material', '재질')} <select aria-label={t('Material mode', '재질 모드')} value={material} onChange={e => setMaterial(e.target.value as MaterialMode)}>
        <option value="tissue">{t('Illustrative tissue colors', '조직색 연구')}</option><option value="educational">{t('Educational colors', '교육용 색상')}</option><option value="neutral">{t('Neutral reconstruction', '중립 재구성')}</option></select></label>
      <label><input type="checkbox" checked={labels} onChange={e => setLabels(e.target.checked)} />{t('Selection label', '선택 라벨')}</label>
      <label><input type="checkbox" checked={vesselsVisible} onChange={e => {
        if (e.target.checked) setMode('surface');
        setHidden(previous => e.target.checked ? previous.filter(id => !vesselIds.includes(id)) : [...new Set([...previous, ...vesselIds])]);
      }} />{t('Great vessels', '대혈관')}</label>
    </div>
    <div className="camera-options" role="group" aria-label={t('Camera direction', '카메라 방향')}>{Object.entries(cameraViews).map(([id, preset]) =>
      <button key={id} aria-pressed={view === id} onClick={() => { setView(id as CameraView); setRevision(value => value + 1); }}>{locale === 'en' ? preset.label : preset.labelKo}</button>)}
      <button onClick={reset}>{t('Reset view', '보기 초기화')}</button><button aria-pressed={pan} onClick={() => setPan(value => !value)}>{pan ? t('Drag: pan', '드래그: 이동') : t('Drag: rotate', '드래그: 회전')}</button></div>
    <div className="workspace">
      <section className="viewport" aria-label={t('Heart model with rotation and zoom', '회전 및 확대 가능한 심장 모델')}>
        <div className="viewport-top"><span>{motionEnabled ? t('SYNCHRONIZED MOTION / EDUCATIONAL', '동기화된 움직임 / 교육용') : hasFlow ? t('0D-DRIVEN TRACERS / STATIC ATLAS', '0D 계산 기반 입자 / 정적 아틀라스') : t('HRA MALE / STATIC ATLAS', 'HRA 남성 / 정적 아틀라스')}</span><span>{visibleCount} / {structures.length} {t('structures shown', '구조 표시')}</span></div>
        {(hasFlow || motionEnabled) && <div className="flow-scene-status"><span className={playing ? 'status-dot running' : 'status-dot'} />{playing ? t('Cardiac cycle playing', '심장 주기 재생 중') : t('Time inspection · paused', '시간 탐색 · 정지')}<small>{motionEnabled ? t('Myocardium and valves synchronized', '심근·판막 동기화') : t(`${flowPaths.length} educational paths`, `${flowPaths.length}개 교육용 경로`)}</small></div>}
        <ModelLoading />
        <ViewportBoundary errorMessage={t('The atlas could not be loaded. The structure list and source information remain available. Refresh the page to try again.', '아틀라스를 불러오지 못했습니다. 구조 목록과 출처는 계속 사용할 수 있습니다. 다시 시도하려면 페이지를 새로고침해 주세요.')}>
          <Canvas frameloop={playing && (hasFlow || motionEnabled) ? 'always' : 'demand'} dpr={[1, 1.75]} gl={{ antialias: true, localClippingEnabled: true }}
            camera={{ position: [3, 1, 11], fov: 38, near: .01, far: 100 }}
            fallback={<p className="fallback">{t('WebGL is unavailable. Please use the structure list.', 'WebGL을 사용할 수 없습니다. 구조 목록을 이용해 주세요.')}</p>}>
            <color attach="background" args={['#151d22']} />
            <ambientLight intensity={.75} />
            <hemisphereLight args={['#e6edf2', '#604b41', 1.2]} />
            <directionalLight position={[-4, 6, 7]} intensity={3.2} color="#fff1e2" />
            <directionalLight position={[5, 0, 3]} intensity={1.25} color="#dce8f1" />
            <directionalLight position={[0, 3, -5]} intensity={2.0} color="#e8ddcd" />
            <Suspense fallback={null}><HeartModel mode={mode} selected={selected} hidden={hidden} opacity={opacity} onSelect={select}
              materialMode={material} clip={clip} labels={labels} flowContext={hasFlow && flowContext}
              motionEnabled={motionEnabled} motionWeights={motionWeights} /></Suspense>
            {motionEnabled && <AnimatedValves sample={sample} result={result} clip={clip} hidden={hidden} mode={mode}
              selected={selected} onSelect={select} opacity={opacity} flowContext={hasFlow && flowContext} labels={labels} />}
            {hasFlow && <BloodFlow result={result} elapsedSeconds={elapsedSeconds} paths={flowPaths} density={flowDensity}
              guides={flowGuides} clip={clip} sampleTime={sample.time} inspectionRevision={inspectionRevision} motionWeights={motionWeights} />}
            {planeVisible && <SectionIndicator clip={clip} />}
            <CameraRig view={view} focus={focus} revision={revision} pan={pan} motionEnabled={motionEnabled} />
          </Canvas>
        </ViewportBoundary>
        <div className="viewport-bottom"><span>{t('Drag to', '드래그')} {pan ? t('pan', '이동') : t('rotate', '회전')} · {t('Scroll to zoom · Right-drag to pan', '스크롤 확대 · 우클릭 드래그 이동')}</span><span>{t('Original heart bounds 124.4 × 105.4 × 105.2 mm', '원본 심장 경계 124.4 × 105.4 × 105.2 mm')}</span></div>
      </section>
      <details className="anatomy-settings" open><summary>{t('Explore anatomy', '구조 탐색')} · {structureLabel(active, locale)}</summary><aside aria-label={t('Structure selection and view settings', '구조 선택 및 보기 설정')}>
        <div className="category-options" role="group" aria-label={t('Structure categories', '구조 목록 분류')}>{groups.map(([id, label, labelKo]) =>
          <button key={id} aria-pressed={category === id} onClick={() => setCategory(id)}>{t(label, labelKo)} <span>{structures.filter(item => item.group === id).length}</span></button>)}</div>
        <div className="structure-actions"><button onClick={() => isolate(structures.filter(item => item.group === category).map(item => item.id))}>{t('Isolate category', '이 분류만')}</button>
          <button onClick={() => { setMode('surface'); setHidden([]); setFocus(null); }}>{t('Show all', '모두 표시')}</button></div>
        <div className="structures" tabIndex={0} aria-label={t('Anatomical structures', '해부 구조 목록')}>{structures.filter(item => item.group === category).map(item =>
          <div className="structure-row" key={item.id}><button className={'structure ' + (selected === item.id ? 'selected' : '')} aria-pressed={selected === item.id} onClick={() => select(item.id)}>
            <span className="swatch" style={{ background: item.color }} /><span><strong>{structureLabel(item, locale)}</strong><small>{item.english}</small></span><span className="structure-id">{item.id}</span></button>
            <label className="visibility"><input type="checkbox" checked={isVisible(item, mode, hidden)} aria-label={t(`Show ${structureLabel(item, locale)}`, `${structureLabel(item, locale)} 표시`)} onChange={e => show(item.id, e.target.checked)} /><span>{t('Show', '표시')}</span></label></div>)}</div>
        <div className="selection"><span className="eyebrow">{active.id} / {active.ontologyId ?? t('Name requires review', '명칭 검토 필요')}</span><h3 aria-live="polite">{structureLabel(active, locale)}</h3>
          <p>{active.english}{isVisible(active, mode, hidden) ? '' : t(' · Currently hidden', ' · 현재 숨김')}</p><p className="selection-note">{structureNote(active, locale)}</p>
          {chamberVolume !== undefined && <p className="linked-readout">{t('0D model values', '0D 계산값')} {chamberVolume.toFixed(1)} mL · {chamberPressure?.toFixed(1)} mmHg<br /><small>{t('Values at the same time · Not measured volumes of the displayed mesh.', '동일 시간의 수치 · 표시 메시의 측정 용적이 아닙니다.')}</small></p>}
          {valveFlow !== undefined && <p className="linked-readout">{t('0D valve flow', '0D 판막 유량')} {valveFlow.toFixed(1)} mL/s · {valveFlow < 0 ? t('Reverse flow', '역류') : valveFlow > 0 ? t('Forward flow', '전방 흐름') : t('No forward flow', '전방 흐름 없음')}<br /><small>{motionEnabled ? t('Reconstructed leaflets illustrate opening and closing. Actual valve orifice area is not calculated.', '개폐를 설명하는 재구성 판막엽입니다. 실제 판구 면적은 계산하지 않습니다.') : t('Value at the current calculated time · Original valve geometry is static.', '현재 계산 시점의 값 · 원본 판막 형상은 정적입니다.')}</small></p>}
          <div className="structure-actions"><button onClick={() => isolate([selected])}>{t('Isolate selection', '선택 구조만')}</button><button onClick={() => focusStructure(selected)}>{t('Focus selection', '선택 확대')}</button></div>
        </div>
        <label className="opacity" htmlFor="anatomy-opacity"><span>{t('Overall opacity', '전체 불투명도')} <output>{Math.round(opacity * 100)}%</output></span><input id="anatomy-opacity" type="range" min="0.25" max="1" step="0.01" value={opacity} onChange={e => setOpacity(Number(e.target.value))} /></label>
      </aside></details>
    </div>
    {flowEnabled && !flowPaths.length && <p className="flow-empty">{t('Blood-flow paths are hidden in the current structure view.', '현재 구조 보기에서는 혈류 경로가 숨겨져 있습니다.')} <button onClick={() => { setMode('surface'); setHidden([]); setFocus(null); }}>{t('Show all structures and blood flow', '전체 구조와 혈류 표시')}</button></p>}
    {(flowEnabled || motionEnabled) && <div className="flow-signals" aria-label={t('Current valve flows', '현재 판막 유량')}>{([
      ['tricuspid', t('Tricuspid valve', '삼첨판'), 'RA → RV', 'right'], ['pulmonary', t('Pulmonary valve', '폐동맥판'), t('RV → pulmonary artery', 'RV → 폐동맥'), 'right'],
      ['mitral', t('Mitral valve', '승모판'), sample.flows.mitral < 0 ? t('LV → LA · Reverse flow', 'LV → LA · 역류') : 'LA → LV', 'left'],
      ['aortic', t('Aortic valve', '대동맥판'), t('LV → aorta', 'LV → 대동맥'), 'left'],
    ] as const).map(([key, name, direction, side]) => {
      const rate = sample.flows[key];
      const id = valveIds.find(id => valveDefinitions[id].flowKey === key) as ValveId;
      const state = getValveMotionState(id, sample, valveContext);
      return <div key={key} className={`flow-signal ${side} ${rate < 0 ? 'reverse' : ''}`}>
        <div><strong>{name}</strong><span>{Math.abs(rate) < .005 ? t('No flow', '흐름 없음') : direction}</span></div>
        <output>{rate.toFixed(1)} <small>mL/s</small></output>
        <div className="signal-track"><i style={{ width: `${Math.min(100, Math.abs(rate) / 5)}%` }} /></div>
        {motionEnabled && <button className="valve-state" aria-label={t(`Focus ${name.toLowerCase()} leaflets`, `${name} 판엽 확대`)} onClick={() => focusStructure(id)}>{state.residualGap > 0 ? t('Incomplete closure · Reverse flow', '불완전 닫힘 · 역류') : state.forwardOpen > 0 ? t('Open', '열림') : t('Closed', '닫힘')}<span>{t('Focus leaflets ↗', '판엽 확대 ↗')}</span></button>}
      </div>;
    })}</div>}
    <p className="flow-explanation">{t('Particles are an educational representation of the direction and relative changes of 0D compartment flows. Teal and red distinguish the circulations schematically; oxygen saturation is not calculated. Paths, particle speeds and sizes do not represent actual blood-cell trajectories or flow velocities. Venous particles also reverse when calculated flow is negative.', '입자는 0D 구획 유량의 방향과 상대적 변화를 보여주는 교육용 표현입니다. 청록·적색은 순환 구분을 위한 도식 색상이며 산소포화도를 계산하지 않습니다. 경로·입자 속도·크기는 실제 혈구 궤적이나 유속이 아닙니다. 정맥도 계산값이 음수이면 반대로 흐릅니다.')}</p>
    <p className="motion-explanation">{t('Motion is an educational deformation driven by calculated chamber volumes, activation and valve flows. Reconstructed leaflets illustrate opening and closing; they do not reproduce original valve tissue, measured myocardial strain, wall thickness or valve orifice area. Turn motion off to view the original geometry.', '움직임은 계산된 방별 용적·활성도와 판막 유량에 연결한 교육용 변형입니다. 판막엽은 개폐 설명을 위한 재구성이며, 원본 판막 조직·실측 심근 변형·벽 두께·판구 면적을 재현한 결과가 아닙니다. 움직임을 끄면 원본 형상을 볼 수 있습니다.')}</p>
    <div className="section-controls">
      <label>{t('Section in source coordinates', '원본 좌표 절단')} <select aria-label={t('Section axis', '절단 축')} value={clip.axis} onChange={e => setClip({ ...clip, axis: e.target.value as Clip['axis'] })}>
        <option value="none">{t('Off', '끄기')}</option><option value="x">{t('X axis', 'X축')}</option><option value="y">{t('Y axis', 'Y축')}</option><option value="z">{t('Z axis', 'Z축')}</option></select></label>
      <label className="section-slider">{t('From center', '중심에서')} <output>{(clip.position / displayScale * 1000).toFixed(0)} mm</output><input aria-label={t('Section plane position', '절단면 위치')} type="range" min="-3" max="3" step=".025" disabled={clip.axis === 'none'} value={clip.position} onChange={e => setClip({ ...clip, position: Number(e.target.value) })} /></label>
      <label><input type="checkbox" checked={clip.flip} disabled={clip.axis === 'none'} onChange={e => setClip({ ...clip, flip: e.target.checked })} />{t('Opposite side', '반대쪽')}</label>
      <label><input type="checkbox" checked={planeVisible} onChange={e => setPlaneVisible(e.target.checked)} />{t('Show plane', '평면 표시')}</label>
    </div>
    <div className="anatomy-quickviews"><span>{t('Inspect individual valves', '판막 분리 검사')}</span>{(['MV', 'TV', 'AV', 'PVvalve'] as const).map(id => <button key={id} onClick={() => focusStructure(id)}>{structureLabel(structureById.get(id)!, locale)}</button>)}</div>
    <p className="anatomy-limitation">{t('* Orientations are inferred from source landmarks and await expert review. Sections are open geometric cuts, not registered clinical four-chamber, long-axis or short-axis views. Tissue colors are illustrative materials; photographic textures, epicardial fat and chordae tendineae are not provided.', '* 방향은 원본 구조의 표지점에서 추론했으며 전문가 검수 전입니다. 절단은 열린 기하학적 단면이며 임상 4방·장축·단축면으로 등록되지 않았습니다. 조직색은 예시 재질이며 사진 기반 질감, 심외막 지방과 건삭은 제공하지 않습니다.')}</p>
    <p className="atlas-attribution">© Kristen Browne · Heidi Schlehlein / HRA v1.3 · <a href="https://humanatlas.io/3d-reference-library" target="_blank" rel="noreferrer">{t('Source atlas', '원본 아틀라스')}</a> · <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">CC BY 4.0</a> · {t('Source structures selected and metadata added', '원본 구조 선택 및 메타데이터 추가')}</p>
  </section>;
}
