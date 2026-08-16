import { useNavigate } from 'react-router-dom';
import AdminHeader from '../../../components/admin/AdminHeader.jsx';
import CompetitionForm from '../../../components/admin/CompetitionForm.jsx';
import { useToast } from '../../../components/ui/Toast.jsx';
import { createCompetition } from '../../../services/competitionService.js';

export default function CreateCompetition() {
  const navigate = useNavigate();
  const toast = useToast();

  const handleSubmit = async (payload) => {
    const { error } = await createCompetition(payload);
    if (error) return toast.error(error.message || 'فشل الإنشاء');
    toast.success('تم إنشاء المسابقة');
    navigate('/admin/competitions');
  };

  return (
    <div className="mx-auto max-w-3xl">
      <AdminHeader title="مسابقة جديدة" />
      <CompetitionForm onSubmit={handleSubmit} />
    </div>
  );
}