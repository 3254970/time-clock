# מצב המערכת הנוכחי - תיעוד טכני מלא

מסמך זה מתעד **בדיוק** מה המערכת עושה כרגע, איך היא עובדת, ואיזה קובץ אחראי
על מה - כהכנה לשדרוג מקיף. לתיעוד התקנה/פריסה ראו [README.md](README.md);
כאן הדגש הוא על **התנהגות ולוגיקה בפועל**, כפי שמומשה בקוד (לא תכנון/כוונות).

תאריך כתיבה: 2026-09-20, מבוסס על קריאת כל קובצי `server/` ו-`client/src`.

---

## 1. תמונה כללית

מערכת נוכחות עם שני ממשקי כניסה (אתר + טלפון/IVR) שחולקים **backend אחד**
ו-**מסד נתונים אחד** (Firestore). אין לוגיקה עסקית כפולה - כל פעולת
כניסה/יציאה/עריכה, מכל ממשק, עוברת דרך `server/services/attendanceService.js`.

```
דפדפן (React)  ──┐
                  ├─▶ Express API (Node.js) ──▶ Firestore
טלפון (ימות המשיח)┘        attendanceService.js
```

- **Frontend**: React 18 + Vite + React Router 6. לא נוגע ב-Firestore ישירות
  בכלל - `firestore.rules` חוסם כל גישה ישירה מ-Client SDK (`allow read,
  write: if false` לכל מסמך). הקליינט רק מבצע Firebase Auth (התחברות) וקורא
  ל-API של השרת עם Bearer token.
- **Backend**: Express, מורכב מ-`app.js` (routes בלבד) שמורכב פעמיים -
  כריצה עצמאית (`server.js`, `node --watch`) וכ-Firebase Cloud Function Gen1
  (`functionsIndex.js`, לעקוף חסימת `run.googleapis.com` ברשתות מסוננות).
- **Auth**: Firebase Authentication (Email/Password). תפקיד המשתמש
  (`role`) לא נשמר ב-Auth אלא במסמך נפרד `users/{uid}` ב-Firestore.
- **Excel**: נבנה תמיד בשרת (ExcelJS), לא בקליינט.
- **זמן**: כל חישוב זמן עובר דרך Luxon עם אזור `Asia/Jerusalem` (משתנה
  סביבה `TIMEZONE`), במקום מרכזי אחד (`server/utils/timeUtils.js`).

---

## 2. מודל הנתונים (Firestore)

### `users/{uid}`
מסמך הרשאות בלבד, `uid` = Firebase Auth UID.
| שדה | תיאור |
|---|---|
| `role` | `'EMPLOYEE' \| 'MANAGER' \| 'ADMIN'` |
| `employeeId` | מזהה מסמך ב-`employees`, או `null` עבור ADMIN/MANAGER שאינם גם עובדים |
| `email` | מועתק מ-Auth, לנוחות |
| `updatedAt` | |

נוצר/מתעדכן דרך `userService.setUserRole()` - נקרא מ: יצירת עובד
(`employeeService.createEmployee`), ומ-`authController.updateMe` כשמתעדכן אימייל.

### `employees/{id}`
| שדה | תיאור |
|---|---|
| `employeeNumber` | מחרוזת, ייחודי (נאכף באפליקציה, לא ב-Firestore) |
| `firstName`, `lastName`, `fullName` | `fullName` נגזר בשרת בכל יצירה/עדכון |
| `phone` | הטלפון הראשי, מנורמל (`normalizePhoneNumber`) |
| `phones[]` | מערך אובייקטים `{ phone, isPrimary, canClock }` - כיום תמיד רק הטלפון הראשי, `isPrimary: true` |
| `phoneNumbers[]` | **שדה נגזר (denormalized)** - רק המספרים המנורמלים, כדי לאפשר `array-contains` מהיר בזיהוי טלפוני של ה-IVR. כל עדכון טלפון מעדכן את שלושתם יחד |
| `pin` | קוד PIN לזיהוי טלפוני חלופי (מספר עובד + PIN) |
| `status` | `'ACTIVE' \| 'INACTIVE'` |
| `firebaseUid` | UID של משתמש ה-Auth שלו, או `null` אם נוצר בלי אימייל (עובד בלי גישה לאתר, רק IVR) |

### `departments/{id}`
| שדה | תיאור |
|---|---|
| `name` | שם, טקסט חופשי |
| `isActive` | בוליאני - מחלקות לא נמחקות, רק מושבתות (`isActive: false`) |

### `attendanceSessions/{id}`
"משמרת" אחת - הרשומה המרכזית שכל המסך מסתמך עליה.
| שדה | תיאור |
|---|---|
| `employeeId` | |
| `clockIn` | Firestore Timestamp, **תמיד נקבע בשרת** (`nowInZone()`) - לעולם לא מתקבל מהקליינט בכניסה רגילה |
| `clockOut` | Timestamp או `null` |
| `departmentId` | נבחר **ביציאה** בלבד, לא בכניסה |
| `status` | `'OPEN' \| 'COMPLETE' \| 'MISSING_CLOCK_OUT'` - ראו state machine בסעיף 3 |
| `clockInSource` / `clockOutSource` | `'WEB' \| 'PHONE' \| 'ADMIN' \| null` |

### `attendanceEvents/{id}`
לוג טכני-בלבד של כל אירוע כניסה/יציאה בפועל (לא לעריכות). לא מוצג
ב-UI כרגע - קיים ל-audit/דיבוג עתידי.
`{ employeeId, sessionId, type: 'CLOCK_IN'|'CLOCK_OUT', timestamp, source, createdBy, metadata }`

### `attendanceChanges/{id}`
**Audit permanent - לעולם לא נמחק**, גם כשה-session עצמו נמחק. נכתב בכל
עריכה/יצירה ידנית/מחיקה של session (`updateSession`, `createManualSession`,
`deleteSession`, `markSessionMissing`).
`{ attendanceSessionId, employeeId, changedByUid, changedByRole, changedAt, oldValues, newValues, source, action? }`
- `changedByUid: 'SYSTEM'` עבור סגירה אוטומטית ע"י הג'וב הלילי.
- `action: 'DELETE'` נכתב **לפני** המחיקה בפועל, עם השדה `newValues: null`.
- `action: 'CREATE'` עבור הוספת דיווח ידני (`oldValues: null`).
- עריכה רגילה (`updateSession`) - אין שדה `action` (undefined).

### אינדקסים מורכבים (`firestore.indexes.json`)
1. `attendanceSessions`: `employeeId ASC, status ASC` - לאיתור ה-session הפתוח של עובד.
2. `attendanceSessions`: `employeeId ASC, clockIn DESC` - להיסטוריה של עובד.
3. `employees`: `employeeNumber ASC, pin ASC` - לזיהוי טלפוני (מספר עובד+PIN).

---

## 3. הלוגיקה העסקית המרכזית - `attendanceService.js`

זהו **מקור האמת היחיד**. כל שאר הקוד (controllers, IVR, reports) קורא לפונקציות
כאן ולא נוגע ב-Firestore של attendance ישירות.

### State machine של session
```
(אין session)  --clockIn()-->  OPEN  --clockOut()-->  COMPLETE
                                 │
                                 └--(חצות, עדיין פתוח)--> MISSING_CLOCK_OUT
```
- **`clockIn({employeeId, source, createdBy})`**: נכשל (409) אם לעובד כבר יש
  session `OPEN`. קובע `clockIn = nowInZone()` בשרת - **לא מקבל שעה מהקליינט**.
  יוצר גם רשומת `attendanceEvents` מסוג `CLOCK_IN`.
- **`clockOut({employeeId, departmentId, source, createdBy})`**: נכשל (400) אם
  אין session פתוח, ואם לא נבחרה מחלקה (**חובה לבחור מחלקה ביציאה, לא
  בכניסה**), ואם המחלקה שנבחרה לא `isActive`. קובע `clockOut = nowInZone()`.
- **`markSessionMissing(sessionId)`**: משמש **רק** את הג'וב הלילי (סעיף 6).
  משנה סטטוס ל-`MISSING_CLOCK_OUT` - **לא ממציא שעת יציאה**, `clockOut` נשאר
  `null` לצמיתות עד שמישהו (העובד או מנהל) יזין אותה ידנית דרך עריכה.
- **`updateSession(sessionId, updates, ctx)`**: משמש גם עובד (לרשומה שלו
  בלבד) וגם מנהל (לכל רשומה) - האכיפה מי מותר לו נעשית ב-controller
  (`assertCanAccessSession`), לא כאן. ולידציות: `clockIn` שדה חובה,
  `clockOut` (אם קיים) לא יכול להיות לפני `clockIn`. **סטטוס נגזר אוטומטית**:
  אם יש `clockOut` → `COMPLETE`, אחרת → `OPEN` (כלומר עריכה יכולה "לפתוח
  מחדש" רשומת `MISSING_CLOCK_OUT` פשוט על ידי מתן `clockOut`, או להפוך
  `COMPLETE` בחזרה ל-`OPEN` אם מוחקים את שעת היציאה בעריכה). כל עריכה כותבת
  שורת Audit עם `oldValues`/`newValues` מלאים.
- **`createManualSession(...)`**: **מנהל בלבד** (route-level) - יוצרת session
  ישירות עם שעות שהוזנו, לא עוברת דרך `clockIn`/`clockOut` (אין "session
  פתוח" אמיתי בתהליך). אם יש גם `clockOut` בבקשה - נוצרת ישר כ-`COMPLETE`.
  יוצרת גם events (`CLOCK_IN`, ו-`CLOCK_OUT` אם קיים) וגם Audit
  (`action: 'CREATE'`).
- **`deleteSession(...)`**: מוחקת session לצמיתות. כותבת Audit
  (`action: 'DELETE'`) **לפני** המחיקה כדי שתמיד יהיה תיעוד שהרשומה
  הייתה קיימת ונמחקה, מי ומתי. עובד יכול למחוק רק רשומה שלו, מנהל - כל
  רשומה (שוב, נאכף ב-controller).
- **`deleteAllDataForEmployee(employeeId)`**: מוחקת (ב-batches של 500)
  את **כל** ה-`attendanceSessions`, `attendanceEvents`, `attendanceChanges`
  של עובד. נקראת רק מ-`employeeService.deleteEmployee` - כלומר **מחיקת
  עובד מוחקת גם את כל היסטוריית הנוכחות שלו, כולל ה-Audit** (הקליינט
  מציג אזהרה מפורשת על כך לפני האישור, אך אין "רק השבתה" אוטומטית - מחיקה
  היא תמיד מלאה ובלתי הפיכה).

### תקופת עבודה (חודש קלנדרי)
`server/utils/timeUtils.js` → `getWorkPeriod(year, month)` מחזירה טווח
מה-1 עד היום האחרון בחודש (כולל טיפול נכון בשנים מעוברות דרך
`DateTime.endOf('month')` של Luxon). `getCurrentWorkPeriod()` = התקופה
של החודש הקלנדרי הנוכחי. **כל** מסך/endpoint שמציג טווח חודשי (הנוכחות
שלי, כרטיס עובד, דוחות, Export) מקבל `year`/`month` אופציונליים
ומשתמש ב-`getWorkPeriod` אם ניתנו, אחרת נופל ל-`getCurrentWorkPeriod()`.
בקליינט, `client/src/utils/period.js` → `getCurrentPeriodParts()` מחזירה
רק את ברירת המחדל לבורר החודש (שנה/חודש נוכחיים) - **אין** חישוב טווח
תאריכים בפועל בקליינט, זה נעשה תמיד בשרת.

---

## 4. הרשאות ואימות (Auth)

### זרימת בקשה מאומתת בשרת
1. הקליינט שולח `Authorization: Bearer <Firebase ID Token>` בכל בקשה
   (מצורף אוטומטית ב-`client/src/services/api.js`, מ-`auth.currentUser.getIdToken()`).
2. `verifyFirebaseToken` (middleware): מאמת את הטוקן מול Firebase Auth,
   טוען את `users/{uid}` מ-Firestore, וממלא `req.user = {uid, email, role,
   employeeId}`. אם אין מסמך `users/{uid}` - 403 ("המשתמש אינו רשום במערכת").
   אם הטוקן פג/לא תקין - 401.
3. `requireRole(rolesInput)` (middleware, אחריו): בודק ש-`req.user.role`
   נמצא ברשימת התפקידים המותרים לנתיב, אחרת 403.

### ADMIN מול MANAGER
**אין הבדל פונקציונלי בין השניים בשום מקום בקוד** - תמיד נבדקים יחד
כקבוצה `['ADMIN', 'MANAGER']` (גם ב-routes, גם ב-`ProtectedRoute` בקליינט,
גם בבדיקות `isAdmin` נקודתיות ב-`attendanceController`). שני ה-roles קיימים
כנראה לצורך הבחנה עתידית (רישום מי ביצע פעולה), אבל היום הם שקולים לגמרי
מבחינת הרשאות.

### בקליינט - `ProtectedRoute.jsx` + `AuthContext.jsx`
- `AuthContext` מאזין ל-`onAuthStateChanged` של Firebase, וכשיש משתמש
  מחובר טוען את הפרופיל מ-`GET /api/auth/me` (role+employeeId+פרטי עובד).
  אם טעינת הפרופיל נכשלת (טוקן פג/משתמש נמחק) - מתנתק אוטומטית
  (`signOut`), כדי לא "להיתקע" עם משתמש Firebase בלי פרופיל תקין.
- `ProtectedRoute` (עוטף route ב-`App.jsx`): אם אין `firebaseUser` או אין
  `role` → מפנה ל-`/login`. אם יש role אך לא ברשימת ה-`roles` המותרים
  לנתיב → מפנה (מ-**2026-09-20**) לדף הבית של אותו משתמש לפי role
  (`getHomePathForRole`, ב-`client/src/utils/roles.js`: `EMPLOYEE →
  /employee`, אחרת `/admin`) - **לא** מציג הודעת שגיאה. אותה פונקציה
  משמשת גם ב-`LoginPage` להפניה אחרי התחברות מוצלחת.
- מבנה נתיבים (`App.jsx`): `/login`, `/employee/*` (roles: `EMPLOYEE`),
  `/admin/*` (roles: `ADMIN`, `MANAGER`). `/` וכל נתיב לא מוכר (`*`)
  מפנים ל-`/login` (שמפנה הלאה לדף הבית אם המשתמש כבר מחובר).

---

## 5. מפת אחריות קבצים

### Server
| קובץ | אחריות |
|---|---|
| `app.js` | הרכבת Express: middleware גלובלי (`cors`, `json`, `urlencoded`), חיבור כל ה-routers, health check, error handlers. **בלי `listen()`** - כדי לשמש גם כ-Function |
| `server.js` | נקודת כניסה לריצה עצמאית: `app.listen()` + הפעלת ה-cron המקומי |
| `functionsIndex.js` | נקודת כניסה כ-Firebase Function (Gen1): מייצא `api` (אותו `app`) ו-`dailyJob` (scheduled) |
| `firebase/firebaseAdmin.js` | אתחול Firebase Admin SDK (`db`, `authAdmin`, `FieldValue`) מ-`SA_*` env vars |
| `middleware/verifyFirebaseToken.js` | אימות טוקן + טעינת `req.user` |
| `middleware/requireRole.js` | אכיפת role על נתיב |
| `middleware/errorHandler.js` | תשובת שגיאה אחידה + 404 handler |
| `utils/AppError.js` | מחלקת שגיאה עם `statusCode` |
| `utils/asyncHandler.js` | עוטף async controllers כדי שחריגות יגיעו ל-`errorHandler` |
| `utils/apiResponse.js` | `sendSuccess()` - עטיפת תשובה אחידה `{success:true,data}` |
| `utils/timeUtils.js` | **כל** חישובי הזמן: אזור זמן, `getWorkPeriod`, פורמוט, הפרשי זמן |
| `utils/phoneUtils.js` | נרמול מספרי טלפון ישראליים לפורמט `05XXXXXXXX` |
| `utils/statusLabels.js` | תרגום קודי סטטוס לעברית (למסכים/Excel) |
| `services/attendanceService.js` | **הלוגיקה המרכזית** - ראו סעיף 3 |
| `services/employeeService.js` | CRUD עובדים, יצירת Auth user, מחיקה מלאה (כולל נוכחות) |
| `services/departmentService.js` | CRUD מחלקות (מחיקה = `isActive:false`) |
| `services/userService.js` | ניהול מסמך `users/{uid}` + עדכון Auth credentials |
| `services/reportService.js` | כל צבירת הנתונים לדוחות/Dashboard/כרטיס עובד/Export (ראו סעיף 7) |
| `services/excelService.js` | בניית קובצי Excel (ExcelJS) - גיליון לעובד + גיליון סיכום |
| `services/ivrService.js` | פונקציות עזר ל-IVR (זיהוי עובד, מחלקות פעילות, סה"כ תקופה) - לא לוגיקה עסקית |
| `controllers/*.js` | קליטת HTTP request, בדיקות הרשאה נקודתיות (`assertCanAccessSession`), קריאה ל-services, `sendSuccess` |
| `controllers/ivrController.js` | **מכונת המצבים המלאה של שיחת IVR** (תפריטים, קלט טלפון) - ראו סעיף 8 |
| `routes/*.js` | הגדרת נתיבים + `requireRole` בלבד, בלי לוגיקה |
| `jobs/dailyAttendanceJob.js` | הג'וב הלילי - ראו סעיף 6 |
| `scripts/seed.js` | יצירת נתוני דוגמה (אדמין+מנהל+3 עובדים+4 מחלקות+3 sessions לדוגמה), אידמפוטנטי |

### Client
| קובץ | אחריות |
|---|---|
| `App.jsx` | הגדרת כל ה-Routes + מיפוי roles לנתיבים |
| `context/AuthContext.jsx` | מצב התחברות גלובלי (Firebase user + profile מהשרת) |
| `context/ToastContext.jsx` | הודעות Toast גלובליות (נעלמות אחרי 4 שניות) |
| `hooks/useAuth.js`, `hooks/useToast.js` | Hooks לצריכת ה-Contexts הנ"ל |
| `components/ProtectedRoute.jsx` | שמירת נתיבים לפי התחברות+role (סעיף 4) |
| `services/firebase.js` | אתחול Firebase Client SDK (Auth בלבד) |
| `services/api.js` | עטיפת `fetch` ל-API: מצרפת טוקן, מפרקת `{success,data}`, זורקת `Error` על כשל |
| `utils/period.js` | ברירת מחדל לבורר חודש (שנה/חודש נוכחיים בלבד) |
| `utils/roles.js` | מיפוי role → נתיב דף הבית (`EMPLOYEE→/employee`, אחרת `/admin`) |
| `layouts/EmployeeLayout.jsx` / `AdminLayout.jsx` | Sidebar + `Outlet`, כפתור התנתקות, (עובד) גישה ל-`ProfileModal` |
| `pages/auth/LoginPage.jsx` | טופס התחברות; אם כבר מחובר - מפנה לדף הבית לפי role |
| `pages/employee/EmployeeHome.jsx` | מסך הבית של עובד: סטטוס חי (פולינג כל 60 שנ'), כניסה/יציאה, בחירת מחלקה ביציאה (Modal) |
| `pages/employee/AttendanceHistory.jsx` | היסטוריית נוכחות של העובד לחודש נבחר, ניווט קודם/הבא, הוספת דיווח ידני |
| `pages/employee/AttendanceEdit.jsx` | עמוד עריכת דיווח בודד (עוטף `AttendanceEditForm`) |
| `components/AttendanceEditForm.jsx` | טופס עריכה/מחיקה של session בודד - משותף לעובד ולמנהל |
| `components/AddAttendanceModal.jsx` | טופס הוספת דיווח ידני - משותף לעובד (`POST /attendance`) ולמנהל (`POST /admin/attendance`, עם `employeeId`) |
| `components/ProfileModal.jsx` | עריכת פרטים אישיים + סיסמה (`PUT /auth/me`) |
| `pages/admin/AdminDashboard.jsx` | כרטיסי סיכום + טבלת כל העובדים, פולינג כל 60 שנ' |
| `pages/admin/EmployeesList.jsx` | ניהול עובדים: חיפוש, הוספה, השבתה/הפעלה, מחיקה (עם אזהרה), קישור איפוס סיסמה |
| `pages/admin/EmployeeDetail.jsx` | כרטיס עובד: פרטים+סטטוס+היסטוריה לחודש נבחר, עריכה/מחיקה/הוספה של דיווחים, עריכת פרטי עובד |
| `pages/admin/EmployeeFormModal.jsx` / `EmployeeEditModal.jsx` | טפסי יצירה/עריכה של עובד |
| `pages/admin/DepartmentsPage.jsx` | ניהול מחלקות: הוספה/עריכה/השבתה-הפעלה |
| `pages/admin/ReportsPage.jsx` | דוח סיכום עובדים + דוח מחלקות (עם drill-down) + הורדת Excel (כל העובדים/עובד בודד) |
| `components/{Modal,LoadingState,EmptyState,ErrorState,StatusBadge}.jsx` | רכיבי UI גנריים משותפים |

---

## 6. הג'וב הלילי - סגירת ימים

`dailyAttendanceJob.runDailyAttendanceJob()`: שולף את כל ה-`attendanceSessions`
במצב `OPEN` (בכל התקופות, לא רק היום) ומסמן כל אחת `MISSING_CLOCK_OUT`
דרך `markSessionMissing`. **לא ממציא שעת יציאה**.

שתי דרכי הפעלה, **קוראות לאותה פונקציה בדיוק**:
- ריצה מקומית (`server.js`): `node-cron` בתוך תהליך ה-Node, מתוזמן ל-`'0 0
  * * *'` באזור `Asia/Jerusalem`.
- בפריסה בענן (Firebase Functions): אין תהליך רציף (סרברלס) אז `node-cron`
  לא רלוונטי - `functionsIndex.js` מייצא `dailyJob` כ-Cloud Scheduler
  function נפרדת, אותו cron expression ואותו אזור זמן.

---

## 7. דוחות (`reportService.js`) - מה כל פונקציה בדיוק מחשבת

כולן משתמשות ב-`getWorkPeriod`/`getCurrentWorkPeriod` (סעיף 3) לקביעת
הטווח, ובפונקציית עזר פנימית `completedMinutes(session)` שמחזירה 0 לכל
session שאינו `COMPLETE` (כלומר `OPEN`/`MISSING_CLOCK_OUT` **לא נספרים**
בסך השעות בשום דוח).

- **`getEmployeesOverview()`** (Dashboard): לכל עובד - סטטוס נוכחי (יש
  session `OPEN`?), נתוני "היום" (session שה-`clockIn` שלו = תאריך היום),
  וסך דקות מושלמות בתקופה. `missingCount` בכרטיסי הסיכום = **סכום כל**
  ה-`MISSING_CLOCK_OUT` בתקופה על פני כל העובדים (לא רק היום).
- **`getEmployeeDetail(employeeId, {year,month})`** (כרטיס עובד): כנ"ל
  אבל לעובד בודד + כל שורות ה-session המעוצבות (`buildDisplayRow`) לתקופה.
- **`getEmployeesReport({year,month,employeeId})`**: טבלת סיכום - שם, סך
  שעות, מספר sessions, מספר חסרים. אם `employeeId` ניתן - שורה אחת בלבד.
- **`getFullExportData(...)`**: מכינה גם `summaryRows` (לגיליון סיכום)
  וגם `employeeSheets` (rows מעוצבות מלאות לכל עובד) - **שאילתת Firestore
  אחת בלבד** לכל התקופה (לא שאילתה נפרדת לכל עובד).
- **`getDepartmentsReport({year,month})`**: מקבץ רק sessions `COMPLETE`
  עם `departmentId` (session ללא מחלקה - למשל `MISSING_CLOCK_OUT` - לא
  נכלל כלל), מחזיר לכל מחלקה סך דקות + רשימת sessions מפורטת, ממוין
  מהמחלקה עם הכי הרבה שעות.

### Excel Export
`GET /api/admin/reports/export` - בונה workbook עם ExcelJS (RTL), מוריד
כ-attachment. עם `employeeId` → קובץ יחיד לעובד (`writeEmployeeSheet`).
בלי → קובץ עם גיליון "סיכום" + גיליון נפרד לכל עובד (שם הגיליון מנוקה
מתווים אסורים ומקוצץ ל-31 תווים, מגבלת Excel).

---

## 8. IVR (ימות המשיח) - זרימת שיחה מלאה

מבוסס על ספריית `yemot-router2` שמממשת את פרוטוקול ה-API של ימות המשיח.
כל הלוגיקה העסקית עוברת דרך `attendanceService` - `ivrController.js` הוא
רק "מכונת תפריטים" טלפונית.

1. **בקשת ניתוק** (`call.values.hangup === 'yes'`) - יוצאים מיד, בלי לנסות
   להשמיע כלום (השיחה כבר לא פעילה).
2. **זיהוי מתקשר** (`identifyCaller`): קודם לפי `ApiPhone` (הטלפון שממנו
   מתקשרים, מנורמל, מול `employees.phoneNumbers`). אם לא נמצא - מציע
   הזדהות ידנית: מספר עובד + PIN (מקש 1 לאישור, אחרת מנותק).
3. אם העובד נמצא אך `status !== 'ACTIVE'` - הודעה "חשבונך אינו פעיל" ומנותק.
4. **תפריט ראשי** (תלוי אם העובד כרגע `IN` או `OUT`):
   - מקש 1: אם `IN` → `handleClockOut`, אם `OUT` → `handleClockIn`.
   - מקש 2: הודעה "יש להיכנס לאתר" (**אין** תיקון שעות דרך הטלפון).
   - מקש 3: `handleStatusInfo` - משמיע שעת כניסה + זמן עבודה עד כה (רק אם `IN`).
   - מקש 4: `handlePeriodTotal` - סך שעות מושלמות בחודש הקלנדרי הנוכחי.
5. **`handleClockOut`**: מציג תפריט דינמי של כל המחלקות הפעילות (ממוספר
   לפי הסדר), דורש אישור נוסף (מקש 1) לפני ביצוע בפועל, ואז קורא
   ל-`attendanceService.clockOut` עם `source:'PHONE'`. אם אין מחלקות פעילות
   בכלל - מודיע ומנתק בלי לאפשר יציאה.
6. **שגיאות**: כל השיחה עטופה ב-`try/catch` - על שגיאה כלשהי (כולל
   שגיאות עסקיות מ-`attendanceService`, למשל ניסיון כניסה כפולה) משמיע
   "אירעה שגיאה, נא לנסות שוב" ומסיים בשקט אם השיחה כבר נותקה.

**הערה לשדרוג**: לפי הערה בקוד עצמו (`ivrController.js`) - מנוע ה-TTS של
ימות המשיח לא תומך בנקודות/פסיקים בטקסט, לכן כל משפט הוא איבר נפרד
במערך הודעות. יש לבדוק תאימות הפרוטוקול מול תיעוד ימות המשיח העדכני
לפני שינויים בשכבה הזו.

---

## 9. נקודות תשומת לב לפני שדרוג (Known quirks)

- **ADMIN ≡ MANAGER**: אין שום הבדל הרשאות בפועל כרגע (סעיף 4). אם השדרוג
  אמור להבדיל ביניהם - זו עבודה חדשה, לא תיקון קיים.
- **`attendanceEvents` כמעט לא נצרך**: נכתב בכל כניסה/יציאה אבל אין
  שום מסך שקורא ממנו - היום זה log write-only. `attendanceChanges`
  (ה-Audit) כן משמש בעתיד לפוטנציאל תצוגה, אך גם הוא לא מוצג ב-UI כרגע.
- **מחיקת עובד = מחיקת כל ההיסטוריה שלו לצמיתות**, כולל ה-Audit. אין
  "ארכיון" - רק אזהרת UI לפני האישור.
- **`phoneNumbers[]` הוא denormalization ידני** - כל שינוי טלפון חייב
  לעדכן גם את `phone` וגם את `phones[]` וגם את `phoneNumbers[]` ביחד
  (נעשה כיום נכון ב-`employeeService`, אבל שדרוג שמוסיף עוד מקום שכותב
  טלפון חייב לשמור על כך).
- **ולידציית ייחודיות (`employeeNumber`, טלפון) נעשית באפליקציה**, לא
  ב-Firestore (אין unique constraints אמיתיים) - יש חלון race קטן תיאורטי
  בין הבדיקה לכתיבה.
- **`createManualSession` לא בודקת חפיפה** עם sessions קיימים של אותו
  עובד (בשונה מ-`clockIn` הרגיל שבודק "כבר יש session פתוח") - מנהל יכול
  תיאורטית ליצור רשומות חופפות בזמן.
- **עדכון role של משתמש (ADMIN/MANAGER) לא נגיש דרך ה-UI בכלל** - נוצר
  רק דרך `scripts/seed.js` או ישירות ב-Firestore/קוד. אין מסך "ניהול
  הרשאות" באתר.
- **בורר החודש בקליינט הוא state זמני בלבד** (לא ב-URL/localStorage) -
  ריענון דף תמיד מאפס בחזרה לחודש הנוכחי, גם ב-`AttendanceHistory`,
  `EmployeeDetail` וגם `ReportsPage`.
- **פולינג, לא real-time**: `EmployeeHome` ו-`AdminDashboard` מרעננים
  נתוני סטטוס כל 60 שניות עם `setInterval` (לא Firestore listeners/WebSocket).
- **`server/Dockerfile` קיים אך לא בשימוש בפריסה הנוכחית** - הפריסה
  היא Firebase Functions Gen1, לא Cloud Run (ראו README, "למה Cloud
  Function ולא Cloud Run").

---

## 10. סיכום קבצי תלות עיקריים (package.json)

**Server**: `express`, `firebase-admin`, `firebase-functions`, `luxon`,
`node-cron`, `exceljs`, `yemot-router2`, `cors`, `dotenv`. Node 22, ES Modules.

**Client**: `react` 18, `react-router-dom` 6, `firebase` 10 (client SDK,
Auth בלבד), `vite` 5. בלי ספריית UI/state management חיצונית (CSS רגיל,
`useState`/`useContext` בלבד).
