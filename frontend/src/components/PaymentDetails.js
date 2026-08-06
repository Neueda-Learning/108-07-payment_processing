import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { paymentsApi } from '../services/api';

const STATUS_FLOW = ['CREATED', 'VALIDATED', 'SENT', 'COMPLETED'];
const AUTO_ADVANCE_STATUSES = ['CREATED', 'VALIDATED', 'SENT'];
const AUTO_ADVANCE_DELAY_MS = 3000;

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
  const [error, setError] = useState('');

  // Auto-advance state
  const [autoProcessing, setAutoProcessing] = useState(false);
  const [autoCountdown, setAutoCountdown] = useState(0);
  const [showFailureModal, setShowFailureModal] = useState(false);
  const [failureDetails, setFailureDetails] = useState(null);
  const autoTimerRef = useRef(null);
  const countdownRef = useRef(null);

  const loadPayment = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [paymentResponse, historyResponse] = await Promise.all([
        paymentsApi.getById(id),
        paymentsApi.getHistory(id),
      ]);
      setPayment(paymentResponse.data);
      setHistory(historyResponse.data);
    } catch (err) {
      setError(err.code === 'PAYMENT_NOT_FOUND' ? 'Payment not found.' : 'Failed to load payment details.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { loadPayment(); }, [loadPayment]);

  // Auto-advance through all 4 stages
  useEffect(() => {
    if (autoTimerRef.current) clearTimeout(autoTimerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);

    if (!payment || !AUTO_ADVANCE_STATUSES.includes(payment.status)) {
      setAutoProcessing(false);
      setAutoCountdown(0);
      return;
    }

    setAutoProcessing(true);
    let cd = Math.round(AUTO_ADVANCE_DELAY_MS / 1000);
    setAutoCountdown(cd);

    countdownRef.current = setInterval(() => {
      cd -= 1;
      setAutoCountdown(cd);
      if (cd <= 0) clearInterval(countdownRef.current);
    }, 1000);

    autoTimerRef.current = setTimeout(async () => {
      clearInterval(countdownRef.current);
      setAutoCountdown(0);
      const currentStatus = payment.status;
      try {
        await paymentsApi.advanceStatus(id);
        await loadPayment();
      } catch (err) {
        setAutoProcessing(false);
        const errorCode = err.code || 'PROCESSING_ERROR';
        const message = err.message || `Processing failed at stage: ${currentStatus}`;

        // Advancing only throws when a real business rule fails (e.g. insufficient
        // funds) — the payment itself is left in its current status, so it must be
        // explicitly marked FAILED to persist that outcome and record it on the
        // audit trail, mirroring what a real payment processor would do.
        try {
          await paymentsApi.failPayment(id, errorCode);
        } catch {
          // Best-effort: if this also fails (e.g. it had already finished), the
          // failure modal below still tells the user what went wrong.
        }
        await loadPayment();

        setFailureDetails({ stage: currentStatus, message, errorCode });
        setShowFailureModal(true);
      }
    }, AUTO_ADVANCE_DELAY_MS);

    return () => {
      clearTimeout(autoTimerRef.current);
      clearInterval(countdownRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payment?.status, id]);

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

  const createdEntry = history.find((h) => h.status === 'CREATED');
  const lastEntry = history.length ? history[history.length - 1] : null;
  const failureEntry = history.slice().reverse().find((h) => h.status === 'FAILED');

  function handleRetry() {
    navigate('/payments/new', {
      state: {
        retryPayload: {
          amount: String(payment.amount),
          currency: payment.currency,
          sourceAccount: payment.sourceAccount,
          destinationAccount: payment.destinationAccount,
          description: payment.description || '',
        },
      },
    });
  }

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
        {payment.status === 'FAILED' && (
          <button className="btn btn-primary" onClick={handleRetry}>
            🔁 Retry Payment
          </button>
        )}
      </div>

      {/* Auto-processing banner */}
      {autoProcessing && payment && AUTO_ADVANCE_STATUSES.includes(payment.status) && (
        <div className="auto-processing-banner">
          <div className="auto-processing-spinner" />
          <span>
            Auto-processing payment… advancing to{' '}
            <strong>{nextStatus(payment.status)}</strong>
            {autoCountdown > 0 ? ` in ${autoCountdown}s` : '…'}
          </span>
        </div>
      )}

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
            <span className="mono">{payment.sourceAccount || '—'}</span>
          </div>
          <div className="detail-item">
            <label>Destination Account</label>
            <span className="mono">{payment.destinationAccount || '—'}</span>
          </div>
          <div className="detail-item">
            <label>Description</label>
            <span>{payment.description || '—'}</span>
          </div>
          <div className="detail-item">
            <label>Created At</label>
            <span>{payment.createdAt ? new Date(payment.createdAt).toLocaleString() : (createdEntry?.timestamp ? new Date(createdEntry.timestamp).toLocaleString() : '—')}</span>
          </div>
          <div className="detail-item">
            <label>Last Updated</label>
            <span>{lastEntry?.timestamp ? new Date(lastEntry.timestamp).toLocaleString() : '—'}</span>
          </div>
        </div>

        {/* Error details */}
        {payment.status === 'FAILED' && failureEntry?.errorCode && (
          <div style={{ marginTop: '16px', padding: '14px', background: 'var(--danger-light)', borderRadius: '8px' }}>
            <div style={{ fontWeight: 700, color: 'var(--danger)', marginBottom: '6px', fontSize: '13px' }}>
              ⚠ Failure Details
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '4px' }}>
              <span style={{ fontSize: '12px', color: '#5f6368' }}>Error Code:</span>
              <span className="error-code">{failureEntry.errorCode}</span>
            </div>
            {ERROR_CODE_DESCRIPTIONS[failureEntry.errorCode] && (
              <div style={{ fontSize: '13px', color: '#5f6368' }}>
                {ERROR_CODE_DESCRIPTIONS[failureEntry.errorCode]}
              </div>
            )}
            {failureEntry.errorMessage && (
              <div style={{ fontSize: '13px', color: 'var(--danger)', marginTop: '6px' }}>
                {failureEntry.errorMessage}
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
                    {entry.oldStatus && (
                      <span style={{ fontSize: '12px', color: '#9aa0a6', marginLeft: '8px' }}>
                        ← from {entry.oldStatus}
                      </span>
                    )}
                  </div>
                  <div className="timeline-time">
                    {entry.timestamp ? new Date(entry.timestamp).toLocaleString() : '—'}
                  </div>
                  {(entry.reason || entry.errorCode) && (
                    <div className="timeline-note">
                      {entry.errorCode && (
                        <span className="error-code" style={{ marginRight: '6px' }}>
                          {entry.errorCode}
                        </span>
                      )}
                      {entry.reason || ''}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Failure popup modal */}
      {showFailureModal && failureDetails && (
        <div className="modal-overlay" onClick={() => setShowFailureModal(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-icon-fail">⚠️</div>
            <h3 className="modal-title">Payment Stage Failed</h3>
            <p className="modal-stage">
              Stage <strong>{failureDetails.stage}</strong> failed to complete
            </p>
            {failureDetails.errorCode && (
              <span className="error-code" style={{ display: 'inline-block', marginBottom: '8px' }}>
                {failureDetails.errorCode}
              </span>
            )}
            <p className="modal-message">{failureDetails.message}</p>
            <div className="modal-actions">
              <button className="btn btn-primary" onClick={() => setShowFailureModal(false)}>
                Dismiss
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => { setShowFailureModal(false); loadPayment(); }}
              >
                Refresh
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
