// Backend istekleri. JWT localStorage'da saklanır; 401 gelince giriş ekranına dönülür.

// Varsayılan: sayfanın açıldığı makinenin 3000 portu (telefondan LAN IP ile açınca da çalışır).
// Başka bir adres için index.html'de window.ZELLYBON_API_URL tanımlanabilir.
const host = location.hostname || 'localhost';
const protocol = location.protocol === 'https:' ? 'https:' : 'http:';
export const API_URL = window.ZELLYBON_API_URL || `${protocol}//${host}:3000/api`;

const TOKEN_KEY = 'zellybon_token';

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token) {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // özel pencere vb. — oturum sadece bu sayfa açıkken sürer
  }
  memoryToken = token;
}

export function clearToken() {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // yok say
  }
  memoryToken = null;
}

let memoryToken = null;
let onUnauthorized = () => {};

export function setUnauthorizedHandler(fn) {
  onUnauthorized = fn;
}

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

async function request(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const token = getToken() ?? memoryToken;
  if (auth && token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError('Sunucuya ulaşılamadı. Bağlantını kontrol et.', 0);
  }

  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && auth) {
    clearToken();
    onUnauthorized(data.error);
  }
  if (!res.ok) throw new ApiError(data.error || 'Bir hata oluştu.', res.status);
  return data;
}

export const Api = {
  register: (username, password) =>
    request('/auth/register', { method: 'POST', body: { username, password }, auth: false }),
  login: (username, password) =>
    request('/auth/login', { method: 'POST', body: { username, password }, auth: false }),
  me: () => request('/me'),
  saveScore: (result) => request('/scores', { method: 'POST', body: result }),
  records: (mode = 'quick') => request(`/records?mode=${encodeURIComponent(mode)}`),
};
