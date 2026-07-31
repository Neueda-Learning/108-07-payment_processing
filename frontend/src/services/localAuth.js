// Local authentication service — stores users in localStorage.
// Replace these calls with real API calls once the Spring Boot backend is running.

const USERS_KEY = 'pps_users';

function getUsers() {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY)) || [];
  } catch {
    return [];
  }
}

function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

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

export function localRegister(username, password) {
  const users = getUsers();
  const exists = users.some(
    (u) => u.username.toLowerCase() === username.toLowerCase()
  );
  if (exists) {
    const err = new Error('Username already taken.');
    err.code = 'USERNAME_TAKEN';
    throw err;
  }
  users.push({ username, password }); // demo only — backend will hash with BCrypt
  saveUsers(users);
  return makeToken(username);
}

export function localLogin(username, password) {
  const users = getUsers();
  const user = users.find(
    (u) =>
      u.username.toLowerCase() === username.toLowerCase() &&
      u.password === password
  );
  if (!user) {
    const err = new Error('Invalid username or password.');
    err.code = 'INVALID_CREDENTIALS';
    throw err;
  }
  return makeToken(username);
}
