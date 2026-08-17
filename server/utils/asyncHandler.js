// עוטף controller אסינכרוני ומעביר שגיאות ל-errorHandler במקום try/catch בכל מקום.
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
