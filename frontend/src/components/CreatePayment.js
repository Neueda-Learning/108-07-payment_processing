import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { localCreatePayment } from '../services/localPayments';

const CURRENCIES = ['USD', 'EUR', 'INR'];

const INITIAL_FORM = {
  amount: '',
  currency: 'USD',
};

export default function CreatePayment() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ ...INITIAL_FORM });
  const [fieldErrors, setFieldErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setFieldErrors((prev) => ({ ...prev, [name]: '' }));
    setServerError('');
  }

  function validate() {
    const errors = {};

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

  async function handleSubmit(e) {
    e.preventDefault();
    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setServerError('');
    setLoading(true);
    try {
      const payload = {
        amount: parseFloat(form.amount),
        currency: form.currency,
      };
      const payment = await localCreatePayment(payload);
      navigate(`/payments/${payment.id}`);
    } catch (err) {
      setServerError(err.message || 'Failed to create payment. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setForm({ ...INITIAL_FORM });
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
