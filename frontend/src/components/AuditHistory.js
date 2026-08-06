import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { paymentsApi } from '../services/api';

const STATUSES = ['CREATED', 'VALIDATED', 'SENT', 'COMPLETED', 'FAILED'];

const STATUS_META = {
  CREATED: { icon: '🆕', color: '#3b82f6' },
  VALIDATED: { icon: '✅', color: '#a78bfa' },
  SENT: { icon: '📤', color: '#eab308' },
  COMPLETED: { icon: '🏁', color: '#22c55e' },
  FAILED: { icon: '⚠️', color: '#ef4444' },
};

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
  const pieBackground = pieTotal > 0 ? `conic-gradient(${gradientStops.join(', ')})` : '#6B7280';

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Audit History</h1>
          <p>Payment activity summary and status breakdown</p>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {stats && (
        <div className="payment-summary-row" style={{ marginBottom: '24px' }}>
          <div className="card payment-summary-total-card">
            <span className="payment-summary-total-icon" aria-hidden="true">💳</span>
            <div className="payment-summary-total-info">
              <div className="payment-summary-total-label">Total Payments</div>
              <div className="payment-summary-total-count">{stats.total ?? 0}</div>
              <div className="payment-summary-total-subtitle">All Time</div>
            </div>
          </div>

          <div className="card payment-summary-chart-card">
            <div className="pie-chart-wrapper">
              <div className="pie-chart" style={{ background: pieBackground }}>
                <div className="pie-chart-center">
                  <span className="pie-chart-total">{stats.total ?? 0}</span>
                  <span className="pie-chart-total-label">Total</span>
                </div>
              </div>
            </div>

            <div className="payment-summary-legend">
              <div className="payment-summary-legend-item">
                <span className="payment-summary-legend-swatch" style={{ background: 'var(--pie-completed)' }} />
                <span className="payment-summary-legend-label">Completed</span>
                <span className="payment-summary-legend-value">{stats.completed ?? 0}</span>
              </div>
              <div className="payment-summary-legend-item">
                <span className="payment-summary-legend-swatch" style={{ background: 'var(--pie-failed)' }} />
                <span className="payment-summary-legend-label">Failed</span>
                <span className="payment-summary-legend-value">{stats.failed ?? 0}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Status breakdown */}
      {stats && (
        <div className="card">
          <div className="section-title">Status Breakdown</div>
          <div className="audit-status-links">
            {STATUSES.map((s) => {
              const meta = STATUS_META[s];
              const card = (
                <div
                  className={`status-breakdown-card${s === 'COMPLETED' || s === 'FAILED' ? '' : ' status-breakdown-card-static'}`}
                  style={{ borderBottomColor: meta.color }}
                >
                  <span className="status-breakdown-icon" aria-hidden="true">{meta.icon}</span>
                  <div className="status-breakdown-info">
                    <div className="status-breakdown-name">{s}</div>
                    <div className="status-breakdown-count">{stats[s.toLowerCase()] ?? 0}</div>
                  </div>
                </div>
              );

              const isLinkable = s === 'COMPLETED' || s === 'FAILED';

              return isLinkable ? (
                <Link key={s} to={`/payments?status=${s}`} style={{ textDecoration: 'none' }}>
                  {card}
                </Link>
              ) : (
                <div key={s}>{card}</div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
