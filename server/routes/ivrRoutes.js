import { YemotRouter } from 'yemot-router2';
import { handleIncomingCall } from '../controllers/ivrController.js';

// שימוש בספריית yemot-router2 (מיישמת את פרוטוקול ה-API הרשמי של ימות המשיח:
// פרמטרים כמו ApiPhone מגיעים ב-query/body, ותשובות בפורמט read=/id_list_message=/go_to_folder=).
// כתובת השלוחה בימות המשיח צריכה להצביע ל-URL הציבורי של השרת בנתיב הזה, לדוגמה:
// https://<your-domain>/api/ivr
const router = YemotRouter();

router.get('/', handleIncomingCall);
router.post('/', handleIncomingCall);

export default router;
