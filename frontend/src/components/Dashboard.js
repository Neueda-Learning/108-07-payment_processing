import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { accountsApi, paymentsApi } from '../services/api';
import { useAuth } from '../context/AuthContext';

function getPaymentTimestamp(payment) {
  return payment.updatedAt || payment.createdAt || null;
}

function buildBalanceTimeline(account, payments) {
  if (!account) return [];

  const completed = payments
    .filter((p) => p.status === 'COMPLETED')
    .filter((p) => p.sourceAccount === account.accountNumber || p.destinationAccount === account.accountNumber)
    .filter((p) => !!getPaymentTimestamp(p))
    .sort((a, b) => new Date(getPaymentTimestamp(a)) - new Date(getPaymentTimestamp(b)));

  if (completed.length === 0) {
    return [{
      timestamp: new Date().toISOString(),
      credit: 0,
      debit: 0,
      paymentId: null,
      amount: 0,
      direction: 'NONE',
    }];
  }

  let runningCredit = 0;
  let runningDebit = 0;
  const points = [];

  for (const p of completed) {
    const amount = Number(p.amount || 0);
    const isSource = p.sourceAccount === account.accountNumber;
    const isDestination = p.destinationAccount === account.accountNumber;

    if (isDestination) runningCredit += amount;
    if (isSource) runningDebit += amount;

    points.push({
      timestamp: getPaymentTimestamp(p),
      credit: runningCredit,
      debit: runningDebit,
      paymentId: p.id,
      amount,
      direction: isSource ? 'OUT' : 'IN',
    });
  }

  return points;
}

function BalanceChart({ points }) {
  const width = 760;
  const height = 270;
  const padLeft = 62;
  const padRight = 18;
  const padTop = 22;
  const padBottom = 46;
  const innerWidth = width - padLeft - padRight;
  const innerHeight = height - padTop - padBottom;

  const values = points.flatMap((p) => [p.credit, p.debit]);
  let minValue = Math.min(0, ...values);
  let maxValue = Math.max(...values);

  if (minValue === maxValue) {
    minValue -= 1;
    maxValue += 1;
  }

  const yAt = (value) => {
    const ratio = (value - minValue) / (maxValue - minValue);
    return padTop + (1 - ratio) * innerHeight;
  };

  const xAt = (idx) => {
    if (points.length <= 1) return padLeft + innerWidth / 2;
    return padLeft + (idx / (points.length - 1)) * innerWidth;
  };

  const creditPathD = points
    .map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${xAt(idx)} ${yAt(p.credit)}`)
    .join(' ');

  const debitPathD = points
    .map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${xAt(idx)} ${yAt(p.debit)}`)
    .join(' ');

  const yTicks = 4;
  const yValues = Array.from({ length: yTicks + 1 }, (_, i) => {
    const r = i / yTicks;
    return maxValue - r * (maxValue - minValue);
  });

  const xLabelIndexes = points.length <= 5
    ? points.map((_, idx) => idx)
    : [0, Math.floor((points.length - 1) * 0.25), Math.floor((points.length - 1) * 0.5), Math.floor((points.length - 1) * 0.75), points.length - 1];

  return (
    <div>
      <div className="balance-chart-legend">
        <span className="balance-legend-item">
          <span className="balance-legend-swatch balance-legend-credit" /> Credit
        </span>
        <span className="balance-legend-item">
          <span className="balance-legend-swatch balance-legend-debit" /> Debit
        </span>
      </div>
      <svg className="balance-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Credit and debit over time chart">
        <line x1={padLeft} y1={padTop} x2={padLeft} y2={padTop + innerHeight} className="balance-axis" />
        <line x1={padLeft} y1={padTop + innerHeight} x2={padLeft + innerWidth} y2={padTop + innerHeight} className="balance-axis" />

        {yValues.map((value) => (
          <g key={value}>
            <line
              x1={padLeft}
              y1={yAt(value)}
              x2={padLeft + innerWidth}
              y2={yAt(value)}
              className="balance-grid-line"
            />
            <text x={padLeft - 8} y={yAt(value) + 4} className="balance-tick-label balance-tick-left">
              {Number(value).toFixed(2)}
            </text>
          </g>
        ))}

        <path d={creditPathD} className="balance-line-credit" />
        <path d={debitPathD} className="balance-line-debit" />

        {points.map((point, idx) => (
          <g key={`credit-${point.timestamp}-${idx}`}>
            <circle cx={xAt(idx)} cy={yAt(point.credit)} r="3.5" className="balance-point-credit" />
            <title>
              {`${new Date(point.timestamp).toLocaleString()} | Credit: ${Number(point.credit).toFixed(2)}`}
            </title>
          </g>
        ))}

        {points.map((point, idx) => (
          <g key={`debit-${point.timestamp}-${idx}`}>
            <circle cx={xAt(idx)} cy={yAt(point.debit)} r="3.5" className="balance-point-debit" />
            <title>
              {`${new Date(point.timestamp).toLocaleString()} | Debit: ${Number(point.debit).toFixed(2)}`}
            </title>
          </g>
        ))}

        {xLabelIndexes.map((idx) => {
          const point = points[idx];
          return (
            <text key={`x-${idx}`} x={xAt(idx)} y={height - 16} className="balance-tick-label balance-tick-center">
              {new Date(point.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { username } = useAuth();
  const [payments, setPayments] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [paymentsResponse, accountsResponse] = await Promise.all([
        paymentsApi.getAll(),
        accountsApi.getAll(),
      ]);

      const sorted = paymentsResponse.data
        .slice()
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      const accountList = accountsResponse.data || [];

      setPayments(sorted);
      setAccounts(accountList);
      setSelectedAccount((prev) => {
        if (prev && accountList.some((a) => a.accountNumber === prev)) return prev;
        return accountList[0]?.accountNumber || '';
      });
      setRecent(sorted.slice(0, 8));
    } catch (err) {
      setError('Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const selectedAccountData = useMemo(
    () => accounts.find((a) => a.accountNumber === selectedAccount) || null,
    [accounts, selectedAccount]
  );

  const balanceTimeline = useMemo(
    () => buildBalanceTimeline(selectedAccountData, payments),
    [selectedAccountData, payments]
  );

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
      <div className="dashboard-greeting-card">
        <div className="dashboard-greeting-text">
          <h2>Greetings, {username || 'there'}</h2>
          <p>
            {new Date().toLocaleDateString(undefined, {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>
        <div className="dashboard-greeting-avatar" aria-label="Current user profile">
          <span aria-hidden="true">👤</span>
          <div className="dashboard-greeting-avatar-tooltip">{username || 'Unknown User'}</div>
        </div>
      </div>

      <div className="page-header">
        <div>
          <h1 className="dashboard-page-title">Dashboard</h1>
          <p>Overview of all payment activity</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <Link to="/payments/new" className="btn btn-primary btn-sm">+ New Payment</Link>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="dashboard-balance-layout">
          <div>
            <div className="dashboard-payment-activity-title" style={{ marginBottom: '4px' }}>
              Payment Activity
            </div>
            {selectedAccountData ? (
              <>
                <p className="dashboard-balance-amount">
                  Balance: <strong>{Number(selectedAccountData.balance || 0).toFixed(2)} {selectedAccountData.currency}</strong>
                </p>
                <BalanceChart points={balanceTimeline} />
              </>
            ) : (
              <div className="empty-state" style={{ padding: '40px 10px' }}>
                <h3>No bank accounts available</h3>
                <p>Add an account to view balance over time.</p>
              </div>
            )}
          </div>

          <div className="dashboard-account-list">
            <div className="dashboard-your-accounts-title" style={{ marginBottom: '12px' }}>
              Your Accounts
            </div>
            {accounts.length === 0 ? (
              <p style={{ color: '#5f6368', fontSize: '13px' }}>No accounts found.</p>
            ) : (
              accounts.map((account) => (
                <button
                  key={account.accountNumber}
                  type="button"
                  className={`dashboard-account-item ${selectedAccount === account.accountNumber ? 'active' : ''}`}
                  onClick={() => setSelectedAccount(account.accountNumber)}
                >
                  <div className="dashboard-account-title">{account.accountHolderName || 'Account Holder'}</div>
                  <div className="dashboard-account-subtitle mono">{account.accountNumber}</div>
                  <div className="dashboard-account-balance">
                    Available: <strong>{Number(account.balance || 0).toFixed(2)}</strong> {account.currency}
                  </div>
                </button>
              ))
            )}
          </div>
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
