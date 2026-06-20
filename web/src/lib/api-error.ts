export function extractApiError(err: unknown, fallback = 'Something went wrong'): string {
  if (!err || typeof err !== 'object') return fallback;
  const response = (err as { response?: { data?: { message?: string | string[] } } }).response;
  const message = response?.data?.message;
  if (Array.isArray(message)) return message[0] ?? fallback;
  if (typeof message === 'string' && message.trim()) return message;
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}
