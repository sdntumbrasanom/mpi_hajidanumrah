import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ChevronDown,
  ChevronUp,
  Compass,
  Home,
  Maximize2,
  Minimize2,
  Navigation,
  PlayCircle,
  Sparkles,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { INITIAL_CLASS_LEADERBOARD, WORSHIP_PROGRAMS } from './data/manasikData';
import {
  BadgeEmblem,
  BadgeInfo,
  GameScreen,
  GenderType,
  LeaderboardEntry,
  LiveSimulationProgress,
  TeacherConfig,
  WorshipType,
} from './types/game';
import { soundEngine } from './utils/sound';
import { WorldCanvas, WorldCanvasHandle } from './components/WorldCanvas';
import { StartSessionPayload, TitleScreen } from './components/TitleScreen';
import { VideoQuizModal } from './components/VideoQuizModal';
import { CompactRobloxLeaderboard, FullLeaderboardModal } from './components/LeaderboardPanel';
import { VictoryModal } from './components/VictoryModal';
import { TeacherPortalModal } from './components/TeacherPortalModal';
import { BadgeIcon } from './components/BadgeIcon';

const STORAGE_KEY = 'bloxmanasik_leaderboard_v2';
const TEACHER_CONFIG_STORAGE_KEY = 'bloxmanasik_teacher_config_v1';
const LAST_TEACHER_PHONE_KEY = 'bloxmanasik_last_teacher_phone_v1';

function loadSavedLeaderboard(): LeaderboardEntry[] {
  if (typeof window === 'undefined') return INITIAL_CLASS_LEADERBOARD;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return INITIAL_CLASS_LEADERBOARD;
    const parsed = JSON.parse(raw) as LeaderboardEntry[];
    if (Array.isArray(parsed)) return parsed;
  } catch {
    // Fallback
  }
  return INITIAL_CLASS_LEADERBOARD;
}

function loadSavedTeacherConfig(): TeacherConfig {
  if (typeof window === 'undefined') {
    return { teacherName: '', teacherPhone: '', schoolName: '' };
  }
  try {
    const raw = window.localStorage.getItem(TEACHER_CONFIG_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<TeacherConfig>;
      return {
        teacherName: parsed.teacherName ?? '',
        teacherPhone: parsed.teacherPhone ?? '',
        schoolName: parsed.schoolName ?? '',
      };
    }
  } catch {
    // Fallback
  }
  return { teacherName: '', teacherPhone: '', schoolName: '' };
}

function loadLastPhone(): string {
  if (typeof window === 'undefined') return '';
  try {
    return window.localStorage.getItem(LAST_TEACHER_PHONE_KEY) ?? '';
  } catch {
    return '';
  }
}

function mergeResultsLists(
  localList: LeaderboardEntry[],
  serverList: LeaderboardEntry[]
): LeaderboardEntry[] {
  const map = new Map<string, LeaderboardEntry>();
  for (const item of localList) {
    map.set(item.id, item);
  }
  for (const srv of serverList) {
    const existing = map.get(srv.id);
    if (!existing || srv.updatedAt >= existing.updatedAt) {
      map.set(srv.id, { ...srv, isCurrentPlayer: existing?.isCurrentPlayer });
    }
  }
  return Array.from(map.values());
}

export default function App() {
  const worldRef = useRef<WorldCanvasHandle | null>(null);

  const [screen, setScreen] = useState<GameScreen>('title');
  const [studentName, setStudentName] = useState('');
  const [teacherPhone, setTeacherPhone] = useState(loadLastPhone);
  const [sessionId, setSessionId] = useState('player_1');
  const [gender, setGender] = useState<GenderType>('putra');
  const [worshipType, setWorshipType] = useState<WorshipType>('tamattu');
  const [muted, setMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const [activeStationIndex, setActiveStationIndex] = useState(0);
  const [simulationUnlocked, setSimulationUnlocked] = useState(false);
  const [showVideoQuizModal, setShowVideoQuizModal] = useState(false);
  const [showFullLeaderboard, setShowFullLeaderboard] = useState(false);
  const [showTeacherPortal, setShowTeacherPortal] = useState(false);
  const [isSyncingPortal, setIsSyncingPortal] = useState(false);
  const [hudDockCollapsed, setHudDockCollapsed] = useState(false);

  const [points, setPoints] = useState(0);
  const [completedStationIds, setCompletedStationIds] = useState<string[]>([]);
  const [completedAtTimestamp, setCompletedAtTimestamp] = useState<number | undefined>(undefined);
  const [earnedBadges, setEarnedBadges] = useState<BadgeEmblem[]>([]);
  const [recentBadgeBanner, setRecentBadgeBanner] = useState<{
    badge: BadgeInfo;
    pointsEarned: number;
  } | null>(null);

  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(loadSavedLeaderboard);
  const [teacherConfig, setTeacherConfig] = useState<TeacherConfig>(loadSavedTeacherConfig);

  const [simProgress, setSimProgress] = useState<LiveSimulationProgress>({
    stationId: null,
    stationKind: null,
    currentCount: 0,
    targetCount: 1,
    subStepLabel: '',
    hintMessage: '',
    warningMessage: null,
    canTriggerAction: false,
    actionButtonLabel: null,
    distanceToActiveStation: 0,
    nearStationPortal: false,
  });

  // Pengaman fallback agar program tidak pernah undefined
  const validWorshipKey = WORSHIP_PROGRAMS[worshipType] ? worshipType : 'tamattu';
  const program = WORSHIP_PROGRAMS[validWorshipKey];
  const activeStation = program?.stations?[activeStationIndex] ?? null;

  // Fullscreen listener & cross-browser toggle
  useEffect(() => {
    const syncFs = () => {
      const docAny = document as Document & { webkitFullscreenElement?: Element | null };
      setIsFullscreen(Boolean(document.fullscreenElement || docAny.webkitFullscreenElement));
    };
    document.addEventListener('fullscreenchange', syncFs);
    document.addEventListener('webkitfullscreenchange', syncFs);
    return () => {
      document.removeEventListener('fullscreenchange', syncFs);
      document.removeEventListener('webkitfullscreenchange', syncFs);
    };
  }, []);

  const handleToggleFullscreen = useCallback(async () => {
    try {
      const docAny = document as Document & {
        webkitFullscreenElement?: Element | null;
        webkitExitFullscreen?: () => Promise<void>;
      };
      const elemAny = document.documentElement as HTMLElement & {
        webkitRequestFullscreen?: () => Promise<void>;
      };

      if (!document.fullscreenElement && !docAny.webkitFullscreenElement) {
        if (elemAny.requestFullscreen) {
          await elemAny.requestFullscreen();
        } else if (elemAny.webkitRequestFullscreen) {
          await elemAny.webkitRequestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if (docAny.webkitExitFullscreen) {
          await docAny.webkitExitFullscreen();
        }
      }
    } catch {
      // Ignore if host iframe policy restricts fullscreen
    }
  }, []);

  const fetchServerResults = useCallback(async () => {
    setIsSyncingPortal(true);
    try {
      const res = await fetch('/api/results');
      if (!res.ok) return;
      const data = (await res.json()) as {
        results?: LeaderboardEntry[];
        teacherConfig?: TeacherConfig;
      };
      if (data.teacherConfig) {
        setTeacherConfig((prev) => {
          const nextCfg = {
            teacherName: data.teacherConfig?.teacherName || prev.teacherName,
            teacherPhone: data.teacherConfig?.teacherPhone || prev.teacherPhone,
            schoolName: data.teacherConfig?.schoolName || prev.schoolName,
          };
          try {
            window.localStorage.setItem(TEACHER_CONFIG_STORAGE_KEY, JSON.stringify(nextCfg));
          } catch {
            // Ignore storage errors
          }
          return nextCfg;
        });
      }
      if (Array.isArray(data.results) && data.results.length > 0) {
        setLeaderboard((prev) => {
          const merged = mergeResultsLists(prev, data.results!);
          try {
            window.localStorage.setItem(
              STORAGE_KEY,
              JSON.stringify(merged.map(({ isCurrentPlayer: _, ...rest }) => rest))
            );
          } catch {
            // Ignore storage errors
          }
          return merged;
        });
      }
    } catch {
      // Offline fallback cleanly uses localStorage
    } finally {
      setIsSyncingPortal(false);
    }
  }, []);

  useEffect(() => {
    fetchServerResults();
  }, [fetchServerResults]);

  // Persist & sync current player entry into localStorage AND /api/results
  useEffect(() => {
    if (!studentName.trim() || screen === 'title') return;

    const currentEntry: LeaderboardEntry = {
      id: sessionId,
      studentName: studentName.trim(),
      teacherPhone: teacherPhone.trim(),
      gender,
      worshipType,
      points,
      completedStationIds,
      totalStations: program?.stations?.length || 0,
      badges: earnedBadges,
      updatedAt: Date.now(),
      completedAt: completedAtTimestamp,
      isCurrentPlayer: true,
    };

    setLeaderboard((prev) => {
      const cleaned = prev.map((e) => ({ ...e, isCurrentPlayer: false }));
      const idx = cleaned.findIndex((e) => e.id === sessionId);
      const updated =
        idx >= 0
          ? cleaned.map((item, i) => (i === idx ? currentEntry : item))
          : [...cleaned, currentEntry];

      try {
        window.localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify(updated.map(({ isCurrentPlayer: _, ...rest }) => rest))
        );
      } catch {
        // Ignore storage quota issues
      }
      return updated;
    });

    const { isCurrentPlayer: _, ...payload } = currentEntry;
    fetch('/api/results', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(() => {
      // Ignore network errors cleanly
    });
  }, [
    studentName,
    teacherPhone,
    sessionId,
    gender,
    worshipType,
    points,
    completedStationIds,
    completedAtTimestamp,
    earnedBadges,
    program?.stations?.length,
    screen,
  ]);

  // Keyboard shortcuts (Tab Leaderboard, H Hide Dock, F Fullscreen, Esc Close Modal)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        document.activeElement &&
        (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA')
      ) {
        return;
      }
      if (e.code === 'Tab' && screen === 'playing') {
        e.preventDefault();
        setShowFullLeaderboard((v) => !v);
      } else if (e.code === 'KeyH' && screen === 'playing' && !showVideoQuizModal) {
        setHudDockCollapsed((c) => !c);
      } else if (e.code === 'KeyF' && !showVideoQuizModal && !showTeacherPortal) {
        handleToggleFullscreen();
      } else if (e.code === 'Escape') {
        if (showTeacherPortal) setShowTeacherPortal(false);
        else if (showFullLeaderboard) setShowFullLeaderboard(false);
        else if (showVideoQuizModal) setShowVideoQuizModal(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [screen, showTeacherPortal, showFullLeaderboard, showVideoQuizModal, handleToggleFullscreen]);

  const handleToggleMute = () => {
    const nextMuted = soundEngine.toggleMute();
    setMuted(nextMuted);
  };

  const handleStartGame = (payload: StartSessionPayload) => {
    const cleanSlug = payload.studentName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
    const newSessionId = `student_${cleanSlug}_${worshipType}`;

    setStudentName(payload.studentName);
    setTeacherPhone(payload.teacherPhone);
    try {
      window.localStorage.setItem(LAST_TEACHER_PHONE_KEY, payload.teacherPhone);
    } catch {
      // Ignore
    }

    setSessionId(newSessionId);
    setActiveStationIndex(0);
    setSimulationUnlocked(false);
    setPoints(0);
    setCompletedStationIds([]);
    setCompletedAtTimestamp(undefined);
    setEarnedBadges([]);
    setRecentBadgeBanner(null);
    setScreen('playing');
    setShowVideoQuizModal(true);
  };

  const handleCompletePreActivity = (earnedQuizPts: number) => {
    setPoints((p) => p + earnedQuizPts);
    setShowVideoQuizModal(false);
    setSimulationUnlocked(true);
    setTimeout(() => {
      worldRef.current?.teleportToCurrentTarget();
    }, 60);
  };

  const handleStationSimulationComplete = useCallback(
    (finishedStationId: string) => {
      const stIndex = program?.stations?.findIndex((s) => s.id === finishedStationId) ?? -1;
      if (stIndex < 0) return;
      const finishedSt = program.stations[stIndex];

      setCompletedStationIds((prev) =>
        prev.includes(finishedStationId) ? prev : [...prev, finishedStationId]
      );
      setEarnedBadges((prev) =>
        prev.includes(finishedSt.badge.emblem) ? prev : [...prev, finishedSt.badge.emblem]
      );
      setPoints((prev) => prev + finishedSt.pointsReward);

      setRecentBadgeBanner({
        badge: finishedSt.badge,
        pointsEarned: finishedSt.pointsReward,
      });

      setTimeout(() => {
        setRecentBadgeBanner(null);
      }, 4500);

      if (stIndex < program.stations.length - 1) {
        setTimeout(() => {
          setActiveStationIndex(stIndex + 1);
          setSimulationUnlocked(false);
        }, 1600);
      } else {
        setCompletedAtTimestamp(Date.now());
        setTimeout(() => {
          setScreen('victory');
        }, 2000);
      }
    },
    [program?.stations]
  );

  const handleSaveTeacherConfig = async (cfg: TeacherConfig) => {
    setTeacherConfig(cfg);
    if (cfg.teacherPhone && !teacherPhone) {
      setTeacherPhone(cfg.teacherPhone);
    }
    try {
      window.localStorage.setItem(TEACHER_CONFIG_STORAGE_KEY, JSON.stringify(cfg));
    } catch {
      // Ignore
    }
    try {
      await fetch('/api/teacher-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cfg),
      });
    } catch {
      // Ignore offline error
    }
  };

  const handleDeleteEntry = async (id: string) => {
    setLeaderboard((prev) => {
      const next = prev.filter((item) => item.id !== id);
      try {
        window.localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify(next.map(({ isCurrentPlayer: _, ...rest }) => rest))
        );
      } catch {
        // Ignore
      }
      return next;
    });
    try {
      await fetch(`/api/results/${encodeURIComponent(id)}`, { method: 'DELETE' });
    } catch {
      // Ignore
    }
  };

  const handleClearAllEntries = async () => {
    setLeaderboard([]);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
    } catch {
      // Ignore
    }
    try {
      await fetch('/api/results', { method: 'DELETE' });
    } catch {
      // Ignore
    }
  };

  const playerRank = useMemo(() => {
    const sorted = [...leaderboard].sort((a, b) => b.points - a.points);
    const idx = sorted.findIndex((e) => e.id === sessionId);
    return idx >= 0 ? idx + 1 : 1;
  }, [leaderboard, sessionId]);

  const currentVictoryEntry: LeaderboardEntry = useMemo(
    () => ({
      id: sessionId,
      studentName: studentName.trim() || 'Peserta Didik',
      teacherPhone: teacherPhone.trim(),
      gender,
      worshipType,
      points,
      completedStationIds,
      totalStations: program?.stations?.length || 0,
      badges: earnedBadges,
      updatedAt: Date.now(),
      completedAt: completedAtTimestamp ?? Date.now(),
      isCurrentPlayer: true,
    }),
    [
      sessionId,
      studentName,
      teacherPhone,
      gender,
      worshipType,
      points,
      completedStationIds,
      program?.stations?.length,
      earnedBadges,
      completedAtTimestamp,
    ]
  );

  const anyModalOpen =
    showVideoQuizModal || showFullLeaderboard || showTeacherPortal || screen === 'victory';

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 select-none">
      {/* Persistent 60fps 3D Roblox Makkah World */}
      <WorldCanvas
        ref={worldRef}
        screen={screen}
        gender={gender}
        worshipType={worshipType}
        activeStation={activeStation}
        simulationUnlocked={simulationUnlocked}
        isModalOpen={anyModalOpen}
        onNearStationEnter={() => setShowVideoQuizModal(true)}
        onProgressUpdate={setSimProgress}
        onStationSimulationComplete={handleStationSimulationComplete}
      />

      {/* Centered Transparent Login Screen */}
      {screen === 'title' && (
        <TitleScreen
          initialName={studentName}
          initialTeacherPhone={teacherPhone || teacherConfig?.teacherPhone || ''}
          gender={gender}
          worshipType={worshipType}
          muted={muted}
          isFullscreen={isFullscreen}
          onChangeGender={setGender}
          onChangeWorshipType={setWorshipType}
          onToggleMute={handleToggleMute}
          onToggleFullscreen={handleToggleFullscreen}
          onOpenLeaderboard={() => setShowFullLeaderboard(true)}
          onOpenTeacherPortal={() => {
            fetchServerResults();
            setShowTeacherPortal(true);
          }}
          onStartGame={handleStartGame}
        />
      )}

      {/* Playing HUD — Low-Occlusion Perimeter Clusters (>=85% Unobstructed 3D Viewport) */}
      {screen === 'playing' && activeStation && program && (
        <div className="fixed inset-0 z-10 pointer-events-none flex flex-col justify-between p-3 sm:p-4">
          {/* Top Row: Left Status + Fullscreen + Camera Controls | Right Checklist & Leaderboard */}
          <div className="flex items-start justify-between gap-3">
            {/* Top-Left Compact Status Cluster */}
            <div className="flex items-center gap-2 pointer-events-auto">
              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  setScreen('title');
                }}
                className="p-2.5 rounded-xl bg-slate-950/90 hover:bg-slate-900 border border-slate-800 text-slate-300 hover:text-white transition-colors"
                title="Halaman Awal"
                aria-label="Halaman Awal"
              >
                <Home className="w-4 h-4" />
              </button>

              <div className="px-3.5 py-2 rounded-xl bg-slate-950/90 border border-slate-800 text-slate-100">
                <p className="text-[11px] text-amber-400 font-semibold leading-none">
                  {program?.name} · Pos {activeStation?.stepNumber}/{program?.stations?.length}
                </p>
                <p className="text-sm font-bold text-white mt-0.5">{activeStation?.title}</p>
              </div>

              <button
                type="button"
                onClick={handleToggleMute}
                className="p-2.5 rounded-xl bg-slate-950/90 hover:bg-slate-900 border border-slate-800 text-slate-300 hover:text-white transition-colors"
                aria-label={muted ? 'Nyalakan suara' : 'Matikan suara'}
                title={muted ? 'Nyalakan Suara' : 'Matikan Suara'}
              >
                {muted ? (
                  <VolumeX className="w-4 h-4 text-slate-400" />
                ) : (
                  <Volume2 className="w-4 h-4 text-emerald-400" />
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  handleToggleFullscreen();
                }}
                className="flex items-center gap-1.5 p-2.5 sm:px-3 sm:py-2.5 rounded-xl bg-slate-950/90 hover:bg-slate-900 border border-slate-800 text-xs font-semibold text-sky-300 hover:text-white transition-colors whitespace-nowrap"
                title={isFullscreen ? 'Keluar Layar Penuh (F)' : 'Layar Penuh (F)'}
                aria-label={isFullscreen ? 'Keluar layar penuh' : 'Layar penuh'}
              >
                {isFullscreen ? (
                  <Minimize2 className="w-4 h-4" />
                ) : (
                  <Maximize2 className="w-4 h-4" />
                )}
                <span className="hidden md:inline">
                  {isFullscreen ? 'Keluar Penuh' : 'Layar Penuh'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  worldRef.current?.resetCameraBehindPlayer();
                }}
                className="hidden sm:flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-950/90 hover:bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-white transition-colors whitespace-nowrap"
                title="Luruskan Kamera"
              >
                <Compass className="w-4 h-4" />
                <span>Reset Kamera</span>
              </button>
            </div>

            {/* Top-Right Compact Checklist & Leaderboard */}
            <CompactRobloxLeaderboard
              studentName={studentName}
              points={points}
              stations={program?.stations || []}
              completedStationIds={completedStationIds}
              activeStationId={activeStation?.id || null}
              leaderboard={leaderboard}
              onOpenFullModal={() => setShowFullLeaderboard(true)}
            />
          </div>

          {/* Center-Top Badge Unlock Celebration Toast */}
          {recentBadgeBanner && (
            <div className="mx-auto pointer-events-auto bg-slate-950/95 border-2 border-amber-400 rounded-2xl px-5 py-3 shadow-2xl flex items-center gap-3.5">
              <BadgeIcon emblem={recentBadgeBanner?.badge?.emblem} size={52} />
              <div>
                <p className="text-xs font-bold text-emerald-400">
                  Pos Selesai &amp; Tercentang di Leaderboard! (+{recentBadgeBanner?.pointsEarned || 0} Poin)
                </p>
                <p className="text-base font-extrabold text-white">
                  Lencana Terbuka: {recentBadgeBanner?.badge?.name ?? 'Lencana Manasik'}
                </p>
              </div>
            </div>
          )}

          {/* Bottom Area: Touch D-Pad (Left) + Unified Collapsible Control Dock (Center) */}
          <div className="flex items-end justify-between gap-3">
            {/* Compact On-Screen Touch / Click D-Pad */}
            <div className="pointer-events-auto grid grid-cols-3 gap-1 p-1.5 rounded-2xl bg-slate-950/85 border border-slate-800 w-32 h-32 shrink-0">
              <div />
              <button
                type="button"
                onPointerDown={() => worldRef.current?.setVirtualJoystick(0, -1)}
                onPointerUp={() => worldRef.current?.setVirtualJoystick(0, 0)}
                onPointerLeave={() => worldRef.current?.setVirtualJoystick(0, 0)}
                className="flex items-center justify-center rounded-lg bg-slate-800 active:bg-amber-400 active:text-slate-950 text-white"
                aria-label="Maju"
              >
                <ArrowUp className="w-5 h-5" />
              </button>
              <div />
              <button
                type="button"
                onPointerDown={() => worldRef.current?.setVirtualJoystick(-1, 0)}
                onPointerUp={() => worldRef.current?.setVirtualJoystick(0, 0)}
                onPointerLeave={() => worldRef.current?.setVirtualJoystick(0, 0)}
                className="flex items-center justify-center rounded-lg bg-slate-800 active:bg-amber-400 active:text-slate-950 text-white"
                aria-label="Kiri"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={() => worldRef.current?.triggerJump()}
                className="flex items-center justify-center rounded-lg bg-slate-900 border border-slate-700 active:bg-emerald-400 active:text-slate-950 text-[10px] font-bold text-slate-300"
              >
                Lompat
              </button>
              <button
                type="button"
                onPointerDown={() => worldRef.current?.setVirtualJoystick(1, 0)}
                onPointerUp={() => worldRef.current?.setVirtualJoystick(0, 0)}
                onPointerLeave={() => worldRef.current?.setVirtualJoystick(0, 0)}
                className="flex items-center justify-center rounded-lg bg-slate-800 active:bg-amber-400 active:text-slate-950 text-white"
                aria-label="Kanan"
              >
                <ArrowRight className="w-5 h-5" />
              </button>
              <div />
              <button
                type="button"
                onPointerDown={() => worldRef.current?.setVirtualJoystick(0, 1)}
                onPointerUp={() => worldRef.current?.setVirtualJoystick(0, 0)}
                onPointerLeave={() => worldRef.current?.setVirtualJoystick(0, 0)}
                className="flex items-center justify-center rounded-lg bg-slate-800 active:bg-amber-400 active:text-slate-950 text-white"
                aria-label="Mundur"
              >
                <ArrowDown className="w-5 h-5" />
              </button>
              <div />
            </div>

            {/* Unified Collapsible Bottom Control Dock */}
            <div className="flex-1 max-w-2xl mx-auto pointer-events-auto flex flex-col items-center">
              <button
                type="button"
                onClick={() => setHudDockCollapsed((c) => !c)}
                className="flex items-center gap-1 px-3 py-1 rounded-t-lg bg-slate-950/90 border border-b-0 border-slate-800 text-[11px] font-semibold text-slate-300 hover:text-white"
              >
                {hudDockCollapsed ? (
                  <>
                    <ChevronUp className="w-3.5 h-3.5" />
                    <span>Tampilkan Panduan Pos</span>
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-3.5 h-3.5" />
                    <span>Sembunyikan Panduan</span>
                  </>
                )}
              </button>

              {!hudDockCollapsed && (
                <div className="w-full bg-slate-950/92 border border-slate-800 rounded-2xl p-3.5 shadow-2xl space-y-2.5">
                  {simProgress?.warningMessage && (
                    <div className="px-3 py-2 rounded-xl bg-amber-950 border border-amber-500 text-xs font-bold text-amber-200">
                      {simProgress.warningMessage}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-extrabold text-amber-300">
                          {simProgress?.subStepLabel || activeStation?.shortLabel || 'Pos'}
                        </span>
                        {simulationUnlocked && (
                          <span className="text-xs font-mono-num font-bold text-emerald-400">
                            ({simProgress?.currentCount || 0}/{simProgress?.targetCount || 1})
                          </span>
                        )}
                      </div>
                      <p className="text-xs sm:text-sm text-slate-200 mt-0.5 leading-snug">
                        {simProgress?.hintMessage || 'Ikuti petunjuk menuju pos ibadah'}
                      </p>
                    </div>

                    {/* Context Action Buttons */}
                    <div className="flex items-center gap-2 shrink-0">
                      {!simulationUnlocked ? (
                        <>
                          <button
                            type="button"
                            onClick={() => worldRef.current?.teleportToCurrentTarget()}
                            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-colors whitespace-nowrap"
                          >
                            <Navigation className="w-3.5 h-3.5 text-sky-400" />
                            <span>Ke Lokasi Pos</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              soundEngine.playClick();
                              setShowVideoQuizModal(true);
                            }}
                            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs sm:text-sm font-extrabold transition-colors whitespace-nowrap"
                          >
                            <PlayCircle className="w-4 h-4" />
                            <span>Tonton Video &amp; Kuis</span>
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => worldRef.current?.teleportToCurrentTarget()}
                            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-colors whitespace-nowrap"
                            title="Dekati titik kegiatan"
                          >
                            <Navigation className="w-3.5 h-3.5 text-sky-400" />
                            <span>Dekati Titik</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              soundEngine.playClick();
                              setShowVideoQuizModal(true);
                            }}
                            className="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 hover:text-white transition-colors whitespace-nowrap"
                          >
                            Materi Pos
                          </button>

                          {simProgress?.canTriggerAction && simProgress?.actionButtonLabel && (
                            <button
                              type="button"
                              onClick={() => worldRef.current?.triggerAction()}
                              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 text-xs sm:text-sm font-extrabold transition-colors whitespace-nowrap shadow-md"
                            >
                              <Sparkles className="w-4 h-4" />
                              <span>{simProgress.actionButtonLabel}</span>
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Visual Counter Progress Bar when Simulation is Unlocked */}
                  {simulationUnlocked && (
                    <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                      <div
                        className="h-full bg-emerald-400 transition-all duration-200"
                        style={{
                          width: `${Math.min(
                            100,
                            Math.round(
                              ((simProgress?.currentCount || 0) / Math.max(1, simProgress?.targetCount || 1)) * 100
                            )
                          )}%`,
                        }}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="hidden lg:block w-32 shrink-0" />
          </div>
        </div>
      )}

      {/* Pre-Pos Short Educational Video & Quiz Modal */}
      {showVideoQuizModal && activeStation && (
        <VideoQuizModal
          station={activeStation}
          onCompletePreActivity={handleCompletePreActivity}
          onCloseCancel={() => {
            soundEngine.stopSpeech();
            setShowVideoQuizModal(false);
          }}
        />
      )}

      {/* Full Leaderboard & Digital Badges Modal */}
      {showFullLeaderboard && (
        <FullLeaderboardModal
          leaderboard={leaderboard}
          currentStations={screen === 'title' ? [] : (program?.stations || [])}
          completedStationIds={completedStationIds}
          onClose={() => setShowFullLeaderboard(false)}
        />
      )}

      {/* Teacher Portal Modal (Portal Guru: View & Download Student Results) */}
      {showTeacherPortal && (
        <TeacherPortalModal
          entries={leaderboard}
          teacherConfig={teacherConfig}
          isLoading={isSyncingPortal}
          onRefresh={fetchServerResults}
          onSaveTeacherConfig={handleSaveTeacherConfig}
          onDeleteEntry={handleDeleteEntry}
          onClearAllEntries={handleClearAllEntries}
          onClose={() => setShowTeacherPortal(false)}
        />
      )}

      {/* Victory Appreciation & WhatsApp Report Submission Modal */}
      {screen === 'victory' && program && (
        <VictoryModal
          entry={currentVictoryEntry}
          program={program}
          rank={playerRank}
          teacherConfig={teacherConfig}
          onUpdateTeacherPhone={(newPhone) => {
            setTeacherPhone(newPhone);
            try {
              window.localStorage.setItem(LAST_TEACHER_PHONE_KEY, newPhone);
            } catch {
              // Ignore
            }
          }}
          onOpenLeaderboard={() => setShowFullLeaderboard(true)}
          onPlayAgain={() => setScreen('title')}
        />
      )}
    </div>
  );
}
