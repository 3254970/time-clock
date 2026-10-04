import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../hooks/useAuth.js';
import ProfileModal from './ProfileModal.jsx';

const AVATAR_COLORS = ['#2563eb', '#16a34a', '#d97706', '#dc2626', '#7c3aed', '#0891b2', '#db2777', '#4b5563'];

// תחתית הסרגל הצדדי: כפתור הגדרות (פרטים אישיים) + עיגול פרופיל ושם,
// שבלחיצה עליו נפתח תפריט עם התנתקות.
// תמונה קיימת רק למי שהתחבר אי פעם עם Google; לשאר (או אם התמונה לא נטענת)
// מוצגים ראשי תיבות על רקע בצבע קבוע לפי השם.
export default function SidebarUserMenu() {
  const { profile, firebaseUser, logout } = useAuth();
  const [imageFailed, setImageFailed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const handleClick = (e) => {
      if (!containerRef.current?.contains(e.target)) setMenuOpen(false);
    };
    const handleKey = (e) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [menuOpen]);

  if (!profile) return null;

  const name = profile.fullName || firebaseUser?.displayName || profile.email || '';
  const photoURL =
    firebaseUser?.photoURL || firebaseUser?.providerData?.find((p) => p.photoURL)?.photoURL || null;
  const showImage = photoURL && !imageFailed;

  return (
    <div className="sidebar-footer" ref={containerRef}>
      <button type="button" className="link sidebar-icon-link" onClick={() => setShowSettings(true)}>
        <SettingsIcon />
        הגדרות
      </button>

      {menuOpen && (
        <div className="user-menu" role="menu">
          {profile.email && <div className="user-menu-email">{profile.email}</div>}
          <button type="button" role="menuitem" className="user-menu-item" onClick={logout}>
            <LogoutIcon />
            התנתקות
          </button>
        </div>
      )}

      <button
        type="button"
        className="user-badge"
        onClick={() => setMenuOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
      >
        <span className="user-avatar" style={showImage ? undefined : { background: colorFor(name) }}>
          {showImage ? (
            <img src={photoURL} alt="" referrerPolicy="no-referrer" onError={() => setImageFailed(true)} />
          ) : (
            initialsOf(name)
          )}
        </span>
        <span className="user-badge-name">{name}</span>
      </button>

      {showSettings && <ProfileModal onClose={() => setShowSettings(false)} />}
    </div>
  );
}

function initialsOf(name) {
  if (!name) return '';
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

function SettingsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="m16 17 5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  );
}
