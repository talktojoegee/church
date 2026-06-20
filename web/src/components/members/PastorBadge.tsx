import { Badge } from '@/components/ui/Badge';
import { PASTORAL_LABELS } from '@/lib/constants';

export function PastorBadge({ role }: { role?: string | null }) {
  if (!role || role === 'NONE') return null;
  return (
    <Badge tone={role === 'PASTOR' ? 'brand' : 'blue'}>
      {PASTORAL_LABELS[role] ?? role}
    </Badge>
  );
}
