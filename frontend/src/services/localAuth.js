import { authApi } from './api';

// Creates a simple signed-looking session token (not a real JWT).
// Good enough for frontend-only mode; replace with real JWT from backend.
function makeToken(username) {
  const payload = { sub: username, iat: Date.now(), exp: Date.now() + 86400000 };
  return btoa(JSON.stringify(payload));
}

export function decodeToken(token) {
  try {
    return JSON.parse(atob(token));
  } catch {
    return null;
  }
}

export async function localRegister(username, password) {
  const passwordPattern = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9])\S{8,12}$/;

  if (!passwordPattern.test(password)) {
    const err = new Error(
      'Password must be 8-12 characters with at least 1 capital letter, 1 number, and 1 special character (no spaces).'
    );
    err.code = 'WEAK_PASSWORD';
    throw err;
  }

  const res = await authApi.register(username, password);
  return res.data?.token || makeToken(username);
}

export async function localLogin(username, password) {
  const res = await authApi.login(username, password);
  return res.data?.token || makeToken(username);
}
