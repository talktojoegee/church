import { Transform } from 'class-transformer';

/** Treat empty query strings as undefined (avoids enum validation failures). */
export function EmptyToUndefined() {
  return Transform(({ value }) => (value === '' || value === null ? undefined : value));
}
