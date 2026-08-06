import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { accountsApi, paymentsApi } from '../services/api';

const STATUSES = ['ALL', 'COMPLETED', 'FAILED'];
const FLOWS = ['CREDITED', 'DEBITED'];

export default function PaymentList() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const initialStatus = searchParams.get('status') || 'ALL';
  const initialFlow = searchParams.get('flow') || '';
  const [activeStatus, setActiveStatus] = useState(
    STATUSES.includes(initialStatus) ? initialStatus : 'ALL'
  );
  const [activeFlow, setActiveFlow] = useState(FLOWS.includes(initialFlow) ? initialFlow : '');
  const [searchTerm, setSearchTerm] = useState('');
  const [payments, setPayments] = useState([]);
  const [myAccounts, setMyAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadPayments = useCallback(async (status) => {
    setLoading(true);
    setError('');
    try {
      const response = await paymentsApi.getAll(status !== 'ALL' ? status : undefined);
      const sorted = response.data
        .slice()
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setPayments(sorted);
    } catch (err) {
      setError('Failed to load payments.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPayments(activeStatus);
  }, [activeStatus, loadPayments]);

  useEffect(() => {
    let cancelled = false;
    accountsApi.getAll()
      .then((response) => {
        if (!cancelled) {
          setMyAccounts((response.data || []).map((a) => a.accountNumber));
        }
      })
      .catch(() => {
        if (!cancelled) setMyAccounts([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function handleStatusFilter(status) {
    setActiveStatus(status);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (status === 'ALL') next.delete('status');
      else next.set('status', status);
      return next;
    });
  }

  function handleFlowFilter(flow) {
    const nextFlow = activeFlow === flow ? '' : flow;
    setActiveFlow(nextFlow);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (!nextFlow) next.delete('flow');
      else next.set('flow', nextFlow);
      return next;
    });
  }

  const flowFiltered = useMemo(() => {
    if (!activeFlow) return payments;
    const accountSet = new Set(myAccounts);
    if (activeFlow === 'CREDITED') {
      return payments.filter((p) => p.destinationAccount && accountSet.has(p.destinationAccount));
    }
    return payments.filter((p) => p.sourceAccount && accountSet.has(p.sourceAccount));
  }, [activeFlow, myAccounts, payments]);

  const filtered = searchTerm.trim()
    ? flowFiltered.filter(
        (p) => p.id?.toLowerCase().includes(searchTerm.trim().toLowerCase())
      )
    : flowFiltered;

  const hasSearch = searchTerm.trim().length > 0;
  const statusLabel = activeStatus === 'ALL' ? 'all statuses' : activeStatus;
  const flowLabel = !activeFlow ? 'all movements' : activeFlow.toLowerCase();
  const resultCountText = hasSearch
    ? `${filtered.length} payment${filtered.length !== 1 ? 's' : ''} found with ID: ${searchTerm.trim()}`
    : `${filtered.length} payment${filtered.length !== 1 ? 's' : ''} found (${statusLabel}, ${flowLabel})`;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Payments</h1>
          <p>{resultCountText}</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <Link to="/payments/new" className="btn btn-primary btn-sm">+ New Payment</Link>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* Filters */}
      <div className="filters-row">
        {STATUSES.map((s) => (
          <button
            key={s}
            className={`filter-btn ${activeStatus === s ? 'active' : ''}`}
            onClick={() => handleStatusFilter(s)}
          >
            {s}
          </button>
        ))}
        {FLOWS.map((f) => (
          <button
            key={f}
            className={`filter-btn ${activeFlow === f ? 'active' : ''}`}
            onClick={() => handleFlowFilter(f)}
            title={f === 'CREDITED' ? 'Money credited to your account(s)' : f === 'DEBITED' ? 'Money debited from your account(s)' : 'All account movements'}
          >
            {f}
          </button>
        ))}
        <input
          type="text"
          className="form-control search-input"
          placeholder="Search by Payment ID"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          maxLength={36}
        />
      </div>

      <div className="card">
        {loading ? (
          <div className="loading-wrapper">
            <div className="spinner" />
            <span>Loading payments…</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📭</div>
            <h3>No payments found</h3>
            <p>
              {searchTerm
                ? 'No payments match your search.'
                : activeStatus !== 'ALL'
                ? `No payments with status ${activeStatus}.`
                : 'Create your first payment to get started.'}
            </p>
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
                  <th>Currency</th>
                  <th>Status</th>
                  <th>Created At</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id} onClick={() => navigate(`/payments/${p.id}`)}>
                    <td className="id-cell" title={p.id}>{p.id}</td>
                    <td className="mono" style={{ fontSize: '12px' }}>{p.sourceAccount || '—'}</td>
                    <td className="mono" style={{ fontSize: '12px' }}>{p.destinationAccount || '—'}</td>
                    <td>
                      <strong>{Number(p.amount).toFixed(2)}</strong>
                    </td>
                    <td>{p.currency}</td>
                    <td>
                      <span className={`badge badge-${p.status}`}>{p.status}</span>
                    </td>
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
