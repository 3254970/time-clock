import admin from 'firebase-admin';

// אתחול Firebase Admin SDK. אם חסרים Credentials בסביבת הפיתוח,
// השרת עדיין עולה (כדי לאפשר בדיקת מבנה), אך קריאות ל-Firestore/Auth ייכשלו
// עד שיוגדרו משתני הסביבה כראוי (ראה server/.env.example).
const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

if (!admin.apps.length) {
  if (projectId && clientEmail && privateKey) {
    admin.initializeApp({
      credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
    });
  } else {
    console.warn(
      '⚠️  Firebase Admin: לא הוגדרו FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY ב-.env. ' +
        'השרת יעלה, אך קריאות ל-Firestore/Auth ייכשלו עד שיוגדרו.'
    );
    admin.initializeApp({ projectId: projectId || 'demo-project' });
  }
}

export const db = admin.firestore();
// preferRest: מונע "תקיעות" שקטות של חיבור gRPC ברשתות מגבילות/פרוקסי -
// עובד באמצעות REST API רגיל במקום סטרימינג, ומחזיר שגיאה ברורה אם יש בעיה
// במקום לחכות לנצח.
db.settings({ ignoreUndefinedProperties: true, preferRest: true });

export const authAdmin = admin.auth();
export const FieldValue = admin.firestore.FieldValue;
export const Timestamp = admin.firestore.Timestamp;

export default admin;
