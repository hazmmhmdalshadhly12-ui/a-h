import { useEffect, useState, useMemo } from 'react';
import AdminHeader from '../../../components/admin/AdminHeader.jsx';
import StudentTable from '../../../components/admin/StudentTable.jsx';
import SearchBar from '../../../components/admin/SearchBar.jsx';
import FilterBar from '../../../components/admin/FilterBar.jsx';
import Card from '../../../components/ui/Card.jsx';
import { fetchAllStudents } from '../../../services/profileService.js';
import { GRADES_OPTIONS } from '../../../config/constants.js';
import { useNavigate } from 'react-router-dom';

export default function Students() {
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState('');
  const [grade, setGrade] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data } = await fetchAllStudents({ search, grade });
    setStudents(data || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [search, grade]);

  const gradeLabel = useMemo(
    () => (grade ? GRADES_OPTIONS.find((g) => g.value === grade)?.label : null),
    [grade]
  );

  return (
    <div className="space-y-6">
      <AdminHeader
        title="الطلاب"
        subtitle={gradeLabel ? `عرض: ${gradeLabel}` : 'كل الطلاب المسجلين'}
      />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <SearchBar value={search} onChange={setSearch} placeholder="ابحث بالاسم أو الموبايل..." className="w-full max-w-sm" />
        <FilterBar
          filters={[
            {
              key: 'grade',
              label: 'الصف',
              value: grade,
              onChange: setGrade,
              options: GRADES_OPTIONS,
              placeholder: 'كل الصفوف'
            }
          ]}
          onReset={() => setGrade('')}
        />
      </div>
      {loading ? (
        <Card className="text-center text-muted">جارٍ التحميل...</Card>
      ) : (
        <StudentTable students={students} onView={(id) => navigate(`/admin/students/${id}`)} />
      )}
    </div>
  );
}