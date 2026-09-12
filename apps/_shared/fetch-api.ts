export async function fetchApi<TResponse>(
  path: `/${string}`,
  init?: RequestInit,
): Promise<TResponse> {
  const response = await fetch(`http://localhost:3002${path}`, init);

  if (!response.ok) {
    throw new Error(`API request failed with status ${response.status}`);
  }

  return response.json() as Promise<TResponse>;
}
