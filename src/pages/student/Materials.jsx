import { useEffect, useState } from 'react';
import Card from '../../components/ui/Card.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import Icon from '../../components/ui/Icon.jsx';
import Skeleton from '../../components/ui/Skeleton.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import { useAuth } from '../../hooks/useAuth.js';
import { fetchMaterials, materialUrl, formatFileSize } from '../../services/materialService.js';
import { formatDate } from '../../utils/formatDate.js';

/** مكتبة المذكرات والملفات — ملفات صف الطالب فقط */
export default function Materials() {
  const { profile } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.grade) return;
    fetchMaterials(profile.grade)
      .then(({ data }) => setItems(data || []))
      .finally(() => setLoading(false));
  }, [profile?.grade]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-black">مكتبة المذكرات 🗂️</h1>
          <p className="mt-1 text-sm text-muted">ملفات صفك من المستر — المراجعات والمذكرات كلها في مكان واحد.</p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon="🗂️"
          title="مفيش ملفات لصفك لسه"
          description="لما المستر ينزّل مذكرات أو مراجعات لصفك هتظهر هنا على طول."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {items.map((item) => (
            <Card key={item.id} className="flex flex-col justify-between gap-3">
              <div>
                <div className="flex items-start justify-between gap-2">
                  <p className="font-display font-bold text-paper">{item.title}</p>
                  {item.file_size > 0 && (
                    <Badge color="muted">{formatFileSize(item.file_size)}</Badge>
                  )}
                </div>
                {item.description && <p className="mt-1 text-sm text-muted">{item.description}</p>}
                <p className="mt-2 text-xs text-muted/70">{formatDate(item.created_at)}</p>
              </div>
              <a href={materialUrl(item.file_path)} target="_blank" rel="noreferrer">
                <Button size="sm" className="w-full">
                  <Icon name="download" className="h-4 w-4" />
                  تحميل / فتح الملف
                </Button>
              </a>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}