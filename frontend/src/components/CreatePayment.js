import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { localCreatePayment } from '../services/localPayments';

const CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY'];

const INITIAL_FORM = {
  sourceAccount: '',
  destinationAccount: '',
  amount: '',
  currency: 'USD',
  reference: '',
  idempotencyKey: '',
};

function generateIdempotencyKey() {
  return `idem-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export default function CreatePayment() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    ...INITIAL_FORM,
    idempotencyKey: generateIdempotencyKey(),
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [loading] = useState(false);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setFieldErrors((prev) => ({ ...prev, [name]: '' }));
    setServerError('');
  }

  function validate() {
    const errors = {};

    if (!form.sourceAccount.trim())
      errors.sourceAccount = 'Source account is required.';

    if (!form.destinationAccount.trim())
      errors.destinationAccount = 'Destination account is required.';
    else if (form.destinationAccount.trim() === form.sourceAccount.trim())
      errors.destinationAccount = 'Source and destination accounts must differ.';

    const amt = parseFloat(form.amount);
    if (!form.amount) {
      errors.amount = 'Amount is required.';
    } else if (isNaN(amt) || amt <= 0) {
      errors.amount = 'Amount must be a positive number.';
    } else if (amt > 1_000_000) {
      errors.amount = 'Amount must not exceed 1,000,000.';
    } else if (!/^\d+(\.\d{1,2})?$/.test(form.amount)) {
      errors.amount = 'Amount must have at most 2 decimal places.';
    }

    if (!form.currency)
      errors.currency = 'Currency is required.';

    return errors;
  }

  function handleSubmit(e) {
    e.preventDefault();
    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setServerError('');
    try {
      const payload = {
        sourceAccount:      form.sourceAccount.trim(),
        destinationAccount: form.destinationAccount.trim(),
        amount:             parseFloat(form.amount),
        currency:           form.currency,
        reference:          form.reference.trim() || null,
        idempotencyKey:     form.idempotencyKey.trim(),
      };
      const payment = localCreatePayment(payload);
      navigate(`/payments/${payment.id}`);
    } catch (err) {
      setServerError(err.message || 'Failed to create payment. Please try again.');
    }
  }

  function handleReset() {
    setForm({ ...INITIAL_FORM, idempotencyKey: generateIdempotencyKey() });
    setFieldErrors({});
    setServerError('');
  }

  return (
    <div>
      <div className="breadcrumb">
        <Link to="/payments">Payments</Link>
        <span>›</span>
        <span>New Payment</span>
      </div>

      <div className="page-header">
        <div>
          <h1>Create Payment</h1>
          <p>Submit a new payment for processing</p>
        </div>
      </div>

      <div className="card" style={{ maxWidth: '800px' }}>
        {serverError && <div className="alert alert-error">{serverError}</div>}

        <form onSubmit={handleSubmit} noValidate>
          {/* Accounts */}
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="sourceAccount">Source Account *</label>
              <input
                id="sourceAccount"
                name="sourceAccount"
                type="text"
                className={`form-control ${fieldErrors.sourceAccount ? 'error' : ''}`}
                value={form.sourceAccount}
                onChange={handleChange}
                placeholder="e.g. ACC-001"
                disabled={loading}
              />
              {fieldErrors.sourceAccount && (
                <div className="form-error">{fieldErrors.sourceAccount}</div>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="destinationAccount">Destination Account *</label>
              <input
                id="destinationAccount"
                name="destinationAccount"
                type="text"
                className={`form-control ${fieldErrors.destinationAccount ? 'error' : ''}`}
                value={form.destinationAccount}
                onChange={handleChange}
                placeholder="e.g. ACC-002"
                disabled={loading}
              />
              {fieldErrors.destinationAccount && (
                <div className="form-error">{fieldErrors.destinationAccount}</div>
              )}
            </div>
          </div>

          {/* Amount & Currency */}
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="amount">Amount *</label>
              <input
                id="amount"
                name="amount"
                type="number"
                min="0.01"
                max="1000000"
                step="0.01"
                className={`form-control ${fieldErrors.amount ? 'error' : ''}`}
                value={form.amount}
                onChange={handleChange}
                placeholder="0.00"
                disabled={loading}
              />
              {fieldErrors.amount && (
                <div className="form-error">{fieldErrors.amount}</div>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="currency">Currency *</label>
              <select
                id="currency"
                name="currency"
                className={`form-control ${fieldErrors.currency ? 'error' : ''}`}
                value={form.currency}
                onChange={handleChange}
                disabled={loading}
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              {fieldErrors.currency && (
                <div className="form-error">{fieldErrors.currency}</div>
              )}
            </div>
          </div>

          {/* Reference */}
          <div className="form-group">
            <label htmlFor="reference">Reference / Description (optional)</label>
            <input
              id="reference"
              name="reference"
              type="text"
              className="form-control"
              value={form.reference}
              onChange={handleChange}
              placeholder="e.g. Invoice #12345"
              disabled={loading}
              maxLength={255}
            />
          </div>

          {/* Idempotency Key — auto-generated, last 4 digits visible */}
          <div className="form-group">
            <label>
              Idempotency Key
              <span style={{ fontWeight: 400, color: '#9aa0a6', marginLeft: '8px', fontSize: '11.5px' }}>
                Auto-generated · Prevents duplicate submissions
              </span>
            </label>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <div
                className="form-control"
                style={{ fontFamily: 'monospace', fontSize: '12.5px', background: '#f8f9fa', cursor: 'default', userSelect: 'none', letterSpacing: '1px', color: '#9aa0a6' }}
              >
                {'•'.repeat(Math.max(0, form.idempotencyKey.length - 4))}
                <span style={{ color: '#3c4043', fontWeight: 600 }}>{form.idempotencyKey.slice(-4)}</span>
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setForm((prev) => ({ ...prev, idempotencyKey: generateIdempotencyKey() }))}
                disabled={loading}
                title="Regenerate key"
              >
                ↺
              </button>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Submitting…' : '➕ Create Payment'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={handleReset} disabled={loading}>
              Clear
            </button>
            <Link to="/payments" className="btn btn-secondary" style={{ marginLeft: 'auto' }}>
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
