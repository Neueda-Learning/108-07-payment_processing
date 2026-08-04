import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { localGetAllPayments } from '../services/localPayments';

const STATUSES = ['ALL', 'COMPLETED', 'FAILED'];

export default function PaymentList() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const initialStatus = searchParams.get('status') || 'ALL';
  const [activeStatus, setActiveStatus] = useState(
    STATUSES.includes(initialStatus) ? initialStatus : 'ALL'
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadPayments = useCallback((status) => {
    setLoading(true);
    setError('');
    try {
      setPayments(localGetAllPayments(status !== 'ALL' ? status : undefined));
    } catch (err) {
      setError('Failed to load payments.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPayments(activeStatus);
  }, [activeStatus, loadPayments]);

  function handleStatusFilter(status) {
    setActiveStatus(status);
    setSearchTerm('');
    if (status === 'ALL') {
      setSearchParams({});
    } else {
      setSearchParams({ status });
    }
  }

  const filtered = searchTerm.trim()
    ? payments.filter(
        (p) => p.id?.toLowerCase().includes(searchTerm.trim().toLowerCase())
      )
    : payments;

  const hasSearch = searchTerm.trim().length > 0;
  const resultCountText = hasSearch
    ? `${filtered.length} payment${filtered.length !== 1 ? 's' : ''} found with this ID`
    : `${payments.length} payment${payments.length !== 1 ? 's' : ''} found`;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Payments</h1>
          <p>{resultCountText}</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary btn-sm" onClick={() => loadPayments(activeStatus)}>
            ↺ Refresh
          </button>
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
        <input
          type="text"
          className="form-control search-input"
          placeholder="Search by Payment ID"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          maxLength={12}
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
                  <th>Amount</th>
                  <th>Currency</th>
                  <th>Status</th>
                  <th>Source Account</th>
                  <th>Destination Account</th>
                  <th>Reference</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id} onClick={() => navigate(`/payments/${p.id}`)}>
                    <td className="id-cell" title={p.id}>{p.id}</td>
                    <td>
                      <strong>{Number(p.amount).toFixed(2)}</strong>
                    </td>
                    <td>{p.currency}</td>
                    <td>
                      <span className={`badge badge-${p.status}`}>{p.status}</span>
                    </td>
                    <td>{p.sourceAccount}</td>
                    <td>{p.destinationAccount}</td>
                    <td style={{ color: '#9aa0a6' }}>{p.reference || '—'}</td>
                    <td style={{ color: '#9aa0a6', fontSize: '12px', whiteSpace: 'nowrap' }}>
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
