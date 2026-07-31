import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { localGetAllPayments, localGetStats } from '../services/localPayments';

const STATUSES = ['CREATED', 'VALIDATED', 'SENT', 'COMPLETED', 'FAILED'];

function StatCard({ label, value, className }) {
  return (
    <div className={`stat-card ${className}`}>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value ?? '—'}</div>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = useCallback(() => {
    setLoading(true);
    setError('');
    try {
      const payments = localGetAllPayments();
      setRecent(payments.slice(0, 8));
      setStats(localGetStats());
    } catch (err) {
      setError('Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) {
    return (
      <div className="loading-wrapper">
        <div className="spinner" />
        <span>Loading dashboard…</span>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p>Overview of all payment activity</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary btn-sm" onClick={loadData}>↺ Refresh</button>
          <Link to="/payments/new" className="btn btn-primary btn-sm">+ New Payment</Link>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* Stats */}
      {stats && (
        <div className="stats-grid">
          <StatCard label="Total Payments"  value={stats.total}     className="stat-total" />
          <StatCard label="Completed"       value={stats.completed} className="stat-completed" />
          <StatCard label="Failed"          value={stats.failed}    className="stat-failed" />
          <StatCard label="In Progress"     value={(stats.created || 0) + (stats.validated || 0) + (stats.sent || 0)} className="stat-pending" />
        </div>
      )}

      {/* Status breakdown */}
      {stats && (
        <div className="card" style={{ marginBottom: '24px' }}>
          <div className="section-title">Status Breakdown</div>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
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

      {/* Recent payments */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div className="section-title" style={{ marginBottom: 0, borderBottom: 'none', paddingBottom: 0 }}>Recent Payments</div>
          <Link to="/payments" className="btn btn-secondary btn-sm">View All</Link>
        </div>

        {recent.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">💳</div>
            <h3>No payments yet</h3>
            <p>Create your first payment to get started.</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Payment ID</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Source Account</th>
                  <th>Destination</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((p) => (
                  <tr key={p.id} onClick={() => navigate(`/payments/${p.id}`)}>
                    <td className="id-cell">{p.id}</td>
                    <td>
                      <strong>{Number(p.amount).toFixed(2)}</strong>{' '}
                      <span style={{ color: '#9aa0a6', fontSize: '12px' }}>{p.currency}</span>
                    </td>
                    <td><span className={`badge badge-${p.status}`}>{p.status}</span></td>
                    <td>{p.sourceAccount}</td>
                    <td>{p.destinationAccount}</td>
                    <td style={{ color: '#9aa0a6', fontSize: '12px' }}>
                      {p.createdAt ? new Date(p.createdAt).toLocaleString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
