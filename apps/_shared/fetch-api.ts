export function fetchApi(
  path: `/${string}`,
  init: RequestInit,
  responseType: "stream",
): Promise<ReadableStream<Uint8Array>>;
export function fetchApi<TResponse>(path: `/${string}`, init?: RequestInit): Promise<TResponse>;
export async function fetchApi<TResponse>(
  path: `/${string}`,
  init?: RequestInit,
  responseType?: "stream",
): Promise<TResponse | ReadableStream<Uint8Array>> {
  const response = await fetch(`http://localhost:3002${path}`, init);

  if (!response.ok) {
    throw new Error(`API request failed with status ${response.status}`);
  }

  if (responseType === "stream") {
    if (!response.headers.get("content-type")?.startsWith("application/x-ndjson") || !response.body) {
      throw new Error("Invalid stream response");
    }
    return response.body;
  }
  return response.json() as Promise<TResponse>;
}
