export const STATUS_LABELS_HE = {
  OPEN: 'פתוח',
  COMPLETE: 'תקין',
  MISSING_CLOCK_OUT: 'חסר דיווח',
  IN: 'בעבודה',
  OUT: 'לא בעבודה',
  ACTIVE: 'פעיל',
  INACTIVE: 'לא פעיל',
};

export function statusLabelHe(status) {
  return STATUS_LABELS_HE[status] || status;
}
