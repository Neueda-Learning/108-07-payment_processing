import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { paymentsApi } from '../services/api';

const STATUSES = ['CREATED', 'VALIDATED', 'SENT', 'COMPLETED', 'FAILED'];

function StatCard({ label, value, className }) {
  return (
    <div className={`stat-card ${className}`}>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value ?? '—'}</div>
    </div>
  );
}

export default function AuditHistory() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadStats = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await paymentsApi.getStats();
      setStats(response.data);
    } catch (err) {
      setError('Failed to load audit history.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadStats(); }, [loadStats]);

  if (loading) {
    return (
      <div className="loading-wrapper">
        <div className="spinner" />
        <span>Loading audit history…</span>
      </div>
    );
  }

  const segments = [
    { key: 'total', label: 'Total Payments', value: stats?.total ?? 0, className: 'stat-total' },
    { key: 'completed', label: 'Completed', value: stats?.completed ?? 0, className: 'stat-completed' },
    { key: 'failed', label: 'Failed', value: stats?.failed ?? 0, className: 'stat-failed' },
  ];

  const pieSegments = [
    { key: 'completed', value: stats?.completed ?? 0 },
    { key: 'failed', value: stats?.failed ?? 0 },
  ];
  const pieTotal = pieSegments.reduce((sum, s) => sum + s.value, 0);
  let cumulative = 0;
  const gradientStops = pieSegments.map((s) => {
    const pct = pieTotal > 0 ? (s.value / pieTotal) * 100 : 0;
    const start = cumulative;
    const end = cumulative + pct;
    cumulative = end;
    return `var(--pie-${s.key}) ${start}% ${end}%`;
  });
  const pieBackground = pieTotal > 0 ? `conic-gradient(${gradientStops.join(', ')})` : '#e8eaed';

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Audit History</h1>
          <p>Payment activity summary and status breakdown</p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={loadStats}>↺ Refresh</button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {stats && (
        <div className="card" style={{ marginBottom: '24px' }}>
          <div className="section-title">Payment Summary</div>
          <div className="audit-summary-grid">
            <div className="pie-chart-wrapper">
              <div className="pie-chart" style={{ background: pieBackground }}>
                <div className="pie-chart-center">
                  <span className="pie-chart-total">{stats.total ?? 0}</span>
                  <span className="pie-chart-total-label">Total</span>
                </div>
              </div>
            </div>

            <div className="audit-stats-vertical">
              {segments.map((s) => (
                <StatCard key={s.key} label={s.label} value={s.value} className={s.className} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Status breakdown */}
      {stats && (
        <div className="card">
          <div className="section-title">Status Breakdown</div>
          <div className="audit-status-links">
            {STATUSES.map((s) => (
              <Link
                key={s}
                to={`/payments?status=${s}`}
                style={{ textDecoration: 'none' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 14px', borderRadius: '8px', border: '1px solid #e8eaed', background: '#fff' }}>
                  <span className={`badge badge-${s}`}>{s}</span>
                  <span style={{ fontWeight: 700, color: '#202124' }}>{stats[s.toLowerCase()] ?? 0}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
