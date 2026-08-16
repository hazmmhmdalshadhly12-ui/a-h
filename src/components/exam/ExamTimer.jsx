import { useState, useEffect, useRef } from 'react';

export default function ExamTimer({ seconds, onExpire }) {
  const [timeLeft, setTimeLeft] = useState(seconds);
  const onExpireRef = useRef(onExpire);

  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  useEffect(() => {
    if (!seconds || seconds <= 0) return;

    setTimeLeft(seconds);

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          if (onExpireRef.current) {
            onExpireRef.current();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [seconds]);

  const formatTime = (totalSec) => {
    if (isNaN(totalSec) || totalSec < 0) return '00:00';
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div className="inline-flex items-center gap-2 rounded-lg bg-red-500/10 px-3 py-1 text-sm font-bold text-red-400 border border-red-500/20">
      <span>⏱️ المتبقي:</span>
      <span className="font-mono">{formatTime(timeLeft)}</span>
    </div>
  );
}
