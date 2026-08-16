import { useEffect, useState } from 'react';
import AdminHeader from '../../../components/admin/AdminHeader.jsx';
import FilterBar from '../../../components/admin/FilterBar.jsx';
import BookingTable from '../../../components/admin/BookingTable.jsx';
import Card from '../../../components/ui/Card.jsx';
import { useToast } from '../../../components/ui/Toast.jsx';
import { fetchAllBookings, updateBookingStatus } from '../../../services/bookingService.js';
import { BOOKING_STATUSES } from '../../../config/constants.js';

const STATUS_FILTERS = Object.values(BOOKING_STATUSES).map((s) => ({ value: s.value, label: s.label }));

export default function Bookings() {
  const toast = useToast();
  const [bookings, setBookings] = useState([]);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data } = await fetchAllBookings(status ? { status } : {});
    setBookings(data || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [status]);

  const handleStatus = async (id, next) => {
    const { error } = await updateBookingStatus(id, next);
    if (error) return toast.error('فشل التحديث');
    toast.success(next === 'confirmed' ? 'تم تأكيد الحجز' : 'تم رفض الحجز');
    load();
  };

  return (
    <div className="space-y-6">
      <AdminHeader title="الحجوزات" subtitle="راجع طلبات الحجز وأكّد أو ارفض" />
      <FilterBar
        filters={[
          {
            key: 'status',
            label: 'الحالة',
            value: status,
            onChange: setStatus,
            options: STATUS_FILTERS,
            placeholder: 'كل الحالات'
          }
        ]}
        onReset={() => setStatus('')}
      />
      {loading ? (
        <Card className="text-center text-muted">جارٍ التحميل...</Card>
      ) : (
        <BookingTable bookings={bookings} onUpdateStatus={handleStatus} />
      )}
    </div>
  );
}