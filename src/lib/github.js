// Синхронизация data.json через GitHub Contents API (§3).
// Каждое сохранение = коммит → полная история изменений как в git.

const API = 'https://api.github.com';
const FILE_PATH = 'data.json';

function headers(token) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
}

// Unicode-безопасный base64
function encode(str) {
  return btoa(String.fromCharCode(...new TextEncoder().encode(str)));
}

function decode(b64) {
  const bin = atob(b64.replace(/\n/g, ''));
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}

// GET содержимого data.json. Возвращает { data, sha } или null, если файла ещё нет.
export async function fetchRemoteData(repo, token) {
  const res = await fetch(`${API}/repos/${repo}/contents/${FILE_PATH}`, {
    headers: headers(token),
    cache: 'no-store',
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GitHub GET ${res.status}: ${await res.text()}`);
  const json = await res.json();
  return { data: JSON.parse(decode(json.content)), sha: json.sha };
}

// Только SHA файла — для проверки перед записью (pull-before-write, §3.4)
export async function fetchRemoteSha(repo, token) {
  const remote = await fetchRemoteData(repo, token);
  return remote ? remote.sha : null;
}

// PUT обновлённого data.json = коммит через API. Возвращает новый SHA.
export async function pushRemoteData(repo, token, data, sha, message) {
  const body = {
    message: message || `arise: sync ${new Date().toISOString()}`,
    content: encode(JSON.stringify(data, null, 2)),
  };
  if (sha) body.sha = sha;
  const res = await fetch(`${API}/repos/${repo}/contents/${FILE_PATH}`, {
    method: 'PUT',
    headers: { ...headers(token), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`GitHub PUT ${res.status}: ${await res.text()}`);
  const json = await res.json();
  return json.content.sha;
}
