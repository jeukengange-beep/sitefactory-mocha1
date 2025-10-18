const rawBaseUrl = import.meta.env.VITE_API_BASE_URL as string | undefined;
const normalizedBaseUrl = rawBaseUrl ? rawBaseUrl.replace(/\/$/, '') : '';

export function apiFetch(input: string, init?: RequestInit) {
  const target = normalizedBaseUrl ? `${normalizedBaseUrl}${input}` : input;
  return fetch(target, init);
}
