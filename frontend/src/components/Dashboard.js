import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { localGetAllPayments } from '../services/localPayments';
import { useAuth } from '../context/AuthContext';
import { getBankAccounts } from '../services/localBankAccounts';

function BalanceChart({ history }) {
  if (!history || history.length === 0) {
    return (
      <div className="empty-state" style={{ padding: '30px' }}>
        <p>No balance history available for this account.</p>
      </div>
    );
  }

  const width = 560;
  const height = 220;
  const padding = 28;
  const values = history.map((h) => h.balance);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const lastIndex = history.length - 1 || 1;

  const coords = history.map((h, i) => ({
    x: padding + (i / lastIndex) * (width - padding * 2),
    y: height - padding - ((h.balance - min) / range) * (height - padding * 2),
  }));

  const linePoints = coords.map((c) => `${c.x},${c.y}`).join(' ');
  const areaPoints = `${padding},${height - padding} ${linePoints} ${width - padding},${height - padding}`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="balance-chart-svg" preserveAspectRatio="none">
      <polygon points={areaPoints} className="balance-chart-area" />
      <polyline points={linePoints} className="balance-chart-line" />
      {coords.map((c, i) => (
        <circle key={i} cx={c.x} cy={c.y} r="3" className="balance-chart-dot" />
      ))}
    </svg>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { username } = useAuth();
  const [recent, setRecent] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const payments = await localGetAllPayments();
      setRecent(payments.slice(0, 8));
      setAccounts(getBankAccounts(username));
    } catch (err) {
      setError('Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  }, [username]);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) {
    return (
      <div className="loading-wrapper">
        <div className="spinner" />
        <span>Loading dashboard…</span>
      </div>
    );
  }

  const selectedAccount = accounts[selectedIndex] || null;

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

      {/* Account balance overview */}
      <div className="dashboard-accounts-grid">
        <div className="card">
          <div className="section-title">
            {selectedAccount ? `Balance — ${selectedAccount.accountNumber}` : 'Account Balance'}
          </div>
          {selectedAccount && (
            <div className="balance-chart-current">
              {selectedAccount.currentBalance?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? '—'}
            </div>
          )}
          <BalanceChart history={selectedAccount?.balanceHistory} />
          {selectedAccount?.balanceHistory?.length > 0 && (
            <div className="balance-chart-range">
              <span>{selectedAccount.balanceHistory[0].date}</span>
              <span>{selectedAccount.balanceHistory[selectedAccount.balanceHistory.length - 1].date}</span>
            </div>
          )}
        </div>

        <div className="card">
          <div className="section-title">Your Accounts</div>
          {accounts.length === 0 ? (
            <div className="empty-state" style={{ padding: '30px' }}>
              <p>No bank accounts added yet.</p>
            </div>
          ) : (
            <div className="account-list">
              {accounts.map((a, idx) => (
                <div
                  key={a.accountNumber + idx}
                  className={`account-list-item ${idx === selectedIndex ? 'active' : ''}`}
                  onClick={() => setSelectedIndex(idx)}
                >
                  <div className="account-number">{a.accountNumber}</div>
                  <div className="account-holder">{a.accountHolderName}</div>
                  <span className="account-type-badge">{a.accountType}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

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
                  <th>Source Account</th>
                  <th>Destination Account</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Created At</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((p) => (
                  <tr key={p.id} onClick={() => navigate(`/payments/${p.id}`)}>
                    <td className="id-cell">{p.id}</td>
                    <td className="mono" style={{ fontSize: '12px' }}>{p.sourceAccount || '—'}</td>
                    <td className="mono" style={{ fontSize: '12px' }}>{p.destinationAccount || '—'}</td>
                    <td>
                      <strong>{Number(p.amount).toFixed(2)}</strong>{' '}
                      <span style={{ color: '#9aa0a6', fontSize: '12px' }}>{p.currency}</span>
                    </td>
                    <td><span className={`badge badge-${p.status}`}>{p.status}</span></td>
                    <td style={{ fontSize: '12px', color: '#5f6368' }}>
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
