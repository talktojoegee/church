type FetchInit = RequestInit & {
  timeoutMs?: number;
  revalidate?: number | false;
};

/** Skip live API calls during Docker/CI production builds (pages revalidate at runtime). */
export function shouldSkipRemoteFetch(): boolean {
  return process.env.NEXT_BUILD_SKIP_REMOTE === '1';
}

export async function fetchWithTimeout(
  input: string,
  init?: FetchInit,
): Promise<Response | null> {
  if (shouldSkipRemoteFetch()) return null;

  const { timeoutMs = 8_000, revalidate, ...rest } = init ?? {};
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const isMutation = rest.method && rest.method !== 'GET';
  const cacheInit =
    isMutation || revalidate === false
      ? { cache: 'no-store' as RequestCache }
      : { next: { revalidate: typeof revalidate === 'number' ? revalidate : 60 } };

  try {
    return await fetch(input, {
      ...rest,
      ...cacheInit,
      signal: controller.signal,
    });
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
