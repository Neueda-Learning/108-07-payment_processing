import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { accountsApi, paymentsApi } from '../services/api';

const CURRENCIES = ['USD', 'EUR', 'INR'];

const INITIAL_FORM = {
  amount: '',
  currency: 'USD',
  sourceAccount: '',
  destinationAccountName: '',
  destinationAccount: '',
  description: '',
};

/**
 * A fresh key per mount/attempt. Retrying a payment (see the "Retry Payment" button
 * on a FAILED payment's details page) lands back on this component, remounting it
 * and thus generating a brand-new key — so the retry is a genuinely new payment
 * attempt, not a resend of the failed one. The backend's uk_payments_idempotency_key
 * constraint means a COMPLETED payment's key can never be reused to create a second
 * payment, even if this were somehow bypassed client-side.
 */
function generateIdempotencyKey() {
  return crypto.randomUUID();
}

export default function CreatePayment() {
  const navigate = useNavigate();
  const location = useLocation();
  const retryPayload = location.state?.retryPayload;

  const [form, setForm] = useState(() => ({ ...INITIAL_FORM, ...retryPayload }));
  const [fieldErrors, setFieldErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [accountsLoading, setAccountsLoading] = useState(true);
  const [idempotencyKey, setIdempotencyKey] = useState(generateIdempotencyKey);

  useEffect(() => {
    let cancelled = false;
    accountsApi.getAll()
      .then((response) => {
        if (cancelled) return;
        setBankAccounts(response.data);
        if (response.data.length > 0) {
          setForm((prev) => ({ ...prev, sourceAccount: prev.sourceAccount || response.data[0].accountNumber }));
        }
      })
      .catch((err) => {
        if (!cancelled) setServerError(err.message || 'Failed to load bank accounts.');
      })
      .finally(() => {
        if (!cancelled) setAccountsLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!form.destinationAccount || form.destinationAccountName) return;
    const selected = bankAccounts.find((a) => a.accountNumber === form.destinationAccount);
    if (selected?.accountHolderName) {
      setForm((prev) => ({ ...prev, destinationAccountName: selected.accountHolderName }));
    }
  }, [bankAccounts, form.destinationAccount, form.destinationAccountName]);

  const destinationOptions = bankAccounts.filter((a) => a.accountNumber !== form.sourceAccount);

  function handleDestinationNameChange(value) {
    const firstMatch = destinationOptions.find((a) => a.accountHolderName === value);
    setForm((prev) => ({
      ...prev,
      destinationAccountName: value,
      destinationAccount: firstMatch ? firstMatch.accountNumber : '',
    }));
    setFieldErrors((prev) => ({
      ...prev,
      destinationAccountName: '',
      destinationAccount: '',
    }));
  }

  function handleDestinationAccountChange(value) {
    const selected = destinationOptions.find((a) => a.accountNumber === value);
    setForm((prev) => ({
      ...prev,
      destinationAccount: value,
      destinationAccountName: selected ? selected.accountHolderName : '',
    }));
    setFieldErrors((prev) => ({
      ...prev,
      destinationAccountName: '',
      destinationAccount: '',
    }));
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => {
      const updated = { ...prev, [name]: value };
      if (name === 'sourceAccount' && value === prev.destinationAccount) {
        updated.destinationAccount = '';
        updated.destinationAccountName = '';
      }
      return updated;
    });
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
    } else if (!accountPattern.test(form.destinationAccount)) {
      errors.destinationAccount = 'Destination account must be exactly 12 digits.';
    } else if (form.sourceAccount && form.destinationAccount === form.sourceAccount) {
      errors.destinationAccount = 'Destination account must be different from source account.';
    } else if (!destinationOptions.some((a) => a.accountNumber === form.destinationAccount)) {
      errors.destinationAccount = 'Please select a valid destination account.';
    }

    if (!form.destinationAccountName) {
      errors.destinationAccountName = 'Destination account name is required.';
    } else if (!destinationOptions.some((a) => a.accountHolderName === form.destinationAccountName)) {
      errors.destinationAccountName = 'Please select a valid destination account name.';
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
    // Disabled for the whole request so a double-click (or a slow network causing an
    // impatient re-click) can never fire this exact submission twice. If the request
    // itself fails (validation, insufficient funds, etc.) the button re-enables and
    // the same idempotencyKey is reused — no payment was created, so that is safe.
    // A brand-new key is only ever minted by remounting this component (see
    // generateIdempotencyKey above), which happens on a genuinely new attempt.
    setLoading(true);
    try {
      const payload = {
        amount: parseFloat(form.amount),
        currency: form.currency,
        sourceAccount: form.sourceAccount,
        destinationAccount: form.destinationAccount,
        description: form.description.trim(),
        idempotencyKey,
      };
      const response = await paymentsApi.create(payload);
      navigate(`/payments/${response.data.id}`);
    } catch (err) {
      setServerError(err.message || 'Failed to create payment. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setForm({
      ...INITIAL_FORM,
      sourceAccount: bankAccounts[0]?.accountNumber || '',
    });
    setFieldErrors({});
    setServerError('');
    setIdempotencyKey(generateIdempotencyKey());
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
                disabled={loading || accountsLoading}
              >
                {accountsLoading ? (
                  <option value="">Loading accounts…</option>
                ) : bankAccounts.length === 0 ? (
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
              <label htmlFor="destinationAccountName">Destination Account Name *</label>
              <select
                id="destinationAccountName"
                name="destinationAccountName"
                className={`form-control ${fieldErrors.destinationAccountName ? 'error' : ''}`}
                value={form.destinationAccountName}
                onChange={(e) => handleDestinationNameChange(e.target.value)}
                disabled={loading || accountsLoading}
              >
                <option value="">Select destination account name</option>
                {Array.from(new Set(destinationOptions.map((account) => account.accountHolderName))).map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
              {fieldErrors.destinationAccountName && (
                <div className="form-error">{fieldErrors.destinationAccountName}</div>
              )}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="destinationAccount">Destination Account Number *</label>
              <select
                id="destinationAccount"
                name="destinationAccount"
                className={`form-control ${fieldErrors.destinationAccount ? 'error' : ''}`}
                value={form.destinationAccount}
                onChange={(e) => handleDestinationAccountChange(e.target.value)}
                disabled={loading || accountsLoading}
              >
                <option value="">Select destination account number</option>
                {destinationOptions
                  .filter((account) => !form.destinationAccountName || account.accountHolderName === form.destinationAccountName)
                  .map((account) => (
                    <option key={account.accountNumber} value={account.accountNumber}>
                      {account.accountNumber} - {account.accountHolderName}
                    </option>
                  ))}
              </select>
              {fieldErrors.destinationAccount && (
                <div className="form-error">{fieldErrors.destinationAccount}</div>
              )}
            </div>
            <div className="form-group" />
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
