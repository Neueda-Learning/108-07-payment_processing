// Frontend-only bank account store, scoped per username and backed by localStorage.

const STORAGE_KEY = 'flashpay_bank_accounts';
const BALANCE_HISTORY_DAYS = 14;

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

/** Synthetic daily balance history so the dashboard has something to chart. */
function generateBalanceHistory(days = BALANCE_HISTORY_DAYS) {
  const history = [];
  let balance = 1000 + Math.random() * 9000;
  const today = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    balance = Math.max(0, balance + (Math.random() - 0.45) * 500);
    history.push({ date: d.toISOString().slice(0, 10), balance: Math.round(balance * 100) / 100 });
  }

  return history;
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
  const balanceHistory = generateBalanceHistory();

  const newAccount = {
    ...account,
    addedAt: new Date().toISOString(),
    balanceHistory,
    currentBalance: balanceHistory[balanceHistory.length - 1].balance,
  };

  all[username] = [...list, newAccount];
  writeAll(all);
  return newAccount;
}

export function deleteBankAccount(username, accountNumber) {
  const all = readAll();
  const list = all[username] || [];
  all[username] = list.filter((a) => a.accountNumber !== accountNumber);
  writeAll(all);
  return all[username];
}

