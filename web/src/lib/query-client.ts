import { MutationCache, QueryClient } from '@tanstack/react-query';
import { extractApiError } from './api-error';
import { toast } from './toast-store';

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 30_000 },
    },
    mutationCache: new MutationCache({
      onSuccess: (_data, _variables, _context, mutation) => {
        const meta = mutation.meta;
        if (meta?.skipSuccessToast) return;
        if (typeof meta?.successMessage === 'string') {
          toast.success(meta.successMessage);
        }
      },
      onError: (error, _variables, _context, mutation) => {
        const meta = mutation.meta;
        if (meta?.skipErrorToast) return;
        toast.error(extractApiError(error, meta?.errorMessage));
      },
    }),
  });
}
