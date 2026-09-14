import { useCallback, useEffect, useRef, useState } from 'react';
import Icon from '../ui/Icon.jsx';

// ============================================================
// LessonVideoPlayer.jsx — مشغّل فيديو بتحكم من المنصة
// * فيديو مباشر (Storage/MP4): مشغّل كامل بأزرار المنصة، بدون أي علامة خارجية
//   + دعم HLS (.m3u8) مع تبديل الجودة الحقيقية
// * يوتيوب: واجهة دخول بأزرار المنصة + تحكم تشغيل/إيقاف/تقدم/±10ث من المنصة
//   (شعار يوتيوب نفسه لا يمكن إزالته طول ما الفيديو مستضاف عندهم)
// * علامة مائية متحركة برقم الطالب (رادع ضد التسريبات — لا يمنع التصوير نهائياً)
// ============================================================

function formatTime(sec) {
  if (!sec || !isFinite(sec)) return '0:00';
  const s = Math.floor(sec);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
}

function extractYouTubeId(url) {
  if (!url) return null;
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
  return match ? match[1] : null;
}

function isHlsUrl(url) {
  return /\.m3u8(\?|#|$)/i.test(url || '');
}

let ytApiPromise = null;
function loadYouTubeApi() {
  if (ytApiPromise) return ytApiPromise;
  ytApiPromise = new Promise((resolve, reject) => {
    if (window.YT && window.YT.Player) {
      resolve(window.YT);
      return;
    }
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    tag.async = true;
    tag.onerror = () => reject(new Error('تعذر تحميل مشغل يوتيوب'));
    window.onYouTubeIframeAPIReady = () => resolve(window.YT);
    document.body.appendChild(tag);
  });
  return ytApiPromise;
}

let hlsPromise = null;
function loadHlsJs() {
  if (hlsPromise) return hlsPromise;
  hlsPromise = new Promise((resolve, reject) => {
    if (window.Hls) {
      resolve(window.Hls);
      return;
    }
    const tag = document.createElement('script');
    tag.src = 'https://cdn.jsdelivr.net/npm/hls.js@1.5.13/dist/hls.min.js';
    tag.async = true;
    tag.onload = () => (window.Hls ? resolve(window.Hls) : reject(new Error('تعذر تحميل مشغل HLS')));
    tag.onerror = () => reject(new Error('تعذر تحميل مشغل HLS'));
    document.body.appendChild(tag);
  });
  return hlsPromise;
}

// مواضع العلامة المائية — بتتبدل عشوائياً كل 3 ثواني
const WATERMARK_POSITIONS = [
  'top-3 right-3',
  'top-3 left-3',
  'bottom-16 right-3',
  'bottom-16 left-3',
  'top-1/2 right-3 -translate-y-1/2',
  'top-1/2 left-3 -translate-y-1/2'
];

function useMovingWatermark(enabled) {
  const [pos, setPos] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    const t = setInterval(() => {
      setPos((p) => {
        let n = Math.floor(Math.random() * WATERMARK_POSITIONS.length);
        if (n === p) n = (n + 1) % WATERMARK_POSITIONS.length;
        return n;
      });
    }, 3000);
    return () => clearInterval(t);
  }, [enabled]);
  return WATERMARK_POSITIONS[pos];
}

function Watermark({ text, enabled, overlay }) {
  const pos = useMovingWatermark(enabled);
  if (!enabled || !text) return null;
  return (
    <div className={`pointer-events-none absolute z-10 select-none ${overlay ? '' : ''} ${pos}`}>
      <span className="rounded-md bg-black/45 px-2 py-1 font-mono text-[11px] font-bold tracking-wider text-white/85">
        {text}
      </span>
    </div>
  );
}

// ---------- مشغّل الفيديو المباشر بتحكم كامل من المنصة ----------
function DirectPlayer({ src, title, watermark }) {
  const videoRef = useRef(null);
  const boxRef = useRef(null);
  const hlsRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [buffering, setBuffering] = useState(false);
  const [levels, setLevels] = useState([]);
  const [quality, setQuality] = useState(-1);
  const wmPos = useMovingWatermark(Boolean(watermark) && playing);

  // تركيب HLS لو الرابط بث متعدد الجودات
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !src) return;
    let cancelled = false;
    if (isHlsUrl(src) && !v.canPlayType('application/vnd.apple.mpegurl')) {
      loadHlsJs()
        .then((Hls) => {
          if (cancelled || !Hls.isSupported()) return;
          const hls = new Hls({ enableWorker: true });
          hlsRef.current = hls;
          hls.loadSource(src);
          hls.attachMedia(v);
          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            setLevels(hls.levels || []);
            setQuality(-1);
          });
        })
        .catch(() => {});
    } else {
      setLevels([]);
      setQuality(-1);
    }
    return () => {
      cancelled = true;
      try {
        hlsRef.current?.destroy();
      } catch {
        /* تجاهل */
      }
      hlsRef.current = null;
    };
  }, [src]);

  const toggle = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play().catch(() => {});
    else v.pause();
  }, []);

  const skip = useCallback((sec) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.min(Math.max(0, v.currentTime + sec), v.duration || Infinity);
  }, []);

  const onSeek = (e) => {
    const v = videoRef.current;
    if (!v || !duration) return;
    v.currentTime = (Number(e.target.value) / 100) * duration;
  };

  const changeQuality = (e) => {
    const q = Number(e.target.value);
    setQuality(q);
    if (hlsRef.current) {
      try {
        hlsRef.current.currentLevel = q;
      } catch {
        /* تجاهل */
      }
    }
  };

  const toggleFullscreen = () => {
    const box = boxRef.current;
    if (!box) return;
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else box.requestFullscreen?.().catch(() => {});
  };

  return (
    <div
      ref={boxRef}
      className="group relative aspect-video w-full overflow-hidden bg-black"
      dir="ltr"
      onContextMenu={(e) => e.preventDefault()}
    >
      <video
        ref={videoRef}
        src={isHlsUrl(src) ? undefined : src}
        className="h-full w-full"
        preload="metadata"
        playsInline
        controlsList="nodownload"
        disablePictureInPicture
        onClick={toggle}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => {
          setDuration(e.currentTarget.duration);
          e.currentTarget.volume = volume;
          e.currentTarget.playbackRate = speed;
        }}
        onWaiting={() => setBuffering(true)}
        onPlaying={() => setBuffering(false)}
        onVolumeChange={(e) => {
          setVolume(e.currentTarget.volume);
          setMuted(e.currentTarget.muted);
        }}
      />
      {watermark && (
        <div className={`pointer-events-none absolute z-10 select-none ${wmPos}`}>
          <span className="rounded-md bg-black/45 px-2 py-1 font-mono text-[11px] font-bold tracking-wider text-white/85">
            {watermark}
          </span>
        </div>
      )}
      {buffering && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="h-10 w-10 animate-spin rounded-full border-2 border-paper/30 border-t-signal" />
        </div>
      )}
      {!playing && !buffering && (
        <button
          onClick={toggle}
          aria-label="تشغيل"
          className="absolute inset-0 m-auto flex h-16 w-16 items-center justify-center rounded-full bg-signal text-ink shadow-signal transition hover:scale-105"
        >
          <Icon name="play" className="h-7 w-7" />
        </button>
      )}
      <div
        className="absolute inset-x-0 bottom-0 flex items-center gap-1.5 bg-gradient-to-t from-black/80 to-transparent px-3 pb-2.5 pt-8 sm:gap-2"
        dir="rtl"
      >
        <button onClick={toggle} aria-label={playing ? 'إيقاف' : 'تشغيل'} className="shrink-0 text-paper transition hover:text-signal">
          <Icon name={playing ? 'pause' : 'play'} className="h-5 w-5" />
        </button>
        <button
          onClick={() => skip(-10)}
          aria-label="ترجيع 10 ثواني"
          className="shrink-0 rounded-full px-1.5 py-0.5 font-mono text-[11px] font-bold text-paper transition hover:text-signal"
        >
          -10
        </button>
        <button
          onClick={() => skip(10)}
          aria-label="تقديم 10 ثواني"
          className="shrink-0 rounded-full px-1.5 py-0.5 font-mono text-[11px] font-bold text-paper transition hover:text-signal"
        >
          +10
        </button>
        <span className="hidden font-mono text-[11px] text-paper/80 sm:inline">
          {formatTime(time)} / {formatTime(duration)}
        </span>
        <input
          type="range"
          min={0}
          max={100}
          value={duration ? (time / duration) * 100 : 0}
          onChange={onSeek}
          aria-label="التقدم"
          className="h-1 min-w-0 flex-1 cursor-pointer accent-signal"
          dir="ltr"
        />
        {levels.length > 1 && (
          <select
            value={quality}
            onChange={changeQuality}
            aria-label="الجودة"
            className="shrink-0 rounded-md bg-ink-800 px-1.5 py-1 font-mono text-[11px] text-paper outline-none"
            dir="ltr"
            title="جودة الفيديو"
          >
            <option value={-1}>تلقائي</option>
            {levels.map((l, i) => (
              <option key={i} value={i}>
                {l.height ? `${l.height}p` : `${Math.round((l.bitrate || 0) / 1000)}k`}
              </option>
            ))}
          </select>
        )}
        <button
          onClick={() => {
            const v = videoRef.current;
            if (v) v.muted = !muted;
          }}
          aria-label="الصوت"
          className="shrink-0 text-paper transition hover:text-signal"
        >
          <Icon name={muted || volume === 0 ? 'volumeOff' : 'volume'} className="h-5 w-5" />
        </button>
        <select
          value={speed}
          onChange={(e) => {
            const s = Number(e.target.value);
            setSpeed(s);
            if (videoRef.current) videoRef.current.playbackRate = s;
          }}
          aria-label="السرعة"
          className="hidden shrink-0 rounded-md bg-ink-800 px-1.5 py-1 font-mono text-[11px] text-paper outline-none sm:block"
          dir="ltr"
        >
          {[0.5, 0.75, 1, 1.25, 1.5, 2].map((s) => (
            <option key={s} value={s}>
              {s}x
            </option>
          ))}
        </select>
        <button onClick={toggleFullscreen} aria-label="ملء الشاشة" className="shrink-0 text-paper transition hover:text-signal">
          <Icon name="fullscreen" className="h-5 w-5" />
        </button>
      </div>
      <span className="sr-only">{title}</span>
    </div>
  );
}

// ---------- مشغّل يوتيوب بتحكم من المنصة ----------
function YouTubePlayer({ videoId, title, watermark }) {
  const mountRef = useRef(null);
  const playerRef = useRef(null);
  const timerRef = useRef(null);
  const [started, setStarted] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [failed, setFailed] = useState(false);
  const wmPos = useMovingWatermark(Boolean(watermark) && started && !failed);

  useEffect(
    () => () => {
      if (timerRef.current) clearInterval(timerRef.current);
      try {
        playerRef.current?.destroy();
      } catch {
        /* تجاهل */
      }
      playerRef.current = null;
    },
    []
  );

  const syncProgress = useCallback(() => {
    const p = playerRef.current;
    if (!p || !p.getCurrentTime) return;
    try {
      setTime(p.getCurrentTime());
      const d = p.getDuration();
      if (d) setDuration(d);
    } catch {
      /* تجاهل */
    }
  }, []);

  const start = useCallback(async () => {
    setFailed(false);
    try {
      const YT = await loadYouTubeApi();
      setStarted(true);
      requestAnimationFrame(() => {
        if (!mountRef.current || playerRef.current) return;
        playerRef.current = new YT.Player(mountRef.current, {
          videoId,
          playerVars: {
            modestbranding: 1,
            rel: 0,
            controls: 0,
            disablekb: 1,
            playsinline: 1,
            iv_load_policy: 3,
            autoplay: 1,
            origin: window.location.origin
          },
          events: {
            onReady: (e) => {
              setDuration(e.target.getDuration() || 0);
              e.target.playVideo();
            },
            onStateChange: (e) => {
              const isPlaying = e.data === window.YT.PlayerState.PLAYING;
              setPlaying(isPlaying);
              if (isPlaying) {
                if (timerRef.current) clearInterval(timerRef.current);
                timerRef.current = setInterval(syncProgress, 500);
              } else if (timerRef.current) {
                clearInterval(timerRef.current);
                syncProgress();
              }
            },
            onError: () => setFailed(true)
          }
        });
      });
    } catch {
      setFailed(true);
    }
  }, [videoId, syncProgress]);

  const toggle = () => {
    const p = playerRef.current;
    if (!p) {
      start();
      return;
    }
    try {
      const state = p.getPlayerState();
      if (state === window.YT.PlayerState.PLAYING) p.pauseVideo();
      else p.playVideo();
    } catch {
      /* تجاهل */
    }
  };

  const skip = (sec) => {
    const p = playerRef.current;
    if (!p) return;
    try {
      p.seekTo(Math.max(0, p.getCurrentTime() + sec), true);
      syncProgress();
    } catch {
      /* تجاهل */
    }
  };

  const onSeek = (e) => {
    const p = playerRef.current;
    if (!p || !duration) return;
    try {
      p.seekTo((Number(e.target.value) / 100) * duration, true);
      setTime((Number(e.target.value) / 100) * duration);
    } catch {
      /* تجاهل */
    }
  };

  if (failed) {
    return (
      <div className="flex aspect-video w-full flex-col items-center justify-center gap-3 bg-ink-900">
        <p className="text-sm text-muted">تعذر تشغيل الفيديو — جرّب تحديث الصفحة</p>
      </div>
    );
  }

  if (!started) {
    return (
      <div className="relative aspect-video w-full bg-black" onContextMenu={(e) => e.preventDefault()}>
        <button onClick={start} className="group relative block h-full w-full overflow-hidden text-right" aria-label="تشغيل الدرس">
          <img
            src={`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`}
            alt={title}
            className="h-full w-full object-cover opacity-70 transition group-hover:opacity-90"
            loading="lazy"
          />
          <span className="absolute inset-0 m-auto flex h-16 w-16 items-center justify-center rounded-full bg-signal text-ink shadow-signal transition group-hover:scale-105">
            <Icon name="play" className="h-7 w-7" />
          </span>
          <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-4 pb-3 pt-8 text-sm font-bold text-paper">
            {title}
          </span>
        </button>
        {watermark && (
          <div className={`pointer-events-none absolute z-10 select-none ${wmPos}`}>
            <span className="rounded-md bg-black/45 px-2 py-1 font-mono text-[11px] font-bold tracking-wider text-white/85">
              {watermark}
            </span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="w-full bg-black" dir="rtl" onContextMenu={(e) => e.preventDefault()}>
      <div className="relative aspect-video w-full">
        <div ref={mountRef} className="h-full w-full" />
        {watermark && (
          <div className={`pointer-events-none absolute z-10 select-none ${wmPos}`}>
            <span className="rounded-md bg-black/45 px-2 py-1 font-mono text-[11px] font-bold tracking-wider text-white/85">
              {watermark}
            </span>
          </div>
        )}
      </div>
      <div className="flex items-center gap-1.5 px-3 py-2.5 sm:gap-2">
        <button onClick={toggle} aria-label={playing ? 'إيقاف' : 'تشغيل'} className="shrink-0 text-paper transition hover:text-signal">
          <Icon name={playing ? 'pause' : 'play'} className="h-5 w-5" />
        </button>
        <button
          onClick={() => skip(-10)}
          aria-label="ترجيع 10 ثواني"
          className="shrink-0 rounded-full px-1.5 py-0.5 font-mono text-[11px] font-bold text-paper transition hover:text-signal"
        >
          -10
        </button>
        <button
          onClick={() => skip(10)}
          aria-label="تقديم 10 ثواني"
          className="shrink-0 rounded-full px-1.5 py-0.5 font-mono text-[11px] font-bold text-paper transition hover:text-signal"
        >
          +10
        </button>
        <span className="hidden font-mono text-[11px] text-paper/80 sm:inline">
          {formatTime(time)} / {formatTime(duration)}
        </span>
        <input
          type="range"
          min={0}
          max={100}
          value={duration ? (time / duration) * 100 : 0}
          onChange={onSeek}
          aria-label="التقدم"
          className="h-1 min-w-0 flex-1 cursor-pointer accent-signal"
          dir="ltr"
        />
      </div>
    </div>
  );
}

function isDirectVideo(url, provider) {
  if (!url) return false;
  if (provider === 'direct') return true;
  if (isHlsUrl(url)) return true;
  if (url.includes('supabase.co/storage')) return true;
  return /\.(mp4|m4v|mov|webm|ogg)(\?|#|$)/i.test(url);
}

/** المشغّل الرئيسي — يختار النوع تلقائياً من الرابط */
export default function LessonVideoPlayer({ videoUrl, videoProvider, title, watermark }) {
  const ytId = extractYouTubeId(videoUrl);
  if (!videoUrl) return null;
  if (isDirectVideo(videoUrl, videoProvider)) {
    return <DirectPlayer src={videoUrl} title={title} watermark={watermark} />;
  }
  if (ytId) {
    return <YouTubePlayer videoId={ytId} title={title} watermark={watermark} />;
  }
  return (
    <div className="flex aspect-video w-full flex-col items-center justify-center gap-2 bg-ink-900 p-6 text-center">
      <p className="text-sm text-muted">رابط الفيديو غير صالح</p>
      <a href={videoUrl} target="_blank" rel="noreferrer" className="text-sm font-bold text-signal hover:text-signal-light">
        فتح الرابط
      </a>
    </div>
  );
}

// أبقِ Watermark متاحاً لو احتجته مكوناً مستقلاً لاحقاً
export { Watermark };
