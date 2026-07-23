// Локальный кеш на случай оффлайна (§3.2) + токен (только localStorage, §3)

const DATA_KEY = 'arise:data';
const TOKEN_KEY = 'arise:token';
const SHA_KEY = 'arise:sha';
const STEAM_KEY = 'arise:steam';

export function loadCachedData() {
  try {
    const raw = localStorage.getItem(DATA_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveCachedData(data) {
  try {
    localStorage.setItem(DATA_KEY, JSON.stringify(data));
  } catch {
    /* квота/приватный режим — молча живём на state в памяти */
  }
}

export function loadToken() {
  return localStorage.getItem(TOKEN_KEY) || '';
}

export function saveToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export function loadSha() {
  return localStorage.getItem(SHA_KEY) || null;
}

export function saveSha(sha) {
  if (sha) localStorage.setItem(SHA_KEY, sha);
  else localStorage.removeItem(SHA_KEY);
}

// Кеш библиотеки Steam — чтобы карты показывались и оффлайн, без обращения к API
export function loadCachedSteam() {
  try {
    const raw = localStorage.getItem(STEAM_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveCachedSteam(lib) {
  try {
    if (lib) localStorage.setItem(STEAM_KEY, JSON.stringify(lib));
  } catch {
    /* квота — молча живём на state в памяти */
  }
}
