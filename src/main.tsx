import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Chart } from './Chart';
import { BrandMark, Icon } from './icons';
import { csvFor, dateLabel, getStats, number, parseSnapshot, periodFromHash, periods, type Period, type Snapshot } from './data';
import './styles.css';

function App() {
  const [period, setPeriod] = useState<Period>(periodFromHash);
  const [data, setData] = useState<Snapshot | null>(null);
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);
  const [kind, setKind] = useState<'bars' | 'line'>('bars');
  const [page, setPage] = useState(0);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    setLoadState('loading');
    fetch(new URL('./data/jobs.json', document.baseURI), { signal: controller.signal })
      .then(response => { if (!response.ok) throw new Error('Could not load snapshot'); return response.json(); })
      .then(parseSnapshot)
      .then(snapshot => { setData(snapshot); setLoadState('ready'); })
      .catch(error => { if (error.name !== 'AbortError') setLoadState('error'); });
    return () => controller.abort();
  }, [attempt]);

  useEffect(() => {
    const sync = () => {
      if (/^#(7|30|90)d?$/.test(location.hash)) { setPeriod(periodFromHash()); setPage(0); }
    };
    addEventListener('hashchange', sync);
    return () => removeEventListener('hashchange', sync);
  }, []);

  const changePeriod = (next: Period) => {
    setPeriod(next);
    setPage(0);
    setNotice(`Showing the last ${next} days.`);
    history.replaceState(null, '', `#${next}d`);
  };
  const stats = data ? getStats(data, period) : null;
  const rows = stats ? [...stats.days].reverse() : [];
  const totalPages = Math.ceil(rows.length / 7);
  const exportCSV = () => {
    if (!stats || !data) return;
    const blob = new Blob([csvFor(stats.days, data.capturedAt)], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `imd-jobs-${period}d-${data.endDate}.csv`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice(`Downloaded ${period} days of job data as CSV.`);
  };

  return <>
    <a className="skip-link" href="#main">Skip to content</a>
    <header className="site-header">
      <div className="header-inner">
        <a className="brand" href="#30d" aria-label="IMD Stats home"><BrandMark /><span>imd<span className="brand-divider">/</span><span className="brand-product">stats</span></span></a>
        <nav className="main-nav" aria-label="Main navigation"><a className="nav-active" href="#main" aria-current="page">Overview</a><a href="#about-data">About the data</a></nav>
        <a className="explorer-link" href="https://explorer.imd.fun/" target="_blank" rel="noreferrer">Open explorer <Icon name="arrow" size={15} /></a>
      </div>
    </header>

    <main id="main" className="page-shell">
      <section className="page-intro" aria-labelledby="page-title">
        <div><h1 id="page-title">The network in numbers<span className="heading-dot">.</span></h1><p>Daily job activity across IMD.</p></div>
        <div className="snapshot-label"><span className="snapshot-dot" /><span>{data ? `Snapshot · ${dateLabel(data.endDate, { year: 'numeric' })}` : loadState === 'error' ? 'Snapshot unavailable' : 'Loading snapshot…'}</span></div>
      </section>

      <div className="dashboard-toolbar">
        <div className="range-controls" role="group" aria-label="Date range">{periods.map(value => <button key={value} type="button" aria-pressed={period === value} onClick={() => changePeriod(value)}>{value} days</button>)}</div>
        <div className="toolbar-right"><span className="date-range">{stats ? <><Icon name="calendar" size={16} />{dateLabel(stats.days[0].date)} <span className="range-dash">–</span> {dateLabel(data!.endDate, { year: 'numeric' })}</> : `Last ${period} days`}</span><button className="button button-export" type="button" onClick={exportCSV} disabled={loadState !== 'ready'}><Icon name="download" size={17} /><span>Export CSV</span></button></div>
      </div>

      {loadState === 'loading' && <section className="state-panel" aria-busy="true" aria-live="polite"><div className="loading-bars" aria-hidden="true"><i /><i /><i /><i /><i /></div><h2>Loading job activity</h2><p>Opening the bundled data snapshot.</p></section>}
      {loadState === 'error' && <section className="state-panel" role="alert"><Icon name="info" size={28} /><h2>Job data couldn’t load</h2><p>Check your connection, then try again.</p><button className="button button-primary" type="button" onClick={() => setAttempt(value => value + 1)}><Icon name="refresh" />Try again</button></section>}

      {loadState === 'ready' && data && stats && <>
        <section className="metrics" aria-label={`Summary for the last ${period} days`}>
          <div className="metric metric-total"><div className="metric-label">Total jobs <Icon name="bars" size={17} /></div><div className="metric-number" data-testid="total">{number.format(stats.total)}</div><div className="metric-detail">{stats.change !== null ? <><span className={`change-badge ${stats.change < 0 ? 'change-down' : ''}`}><span aria-hidden="true">{stats.change >= 0 ? '↗' : '↘'}</span> {Math.abs(stats.change).toLocaleString('en-US', { maximumFractionDigits: 1 })}%</span><span>vs. previous {period} days</span></> : <span>No jobs in the previous period</span>}</div></div>
          <div className="metric"><div className="metric-label">Daily average <Icon name="trend" size={17} /></div><div className="metric-number">{stats.average.toLocaleString('en-US', { maximumFractionDigits: 1 })}<span className="metric-unit">jobs</span></div><div className="metric-detail">Across {period} calendar days</div></div>
          <div className="metric"><div className="metric-label">Busiest day <Icon name="calendar" size={17} /></div><div className="metric-number">{number.format(stats.peak.jobs)}<span className="metric-unit">jobs</span></div><div className="metric-detail">{stats.peak.jobs ? dateLabel(stats.peak.date, { weekday: 'long' }) : 'No jobs in this period'}</div></div>
          <div className="metric"><div className="metric-label">Active days <Icon name="globe" size={17} /></div><div className="metric-number">{stats.active}<span className="metric-unit">/ {period}</span></div><div className="metric-detail">Days with at least one job</div></div>
        </section>

        <section className="chart-panel" aria-labelledby="activity-title">
          <div className="panel-heading"><div><h2 id="activity-title">Jobs per day</h2><p>A daily view of jobs entering the network.</p></div><div className="chart-kind" role="group" aria-label="Chart type"><button type="button" aria-label="Bar chart" aria-pressed={kind === 'bars'} onClick={() => setKind('bars')}><Icon name="bars" /></button><button type="button" aria-label="Line chart" aria-pressed={kind === 'line'} onClick={() => setKind('line')}><Icon name="line" /></button></div></div>
          {stats.total === 0 ? <div className="empty-chart"><Icon name="bars" size={28} /><h3>No jobs in this period</h3><p>Select another date range to explore more activity.</p></div> : <Chart key={`${period}-${kind}`} days={stats.days} kind={kind} endDate={data.endDate} />}
          <div className="chart-footer"><div className="chart-legend"><span><i className="legend-key" />Jobs created</span><span><i className="legend-key legend-partial" />Partial day</span></div><span>All dates in UTC</span></div>
        </section>

        <div className="lower-grid">
          <section className="daily-panel" aria-labelledby="breakdown-title">
            <div className="breakdown-heading"><h2 id="breakdown-title">Daily breakdown</h2><span>{period} days</span></div>
            <table><caption className="sr-only">Daily job counts for the selected {period} day period, newest first. The final day is partial.</caption><thead><tr><th scope="col">Date <span className="sort-arrow" aria-hidden="true">↓</span></th><th scope="col">Jobs created</th><th scope="col" className="activity-column">Daily activity</th></tr></thead><tbody>{rows.slice(page * 7, page * 7 + 7).map(day => <tr key={day.date}><th scope="row"><span>{dateLabel(day.date, { weekday: 'short' })}</span>{day.date === data.endDate && <span className="partial-label">Partial</span>}</th><td>{number.format(day.jobs)}</td><td className="activity-column"><div className="table-bar" aria-hidden="true"><i style={{ width: `${stats.peak.jobs ? day.jobs / stats.peak.jobs * 100 : 0}%` }} /></div></td></tr>)}</tbody></table>
            <div className="pagination"><span>{page * 7 + 1}–{Math.min((page + 1) * 7, period)} of {period} days</span><div><button type="button" className="page-button" aria-label="Previous page of daily counts" disabled={page === 0} onClick={() => setPage(value => value - 1)}><Icon name="chevron" className="chevron-back" size={16} /></button><span className="page-count">{page + 1} / {totalPages}</span><button type="button" className="page-button" aria-label="Next page of daily counts" disabled={page >= totalPages - 1} onClick={() => setPage(value => value + 1)}><Icon name="chevron" size={16} /></button></div></div>
          </section>

          <aside id="about-data" className="data-note" aria-labelledby="data-title">
            <div className="note-symbol"><Icon name="info" size={23} /></div><h2 id="data-title">Behind the numbers</h2><p>Each job is counted on its creation date. Date ranges end on the snapshot date shown above.</p>
            <dl><div><dt>What counts</dt><dd>Each unique job in the public API, across all statuses and job types.</dd></div><div><dt>Time zone</dt><dd>UTC, from midnight to midnight. The snapshot’s final day is partial.</dd></div><div><dt>Data captured</dt><dd>{dateLabel(data.endDate, { year: 'numeric' })} at {new Date(data.capturedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })} UTC. This is a saved snapshot.</dd></div></dl>
            <a href="https://api.imd.fun/jobs?limit=100" target="_blank" rel="noreferrer">View the public data source <Icon name="arrow" size={15} /></a>
          </aside>
        </div>
        <p className="data-footnote"><Icon name="info" size={15} />Totals include a partial final day. Comparisons use the preceding {period} calendar days, so the latest period is incomplete.</p>
      </>}
      <p className="sr-only" role="status">{notice}</p>
    </main>
    <footer className="site-footer"><div className="footer-inner"><a className="footer-brand" href="https://imd.fun/" target="_blank" rel="noreferrer"><BrandMark /><span>Built on IMD</span><Icon name="arrow" size={13} /></a><span>Open data. A clearer picture.</span><span className="footer-timezone"><Icon name="globe" size={14} /> Coordinated Universal Time</span></div></footer>
  </>;
}

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
