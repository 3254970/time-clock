export default function ErrorState({ message }) {
  if (!message) return null;
  return <div className="error-state">{message}</div>;
}
