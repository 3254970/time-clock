import { createContext, useEffect, useState, useCallback } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth } from '../services/firebase.js';
import { api } from '../services/api.js';

export const AuthContext = createContext(null);

// אחראי על מצב ההתחברות: משתמש Firebase + פרופיל (role, employeeId) מהשרת.
export function AuthProvider({ children }) {
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadProfile = useCallback(async () => {
    try {
      const data = await api.get('/auth/me');
      setProfile(data);
    } catch (err) {
      setProfile(null);
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        await loadProfile();
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, [loadProfile]);

  const login = async (email, password) => {
    setError(null);
    await signInWithEmailAndPassword(auth, email, password);
  };

  const logout = async () => {
    await signOut(auth);
    setProfile(null);
  };

  const value = {
    firebaseUser,
    profile,
    role: profile?.role || null,
    employeeId: profile?.employeeId || null,
    loading,
    error,
    login,
    logout,
    refreshProfile: loadProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
