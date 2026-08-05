import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getBankAccounts } from '../services/localBankAccounts';
import { localCreatePayment } from '../services/localPayments';

const CURRENCIES = ['USD', 'EUR', 'INR'];

const INITIAL_FORM = {
  amount: '',
  currency: 'USD',
  sourceAccount: '',
  destinationAccount: '',
  description: '',
};

export default function CreatePayment() {
  const navigate = useNavigate();
  const { username } = useAuth();
  const [form, setForm] = useState({ ...INITIAL_FORM });
  const [fieldErrors, setFieldErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);

  const bankAccounts = useMemo(() => getBankAccounts(username), [username]);

  useEffect(() => {
    if (!form.sourceAccount && bankAccounts.length > 0) {
      setForm((prev) => ({ ...prev, sourceAccount: bankAccounts[0].accountNumber }));
    }
  }, [bankAccounts, form.sourceAccount]);

  function handleChange(e) {
    const { name, value } = e.target;
    // Destination account accepts digits only (no spaces), capped at 12 characters.
    const nextValue = name === 'destinationAccount'
      ? value.replace(/\D/g, '').slice(0, 12)
      : value;
    setForm((prev) => ({ ...prev, [name]: nextValue }));
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

    const accountPattern = /^\d{12}$/;

    if (!form.sourceAccount) {
      errors.sourceAccount = 'Source account is required.';
    } else if (!bankAccounts.some((a) => a.accountNumber === form.sourceAccount)) {
      errors.sourceAccount = 'Please select a valid registered source account.';
    }

    if (!form.destinationAccount) {
      errors.destinationAccount = 'Destination account is required.';
    } else if (/\s/.test(form.destinationAccount)) {
      errors.destinationAccount = 'Destination account must not contain spaces.';
    } else if (!accountPattern.test(form.destinationAccount)) {
      errors.destinationAccount = 'Destination account must be exactly 12 digits.';
    } else if (form.sourceAccount && form.destinationAccount === form.sourceAccount) {
      errors.destinationAccount = 'Destination account must be different from source account.';
    }

    if (form.description && form.description.length > 255) {
      errors.description = 'Description must not exceed 255 characters.';
    }

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
        sourceAccount: form.sourceAccount,
        destinationAccount: form.destinationAccount,
        description: form.description.trim(),
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
          {/* Source & Destination accounts */}
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="sourceAccount">Source Account *</label>
              <select
                id="sourceAccount"
                name="sourceAccount"
                className={`form-control ${fieldErrors.sourceAccount ? 'error' : ''}`}
                value={form.sourceAccount}
                onChange={handleChange}
                disabled={loading}
              >
                {bankAccounts.length === 0 ? (
                  <option value="">No registered accounts found</option>
                ) : (
                  bankAccounts.map((account) => (
                    <option key={account.accountNumber} value={account.accountNumber}>
                      {account.accountNumber} - {account.bankName} ({account.accountType})
                    </option>
                  ))
                )}
              </select>
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
                inputMode="numeric"
                maxLength={12}
                className={`form-control ${fieldErrors.destinationAccount ? 'error' : ''}`}
                value={form.destinationAccount}
                onChange={handleChange}
                placeholder="12-digit account number"
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

          {/* Description */}
          <div className="form-group">
            <label htmlFor="description">Description</label>
            <input
              id="description"
              name="description"
              type="text"
              maxLength={255}
              className={`form-control ${fieldErrors.description ? 'error' : ''}`}
              value={form.description}
              onChange={handleChange}
              placeholder="What is this payment for? (optional)"
              disabled={loading}
            />
            {fieldErrors.description && (
              <div className="form-error">{fieldErrors.description}</div>
            )}
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
