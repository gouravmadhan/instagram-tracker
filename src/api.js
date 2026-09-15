async function request(url, options) {
  const res = await fetch(url, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Request to ${url} failed (${res.status})`);
  }
  return data;
}

export function fetchStatus() {
  return request('/api/status');
}

export function fetchMe() {
  return request('/api/auth/me');
}

export function logout() {
  return request('/api/auth/logout', { method: 'POST' });
}

export function signup(email, password, name) {
  return request('/api/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, name }),
  });
}

export function loginWithPassword(email, password) {
  return request('/api/auth/login-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
}

export function uploadZip(zipBase64) {
  return request('/api/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ zipBase64 }),
  });
}

export function commitSnapshot() {
  return request('/api/commit', { method: 'POST' });
}

export function fetchLists() {
  return request('/api/lists');
}

// `usernames` can be a single handle, or a comma/newline/space separated
// blob of many — the API parses and dedupes it either way.
export function addToList(type, usernames) {
  return request('/api/lists', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, usernames }),
  });
}

export function removeFromList(type, usernames) {
  return request('/api/lists', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, usernames }),
  });
}

export function clearList(type) {
  return request('/api/lists', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, all: true }),
  });
}

export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      const base64 = result.substring(result.indexOf(',') + 1);
      resolve(base64);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
