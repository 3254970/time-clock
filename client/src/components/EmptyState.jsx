export default function EmptyState({ text = 'אין נתונים להצגה' }) {
  return <div className="empty-state">{text}</div>;
}
