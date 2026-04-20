export function formatDistanceToNow(dateStr: string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diff = now - date;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 7) return new Date(dateStr).toLocaleDateString();
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'just now';
}

export function formatDate(dateStr: string, options?: Intl.DateTimeFormatOptions): string {
  return new Date(dateStr).toLocaleDateString('en-US', options || {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

export function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

export function isOverdue(dateStr: string): boolean {
  return new Date(dateStr) < new Date();
}

export function daysUntil(dateStr: string): number {
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

export function clsx(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function getPriorityColor(priority: string): string {
  const map: Record<string, string> = {
    low: 'success',
    medium: 'warning',
    high: 'danger',
    critical: 'danger',
  };
  return map[priority] || 'default';
}

export function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    open: 'info',
    in_progress: 'warning',
    resolved: 'success',
    closed: 'default',
    pending: 'warning',
    submitted: 'info',
    graded: 'success',
    present: 'success',
    absent: 'danger',
    late: 'warning',
    upcoming: 'info',
    ongoing: 'success',
    completed: 'default',
    cancelled: 'danger',
    paid: 'success',
    failed: 'danger',
  };
  return map[status] || 'default';
}

export function courseColors(): string[] {
  return [
    '#3B82F6', '#10B981', '#F59E0B', '#EF4444',
    '#06B6D4', '#8B5CF6', '#EC4899', '#F97316',
  ];
}
