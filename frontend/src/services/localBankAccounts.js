// Frontend-only bank account store, scoped per username and backed by localStorage.

const STORAGE_KEY = 'flashpay_bank_accounts';

function readAll() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch {
    return {};
  }
}

function writeAll(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function getBankAccounts(username) {
  if (!username) return [];
  const all = readAll();
  return all[username] || [];
}

export function hasBankAccount(username) {
  return getBankAccounts(username).length > 0;
}

export function addBankAccount(username, account) {
  const all = readAll();
  const list = all[username] || [];
  const newAccount = { ...account, addedAt: new Date().toISOString() };
  all[username] = [...list, newAccount];
  writeAll(all);
  return newAccount;
}
