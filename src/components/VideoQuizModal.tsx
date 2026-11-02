import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Pause, Play, RotateCcw, Volume2, VolumeX, ArrowRight, Sparkles } from 'lucide-react';
import { QuizQuestion, StationConfig, VideoScene } from '../types/game';
import { soundEngine } from '../utils/sound';
import { BadgeIcon } from './BadgeIcon';

function shuffleArray<T>(items: readonly T[] | null | undefined): T[] {
  const arr = Array.isArray(items) ? [...items] : [];

  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }

  return arr;
}
function shuffleQuestionOptions(q: QuizQuestion): QuizQuestion {
  const tagged = q.options.map((text, idx) => ({
    text,
    isCorrect: idx === q.correctIndex,
  }));
  const shuffled = shuffleArray(tagged);
  return {
    ...q,
    options: shuffled.map((item) => item.text),
    correctIndex: shuffled.findIndex((item) => item.isCorrect),
  };
}

function buildRandomizedQuiz(pool: QuizQuestion[], takeCount = 3): QuizQuestion[] {
  const selectedQuestions = shuffleArray(pool).slice(0, Math.min(takeCount, pool.length));
  return selectedQuestions.map(shuffleQuestionOptions);
}

interface VideoQuizModalProps {
  station: StationConfig;
  onCompletePreActivity: (earnedQuizPoints: number) => void;
  onCloseCancel: () => void;
}

function drawRobloxKid2D(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  ihram: boolean,
  scale = 1,
  raiseHands = false
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  // Legs
  ctx.fillStyle = ihram ? '#F8FAFC' : '#1E293B';
  ctx.fillRect(-13, 18, 11, 22);
  ctx.fillRect(2, 18, 11, 22);

  // Torso
  ctx.fillStyle = ihram ? '#FFFFFF' : '#2563EB';
  ctx.beginPath();
  ctx.roundRect(-16, -12, 32, 32, 5);
  ctx.fill();

  if (ihram) {
    // Diagonal Rida' sash accent
    ctx.strokeStyle = '#CBD5E1';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-15, -8);
    ctx.lineTo(15, 14);
    ctx.stroke();
  }

  // Arms
  ctx.fillStyle = ihram ? '#F6C799' : '#2563EB';
  if (raiseHands) {
    ctx.fillRect(-26, -28, 9, 24);
    ctx.fillRect(17, -28, 9, 24);
  } else {
    ctx.fillRect(-26, -10, 9, 24);
    ctx.fillRect(17, -10, 9, 24);
  }

  // Blocky Head
  ctx.fillStyle = '#F6C799';
  ctx.beginPath();
  ctx.roundRect(-13, -38, 26, 25, 6);
  ctx.fill();

  // Peci if not in Ihram
  if (!ihram) {
    ctx.fillStyle = '#0F766E';
    ctx.fillRect(-14, -43, 28, 8);
  }

  // Smiling eyes & mouth
  ctx.fillStyle = '#0F172A';
  ctx.fillRect(-7, -30, 4, 5);
  ctx.fillRect(3, -30, 4, 5);
  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.arc(0, -22, 5, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();

  ctx.restore();
}

function renderAnimatedScene(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  scene: VideoScene,
  t: number
) {
  // Warm sky-to-sand animated cartoon backdrop
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  if (scene.visualType === 'mina_pebbles') {
    bg.addColorStop(0, '#0F172A');
    bg.addColorStop(1, '#1E293B');
  } else if (scene.visualType === 'arafah_sun') {
    bg.addColorStop(0, '#EA580C');
    bg.addColorStop(0.6, '#FDBA74');
    bg.addColorStop(1, '#FDE68A');
  } else {
    bg.addColorStop(0, '#0284C7');
    bg.addColorStop(0.65, '#BAE6FD');
    bg.addColorStop(1, '#FDE68A');
  }
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // Ground strip
  ctx.fillStyle = scene.visualType === 'mina_pebbles' ? '#334155' : '#F3DFA2';
  ctx.fillRect(0, h - 56, w, 56);

  const cx = w / 2;
  const cy = h / 2;

  if (scene.visualType === 'ihram_change') {
    // Miqat Pavilion Arch + Character transforming into white Ihram!
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(cx - 150, h - 165, 95, 110);
    ctx.fillStyle = '#10B981';
    ctx.beginPath();
    ctx.arc(cx - 102, h - 165, 46, Math.PI, 0);
    ctx.fill();

    const isWearingIhram = (t % 4) > 1.8;
    drawRobloxKid2D(ctx, cx + 45, h - 94, isWearingIhram, 1.35, isWearingIhram);

    // Transformation sparkles
    if (isWearingIhram) {
      ctx.fillStyle = '#FACC15';
      for (let i = 0; i < 6; i++) {
        const a = t * 2.5 + (i / 6) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(cx + 45 + Math.cos(a) * 58, h - 104 + Math.sin(a) * 48, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 15px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(isWearingIhram ? 'Pakaian Ihram Putih Suci' : 'Sebelum Berihram', cx + 45, 36);
  } else if (scene.visualType === 'kaaba_orbit') {
    // Top-down / isometric Mataf circle + Ka'bah + CCW orbiting character + Lap counter 1..7!
    ctx.fillStyle = '#F8FAFC';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 12, 138, 76, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#CBD5E1';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Green Hajar Aswad start line
    ctx.strokeStyle = '#10B981';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(cx + 22, cy + 24);
    ctx.lineTo(cx + 105, cy + 62);
    ctx.stroke();

    // Ka'bah in center
    ctx.fillStyle = '#0F172A';
    ctx.fillRect(cx - 32, cy - 36, 64, 66);
    ctx.fillStyle = '#FACC15';
    ctx.fillRect(cx - 32, cy - 22, 64, 10);

    // Orbiting Roblox avatar (counter-clockwise: decreasing angle!)
    const ang = -t * 1.65;
    const px = cx + Math.cos(ang) * 105;
    const py = cy + 12 + Math.sin(ang) * 56;
    drawRobloxKid2D(ctx, px, py - 14, true, 0.72, false);

    const lapDisplay = (Math.floor((t * 1.65) / (Math.PI * 2)) % 7) + 1;
    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 16px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`Arah Tawaf Berlawanan Jarum Jam · Putaran ${lapDisplay}/7`, cx, 28);
  } else if (scene.visualType === 'sai_hills') {
    // Bukit Shafa (left) & Bukit Marwah (right) + Green Pillars in middle!
    ctx.fillStyle = '#B48456';
    ctx.beginPath();
    ctx.arc(92, h - 54, 48, Math.PI, 0);
    ctx.arc(w - 92, h - 54, 48, Math.PI, 0);
    ctx.fill();

    // Green pillars in middle
    ctx.fillStyle = '#22C55E';
    ctx.fillRect(cx - 38, h - 136, 12, 80);
    ctx.fillRect(cx + 26, h - 136, 12, 80);
    ctx.fillRect(cx - 42, h - 142, 84, 12);

    // Ping-pong avatar from Shafa to Marwah
    const leg = Math.floor(t * 0.75) % 7;
    const frac = (t * 0.75) % 1;
    const goingRight = leg % 2 === 0;
    const u = goingRight ? frac : 1 - frac;
    const ax = 110 + u * (w - 220);
    drawRobloxKid2D(ctx, ax, h - 88, true, 0.9, false);

    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 14px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Bukit Shafa', 92, h - 18);
    ctx.fillText('Lampu Hijau', cx, h - 18);
    ctx.fillText('Bukit Marwah', w - 92, h - 18);
    ctx.font = 'bold 16px Outfit, sans-serif';
    ctx.fillText(`Perjalanan Sa'i ke-${leg + 1} dari 7`, cx, 30);
  } else if (scene.visualType === 'arafah_sun') {
    // Golden Sun + Jabal Rahmah white obelisk + Arafah tent + praying avatar
    ctx.fillStyle = '#FEF08A';
    ctx.beginPath();
    ctx.arc(w - 95, 58, 28, 0, Math.PI * 2);
    ctx.fill();

    // Jabal Rahmah hill & white monument
    ctx.fillStyle = '#9A3412';
    ctx.beginPath();
    ctx.moveTo(70, h - 56);
    ctx.lineTo(155, h - 140);
    ctx.lineTo(240, h - 56);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(148, h - 178, 14, 42);

    // White Tent
    ctx.beginPath();
    ctx.moveTo(cx + 35, h - 56);
    ctx.lineTo(cx + 35, h - 102);
    ctx.lineTo(cx + 85, h - 135);
    ctx.lineTo(cx + 135, h - 102);
    ctx.lineTo(cx + 135, h - 56);
    ctx.closePath();
    ctx.fill();

    drawRobloxKid2D(ctx, cx - 10, h - 92, true, 1.1, true);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 16px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('9 Dzulhijjah: Berdoa Khusyuk di Padang Arafah', cx, 30);
  } else if (scene.visualType === 'mina_pebbles') {
    // Starry sky + Jumrah Pillar + flying 7 pebbles
    ctx.fillStyle = '#E2E8F0';
    for (let i = 0; i < 16; i++) {
      ctx.fillRect((i * 47) % w, 16 + ((i * 23) % 70), 3, 3);
    }

    // Jumrah basin & pillar
    ctx.fillStyle = '#CBD5E1';
    ctx.fillRect(w - 155, h - 82, 88, 26);
    ctx.fillStyle = '#F59E0B';
    ctx.fillRect(w - 122, h - 160, 22, 80);

    drawRobloxKid2D(ctx, 130, h - 92, true, 1.05, false);

    // Parabolic stone
    const u = (t * 1.4) % 1;
    const sx = 155 + u * (w - 270);
    const sy = h - 110 - Math.sin(u * Math.PI) * 75;
    ctx.fillStyle = '#38BDF8';
    ctx.beginPath();
    ctx.arc(sx, sy, 7, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#F8FAFC';
    ctx.font = 'bold 16px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Muzdalifah (7 Kerikil) -> Lontar Jumrah di Mina 7x', cx, 30);
  } else if (scene.visualType === 'dam_gift') {
    // Cute blocky sheep Hadyu + Roblox pilgrim smiling
    drawRobloxKid2D(ctx, cx - 75, h - 92, false, 1.15, false);

    // Sheep
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.roundRect(cx + 35, h - 108, 66, 40, 14);
    ctx.fill();
    ctx.fillStyle = '#334155';
    ctx.beginPath();
    ctx.roundRect(cx + 88, h - 116, 26, 26, 6);
    ctx.fill();
    ctx.fillRect(cx + 48, h - 68, 8, 16);
    ctx.fillRect(cx + 80, h - 68, 8, 16);

    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 16px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Jeda Tamattu\' & Kewajiban Membayar Dam Syukur', cx, 30);
  } else {
    // Tahallul scissors + sparkling crown!
    drawRobloxKid2D(ctx, cx, h - 94, true, 1.25, true);

    // Animated golden scissors above head
    const snip = Math.sin(t * 7) * 0.25;
    ctx.save();
    ctx.translate(cx + 58, h - 150);
    ctx.strokeStyle = '#F59E0B';
    ctx.lineWidth = 6;
    ctx.rotate(snip);
    ctx.beginPath();
    ctx.moveTo(-18, -14);
    ctx.lineTo(20, 14);
    ctx.stroke();
    ctx.rotate(-snip * 2);
    ctx.beginPath();
    ctx.moveTo(-18, 14);
    ctx.lineTo(20, -14);
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 16px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Tahallul: Potong Minimal 3 Helai Rambut!', cx, 30);
  }
}

export function VideoQuizModal({
  station,
  onCompletePreActivity,
  onCloseCancel,
}: VideoQuizModalProps) {
  const [phase, setPhase] = useState<'video' | 'quiz'>('video');
  const [sceneIdx, setSceneIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [sceneElapsed, setSceneElapsed] = useState(0);
  const [voiceEnabled, setVoiceEnabled] = useState(!soundEngine.isMuted());

  // Randomized Quiz state (both question order/selection AND A/B/C/D answer positions are shuffled per student)
  const [randomizedQuiz, setRandomizedQuiz] = useState<QuizQuestion[]>(() =>
  buildRandomizedQuiz(
    Array.isArray(station?.quiz) ? station.quiz : [],
    3
  )
);
  const [qIdx, setQIdx] = useState(0);
  const [selectedOpt, setSelectedOpt] = useState<number | null>(null);
  const [answeredCorrectly, setAnsweredCorrectly] = useState(false);
  const [hadWrongAttempt, setHadWrongAttempt] = useState(false);
  const [earnedPoints, setEarnedPoints] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);

  useEffect(() => {
    setRandomizedQuiz(
  buildRandomizedQuiz(
    Array.isArray(station?.quiz) ? station.quiz : [],
    3
  )
);
    setQIdx(0);
    setSelectedOpt(null);
    setAnsweredCorrectly(false);
    setHadWrongAttempt(false);
    setEarnedPoints(0);
    setQuizFinished(false);
  }, [station.id, station.quiz]);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const currentScene = station.videoScenes[sceneIdx] ?? station.videoScenes[0];

  // Narrate current scene when playing
  useEffect(() => {
    if (phase === 'video' && isPlaying && voiceEnabled && currentScene) {
      soundEngine.speakIndonesian(currentScene.narration);
    } else {
      soundEngine.stopSpeech();
    }
    return () => {
      soundEngine.stopSpeech();
    };
  }, [phase, sceneIdx, isPlaying, voiceEnabled, currentScene]);

  // 2D Animated Video Playback Loop
  useEffect(() => {
    if (phase !== 'video') return;
    let raf = 0;
    let lastTime = performance.now();

    const renderLoop = (now: number) => {
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;

      if (isPlaying) {
        setSceneElapsed((prev) => {
          const next = prev + dt;
          if (next >= currentScene.durationSec) {
            if (sceneIdx < station.videoScenes.length - 1) {
              setSceneIdx((idx) => idx + 1);
              return 0;
            } else {
              setIsPlaying(false);
              return currentScene.durationSec;
            }
          }
          return next;
        });
      }

      const cvs = canvasRef.current;
      if (cvs) {
        const ctx = cvs.getContext('2d');
        if (ctx) {
          renderAnimatedScene(ctx, cvs.width, cvs.height, currentScene, now / 1000);
        }
      }
      raf = requestAnimationFrame(renderLoop);
    };

    raf = requestAnimationFrame(renderLoop);
    return () => cancelAnimationFrame(raf);
  }, [phase, isPlaying, sceneIdx, currentScene, station.videoScenes.length]);

  const totalVideoDuration = station.videoScenes.reduce((acc, s) => acc + s.durationSec, 0);
  const elapsedBeforeCurrent = station.videoScenes
    .slice(0, sceneIdx)
    .reduce((acc, s) => acc + s.durationSec, 0);
  const overallProgressPct = Math.min(
    100,
    Math.round(((elapsedBeforeCurrent + sceneElapsed) / Math.max(1, totalVideoDuration)) * 100)
  );

  const currentQuestion = randomizedQuiz[qIdx] ?? randomizedQuiz[0];

  const handleSelectOption = (optIndex: number) => {
    if (answeredCorrectly || !currentQuestion) return;
    setSelectedOpt(optIndex);
    if (optIndex === currentQuestion.correctIndex) {
      soundEngine.playQuizCorrect();
      setAnsweredCorrectly(true);
      const pts = hadWrongAttempt ? 25 : 50;
      setEarnedPoints((p) => p + pts);
    } else {
      soundEngine.playQuizWrong();
      setHadWrongAttempt(true);
    }
  };

  const handleNextQuestion = () => {
    soundEngine.playClick();
    if (qIdx < randomizedQuiz.length - 1) {
      setQIdx((i) => i + 1);
      setSelectedOpt(null);
      setAnsweredCorrectly(false);
      setHadWrongAttempt(false);
    } else {
      setQuizFinished(true);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-slate-950/85 pointer-events-auto">
      <div className="w-full max-w-3xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden text-slate-100">
        {/* Modal Header */}
        <div className="flex items-center justify-between gap-4 px-6 py-4 bg-slate-950 border-b border-slate-800">
          <div>
            <p className="text-xs font-medium text-amber-400">
              Pos {station.stepNumber} · {station.locationName}
            </p>
            <h2 className="text-xl font-bold text-white">{station.title}</h2>
          </div>

          {/* Segmented Step Switcher */}
          <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-lg">
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                setPhase('video');
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                phase === 'video'
                  ? 'bg-amber-500 text-slate-950'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              1. Video Penjelasan
            </button>
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                soundEngine.stopSpeech();
                setPhase('quiz');
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                phase === 'quiz'
                  ? 'bg-emerald-500 text-slate-950'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              2. Kuis Pemahaman
            </button>
          </div>
        </div>

        {/* Modal Body */}
        {phase === 'video' ? (
          <div className="p-6 space-y-4">
            {/* Animated Video Viewport */}
            <div className="relative rounded-xl overflow-hidden border border-slate-700 bg-slate-950">
              <canvas
                ref={canvasRef}
                width={680}
                height={250}
                className="w-full h-56 sm:h-64 block object-cover"
              />

              {/* Scene Tabs Top-Left */}
              <div className="absolute top-3 left-3 flex items-center gap-1 bg-slate-950/85 p-1 rounded-lg border border-slate-700">
                {station.videoScenes.map((sc, i) => (
                  <button
                    key={sc.title}
                    type="button"
                    onClick={() => {
                      soundEngine.playClick();
                      setSceneIdx(i);
                      setSceneElapsed(0);
                      setIsPlaying(true);
                    }}
                    className={`px-2.5 py-1 text-xs font-semibold rounded transition-colors whitespace-nowrap ${
                      sceneIdx === i
                        ? 'bg-amber-400 text-slate-950'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    Bagian {i + 1}
                  </button>
                ))}
              </div>

              {/* Voiceover Toggle Top-Right */}
              <button
                type="button"
                onClick={() => {
                  const next = !voiceEnabled;
                  setVoiceEnabled(next);
                  if (!next) soundEngine.stopSpeech();
                }}
                className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-950/85 border border-slate-700 text-xs font-semibold text-slate-200 hover:text-white"
              >
                {voiceEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
                <span>{voiceEnabled ? 'Suara Aktif' : 'Suara Mati'}</span>
              </button>

              {/* Progress Bar */}
              <div className="h-2 bg-slate-800 w-full">
                <div
                  className="h-full bg-amber-400 transition-all duration-100"
                  style={{ width: `${overallProgressPct}%` }}
                />
              </div>
            </div>

            {/* Subtitle & Narration Box */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-amber-300">{currentScene.title}</h3>
                <span className="text-xs text-slate-400 font-mono-num">
                  Adegan {sceneIdx + 1}/{station.videoScenes.length}
                </span>
              </div>
              <p className="text-sm sm:text-base text-slate-100 leading-relaxed">
                {currentScene.narration}
              </p>

              {currentScene.arabicText && (
                <div className="pt-2 mt-2 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <p className="text-lg font-bold text-emerald-300" dir="rtl">
                    {currentScene.arabicText}
                  </p>
                  <p className="text-xs text-slate-300 italic">"{currentScene.arabicMeaning}"</p>
                </div>
              )}
            </div>

            {/* Playback & Continue Controls */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    setIsPlaying((p) => !p);
                  }}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-sm font-semibold text-white transition-colors whitespace-nowrap"
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  <span>{isPlaying ? 'Jeda Video' : 'Putar Video'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    setSceneIdx(0);
                    setSceneElapsed(0);
                    setIsPlaying(true);
                  }}
                  className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-sm font-medium text-slate-200 transition-colors whitespace-nowrap"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Ulangi</span>
                </button>
                <button
                  type="button"
                  onClick={onCloseCancel}
                  className="px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-white transition-colors whitespace-nowrap"
                >
                  Kembali Jalan
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  soundEngine.stopSpeech();
                  setPhase('quiz');
                }}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm transition-colors whitespace-nowrap"
              >
                <span>Lanjut Jawab Kuis</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : !quizFinished ? (
          <div className="p-6 space-y-5">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>
                Pertanyaan Acak <strong className="text-white font-mono-num">{qIdx + 1}</strong> dari{' '}
                <strong className="text-white font-mono-num">{randomizedQuiz.length}</strong>
              </span>
              <span className="font-mono-num text-emerald-400 font-semibold">
                Poin Kuis Pos Ini: +{earnedPoints}
              </span>
            </div>

            <h3 className="text-lg sm:text-xl font-bold text-white leading-snug">
              {currentQuestion.question}
            </h3>

            <div className="space-y-2.5">
              {currentQuestion.options.map((opt, idx) => {
                const isSelected = selectedOpt === idx;
                const isRight = idx === currentQuestion.correctIndex;
                let btnStyle = 'bg-slate-950 border-slate-700 hover:border-slate-500 text-slate-100';
                if (isSelected && isRight) {
                  btnStyle = 'bg-emerald-950 border-emerald-400 text-emerald-100';
                } else if (isSelected && !isRight) {
                  btnStyle = 'bg-rose-950 border-rose-500 text-rose-100';
                }

                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => handleSelectOption(idx)}
                    className={`w-full text-left px-4 py-3.5 rounded-xl border text-sm sm:text-base font-medium transition-colors flex items-center justify-between gap-3 ${btnStyle}`}
                  >
                    <span>
                      <strong className="mr-2 font-mono-num">{String.fromCharCode(65 + idx)}.</strong>
                      {opt}
                    </span>
                    {isSelected && isRight && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
                  </button>
                );
              })}
            </div>

            {selectedOpt !== null && (
              <div
                className={`p-4 rounded-xl border text-sm ${
                  answeredCorrectly
                    ? 'bg-emerald-950/70 border-emerald-700 text-emerald-200'
                    : 'bg-amber-950/70 border-amber-700 text-amber-200'
                }`}
              >
                {answeredCorrectly ? (
                  <p>
                    <strong>Hebat, Jawabanmu Benar!</strong> {currentQuestion.explanation}
                  </p>
                ) : (
                  <p>
                    <strong>Belum tepat, baca kembali pilihan dengan teliti ya!</strong> Urutan soal dan pilihan jawaban tiap siswa diacak agar kamu paham maknanya sendiri.
                  </p>
                )}
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setPhase('video')}
                className="px-4 py-2 text-xs sm:text-sm font-medium text-slate-400 hover:text-white transition-colors whitespace-nowrap"
              >
                Tonton Ulang Video
              </button>

              {answeredCorrectly && (
                <button
                  type="button"
                  onClick={handleNextQuestion}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm transition-colors whitespace-nowrap"
                >
                  <span>
                    {qIdx < randomizedQuiz.length - 1 ? 'Pertanyaan Berikutnya' : 'Selesai Kuis'}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        ) : (
          /* Quiz Completed -> Ready to Enter 3D Simulation! */
          <div className="p-6 text-center space-y-5">
            <div className="flex justify-center">
              <BadgeIcon emblem={station.badge.emblem} size={76} />
            </div>
            <div className="space-y-1.5 max-w-lg mx-auto">
              <h3 className="text-2xl font-extrabold text-white">
                Kuis Lulus! Kamu Raih +{earnedPoints} Poin!
              </h3>
              <p className="text-sm text-slate-300">
                Sekarang saatnya mempraktikkan langsung ibadah di <strong>{station.locationName}</strong> untuk membuka{' '}
                <strong className="text-amber-300">{station.badge.name}</strong> (+{station.pointsReward} Poin)!
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 max-w-xl mx-auto text-left">
              <p className="text-xs font-semibold text-amber-400 mb-1">Misi Simulasi 3D Kamu:</p>
              <p className="text-sm text-slate-100 font-medium">{station.childInstruction}</p>
            </div>

            <button
              type="button"
              onClick={() => {
                soundEngine.playIhramSwap();
                onCompletePreActivity(earnedPoints);
              }}
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-base transition-colors whitespace-nowrap"
            >
              <Sparkles className="w-5 h-5" />
              <span>Mulai Simulasi Ibadah Sekarang!</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
