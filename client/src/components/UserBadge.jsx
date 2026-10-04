import { useState } from 'react';
import { useAuth } from '../hooks/useAuth.js';

const AVATAR_COLORS = ['#2563eb', '#16a34a', '#d97706', '#dc2626', '#7c3aed', '#0891b2', '#db2777', '#4b5563'];

// עיגול עם תמונת הפרופיל + שם המשתמש בתחתית הסרגל הצדדי.
// תמונה קיימת רק למי שהתחבר אי פעם עם Google; לשאר (או אם התמונה לא נטענת)
// מוצגים ראשי תיבות על רקע בצבע קבוע לפי השם.
export default function UserBadge({ onClick }) {
  const { profile, firebaseUser } = useAuth();
  const [imageFailed, setImageFailed] = useState(false);

  const name = profile?.fullName || firebaseUser?.displayName || profile?.email || '';
  if (!name) return null;

  const photoURL =
    firebaseUser?.photoURL || firebaseUser?.providerData?.find((p) => p.photoURL)?.photoURL || null;
  const showImage = photoURL && !imageFailed;

  const content = (
    <>
      <span className="user-avatar" style={showImage ? undefined : { background: colorFor(name) }}>
        {showImage ? (
          <img src={photoURL} alt="" referrerPolicy="no-referrer" onError={() => setImageFailed(true)} />
        ) : (
          initialsOf(name)
        )}
      </span>
      <span className="user-badge-name">{name}</span>
    </>
  );

  return onClick ? (
    <button type="button" className="user-badge" onClick={onClick} title="עריכת פרטים אישיים">
      {content}
    </button>
  ) : (
    <div className="user-badge">{content}</div>
  );
}

function initialsOf(name) {
  if (name.includes('@')) return name[0].toUpperCase();
  const words = name.trim().split(/\s+/);
  return words
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

function colorFor(name) {
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) | 0;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}
