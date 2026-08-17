import { useNavigate, useParams } from 'react-router-dom';
import AttendanceEditForm from '../../components/AttendanceEditForm.jsx';

export default function AttendanceEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const back = () => navigate('/employee/attendance');

  return (
    <div>
      <h1 className="page-title">עריכת דיווח נוכחות</h1>
      <AttendanceEditForm sessionId={id} onSaved={back} onCancel={back} />
    </div>
  );
}
