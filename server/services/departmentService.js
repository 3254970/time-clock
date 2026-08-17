import { db, FieldValue } from '../firebase/firebaseAdmin.js';
import { AppError } from '../utils/AppError.js';

const departmentsCollection = db.collection('departments');

function toDTO(doc) {
  const data = doc.data();
  return {
    id: doc.id,
    name: data.name,
    isActive: data.isActive,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

export async function listDepartments({ activeOnly = false } = {}) {
  let query = departmentsCollection;
  if (activeOnly) {
    query = query.where('isActive', '==', true);
  }
  const snapshot = await query.get();
  return snapshot.docs.map(toDTO).sort((a, b) => a.name.localeCompare(b.name, 'he'));
}

export async function getDepartmentById(departmentId) {
  const doc = await departmentsCollection.doc(departmentId).get();
  if (!doc.exists) {
    throw new AppError('המחלקה לא נמצאה', 404);
  }
  return toDTO(doc);
}

export async function createDepartment({ name }) {
  if (!name || !name.trim()) {
    throw new AppError('חובה להזין שם מחלקה', 400);
  }
  const docRef = await departmentsCollection.add({
    name: name.trim(),
    isActive: true,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  return getDepartmentById(docRef.id);
}

export async function updateDepartment(departmentId, updates) {
  await getDepartmentById(departmentId);

  const patch = { updatedAt: FieldValue.serverTimestamp() };
  if (updates.name !== undefined) {
    if (!updates.name.trim()) {
      throw new AppError('שם מחלקה לא יכול להיות ריק', 400);
    }
    patch.name = updates.name.trim();
  }
  if (updates.isActive !== undefined) {
    patch.isActive = Boolean(updates.isActive);
  }

  await departmentsCollection.doc(departmentId).update(patch);
  return getDepartmentById(departmentId);
}
