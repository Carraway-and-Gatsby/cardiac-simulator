import { memo, useId, useMemo, useState, type KeyboardEvent, type MouseEvent } from 'react';
import { useI18n } from '../i18n';
import { chartLabel } from '../i18n/charts';
import './hemodynamic-charts.css';

type Chamber = 'LA' | 'LV' | 'SA' | 'SV' | 'RA' | 'RV' | 'PA' | 'PV';
type Flow = 'mitral' | 'aortic' | 'tricuspid' | 'pulmonary' | 'systemic' | 'pulmonaryBed' | 'systemicVenous' | 'pulmonaryVenous';

/** Structural interface: plots consume calculated states without modifying them. */
export interface ChartSample {
  time: number;
  volumes: Record<Chamber, number>;
  pressures: Record<Chamber, number>;
  flows: Record<Flow, number>;
}

export interface HemodynamicChartsProps {
  samples: readonly ChartSample[];
  selectedIndex: number;
  onSelectIndex: (index: number) => void;
}

type Series = { name: string; color: string; dash?: string; value: (sample: ChartSample) => number };
type Signal = 'pressure' | 'volume' | 'flow';
type Domain = { min: number; max: number; ticks: number[] };

const WIDTH = 580;
const HEIGHT = 300;
const BOX = { left: 62, right: 558, top: 28, bottom: 249 };
const RED = '#b94d46';
const TEAL = '#26796e';
const BLUE = '#477fac';
const AMBER = '#a8792d';

const signals: Record<Signal, { label: string; unit: string; title: string; series: Series[] }> = {
  pressure: { label: '압력', unit: 'mmHg', title: '심장과 동맥의 압력', series: [
    { name: '좌심실 LV', color: RED, value: sample => sample.pressures.LV },
    { name: '좌심방 LA', color: AMBER, dash: '5 3', value: sample => sample.pressures.LA },
    { name: '체동맥 SA', color: TEAL, value: sample => sample.pressures.SA },
  ] },
  volume: { label: '용적', unit: 'mL', title: '좌·우심실 용적', series: [
    { name: '좌심실 LV', color: RED, value: sample => sample.volumes.LV },
    { name: '우심실 RV', color: BLUE, dash: '5 3', value: sample => sample.volumes.RV },
  ] },
  flow: { label: '유량', unit: 'mL/s', title: '좌심장 판막 유량', series: [
    { name: '대동맥판 LV → SA', color: RED, value: sample => sample.flows.aortic },
    { name: '승모판 LA → LV', color: BLUE, dash: '5 3', value: sample => sample.flows.mitral },
  ] },
};

const formatters = new Map<number, Intl.NumberFormat>();
function number(value: number, digits = 0) {
  if (!Number.isFinite(value)) return '—';
  let formatter = formatters.get(digits);
  if (!formatter) {
    formatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: digits });
    formatters.set(digits, formatter);
  }
  // A closed ideal valve can produce IEEE −0; values rounding to zero should read 0.
  return formatter.format(Math.abs(value) < .5 * 10 ** -digits ? 0 : value);
}

function domain(values: number[], includeZero: boolean): Domain {
  const finite = values.filter(Number.isFinite);
  let min = finite.length ? Math.min(...finite) : 0;
  let max = finite.length ? Math.max(...finite) : 1;
  if (includeZero) { min = Math.min(min, 0); max = Math.max(max, 0); }
  const span = max - min || Math.max(Math.abs(max), 1);
  if (!includeZero || min < 0) min -= span * .06;
  max += span * .07;
  const rawStep = (max - min) / 4;
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const fraction = rawStep / magnitude;
  const step = (fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 2.5 ? 2.5 : fraction <= 5 ? 5 : 10) * magnitude;
  min = Math.floor(min / step) * step;
  max = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let value = min; value <= max + step / 100; value += step) ticks.push(value);
  return { min, max, ticks };
}

function scale(value: number, range: Domain, start: number, end: number) {
  return start + (value - range.min) / (range.max - range.min) * (end - start);
}

function path(samples: readonly ChartSample[], getX: (sample: ChartSample) => number, getY: (sample: ChartSample) => number) {
  // Piecewise linear segments connect recorded numerical samples; no curve smoothing.
  let hasPrevious = false;
  return samples.map(sample => {
    const x = getX(sample);
    const y = getY(sample);
    if (!Number.isFinite(x) || !Number.isFinite(y)) { hasPrevious = false; return ''; }
    const command = hasPrevious ? 'L' : 'M';
    hasPrevious = true;
    return `${command}${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(' ');
}

const Axis = memo(function Axis({ x, y, xLabel, yLabel }: { x: Domain; y: Domain; xLabel: string; yLabel: string }) {
  return <g className="hemo-axis" aria-hidden="true">
    {y.ticks.map(tick => <g key={tick}>
      <line x1={BOX.left} x2={BOX.right} y1={scale(tick, y, BOX.bottom, BOX.top)} y2={scale(tick, y, BOX.bottom, BOX.top)} className={tick === 0 ? 'hemo-zero-line' : 'hemo-grid-line'} />
      <text x={BOX.left - 10} y={scale(tick, y, BOX.bottom, BOX.top)} textAnchor="end" dominantBaseline="middle">{number(tick, 2)}</text>
    </g>)}
    {x.ticks.map(tick => <g key={tick}>
      <line x1={scale(tick, x, BOX.left, BOX.right)} x2={scale(tick, x, BOX.left, BOX.right)} y1={BOX.bottom} y2={BOX.bottom + 4} />
      <text x={scale(tick, x, BOX.left, BOX.right)} y={BOX.bottom + 20} textAnchor="middle">{number(tick, 2)}</text>
    </g>)}
    <line x1={BOX.left} x2={BOX.left} y1={BOX.top} y2={BOX.bottom} />
    <line x1={BOX.left} x2={BOX.right} y1={BOX.bottom} y2={BOX.bottom} />
    <text x={(BOX.left + BOX.right) / 2} y={HEIGHT - 5} textAnchor="middle" className="hemo-axis-label">{xLabel}</text>
    <text x={BOX.left} y={14} className="hemo-axis-label">{yLabel}</text>
  </g>;
});

function keyboardSelect(event: KeyboardEvent<HTMLDivElement>, selectedIndex: number, count: number, onSelectIndex: (index: number) => void) {
  let next: number;
  if (event.key === 'ArrowRight' || event.key === 'ArrowUp') next = selectedIndex + 1;
  else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') next = selectedIndex - 1;
  else if (event.key === 'Home') next = 0;
  else if (event.key === 'End') next = count - 1;
  else if (event.key === 'PageUp') next = selectedIndex + Math.max(1, Math.round((count - 1) / 10));
  else if (event.key === 'PageDown') next = selectedIndex - Math.max(1, Math.round((count - 1) / 10));
  else return;
  event.preventDefault();
  onSelectIndex(Math.max(0, Math.min(count - 1, next)));
}

function pointerPosition(event: MouseEvent<SVGSVGElement>) {
  // Pointer inspection leaves the same control ready for keyboard fine adjustment.
  event.currentTarget.parentElement?.focus({ preventScroll: true });
  const point = event.currentTarget.createSVGPoint();
  point.x = event.clientX;
  point.y = event.clientY;
  const matrix = event.currentTarget.getScreenCTM();
  return matrix ? point.matrixTransform(matrix.inverse()) : null;
}

function nearestSample(samples: readonly ChartSample[], targetX: number, targetY: number | null, getX: (sample: ChartSample) => number, getY: (sample: ChartSample) => number) {
  let nearest = 0;
  let bestDistance = Infinity;
  samples.forEach((sample, index) => {
    const dx = targetX - getX(sample);
    const dy = targetY === null ? 0 : targetY - getY(sample);
    const distance = dx * dx + dy * dy;
    if (distance < bestDistance) { bestDistance = distance; nearest = index; }
  });
  return nearest;
}

export function HemodynamicCharts({ samples, selectedIndex, onSelectIndex }: HemodynamicChartsProps) {
  const { locale, t } = useI18n();
  const label = (text: string) => chartLabel(text, locale);
  const [signal, setSignal] = useState<Signal>('pressure');
  const id = useId();
  const currentIndex = Math.max(0, Math.min(samples.length - 1, selectedIndex));
  const sample = samples[currentIndex];
  const config = signals[signal];
  const ranges = useMemo(() => {
    const firstTime = samples[0]?.time ?? 0;
    const duration = (samples.at(-1)?.time ?? firstTime) - firstTime;
    return {
      volume: domain(samples.map(item => item.volumes.LV), false),
      pressure: domain(samples.map(item => item.pressures.LV), true),
      time: { min: 0, max: duration || 1, ticks: Array.from({ length: 5 }, (_, i) => (duration || 1) * i / 4) },
      signal: domain(samples.flatMap(item => config.series.map(series => series.value(item))), signal !== 'volume'),
      firstTime,
    };
  }, [samples, signal, config]);
  const geometry = useMemo(() => {
    const pvX = (item: ChartSample) => scale(item.volumes.LV, ranges.volume, BOX.left, BOX.right);
    const pvY = (item: ChartSample) => scale(item.pressures.LV, ranges.pressure, BOX.bottom, BOX.top);
    const timeX = (item: ChartSample) => scale(item.time - ranges.firstTime, ranges.time, BOX.left, BOX.right);
    return {
      pvX, pvY, timeX,
      pvPath: path(samples, pvX, pvY),
      seriesPaths: config.series.map(series => path(samples, timeX, item => scale(series.value(item), ranges.signal, BOX.bottom, BOX.top))),
    };
  }, [samples, ranges, config]);
  if (!sample) return <p className="hemo-empty" role="status">{t('Waiting for a computed cycle.', '계산된 주기를 기다리고 있습니다.')}</p>;
  const { pvX, pvY, timeX } = geometry;
  const timeText = `${number(sample.time - ranges.firstTime, 3)}${t(' s', '초')}`;
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => keyboardSelect(event, currentIndex, samples.length, onSelectIndex);

  return <div className="hemo-charts">
    <figure className="hemo-chart-card">
      <figcaption className="hemo-chart-heading"><div><span className="hemo-kicker">{t('PRESSURE–VOLUME', '압력–용적')}</span><h3>{t('Left ventricular pressure–volume loop', '좌심실 압력–용적 고리')}</h3></div><span className="hemo-chart-tag">LV</span></figcaption>
      <div className="hemo-plot-control" tabIndex={0} role="slider" aria-orientation="horizontal" aria-describedby={`${id}-pv-hint`} aria-label={t('Pressure–volume loop cycle position. Use arrow keys to move between samples.', '압력–용적 고리의 주기 시점. 방향키로 표본 이동')} aria-valuemin={0} aria-valuemax={samples.length - 1} aria-valuenow={currentIndex} aria-valuetext={`${timeText}, ${label('용적')} ${number(sample.volumes.LV, 1)} mL, ${label('압력')} ${number(sample.pressures.LV, 1)} mmHg`} onKeyDown={onKeyDown}>
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-labelledby={`${id}-pv-title ${id}-pv-desc`} onClick={event => {
          const point = pointerPosition(event);
          if (point) onSelectIndex(nearestSample(samples, point.x, point.y, pvX, pvY));
        }}>
          <title id={`${id}-pv-title`}>{t('Left ventricular pressure–volume loop', '좌심실 압력–용적 고리')}</title><desc id={`${id}-pv-desc`}>{t('Volume and pressure over one computed cycle. Click the curve or use arrow keys to select the same time in every view.', '계산된 한 주기의 용적과 압력. 선 위를 클릭하거나 방향키를 눌러 같은 시점의 모든 보기를 선택합니다.')}</desc>
          <Axis x={ranges.volume} y={ranges.pressure} xLabel={t('LV volume (mL)', '좌심실 용적 (mL)')} yLabel={t('Pressure (mmHg)', '압력 (mmHg)')} />
          <path d={geometry.pvPath} fill="none" stroke={RED} strokeWidth="2.4" strokeLinejoin="round" />
          <line x1={pvX(sample)} x2={pvX(sample)} y1={pvY(sample)} y2={BOX.bottom} className="hemo-crosshair" />
          <line x1={BOX.left} x2={pvX(sample)} y1={pvY(sample)} y2={pvY(sample)} className="hemo-crosshair" />
          <circle cx={pvX(sample)} cy={pvY(sample)} r="6" fill={RED} stroke="white" strokeWidth="2.5" />
        </svg>
      </div>
      <div className="hemo-readout"><span>{t('Selected time', '선택 시점')} <strong>{timeText}</strong></span><span>LV <strong>{number(sample.pressures.LV, 1)} <small>mmHg</small></strong></span><span><strong>{number(sample.volumes.LV, 1)} <small>mL</small></strong></span></div>
      <p id={`${id}-pv-hint`} className="hemo-chart-hint">{t('Click to inspect · Focus and use arrow keys · Axes adapt to the computed values', '점을 클릭해 탐색 · 초점 후 방향키로 이동 · 축 범위는 계산값에 맞춰 조정')}</p>
    </figure>
    <figure className="hemo-chart-card">
      <figcaption className="hemo-chart-heading"><div><span className="hemo-kicker">{t('ONE COMPUTED CYCLE', '계산된 한 주기')}</span><h3>{label(config.title)}</h3></div><div className="hemo-signal-options" role="group" aria-label={t('Time-series signal', '시계열 종류')}>{(Object.keys(signals) as Signal[]).map(key => <button key={key} type="button" aria-pressed={signal === key} onClick={() => setSignal(key)}>{label(signals[key].label)}</button>)}</div></figcaption>
      <div className="hemo-plot-control" tabIndex={0} role="slider" aria-orientation="horizontal" aria-describedby={`${id}-time-hint`} aria-label={t(`${label(config.title)} cycle position. Use arrow keys to move between samples.`, `${config.title}의 주기 시점. 방향키로 표본 이동`)} aria-valuemin={0} aria-valuemax={samples.length - 1} aria-valuenow={currentIndex} aria-valuetext={`${timeText}, ${config.series.map(series => `${label(series.name)} ${number(series.value(sample), 1)} ${config.unit}`).join(', ')}`} onKeyDown={onKeyDown}>
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-labelledby={`${id}-time-title ${id}-time-desc`} onClick={event => {
          const point = pointerPosition(event);
          if (point) onSelectIndex(nearestSample(samples, point.x, null, timeX, () => 0));
        }}>
          <title id={`${id}-time-title`}>{label(config.title)}</title><desc id={`${id}-time-desc`}>{t('Computed values against time since the start of the cycle. Each line connects recorded numerical samples.', '주기 시작 이후의 시간에 따른 계산값입니다. 각 선은 기록된 수치 표본을 연결합니다.')}</desc>
          <Axis x={ranges.time} y={ranges.signal} xLabel={t('Time in cycle (s)', '주기 내 시간 (s)')} yLabel={`${label(config.label)} (${config.unit})`} />
          <line x1={timeX(sample)} x2={timeX(sample)} y1={BOX.top} y2={BOX.bottom} className="hemo-crosshair" />
          {config.series.map((series, index) => <g key={series.name}>
            <path d={geometry.seriesPaths[index]} fill="none" stroke={series.color} strokeWidth="2.1" strokeDasharray={series.dash} strokeLinejoin="round" />
            <circle cx={timeX(sample)} cy={scale(series.value(sample), ranges.signal, BOX.bottom, BOX.top)} r="4.3" fill={series.color} stroke="white" strokeWidth="1.7" />
          </g>)}
        </svg>
      </div>
      <div className="hemo-legend">{config.series.map(series => <span key={series.name}><i style={{ borderColor: series.color, borderTopStyle: series.dash ? 'dashed' : 'solid' }} />{label(series.name)} <strong>{number(series.value(sample), 1)}</strong><small>{config.unit}</small></span>)}</div>
      <p id={`${id}-time-hint`} className="hemo-chart-hint">{signal === 'flow' ? t('Positive: flow in the labeled direction · Negative: reverse flow · All views share the same computed time.', '양수: 표시한 방향의 유량 · 음수: 역류 · 모든 보기는 같은 계산 시점에 연결됩니다.') : t('All curves and values come from the same model state. Click a chart to select a time.', '모든 선과 수치는 같은 모델 상태에서 계산됩니다. 그래프를 클릭해 시점을 선택하세요.')}</p>
    </figure>
  </div>;
}

type CircuitEdge = { key: Flow; from: Chamber; to: Chamber; label: string; valve: boolean; points: [number, number][]; labelX: number; labelY: number };
const circuitNodes: { key: Chamber; label: string; x: number; y: number; side: 'left' | 'right' }[] = [
  { key: 'PV', label: '폐정맥', x: 110, y: 68, side: 'left' },
  { key: 'LA', label: '좌심방', x: 340, y: 68, side: 'left' },
  { key: 'LV', label: '좌심실', x: 560, y: 68, side: 'left' },
  { key: 'SA', label: '체동맥', x: 790, y: 68, side: 'left' },
  { key: 'SV', label: '체정맥', x: 790, y: 185, side: 'right' },
  { key: 'RA', label: '우심방', x: 560, y: 185, side: 'right' },
  { key: 'RV', label: '우심실', x: 340, y: 185, side: 'right' },
  { key: 'PA', label: '폐동맥', x: 110, y: 185, side: 'right' },
];
const circuitEdges: CircuitEdge[] = [
  { key: 'pulmonaryVenous', from: 'PV', to: 'LA', label: '폐정맥 환류', valve: false, points: [[168, 68], [282, 68]], labelX: 225, labelY: 42 },
  { key: 'mitral', from: 'LA', to: 'LV', label: '승모판', valve: true, points: [[398, 68], [502, 68]], labelX: 450, labelY: 42 },
  { key: 'aortic', from: 'LV', to: 'SA', label: '대동맥판', valve: true, points: [[618, 68], [732, 68]], labelX: 675, labelY: 42 },
  { key: 'systemic', from: 'SA', to: 'SV', label: '체순환 저항', valve: false, points: [[848, 68], [926, 68], [926, 185], [848, 185]], labelX: 909, labelY: 119 },
  { key: 'systemicVenous', from: 'SV', to: 'RA', label: '체정맥 환류', valve: false, points: [[732, 185], [618, 185]], labelX: 675, labelY: 222 },
  { key: 'tricuspid', from: 'RA', to: 'RV', label: '삼첨판', valve: true, points: [[502, 185], [398, 185]], labelX: 450, labelY: 222 },
  { key: 'pulmonary', from: 'RV', to: 'PA', label: '폐동맥판', valve: true, points: [[282, 185], [168, 185]], labelX: 225, labelY: 222 },
  { key: 'pulmonaryBed', from: 'PA', to: 'PV', label: '폐순환 저항', valve: false, points: [[52, 185], [21, 185], [21, 68], [52, 68]], labelX: 74, labelY: 119 },
];

function valveState(edge: CircuitEdge, sample: ChartSample) {
  if (sample.flows[edge.key] < 0) return '역류';
  return sample.pressures[edge.from] > sample.pressures[edge.to] ? '열림' : '닫힘';
}

export function CirculationDiagram({ sample }: { sample?: ChartSample }) {
  const id = useId();
  const { locale, t } = useI18n();
  const label = (text: string) => chartLabel(text, locale);
  if (!sample) return null;
  return <figure className="hemo-circuit">
    <figcaption className="hemo-chart-heading"><div><span className="hemo-kicker">{t('CLOSED-LOOP MODEL', '폐쇄 순환 모델')}</span><h3>{t('Circulation at the selected time', '한 시점의 순환 회로')}</h3></div><span className="hemo-circuit-caption">{t('0D compartments · Schematic, not anatomical positions', '0D 계산 구획 · 해부학적 배치가 아닌 도식')}</span></figcaption>
    <div className="hemo-circuit-scroll" tabIndex={0} role="region" aria-label={t('Circulation diagram. Scroll horizontally on small screens.', '순환 회로 도식. 작은 화면에서 가로 스크롤 가능')}>
      <svg viewBox="0 0 980 258" role="img" aria-labelledby={`${id}-circuit-title ${id}-circuit-desc`}>
        <title id={`${id}-circuit-title`}>{t('Eight-compartment circulation with conserved blood volume', '혈액량을 보존하는 8구획 순환 회로')}</title>
        <desc id={`${id}-circuit-desc`}>{t('Connections between pulmonary veins, left atrium, left ventricle, systemic arteries, systemic veins, right atrium, right ventricle and pulmonary arteries. Values show pressure in mmHg and flow in mL/s. Arrows follow the computed flow direction.', '폐정맥, 좌심방, 좌심실, 체동맥, 체정맥, 우심방, 우심실, 폐동맥의 연결. 숫자는 압력 mmHg와 유량 mL/s입니다. 화살표는 계산된 실제 흐름 방향입니다.')} {circuitEdges.filter(edge => edge.valve).map(edge => `${label(edge.label)} ${label(valveState(edge, sample))}, ${label('유량')} ${number(sample.flows[edge.key], 1)} mL/s`).join('. ')}.</desc>
        <defs>{[['forward', TEAL], ['reverse', RED]].map(([key, color]) => <marker key={key} id={`${id}-${key}`} viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0 L8 4 L0 8 Z" fill={color} /></marker>)}</defs>
        {circuitEdges.map(edge => {
          const flow = sample.flows[edge.key];
          const reverse = flow < 0;
          const points = reverse ? [...edge.points].reverse() : edge.points;
          const active = Math.abs(flow) > 0;
          return <g key={edge.key}>
            <polyline points={points.map(point => point.join(',')).join(' ')} fill="none" stroke={active ? reverse ? RED : TEAL : '#bfc9c5'} strokeWidth={edge.valve ? 2.4 : 1.8} strokeDasharray={active ? undefined : '3 4'} markerEnd={active ? `url(#${id}-${reverse ? 'reverse' : 'forward'})` : undefined} strokeLinejoin="round" />
            <text x={edge.labelX} y={edge.labelY} textAnchor="middle" className="hemo-circuit-edge-label">{label(edge.label)}{edge.valve ? ` · ${label(valveState(edge, sample))}` : ''}</text>
            <text x={edge.labelX} y={edge.labelY + 16} textAnchor="middle" className={`hemo-circuit-flow${reverse ? ' is-reverse' : ''}`}>{number(flow, 1)} mL/s</text>
          </g>;
        })}
        {circuitNodes.map(node => <g key={node.key} className={`hemo-circuit-node hemo-circuit-${node.side}`}>
          <rect x={node.x - 55} y={node.y - 27} width="110" height="54" rx="10" />
          <text x={node.x} y={node.y - 5} textAnchor="middle" className="hemo-circuit-node-label">{label(node.label)} <tspan className="hemo-circuit-id">{node.key}</tspan></text>
          <text x={node.x} y={node.y + 14} textAnchor="middle" className="hemo-circuit-pressure">{number(sample.pressures[node.key], 1)} <tspan>mmHg</tspan></text>
        </g>)}
      </svg>
    </div>
    <p className="hemo-chart-hint">{t('Arrows: computed flow direction · Valves: pressure difference and flow · Negative flow: reverse flow · Colors distinguish circuits; oxygen saturation is not computed.', '화살표: 계산 유량의 방향 · 판막: 압력차·유량으로 결정 · 음수 유량: 역류 · 색은 회로 구분용이며 산소포화도를 계산하지 않습니다.')}</p>
  </figure>;
}
