import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AdminHeader from '../../../components/admin/AdminHeader.jsx';
import CompetitionForm from '../../../components/admin/CompetitionForm.jsx';
import Card from '../../../components/ui/Card.jsx';
import { useToast } from '../../../components/ui/Toast.jsx';
import { fetchCompetitionById, updateCompetition } from '../../../services/competitionService.js';

export default function EditCompetition() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [comp, setComp] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCompetitionById(id).then(({ data }) => {
      setComp(data);
      setLoading(false);
    });
  }, [id]);

  const handleSubmit = async (payload) => {
    const { error } = await updateCompetition(id, payload);
    if (error) return toast.error('فشل الحفظ');
    toast.success('تم تحديث المسابقة');
    navigate('/admin/competitions');
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl">
        <AdminHeader title="تعديل المسابقة" />
        <Card className="text-center text-muted">جارٍ التحميل...</Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <AdminHeader title="تعديل المسابقة" />
      <CompetitionForm initial={comp} onSubmit={handleSubmit} />
    </div>
  );
}