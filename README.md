# מערכת נוכחות ושעות עבודה - V1

מערכת לניהול נוכחות ושעות עבודה של עובדים, עם שני ממשקים (אתר אינטרנט וטלפון
דרך ימות המשיח) שמתחברים לאותה לוגיקה עסקית מרכזית ב-Backend ולאותה בסיס
נתונים (Firestore). אין "נתוני אתר" ו"נתוני טלפון" נפרדים - הכל מקום אחד.

כל הקוד הוא **JavaScript רגיל** (ללא TypeScript).

## טכנולוגיות

| שכבה | טכנולוגיה |
|---|---|
| Frontend | React + Vite + React Router, JavaScript, RTL/עברית |
| Backend | Node.js + Express, JavaScript |
| Database | Google Firebase Firestore |
| Authentication | Firebase Authentication |
| Excel | ExcelJS (נוצר תמיד בשרת) |
| טלפוניה | ימות המשיח (IVR), דרך הספרייה [`yemot-router2`](https://github.com/ShlomoCode/yemot-router2) |
| אזור זמן | Asia/Jerusalem (כולל שעון קיץ) - חישוב באמצעות Luxon |

## מבנה הפרויקט

```
/client                  אפליקציית React (Vite)
  src/
    components/          רכיבי UI משותפים (Modal, StatusBadge, Toast...)
    pages/employee/       דפי עובד
    pages/admin/           דפי מנהל
    pages/auth/            דף התחברות
    layouts/              שלדי עמוד (Sidebar לעובד / למנהל)
    services/             firebase.js, api.js (קריאות ל-Backend)
    hooks/                 useAuth, useToast
    context/               AuthContext, ToastContext
    utils/

/server                   Express API
  routes/                 הגדרת נתיבים בלבד (קצר)
  controllers/            קליטת בקשה + קריאה ל-services
  services/               כל הלוגיקה העסקית, כולל attendanceService המרכזי
  middleware/             verifyFirebaseToken, requireRole, errorHandler
  firebase/               firebaseAdmin.js - אתחול Firebase Admin SDK
  jobs/                   dailyAttendanceJob.js - סגירת ימים בחצות
  scripts/                seed.js - נתוני דוגמה
  tests/                  בדיקות (node:test)

firestore.rules           חוקי אבטחה - חוסמים גישה ישירה מה-Client
firestore.indexes.json    אינדקסים מורכבים נדרשים
```

### ארכיטקטורה - עיקרון מרכזי

```
Employee (Web)  ─┐
Admin (Web)     ─┼─▶  Node.js + Express API  ─▶  Firestore
ימות המשיח      ─┘         (attendanceService)
```

כל כניסה/יציאה/עריכת נוכחות - בין אם מהאתר ובין אם מהטלפון - עוברת דרך אותן
פונקציות בדיוק ב-`server/services/attendanceService.js`
(`clockIn`, `clockOut`, `updateSession`...). אין מימוש כפול.

---

## התקנה - שלב אחר שלב

### 1. יצירת פרויקט Firebase

1. גשו ל-[Firebase Console](https://console.firebase.google.com/) ולחצו "הוסף פרויקט".
2. תנו שם לפרויקט (למשל `attendance-system`) וסיימו את יצירת הפרויקט.

### 2. הפעלת Firebase Authentication

1. בתפריט הצד: **Build → Authentication → Get started**.
2. בלשונית **Sign-in method**, הפעילו את **Email/Password**.
3. משתמשים (עובדים/מנהלים) ייווצרו דרך המערכת עצמה (טופס "הוספת עובד" בממשק
   הניהול, או סקריפט ה-seed) - אין צורך ליצור אותם ידנית מכאן.

### 3. הפעלת Firestore

1. בתפריט הצד: **Build → Firestore Database → Create database**.
2. בחרו מצב **Production mode** (חוקי האבטחה ב-`firestore.rules` כבר חוסמים
   גישה ישירה מה-Client, כך שהמערכת בטוחה בברירת המחדל).
3. בחרו Region (מומלץ קרוב לישראל, למשל `europe-west1`).
4. פרסמו את הקבצים `firestore.rules` ו-`firestore.indexes.json` שבשורש
   הפרויקט, דרך Firebase CLI:
   ```bash
   npm install -g firebase-tools
   firebase login
   firebase init firestore   # בחרו בפרויקט הקיים, אשרו החלפת הקבצים הקיימים ב-repo
   firebase deploy --only firestore:rules,firestore:indexes
   ```

### 4. יצירת Service Account (ל-Backend)

1. **Project settings (גלגל שיניים) → Service accounts**.
2. לחצו **Generate new private key** - יורד קובץ JSON.
3. מתוך הקובץ תצטרכו 3 ערכים ל-`.env` של השרת: `project_id`, `client_email`,
   `private_key`.

### 5. הגדרת Frontend

1. **Project settings → General → Your apps → Web app** (סמל `</>`), רשמו
   אפליקציה חדשה.
2. יועתק לכם אובייקט `firebaseConfig` - את הערכים ממנו יש להעתיק ל-`.env`.
3. העתיקו את `client/.env.example` ל-`client/.env` ומלאו:
   ```
   VITE_FIREBASE_API_KEY=...
   VITE_FIREBASE_AUTH_DOMAIN=...
   VITE_FIREBASE_PROJECT_ID=...
   VITE_FIREBASE_STORAGE_BUCKET=...
   VITE_FIREBASE_MESSAGING_SENDER_ID=...
   VITE_FIREBASE_APP_ID=...
   VITE_API_URL=http://localhost:3000/api
   ```

### 6. הגדרת Backend

העתיקו את `server/.env.example` ל-`server/.env` ומלאו לפי קובץ ה-Service
Account שהורדתם בשלב 4:

```
PORT=3000
FIREBASE_PROJECT_ID=...
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FRONTEND_URL=http://localhost:5173
TIMEZONE=Asia/Jerusalem
```

חשוב: את `FIREBASE_PRIVATE_KEY` יש להעתיק בדיוק כפי שהוא מופיע בקובץ ה-JSON
(כולל `\n`), בתוך מרכאות.

**לעולם אל תעלו את קובץ ה-`.env` או את ה-Service Account ל-git.** שני
הקבצים כלולים ב-`.gitignore`.

### 7. הרצת השרת (Backend)

```bash
cd server
npm install
npm run dev        # מריץ עם node --watch, מתחדש אוטומטית בכל שינוי
# או: npm start
```

השרת עולה בכתובת `http://localhost:3000`. אם `.env` לא מוגדר כראוי, השרת
עדיין יעלה (עם אזהרה בקונסול) אבל קריאות ל-Firestore/Auth ייכשלו - זה מכוון,
כדי לאפשר בדיקת מבנה הפרויקט גם בלי Firebase אמיתי.

### 8. הרצת הקליינט (Frontend)

```bash
cd client
npm install
npm run dev
```

האתר עולה בכתובת `http://localhost:5173`.

### 9. יצירת נתוני דוגמה (Demo Data)

לאחר שה-`.env` של השרת מוגדר עם Firebase אמיתי:

```bash
cd server
npm run seed
```

הסקריפט יוצר (וניתן להריץ שוב בבטחה - הוא מדלג על מה שכבר קיים):

- משתמש **ADMIN**: `admin@example.com` / `Admin123!`
- משתמש **MANAGER**: `manager@example.com` / `Manager123!`
- 3 עובדים עם משתמשי התחברות (`emp1/2/3@example.com`), טלפונים ו-PIN לזיהוי
  טלפוני (1001/1111, 1002/2222, 1003/3333)
- 4 מחלקות: משרדים, תחזוקה, מטבח, אבטחה
- רשומות נוכחות לדוגמה: אחת תקינה (COMPLETE), אחת פתוחה (OPEN - "בעבודה
  עכשיו"), ואחת עם `MISSING_CLOCK_OUT` (לא בוצעה יציאה)

### 10. התחברות כ-Admin

גשו ל-`http://localhost:5173/login` והתחברו עם `admin@example.com` /
`Admin123!`. תועברו אוטומטית ל-`/admin`.

---

## מבנה Firestore

| Collection | תיאור |
|---|---|
| `users/{uid}` | הרשאות: `role` (EMPLOYEE/MANAGER/ADMIN), `employeeId` |
| `employees/{id}` | פרטי עובד, כולל `phones`/`phoneNumbers` (לחיפוש מהיר לפי טלפון ב-IVR) |
| `departments/{id}` | מחלקות (`isActive` במקום מחיקה) |
| `attendanceSessions/{id}` | "משמרת" אחת: כניסה+יציאה+מחלקה. `status`: OPEN / COMPLETE / MISSING_CLOCK_OUT |
| `attendanceEvents/{id}` | לוג של כל אירוע כניסה/יציאה בפועל, עם `source` (WEB/PHONE/ADMIN/SYSTEM) |
| `attendanceChanges/{id}` | Audit - כל עריכה ידנית של רשומת נוכחות, לעולם לא נמחק |

עיקרון: `employees.phone` + `employees.phones[]` הם מקור האמת לטלפונים של
עובד; `employees.phoneNumbers[]` הוא שדה נגזר (denormalized) שמכיל רק את
המספרים המנורמלים, כדי לאפשר שאילתת `array-contains` מהירה ב-IVR
(`findEmployeeByPhone`). כל עדכון טלפון מעדכן את שני השדות יחד.

### תקופת עבודה (16 עד 15)

מחושבת במקום אחד בלבד: `server/utils/timeUtils.js` → `getWorkPeriod(year, month)`.
כל שאר המערכת (דוחות, Export, מסך "הנוכחות שלי") משתמשת בפונקציה הזו ולא
משכפלת את הלוגיקה.

---

## חיבור ימות המשיח (IVR)

השרת חושף שלוחת API בנתיב `/api/ivr` (ראו `server/routes/ivrRoutes.js`),
בנויה עם הספרייה [`yemot-router2`](https://github.com/ShlomoCode/yemot-router2)
שמיישמת את פרוטוקול ה-API הרשמי של ימות המשיח (הפרמטרים כמו `ApiPhone`
מגיעים ב-query/body, והתשובות בפורמט `read=` / `id_list_message=` /
`go_to_folder=` הנדרש). כל הלוגיקה העסקית בפועל (זיהוי לפי טלפון, כניסה,
יציאה) מ-`server/controllers/ivrController.js` קוראת ל-**אותו**
`attendanceService` שמשמש את האתר - אין מימוש כפול.

### הגדרה בממשק ימות המשיח

1. הקימו שלוחת API (מודול "API - תקשור עם מחשבים") בפאנל הניהול של ימות
   המשיח.
2. הגדירו את כתובת ה-URL של השלוחה לכתובת הציבורית של השרת שלכם, בנתיב:
   ```
   https://<הדומיין שלכם>/api/ivr
   ```
3. ודאו שהשרת נגיש מהאינטרנט (לא רק localhost) - למשל דרך פריסה ל-שרת
   ענן, או כלי כמו ngrok בזמן פיתוח.

### זרימת שיחה

1. זיהוי העובד לפי `ApiPhone` (עם נרמול מספר טלפון - `normalizePhoneNumber`).
   אם לא זוהה - אפשרות להזדהות ידנית עם מספר עובד + PIN.
2. תפריט מהיר: הקשה 1 = כניסה/יציאה (לפי המצב הנוכחי), 2 = הפניה לאתר
   לתיקון שעות, 3 = שמיעת מצב נוכחות, 4 = שמיעת סה"כ שעות בתקופה.
3. ביציאה - תפריט דינמי של מחלקות פעילות ואישור, ואז `attendanceService.clockOut()`
   עם `source: 'PHONE'`, בדיוק כמו באתר.

> **הערה:** יש לבדוק מול פאנל הניהול של ימות המשיח (ולפי תיעוד עדכני
> באתר ה-API של ימות המשיח / קהילת freeivr) שהפרמטרים ופורמט התשובה עדיין
> תואמים, ולעדכן גרסת `yemot-router2` בהתאם במידת הצורך.

---

## בדיקות

```bash
cd server
npm test
```

בדיקות שלא תלויות ב-Firebase (זמן, טלפון, הרשאות) רצות תמיד. בדיקות
הלוגיקה העסקית המרכזית (כניסה/יציאה/MISSING_CLOCK_OUT) ב-
`tests/attendanceService.test.js` דורשות Firestore Emulator:

```bash
firebase emulators:start --only firestore
# בטרמינל נפרד:
FIRESTORE_EMULATOR_HOST=localhost:8080 npm test
```

בלי המשתנה הזה, בדיקות אלו מדולגות אוטומטית (מסומנות `skipped`) - כדי
שאפשר יהיה להריץ `npm test` גם בלי חיבור ל-Firebase.

---

## Job לילי - סגירת ימים

`server/jobs/dailyAttendanceJob.js` רץ אוטומטית כל חצות (לפי Asia/Jerusalem,
דרך `node-cron`) ומחפש רשומות `attendanceSessions` שנשארו `OPEN`. הן
מסומנות `MISSING_CLOCK_OUT` - **בלי להמציא שעת יציאה**. העובד יכול לבצע
כניסה חדשה למחרת, ולערוך את הרשומה החסרה בעצמו (או שהמנהל יערוך אותה).

הג'וב רץ בתוך תהליך ה-Node של השרת (`node-cron`). אם המערכת נפרסת בסביבה
שבה השרת לא רץ ברציפות (למשל Cloud Run שמצטמצם ל-0 מופעים), מומלץ להחליף
להפעלה חיצונית קבועה (Google Cloud Scheduler שקורא לנתיב מוגן שמפעיל את
`runDailyAttendanceJob()`).

---

## API - סיכום נתיבים

כל התשובות בפורמט אחיד: `{ success: true, data }` או `{ success: false, message }`.
כל נתיב (מלבד `/api/ivr` ו-`/api/health`) דורש `Authorization: Bearer <Firebase ID Token>`.

```
GET   /api/auth/me

GET   /api/departments                     (כל משתמש מחובר - מחלקות פעילות)

GET   /api/attendance/status               (עובד)
POST  /api/attendance/clock-in             (עובד)
POST  /api/attendance/clock-out            (עובד)
GET   /api/attendance/my-period            (עובד)
GET   /api/attendance/:id                  (עובד לרשומה שלו / מנהל לכל רשומה)
PUT   /api/attendance/:id                  (כנ"ל - יוצר Audit)

GET   /api/admin/employees                 (ADMIN/MANAGER)
POST  /api/admin/employees
GET   /api/admin/employees/:id
PUT   /api/admin/employees/:id

GET   /api/admin/departments
POST  /api/admin/departments
PUT   /api/admin/departments/:id

GET   /api/admin/attendance
PUT   /api/admin/attendance/:id

GET   /api/admin/reports
GET   /api/admin/reports/departments
GET   /api/admin/reports/export            (מוריד קובץ Excel שנוצר ב-ExcelJS)

*     /api/ivr                             (ימות המשיח)
```

---

## עקרונות עיצוב שנשמרו במימוש

- **מקור אמת יחיד ללוגיקה עסקית**: `attendanceService.js` בלבד, גם לאתר
  וגם לטלפון.
- **חישוב זמן במקום אחד**: `timeUtils.js` (תקופת עבודה, פורמט שעות, אזור
  זמן).
- **Frontend לא נוגע ב-Firestore ישירות** - רק Firebase Auth + קריאות ל-API.
- **Audit לעולם לא נמחק** - כל עריכת נוכחות נשמרת ב-`attendanceChanges`.
- **אין המצאת שעת יציאה** - `MISSING_CLOCK_OUT` נשאר עם `clockOut: null`
  עד שמישהו (העובד או מנהל) יזין ידנית.
