import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { accountsApi } from '../services/api';

const ACCOUNT_TYPES = [
  { value: 'SAVINGS', label: 'Savings Account' },
  { value: 'SALARY', label: 'Salary Account' },
  { value: 'CURRENT', label: 'Current Account' },
];

const CURRENCIES = ['USD', 'EUR', 'INR'];

const INITIAL_FORM = {
  accountNumber: '',
  accountHolderName: '',
  bankName: '',
  accountType: ACCOUNT_TYPES[0].value,
  currency: CURRENCIES[0],
};

export default function AddBankAccount() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ ...INITIAL_FORM });
  const [fieldErrors, setFieldErrors] = useState({});
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const loadAccounts = useCallback(async () => {
    setLoading(true);
    try {
      const response = await accountsApi.getAll();
      setAccounts(response.data);
    } catch (err) {
      setServerError(err.message || 'Failed to load bank accounts.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAccounts(); }, [loadAccounts]);

  function handleChange(e) {
    const { name, value } = e.target;
    const nextValue = name === 'accountNumber' ? value.replace(/\D/g, '').slice(0, 12) : value;
    setForm((prev) => ({ ...prev, [name]: nextValue }));
    setFieldErrors((prev) => ({ ...prev, [name]: '' }));
    setSuccessMessage('');
  }

  function validate() {
    const errors = {};

    if (!form.accountNumber) {
      errors.accountNumber = 'Bank account number is required.';
    } else if (/\s/.test(form.accountNumber) || !/^\d{12}$/.test(form.accountNumber)) {
      errors.accountNumber = 'Account number must be exactly 12 digits with no spaces.';
    }

    if (!form.accountHolderName.trim()) {
      errors.accountHolderName = 'Account holder name is required.';
    }

    if (!form.bankName.trim()) {
      errors.bankName = 'Bank name is required.';
    }

    if (!form.accountType) {
      errors.accountType = 'Account type is required.';
    }

    if (!form.currency) {
      errors.currency = 'Currency is required.';
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
    setSubmitting(true);
    try {
      await accountsApi.create({
        accountNumber: form.accountNumber,
        accountHolderName: form.accountHolderName.trim(),
        bankName: form.bankName.trim(),
        accountType: form.accountType,
        currency: form.currency,
      });

      setForm({ ...INITIAL_FORM });
      setSuccessMessage('Bank account added successfully.');
      await loadAccounts();
    } catch (err) {
      setServerError(err.message || 'Failed to add bank account. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const isFirstTime = accounts.length === 0;

  return (
    <div className={`add-account-page ${isFirstTime ? 'first-time' : ''}`}>
      <div className={`page-header ${isFirstTime ? 'first-time' : ''}`}>
        <div>
          <h1>Add Bank Account</h1>
          <p>
            {isFirstTime
              ? 'Add a bank account to start using FlashPay'
              : 'Add another bank account to your profile'}
          </p>
        </div>
      </div>

      <div className="card" style={{ maxWidth: '600px', marginBottom: '24px', marginInline: 'auto' }}>
        {serverError && <div className="alert alert-error">{serverError}</div>}
        {successMessage && <div className="alert alert-success">{successMessage}</div>}

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label htmlFor="accountNumber">Bank Account Number *</label>
            <input
              id="accountNumber"
              name="accountNumber"
              type="text"
              inputMode="numeric"
              maxLength={12}
              className={`form-control ${fieldErrors.accountNumber ? 'error' : ''}`}
              value={form.accountNumber}
              onChange={handleChange}
              placeholder="12-digit account number"
              disabled={submitting}
            />
            {fieldErrors.accountNumber && (
              <div className="form-error">{fieldErrors.accountNumber}</div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="accountHolderName">Account Holder Name *</label>
            <input
              id="accountHolderName"
              name="accountHolderName"
              type="text"
              className={`form-control ${fieldErrors.accountHolderName ? 'error' : ''}`}
              value={form.accountHolderName}
              onChange={handleChange}
              placeholder="Full name as per bank records"
              disabled={submitting}
            />
            {fieldErrors.accountHolderName && (
              <div className="form-error">{fieldErrors.accountHolderName}</div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="bankName">Bank Name *</label>
            <input
              id="bankName"
              name="bankName"
              type="text"
              className={`form-control ${fieldErrors.bankName ? 'error' : ''}`}
              value={form.bankName}
              onChange={handleChange}
              placeholder="e.g. First National Bank"
              disabled={submitting}
            />
            {fieldErrors.bankName && (
              <div className="form-error">{fieldErrors.bankName}</div>
            )}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="accountType">Account Type *</label>
              <select
                id="accountType"
                name="accountType"
                className={`form-control ${fieldErrors.accountType ? 'error' : ''}`}
                value={form.accountType}
                onChange={handleChange}
                disabled={submitting}
              >
                {ACCOUNT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
              {fieldErrors.accountType && (
                <div className="form-error">{fieldErrors.accountType}</div>
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
                disabled={submitting}
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

          <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Adding…' : '➕ Add Account'}
            </button>
            {accounts.length > 0 && (
              <button
                type="button"
                className="btn btn-secondary"
                style={{ marginLeft: 'auto' }}
                onClick={() => navigate('/dashboard')}
                disabled={submitting}
              >
                Go to Dashboard →
              </button>
            )}
          </div>
        </form>
      </div>

      {loading ? (
        <div className="loading-wrapper">
          <div className="spinner" />
          <span>Loading bank accounts…</span>
        </div>
      ) : accounts.length > 0 && (
        <div className="card">
          <div className="section-title">Your Bank Accounts</div>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Account Number</th>
                  <th>Account Holder</th>
                  <th>Bank Name</th>
                  <th>Account Type</th>
                  <th>Currency</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((a) => (
                  <tr key={a.accountNumber}>
                    <td className="mono">{a.accountNumber}</td>
                    <td>{a.accountHolderName}</td>
                    <td>{a.bankName}</td>
                    <td>{a.accountType}</td>
                    <td>{a.currency}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
