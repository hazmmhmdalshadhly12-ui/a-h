import { cn } from '../../lib/utils.js';

/** جدول بيانات عام — columns: [{key, label, render, className, headerClassName}] */
export default function DataTable({ columns, rows, emptyMessage = 'لا توجد بيانات', keyField = 'id' }) {
  if (!rows || rows.length === 0) {
    return (
      <div className="card-panel flex items-center justify-center py-12 text-sm text-muted">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="card-panel overflow-hidden rounded-lens">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-right">
          <thead>
            <tr className="border-b border-ink-600 bg-ink-900/60">
              {columns.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  className={cn('px-4 py-3 text-xs font-bold uppercase tracking-wide text-muted', col.headerClassName)}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-700/60">
            {rows.map((row) => (
              <tr key={row[keyField]} className="transition hover:bg-ink-700/30">
                {columns.map((col) => (
                  <td key={col.key} className={cn('px-4 py-3 text-sm', col.className)}>
                    {col.render ? col.render(row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}