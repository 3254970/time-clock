// דף הבית של כל role - משמש להפניה אחרי התחברות ובחסימת גישה לדף לא מתאים.
export function getHomePathForRole(role) {
  return role === 'EMPLOYEE' ? '/employee' : '/admin';
}
