export async function readJsonResponse<T = Record<string, unknown>>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text.trim()) return {} as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(response.ok ? 'The server returned an invalid response' : `Request failed (${response.status})`);
  }
}
