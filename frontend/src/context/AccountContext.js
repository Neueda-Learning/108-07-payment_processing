import React, { createContext, useContext, useState, useCallback } from 'react';
import { accountsApi } from '../services/api';

const AccountContext = createContext(null);

export function AccountProvider({ children }) {
  const [hasAccount, setHasAccount] = useState(false);

  const refreshAccountStatus = useCallback(async () => {
    try {
      const response = await accountsApi.getAll();
      setHasAccount(response.data.length > 0);
    } catch {
      setHasAccount(false);
    }
  }, []);

  return (
    <AccountContext.Provider value={{ hasAccount, setHasAccount, refreshAccountStatus }}>
      {children}
    </AccountContext.Provider>
  );
}

export function useAccountStatus() {
  const ctx = useContext(AccountContext);
  if (!ctx) throw new Error('useAccountStatus must be used within AccountProvider');
  return ctx;
}
