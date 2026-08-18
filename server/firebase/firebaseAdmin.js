import admin from 'firebase-admin';

// אתחול Firebase Admin SDK.
// שמות המשתנים הם SA_* ולא FIREBASE_* בכוונה: כש-server רץ כ-Firebase Function,
// הקידומת FIREBASE_ שמורה למערכת ולא ניתן להעביר אותה כ-env var מותאם אישית מ-.env.
// אם אין Credentials מפורשים (למשל בסביבת Cloud Functions/Cloud Run עם ADC תקין),
// נופלים ל-Application Default Credentials האוטומטיות של הסביבה.
const projectId = process.env.SA_PROJECT_ID || process.env.GCLOUD_PROJECT;
const clientEmail = process.env.SA_CLIENT_EMAIL;
const privateKey = process.env.SA_PRIVATE_KEY?.replace(/\\n/g, '\n');

if (!admin.apps.length) {
  if (projectId && clientEmail && privateKey) {
    admin.initializeApp({
      credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
    });
  } else if (projectId) {
    // רץ על תשתית Google (Cloud Functions/Cloud Run) - ה-ADC של הסביבה יטופל אוטומטית
    admin.initializeApp({ projectId });
  } else {
    console.warn(
      '⚠️  Firebase Admin: לא הוגדרו Credentials ב-.env. ' +
        'השרת יעלה, אך קריאות ל-Firestore/Auth ייכשלו עד שיוגדרו (ראה server/.env.example).'
    );
    admin.initializeApp({ projectId: 'demo-project' });
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
