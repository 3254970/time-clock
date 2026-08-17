// תג צבעוני לפי סטטוס נוכחות. ירוק = בעבודה, אפור = לא בעבודה, כתום = חסר דיווח.
const STATUS_MAP = {
  IN: { label: 'בעבודה', className: 'badge-success' },
  OUT: { label: 'לא בעבודה', className: 'badge-neutral' },
  MISSING_CLOCK_OUT: { label: 'חסר דיווח', className: 'badge-warning' },
  OPEN: { label: 'פתוח', className: 'badge-success' },
  COMPLETE: { label: 'תקין', className: 'badge-neutral' },
  ACTIVE: { label: 'פעיל', className: 'badge-success' },
  INACTIVE: { label: 'לא פעיל', className: 'badge-neutral' },
};

export default function StatusBadge({ status }) {
  const info = STATUS_MAP[status] || { label: status, className: 'badge-neutral' };
  return <span className={`badge ${info.className}`}>{info.label}</span>;
}
