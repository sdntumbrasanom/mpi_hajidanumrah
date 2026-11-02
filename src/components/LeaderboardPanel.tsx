import { useState } from 'react';
import { Check, ChevronDown, ChevronUp, Trophy, X } from 'lucide-react';
import { LeaderboardEntry, StationConfig, WorshipType } from '../types/game';
import { WORSHIP_PROGRAMS } from '../data/manasikData';
import { BadgeIcon } from './BadgeIcon';
import { soundEngine } from '../utils/sound';

interface CompactChecklistLeaderboardProps {
  studentName: string;
  points: number;
  stations: StationConfig[];
  completedStationIds: string[];
  activeStationId: string | null;
  leaderboard: LeaderboardEntry[];
  onOpenFullModal: () => void;
}

export function CompactRobloxLeaderboard({
  studentName,
  points,
  stations,
  completedStationIds,
  activeStationId,
  leaderboard,
  onOpenFullModal,
}: CompactChecklistLeaderboardProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [tab, setTab] = useState<'pos' | 'rank'>('pos');

  const sorted = [...leaderboard].sort((a, b) => b.points - a.points).slice(0, 5);

  return (
    <div className="w-64 sm:w-72 bg-slate-950/90 border border-slate-800 rounded-xl overflow-hidden text-slate-100 pointer-events-auto shadow-lg">
      {/* Header Bar */}
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-slate-900 border-b border-slate-800">
        <button
          type="button"
          onClick={() => {
            soundEngine.playClick();
            setCollapsed((c) => !c);
          }}
          className="flex items-center gap-2 text-xs font-bold text-white hover:text-amber-300 transition-colors truncate"
        >
          <Trophy className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="truncate">{studentName}</span>
          <span aria-hidden="true" className="text-slate-500">·</span>
          <span className="font-mono-num text-amber-300">{points} Poin</span>
        </button>

        <button
          type="button"
          onClick={() => {
            soundEngine.playClick();
            setCollapsed((c) => !c);
          }}
          className="p-1 text-slate-400 hover:text-white"
          aria-label={collapsed ? 'Buka papan progres' : 'Tutup papan progres'}
        >
          {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </button>
      </div>

      {!collapsed && (
        <div className="p-3 space-y-2.5">
          {/* Segmented Toggle: Checklist Pos vs Peringkat Siswa */}
          <div className="grid grid-cols-2 gap-1 p-1 bg-slate-900 rounded-lg border border-slate-800">
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                setTab('pos');
              }}
              className={`py-1 text-xs font-semibold rounded transition-colors whitespace-nowrap ${
                tab === 'pos' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Checklist Pos ({completedStationIds.length}/{stations.length})
            </button>
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                setTab('rank');
              }}
              className={`py-1 text-xs font-semibold rounded transition-colors whitespace-nowrap ${
                tab === 'rank' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Leaderboard
            </button>
          </div>

          {tab === 'pos' ? (
            <ul className="space-y-1 max-h-52 overflow-y-auto pr-0.5">
              {stations.map((st) => {
                const isDone = completedStationIds.includes(st.id);
                const isCurrent = st.id === activeStationId;
                return (
                  <li
                    key={st.id}
                    className={`flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-xs ${
                      isDone
                        ? 'bg-emerald-950/60 text-emerald-200 border border-emerald-800/60'
                        : isCurrent
                        ? 'bg-amber-950/60 text-amber-200 border border-amber-700/70 font-semibold'
                        : 'text-slate-400'
                    }`}
                  >
                    <span className="truncate">
                      <span className="font-mono-num mr-1.5">{st.stepNumber}.</span>
                      {st.shortLabel}
                    </span>
                    <span
                      className={`w-4 h-4 rounded flex items-center justify-center shrink-0 ${
                        isDone
                          ? 'bg-emerald-500 text-slate-950'
                          : 'border border-slate-600 text-transparent'
                      }`}
                      aria-label={isDone ? 'Sudah dilaksanakan' : 'Belum dilaksanakan'}
                    >
                      <Check className="w-3 h-3 stroke-[3]" />
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <ul className="space-y-1.5">
              {sorted.map((entry, idx) => (
                <li
                  key={entry.id}
                  className={`flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-xs ${
                    entry.isCurrentPlayer
                      ? 'bg-amber-950/50 border border-amber-700/70 text-amber-200 font-semibold'
                      : 'bg-slate-900/70 text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-mono-num font-bold text-slate-400 w-4">#{idx + 1}</span>
                    <span className="truncate">{entry.studentName}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 font-mono-num">
                    <span className="text-emerald-400">
                      {entry.completedStationIds.length}/{entry.totalStations}✓
                    </span>
                    <span className="text-amber-300 font-bold">{entry.points}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              onOpenFullModal();
            }}
            className="w-full py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-amber-300 transition-colors whitespace-nowrap"
          >
            Buka Papan Peringkat &amp; Lencana
          </button>
        </div>
      )}
    </div>
  );
}

interface FullLeaderboardModalProps {
  leaderboard: LeaderboardEntry[];
  currentStations: StationConfig[];
  completedStationIds: string[];
  onClose: () => void;
}

const WORSHIP_NAMES: Record<WorshipType, string> = {
  umrah: 'Umrah',
  tamattu: 'Haji Tamattu\'',
  qiran: 'Haji Qiran',
  ifrad: 'Haji Ifrad',
};

export function FullLeaderboardModal({
  leaderboard,
  currentStations,
  completedStationIds,
  onClose,
}: FullLeaderboardModalProps) {
  const sorted = [...leaderboard].sort((a, b) => b.points - a.points);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 pointer-events-auto">
      <div className="w-full max-w-4xl max-h-[90vh] flex flex-col bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-950 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <Trophy className="w-6 h-6 text-amber-400" />
            <div>
              <h2 className="text-xl font-bold text-white">
                Papan Peringkat &amp; Checklist Tahapan Ibadah
              </h2>
              <p className="text-xs text-slate-400">
                Setiap tahapan pos yang selesai dilaksanakan otomatis tercentang dan menambah poin apresiasi
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
            aria-label="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6">
          {/* Current Student Digital Badges & Stage Checkmarks */}
          {currentStations.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-200">
                Koleksi Lencana Digital &amp; Status Tahapanmu
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {currentStations.map((st) => {
                  const unlocked = completedStationIds.includes(st.id);
                  return (
                    <div
                      key={st.id}
                      className={`p-3 rounded-xl border flex flex-col items-center text-center gap-2 ${
                        unlocked
                          ? 'bg-slate-950 border-emerald-600/70'
                          : 'bg-slate-950/50 border-slate-800 opacity-65'
                      }`}
                    >
                      <BadgeIcon emblem={st.badge.emblem} size={48} locked={!unlocked} />
                      <div>
                        <p className="text-xs font-bold text-white leading-tight">{st.badge.name}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Pos {st.stepNumber} · {st.shortLabel}
                        </p>
                      </div>
                      <div className="text-[11px] font-semibold">
                        {unlocked ? (
                          <span className="inline-flex items-center gap-1 text-emerald-400">
                            <Check className="w-3.5 h-3.5 stroke-[3]" /> Terlaksana
                          </span>
                        ) : (
                          <span className="text-slate-500">Belum Selesai</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Full Student Leaderboard Table */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-200">Peringkat Siswa Petualang Manasik</h3>
            <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-xs text-slate-400">
                    <th className="py-3 px-4 font-semibold">Peringkat</th>
                    <th className="py-3 px-4 font-semibold">Nama Anak Didik</th>
                    <th className="py-3 px-4 font-semibold">Ibadah</th>
                    <th className="py-3 px-4 font-semibold">Checklist Tahapan Pos</th>
                    <th className="py-3 px-4 font-semibold text-right">Total Poin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {sorted.map((entry, idx) => {
                    const prog = WORSHIP_PROGRAMS[entry.worshipType];
                    return (
                      <tr
                        key={entry.id}
                        className={entry.isCurrentPlayer ? 'bg-amber-950/30' : 'hover:bg-slate-900/50'}
                      >
                        <td className="py-3 px-4 font-mono-num font-bold text-slate-300">
                          #{idx + 1}
                        </td>
                        <td className="py-3 px-4 font-semibold text-white">
                          {entry.studentName}
                          {entry.isCurrentPlayer && (
                            <span className="ml-2 text-xs font-normal text-amber-300">(Kamu)</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-300 whitespace-nowrap">
                          {WORSHIP_NAMES[entry.worshipType]}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-wrap items-center gap-1.5">
                            {prog.stations.map((s) => {
                              const checked = entry.completedStationIds.includes(s.id);
                              return (
                                <span
                                  key={s.id}
                                  title={`${s.stepNumber}. ${s.shortLabel}: ${checked ? 'Sudah terlaksana' : 'Belum'}`}
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium ${
                                    checked
                                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/70'
                                      : 'bg-slate-900 text-slate-500 border border-slate-800'
                                  }`}
                                >
                                  <Check className={`w-3 h-3 ${checked ? 'opacity-100 stroke-[3]' : 'opacity-25'}`} />
                                  <span>{s.shortLabel}</span>
                                </span>
                              );
                            })}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right font-mono-num font-bold text-amber-300">
                          {entry.points}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
