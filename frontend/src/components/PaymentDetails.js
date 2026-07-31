import React, { useEffect, useState, useCallback } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { localGetPaymentById, localGetPaymentHistory, localAdvanceStatus, localFailPayment } from '../services/localPayments';

const STATUS_FLOW = ['CREATED', 'VALIDATED', 'SENT', 'COMPLETED'];

const ERROR_CODE_DESCRIPTIONS = {
  VALIDATION_FAILED:          'Payment failed validation checks',
  INSUFFICIENT_FUNDS:         'Source account has insufficient funds',
  INVALID_ACCOUNT:            'Account number is invalid or does not exist',
  INVALID_CURRENCY:           'Currency code is not supported',
  INVALID_AMOUNT:             'Amount is zero, negative, or invalid',
  DUPLICATE_PAYMENT:          'Payment with same idempotency key exists',
  INVALID_STATUS_TRANSITION:  'Cannot transition from current status to requested status',
  PAYMENT_NOT_FOUND:          'Payment ID does not exist',
  PROCESSING_ERROR:           'Internal error during payment processing',
  NETWORK_ERROR:              'Communication failure with payment network',
};

function nextStatus(current) {
  const idx = STATUS_FLOW.indexOf(current);
  if (idx === -1 || idx === STATUS_FLOW.length - 1) return null;
  return STATUS_FLOW[idx + 1];
}

export default function PaymentDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [payment, setPayment] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const loadPayment = useCallback(() => {
    setLoading(true);
    setError('');
    try {
      setPayment(localGetPaymentById(id));
      setHistory(localGetPaymentHistory(id));
    } catch (err) {
      setError(err.code === 'PAYMENT_NOT_FOUND' ? 'Payment not found.' : 'Failed to load payment details.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { loadPayment(); }, [loadPayment]);

  function handleAdvance() {
    setActionError('');
    setSuccessMsg('');
    setActionLoading(true);
    try {
      localAdvanceStatus(id);
      setSuccessMsg('Payment status advanced successfully.');
      loadPayment();
    } catch (err) {
      setActionError(err.message || 'Failed to advance payment status.');
    } finally {
      setActionLoading(false);
    }
  }

  function handleFail() {
    setActionError('');
    setSuccessMsg('');
    const errorCode = window.prompt(
      'Enter error code for failure (e.g. PROCESSING_ERROR, NETWORK_ERROR):',
      'PROCESSING_ERROR'
    );
    if (!errorCode) return;
    setActionLoading(true);
    try {
      localFailPayment(id, errorCode.trim().toUpperCase());
      setSuccessMsg('Payment marked as FAILED.');
      loadPayment();
    } catch (err) {
      setActionError(err.message || 'Failed to mark payment as failed.');
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="loading-wrapper">
        <div className="spinner" />
        <span>Loading payment…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <div className="breadcrumb">
          <Link to="/payments">Payments</Link>
          <span>›</span>
          <span>Details</span>
        </div>
        <div className="alert alert-error">{error}</div>
        <button className="btn btn-secondary" onClick={() => navigate('/payments')}>
          ← Back to Payments
        </button>
      </div>
    );
  }

  if (!payment) return null;

  const next = nextStatus(payment.status);
  const canAdvance = next !== null && payment.status !== 'FAILED';
  const canFail = payment.status !== 'COMPLETED' && payment.status !== 'FAILED';

  return (
    <div>
      {/* Breadcrumb */}
      <div className="breadcrumb">
        <Link to="/payments">Payments</Link>
        <span>›</span>
        <span style={{ fontFamily: 'monospace', fontSize: '12px' }}>{payment.id}</span>
      </div>

      {/* Header */}
      <div className="page-header">
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            Payment Details
            <span className={`badge badge-${payment.status}`}>{payment.status}</span>
          </h1>
          <p style={{ fontFamily: 'monospace', fontSize: '12px', color: '#9aa0a6' }}>{payment.id}</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary btn-sm" onClick={loadPayment}>
            ↺ Refresh
          </button>
          {canAdvance && (
            <button
              className="btn btn-primary btn-sm"
              onClick={handleAdvance}
              disabled={actionLoading}
            >
              {actionLoading ? 'Processing…' : `→ Advance to ${next}`}
            </button>
          )}
          {canFail && (
            <button
              className="btn btn-danger btn-sm"
              onClick={handleFail}
              disabled={actionLoading}
            >
              ✕ Mark as Failed
            </button>
          )}
        </div>
      </div>

      {actionError  && <div className="alert alert-error">{actionError}</div>}
      {successMsg   && <div className="alert alert-success">{successMsg}</div>}

      {/* Payment info card */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div className="section-title">Payment Information</div>
        <div className="detail-grid">
          <div className="detail-item">
            <label>Payment ID</label>
            <span className="mono">{payment.id}</span>
          </div>
          <div className="detail-item">
            <label>Status</label>
            <span className={`badge badge-${payment.status}`}>{payment.status}</span>
          </div>
          <div className="detail-item">
            <label>Amount</label>
            <span className="amount-display">
              {Number(payment.amount).toFixed(2)}{' '}
              <span style={{ fontSize: '16px', color: '#9aa0a6' }}>{payment.currency}</span>
            </span>
          </div>
          <div className="detail-item">
            <label>Currency</label>
            <span>{payment.currency}</span>
          </div>
          <div className="detail-item">
            <label>Source Account</label>
            <span>{payment.sourceAccount}</span>
          </div>
          <div className="detail-item">
            <label>Destination Account</label>
            <span>{payment.destinationAccount}</span>
          </div>
          <div className="detail-item">
            <label>Reference</label>
            <span>{payment.reference || '—'}</span>
          </div>
          <div className="detail-item">
            <label>Idempotency Key</label>
            <span className="mono">{payment.idempotencyKey || '—'}</span>
          </div>
          <div className="detail-item">
            <label>Created At</label>
            <span>{payment.createdAt ? new Date(payment.createdAt).toLocaleString() : '—'}</span>
          </div>
          <div className="detail-item">
            <label>Updated At</label>
            <span>{payment.updatedAt ? new Date(payment.updatedAt).toLocaleString() : '—'}</span>
          </div>
        </div>

        {/* Error details */}
        {payment.status === 'FAILED' && payment.errorCode && (
          <div style={{ marginTop: '16px', padding: '14px', background: 'var(--danger-light)', borderRadius: '8px' }}>
            <div style={{ fontWeight: 700, color: 'var(--danger)', marginBottom: '6px', fontSize: '13px' }}>
              ⚠ Failure Details
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '4px' }}>
              <span style={{ fontSize: '12px', color: '#5f6368' }}>Error Code:</span>
              <span className="error-code">{payment.errorCode}</span>
            </div>
            {ERROR_CODE_DESCRIPTIONS[payment.errorCode] && (
              <div style={{ fontSize: '13px', color: '#5f6368' }}>
                {ERROR_CODE_DESCRIPTIONS[payment.errorCode]}
              </div>
            )}
            {payment.errorMessage && (
              <div style={{ fontSize: '13px', color: 'var(--danger)', marginTop: '6px' }}>
                {payment.errorMessage}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Status History */}
      <div className="card">
        <div className="section-title">Status History</div>
        {history.length === 0 ? (
          <div className="empty-state" style={{ padding: '30px' }}>
            <p>No status history available.</p>
          </div>
        ) : (
          <div className="timeline">
            {history.map((entry, idx) => (
              <div className="timeline-item" key={idx}>
                <div className={`timeline-dot dot-${entry.status}`} />
                <div className="timeline-content">
                  <div className="timeline-status">
                    <span className={`badge badge-${entry.status}`}>{entry.status}</span>
                    {entry.fromStatus && (
                      <span style={{ fontSize: '12px', color: '#9aa0a6', marginLeft: '8px' }}>
                        ← from {entry.fromStatus}
                      </span>
                    )}
                  </div>
                  <div className="timeline-time">
                    {entry.timestamp
                      ? new Date(entry.timestamp).toLocaleString()
                      : entry.changedAt
                      ? new Date(entry.changedAt).toLocaleString()
                      : '—'}
                  </div>
                  {(entry.note || entry.reason || entry.errorCode) && (
                    <div className="timeline-note">
                      {entry.errorCode && (
                        <span className="error-code" style={{ marginRight: '6px' }}>
                          {entry.errorCode}
                        </span>
                      )}
                      {entry.note || entry.reason || ''}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
