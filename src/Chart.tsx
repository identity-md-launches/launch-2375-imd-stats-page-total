import { useState, type KeyboardEvent, type PointerEvent } from 'react';
import { dateLabel, number, type Day } from './data';

export function Chart({ days, kind, endDate }: { days: Day[]; kind: 'bars' | 'line'; endDate: string }) {
  const [selected, setSelected] = useState<number | null>(null);
  const width = 1000;
  const height = 280;
  const max = Math.max(...days.map(day => day.jobs), 1);
  const step = max > 1000 ? 500 : max > 500 ? 200 : max > 200 ? 100 : max > 100 ? 50 : max > 20 ? 10 : 5;
  const ceiling = Math.ceil(max / step) * step;
  const segment = width / days.length;
  const x = (index: number) => segment * (index + 0.5);
  const y = (jobs: number) => height - (jobs / ceiling) * height;
  const points = days.slice(0, -1).map((day, index) => `${x(index)},${y(day.jobs)}`).join(' ');
  const partialPoints = days.slice(-2).map((day, index) => `${x(days.length - 2 + index)},${y(day.jobs)}`).join(' ');
  const area = `M${x(0)},${height} L${days.map((day, index) => `${x(index)},${y(day.jobs)}`).join(' L')} L${x(days.length - 1)},${height} Z`;
  const active = selected === null ? null : days[Math.min(selected, days.length - 1)];
  const tickIndices = [...new Set([0, Math.round((days.length - 1) / 3), Math.round((days.length - 1) * 2 / 3), days.length - 1])];

  const movePointer = (event: PointerEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    setSelected(Math.min(days.length - 1, Math.max(0, Math.floor((event.clientX - bounds.left) / bounds.width * days.length))));
  };
  const keyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End', 'Escape'].includes(event.key)) return;
    event.preventDefault();
    if (event.key === 'Escape') setSelected(null);
    else if (event.key === 'Home') setSelected(0);
    else if (event.key === 'End') setSelected(days.length - 1);
    else setSelected(index => Math.min(days.length - 1, Math.max(0, (index ?? days.length - 1) + (event.key === 'ArrowLeft' ? -1 : 1))));
  };

  return <div className="chart" dir="ltr">
    <div className="chart-axis" aria-hidden="true">{[1, 0.75, 0.5, 0.25, 0].map(fraction => <span key={fraction}>{number.format(ceiling * fraction)}</span>)}</div>
    <div className="chart-main">
      <div className="chart-plot" tabIndex={0} role="group" aria-label="Daily jobs chart. Use left and right arrow keys to inspect each day, Home for the first day, End for the last day."
        onPointerMove={movePointer} onPointerDown={movePointer} onPointerLeave={() => setSelected(null)}
        onFocus={() => setSelected(days.length - 1)} onBlur={() => setSelected(null)} onKeyDown={keyDown}>
        <svg className="chart-svg" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" role="img" aria-labelledby="chart-title chart-description">
          <title id="chart-title">Jobs created per day</title>
          <desc id="chart-description">{days.length} UTC days from {dateLabel(days[0].date)} to {dateLabel(endDate)}. The highest daily count is {number.format(max)}. A complete daily table follows this chart.</desc>
          <defs><linearGradient id="area-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--color-data)" stopOpacity="0.25" /><stop offset="100%" stopColor="var(--color-data)" stopOpacity="0.025" /></linearGradient><pattern id="partial-hatch" patternUnits="userSpaceOnUse" width="6" height="6"><rect width="6" height="6" fill="var(--color-data-partial)" /><path d="M-1 1 1-1M0 6 6 0M5 7 7 5" stroke="var(--color-accent)" strokeOpacity=".4" strokeWidth="1" /></pattern></defs>
          {[0, 0.25, 0.5, 0.75, 1].map(fraction => <line key={fraction} x1="0" x2={width} y1={height * fraction} y2={height * fraction} className="grid-line" vectorEffect="non-scaling-stroke" />)}
          {kind === 'bars' ? days.map((day, index) => <rect key={day.date} x={segment * index + segment * 0.19} y={y(day.jobs)} width={segment * 0.62} height={height - y(day.jobs)} rx={days.length > 30 ? 1.5 : 3} className={`data-bar ${day.date === endDate ? 'partial-bar' : ''} ${index === selected ? 'selected-bar' : ''}`} />)
            : <><path d={area} fill="url(#area-fill)" /><polyline points={points} fill="none" className="data-line" vectorEffect="non-scaling-stroke" /><polyline points={partialPoints} fill="none" className="data-line partial-line" vectorEffect="non-scaling-stroke" /></>}
          {selected !== null && active && <><line x1={x(selected)} x2={x(selected)} y1="0" y2={height} className="cursor-line" vectorEffect="non-scaling-stroke" /><circle cx={x(selected)} cy={y(active.jobs)} r="5" className="chart-dot" vectorEffect="non-scaling-stroke" /></>}
        </svg>
        {active && selected !== null && <div className="chart-tooltip" style={{ insetInlineStart: `clamp(0px, calc(${((selected + 0.5) / days.length) * 100}% - 66px), calc(100% - 132px))` }}><span>{dateLabel(active.date, { weekday: 'short' })}</span><strong>{number.format(active.jobs)} <span>jobs</span></strong>{active.date === endDate && <small>Partial day</small>}</div>}
      </div>
      <div className="chart-dates" aria-hidden="true">{tickIndices.map(index => <span key={index}>{dateLabel(days[index].date)}</span>)}</div>
    </div>
    <p className="sr-only" role="status">{active ? `${dateLabel(active.date, { year: 'numeric' })}: ${number.format(active.jobs)} jobs${active.date === endDate ? ', partial day' : ''}` : ''}</p>
  </div>;
}
