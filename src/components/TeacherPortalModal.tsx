import { FormEvent, useMemo, useState } from 'react';
import {
  Check,
  ChevronDown,
  ChevronUp,
  Download,
  FileSpreadsheet,
  GraduationCap,
  RefreshCw,
  Search,
  Settings,
  Trash2,
  X,
} from 'lucide-react';
import { WORSHIP_PROGRAMS } from '../data/manasikData';
import { LeaderboardEntry, TeacherConfig, WorshipType } from '../types/game';
import {
  WORSHIP_DISPLAY_NAMES,
  computeStudentGrade,
  downloadAllResultsCSV,
  downloadAllResultsExcel,
  downloadStudentResultCardPng,
  formatPhoneDisplay,
  formatTimestampId,
} from '../utils/reportExport';
import { soundEngine } from '../utils/sound';

interface TeacherPortalModalProps {
  entries: LeaderboardEntry[];
  teacherConfig: TeacherConfig;
  isLoading: boolean;
  onRefresh: () => void;
  onSaveTeacherConfig: (cfg: TeacherConfig) => Promise<void>;
  onDeleteEntry: (id: string) => Promise<void>;
  onClearAllEntries: () => Promise<void>;
  onClose: () => void;
}

export function TeacherPortalModal({
  entries,
  teacherConfig,
  isLoading,
  onRefresh,
  onSaveTeacherConfig,
  onDeleteEntry,
  onClearAllEntries,
  onClose,
}: TeacherPortalModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [worshipFilter, setWorshipFilter] = useState<'all' | WorshipType>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'complete' | 'incomplete'>('all');
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmClearAll, setConfirmClearAll] = useState(false);

  const [showConfigPanel, setShowConfigPanel] = useState(false);
  const [schoolInput, setSchoolInput] = useState(teacherConfig?.schoolName || '');
  const [teacherNameInput, setTeacherNameInput] = useState(teacherConfig?.teacherName || '');
  const [teacherPhoneInput, setTeacherPhoneInput] = useState(teacherConfig?.teacherPhone || '');
  const [configSavedNotice, setConfigSavedNotice] = useState(false);

  const stats = useMemo(() => {
    const totalStudents = entries?.length || 0;
    if (totalStudents === 0) {
      return {
        totalStudents: 0,
        completedStudents: 0,
        avgScore: 0,
        avgCompletionPct: 0,
      };
    }

    let completedCount = 0;
    let scoreSum = 0;
    let pctSum = 0;

    for (const item of (entries || [])) {
      const g = computeStudentGrade(item);
      if (g?.isComplete) completedCount++;
      scoreSum += g?.score100 || 0;
      pctSum += g?.completionPct || 0;
    }

    return {
      totalStudents,
      completedStudents: completedCount,
      avgScore: Math.round(scoreSum / totalStudents),
      avgCompletionPct: Math.round(pctSum / totalStudents),
    };
  }, [entries]);

  const filteredEntries = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return [...(entries || [])]
      .filter((item) => {
        if (worshipFilter !== 'all' && item?.worshipType !== worshipFilter) return false;
        const g = computeStudentGrade(item);
        if (statusFilter === 'complete' && !g?.isComplete) return false;
        if (statusFilter === 'incomplete' && g?.isComplete) return false;
        if (q) {
          const matchName = (item?.studentName || '').toLowerCase().includes(q);
          const matchPhone = (item?.teacherPhone ?? '').toLowerCase().includes(q);
          if (!matchName && !matchPhone) return false;
        }
        return true;
      })
      .sort((a, b) => (b?.updatedAt || 0) - (a?.updatedAt || 0));
  }, [entries, searchQuery, worshipFilter, statusFilter]);

  const handleSaveConfig = async (e: FormEvent) => {
    e.preventDefault();
    await onSaveTeacherConfig({
      schoolName: schoolInput.trim(),
      teacherName: teacherNameInput.trim(),
      teacherPhone: teacherPhoneInput.trim(),
    });
    setConfigSavedNotice(true);
    setTimeout(() => setConfigSavedNotice(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 text-slate-100 flex flex-col overflow-hidden pointer-events-auto">
      {/* Top Workspace Header */}
      <header className="flex items-center justify-between gap-4 px-6 py-4 bg-slate-950 border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-amber-400 shrink-0">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-white truncate">
              Portal Guru · Evaluasi &amp; Rekap Hasil Siswa
            </h1>
            <p className="text-xs text-slate-400 truncate">
              Pantau ketuntasan tahapan manasik peserta didik dan unduh laporan nilai
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              onRefresh();
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-medium text-slate-200 transition-colors whitespace-nowrap"
            title="Muat ulang data terbaru"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Segarkan</span>
          </button>

          <button
            type="button"
            disabled={!entries || entries.length === 0}
            onClick={() => {
              soundEngine.playClick();
              downloadAllResultsCSV(entries);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-40 border border-slate-700 text-xs font-semibold text-slate-100 transition-colors whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5 text-sky-400" />
            <span>Unduh CSV</span>
          </button>

          <button
            type="button"
            disabled={!entries || entries.length === 0}
            onClick={() => {
              soundEngine.playClick();
              downloadAllResultsExcel(entries, teacherConfig);
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-xs font-semibold text-white transition-colors whitespace-nowrap"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Unduh Rekap Excel (.xls)</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-colors"
            aria-label="Tutup Portal Guru"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Scrollable Content */}
      <main className="flex-1 overflow-y-auto px-6 py-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* 1. Summary KPI Row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
              <p className="text-xs text-slate-400">Total Peserta Didik</p>
              <p className="text-2xl font-bold text-white font-mono-num mt-1">
                {stats.totalStudents}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
              <p className="text-xs text-slate-400">Siswa Tuntas (100% Pos)</p>
              <p className="text-2xl font-bold text-emerald-400 font-mono-num mt-1">
                {stats.completedStudents}
                <span className="text-sm font-normal text-slate-400 ml-1">
                  / {stats.totalStudents}
                </span>
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
              <p className="text-xs text-slate-400">Rata-rata Nilai Akhir</p>
              <p className="text-2xl font-bold text-amber-300 font-mono-num mt-1">
                {stats.avgScore}
                <span className="text-sm font-normal text-slate-400 ml-1">/ 100</span>
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
              <p className="text-xs text-slate-400">Rata-rata Ketuntasan Pos</p>
              <p className="text-2xl font-bold text-sky-400 font-mono-num mt-1">
                {stats.avgCompletionPct}%
              </p>
            </div>
          </div>

          {/* 2. Collapsible Teacher Default WhatsApp & School Identity Configuration */}
          <div className="rounded-xl bg-slate-900 border border-slate-800">
            <button
              type="button"
              onClick={() => setShowConfigPanel((v) => !v)}
              className="w-full flex items-center justify-between px-5 py-3.5 text-left"
            >
              <div className="flex items-center gap-2.5">
                <Settings className="w-4 h-4 text-slate-400" />
                <span className="text-sm font-semibold text-slate-200">
                  Pengaturan Identitas Guru &amp; Nomor WhatsApp Default
                </span>
                {teacherConfig?.teacherPhone && (
                  <span className="text-xs text-slate-400 font-mono-num">
                    · {formatPhoneDisplay(teacherConfig.teacherPhone)}
                  </span>
                )}
              </div>
              {showConfigPanel ? (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              )}
            </button>

            {showConfigPanel && (
              <form
                onSubmit={handleSaveConfig}
                className="px-5 pb-5 pt-2 border-t border-slate-800 grid grid-cols-1 md:grid-cols-12 gap-3 items-end"
              >
                <div className="md:col-span-4">
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Nama Sekolah / Madrasah
                  </label>
                  <input
                    type="text"
                    value={schoolInput}
                    onChange={(e) => setSchoolInput(e.target.value)}
                    placeholder="Contoh: SD Negeri 1 / MIN 1"
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div className="md:col-span-3">
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Nama Guru Pembimbing
                  </label>
                  <input
                    type="text"
                    value={teacherNameInput}
                    onChange={(e) => setTeacherNameInput(e.target.value)}
                    placeholder="Contoh: Bapak Misbahul Munir"
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div className="md:col-span-3">
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    No. WhatsApp Guru Default
                  </label>
                  <input
                    type="tel"
                    value={teacherPhoneInput}
                    onChange={(e) => setTeacherPhoneInput(e.target.value)}
                    placeholder="081234567890"
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-sm font-mono-num text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div className="md:col-span-2 flex items-center gap-2">
                  <button
                    type="submit"
                    className="w-full py-2 px-4 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold transition-colors whitespace-nowrap"
                  >
                    {configSavedNotice ? 'Tersimpan ✓' : 'Simpan'}
                  </button>
                </div>
                <p className="md:col-span-12 text-xs text-slate-400">
                  Nomor WhatsApp yang disimpan di sini akan otomatis terisi pada halaman masuk peserta didik dan dicantumkan pada kepala laporan Excel/Kartu Hasil.
                </p>
              </form>
            )}
          </div>

          {/* 3. Filter & Search Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3 flex-1 min-w-0">
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari nama peserta didik..."
                  className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-slate-600"
                />
              </div>

              {/* Worship Filter Segmented Control */}
              <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-900 border border-slate-800 overflow-x-auto">
                {(
                  [
                    ['all', 'Semua Ibadah'],
                    ['tamattu', "Tamattu'"],
                    ['ifrad', 'Ifrad'],
                    ['qiran', 'Qiran'],
                    ['umrah', 'Umrah'],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setWorshipFilter(key)}
                    className={`px-2.5 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap ${
                      worshipFilter === key
                        ? 'bg-slate-800 text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Completion Filter */}
              <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-900 border border-slate-800">
                {(
                  [
                    ['all', 'Semua Status'],
                    ['complete', 'Tuntas'],
                    ['incomplete', 'Proses'],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setStatusFilter(key)}
                    className={`px-2.5 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap ${
                      statusFilter === key
                        ? 'bg-slate-800 text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Safe Two-Step Clear Class Data */}
            {entries && entries.length > 0 && (
              <div className="flex items-center gap-2 shrink-0">
                {!confirmClearAll ? (
                  <button
                    type="button"
                    onClick={() => setConfirmClearAll(true)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-900 hover:bg-rose-950/60 border border-slate-800 hover:border-rose-800 text-xs font-medium text-slate-400 hover:text-rose-300 transition-colors whitespace-nowrap"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Kosongkan Data</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-1.5 bg-rose-950/60 border border-rose-800 px-2.5 py-1.5 rounded-lg">
                    <span className="text-xs text-rose-200">Hapus semua?</span>
                    <button
                      type="button"
                      onClick={async () => {
                        await onClearAllEntries();
                        setConfirmClearAll(false);
                      }}
                      className="px-2 py-0.5 rounded bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white whitespace-nowrap"
                    >
                      Ya, Hapus
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmClearAll(false)}
                      className="px-2 py-0.5 rounded bg-slate-800 text-xs text-slate-300 whitespace-nowrap"
                    >
                      Batal
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 4. Student Results Data Grid */}
          <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
            {!filteredEntries || filteredEntries.length === 0 ? (
              <div className="py-14 px-6 text-center space-y-2">
                <p className="text-sm font-semibold text-slate-300">
                  Belum ada data hasil simulasi siswa yang sesuai filter.
                </p>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Data nilai, ketuntasan tiap pos ibadah, dan poin kuis anak didik akan otomatis tersimpan dan tampil di tabel ini segera setelah siswa memulai simulasi.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-950 border-b border-slate-800 text-xs text-slate-400">
                      <th className="py-3 px-4 font-semibold w-12">No</th>
                      <th className="py-3 px-4 font-semibold">Nama Peserta Didik</th>
                      <th className="py-3 px-4 font-semibold">Program Ibadah</th>
                      <th className="py-3 px-4 font-semibold">Ketuntasan Pos</th>
                      <th className="py-3 px-4 font-semibold text-right">Nilai Akhir</th>
                      <th className="py-3 px-4 font-semibold text-right">Poin</th>
                      <th className="py-3 px-4 font-semibold">No. WA Guru</th>
                      <th className="py-3 px-4 font-semibold">Waktu</th>
                      <th className="py-3 px-4 font-semibold text-right">Tindakan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {filteredEntries.map((entry, idx) => {
                      // Gunakan fallback ke 'tamattu' jika worshipType tidak dikenali agar tidak undefined
                      const progKey = entry?.worshipType && WORSHIP_PROGRAMS[entry.worshipType] ? entry.worshipType : 'tamattu';
                      const prog = WORSHIP_PROGRAMS[progKey];
                      const grade = computeStudentGrade(entry);
                      const isExpanded = expandedRowId === entry?.id;

                      return (
                        <FragmentRow
                          key={entry?.id || idx}
                          index={idx + 1}
                          entry={entry}
                          programName={WORSHIP_DISPLAY_NAMES[progKey] || 'Haji Tamattu'}
                          stations={prog?.stations || []}
                          grade={grade}
                          isExpanded={isExpanded}
                          isConfirmingDelete={confirmDeleteId === entry?.id}
                          onToggleExpand={() =>
                            setExpandedRowId((prev) => (prev === entry?.id ? null : entry?.id))
                          }
                          onDownloadCard={() =>
                            downloadStudentResultCardPng(entry, teacherConfig)
                          }
                          onRequestDelete={() => setConfirmDeleteId(entry?.id)}
                          onCancelDelete={() => setConfirmDeleteId(null)}
                          onConfirmDelete={async () => {
                            if (entry?.id) {
                              await onDeleteEntry(entry.id);
                            }
                            setConfirmDeleteId(null);
                          }}
                        />
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

interface FragmentRowProps {
  index: number;
  entry: LeaderboardEntry;
  programName: string;
  stations: ReturnType<typeof useMemo> extends never ? never : any[];
  grade: ReturnType<typeof computeStudentGrade>;
  isExpanded: boolean;
  isConfirmingDelete: boolean;
  onToggleExpand: () => void;
  onDownloadCard: () => void;
  onRequestDelete: () => void;
  onCancelDelete: () => void;
  onConfirmDelete: () => Promise<void>;
}

function FragmentRow({
  index,
  entry,
  programName,
  stations,
  grade,
  isExpanded,
  isConfirmingDelete,
  onToggleExpand,
  onDownloadCard,
  onRequestDelete,
  onCancelDelete,
  onConfirmDelete,
}: FragmentRowProps) {
  return (
    <>
      <tr className="hover:bg-slate-800/40 transition-colors">
        <td className="py-3 px-4 font-mono-num text-xs text-slate-400">{index}</td>
        <td className="py-3 px-4">
          <div className="font-semibold text-white">{entry?.studentName || 'Siswa'}</div>
          <div className="text-xs text-slate-400">
            {entry?.gender === 'putra' ? 'Putra' : 'Putri'}
          </div>
        </td>
        <td className="py-3 px-4 text-xs font-medium text-slate-200 whitespace-nowrap">
          {programName}
        </td>
        <td className="py-3 px-4">
          <div className="flex items-center gap-2">
            <span className="font-mono-num text-xs font-semibold text-slate-200 whitespace-nowrap">
              {entry?.completedStationIds?.length || 0}/{stations?.length || 0} Pos
            </span>
            <span className="text-slate-600" aria-hidden="true">·</span>
            <span
              className={`text-xs font-medium whitespace-nowrap ${
                grade?.isComplete ? 'text-emerald-400' : 'text-amber-300'
              }`}
            >
              {grade?.isComplete ? 'Tuntas' : `${grade?.completionPct || 0}%`}
            </span>
          </div>
          <div className="w-28 h-1.5 bg-slate-950 rounded-full overflow-hidden mt-1">
            <div
              className={`h-full ${grade?.isComplete ? 'bg-emerald-500' : 'bg-amber-400'}`}
              style={{ width: `${grade?.completionPct || 0}%` }}
            />
          </div>
        </td>
        <td className="py-3 px-4 text-right font-mono-num">
          <span className="font-bold text-white">{grade?.score100 || 0}</span>
          <span className="text-xs text-slate-400 ml-1">({grade?.letter || 'C'})</span>
        </td>
        <td className="py-3 px-4 text-right font-mono-num font-semibold text-amber-300">
          {entry?.points || 0}
        </td>
        <td className="py-3 px-4 font-mono-num text-xs text-slate-300 whitespace-nowrap">
          {formatPhoneDisplay(entry?.teacherPhone)}
        </td>
        <td className="py-3 px-4 text-xs text-slate-400 whitespace-nowrap">
          {formatTimestampId(entry?.completedAt || entry?.updatedAt || Date.now())}
        </td>
        <td className="py-3 px-4 text-right">
          <div className="inline-flex items-center justify-end gap-1.5">
            <button
              type="button"
              onClick={onToggleExpand}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 transition-colors whitespace-nowrap"
            >
              {isExpanded ? 'Tutup Pos' : 'Detail Pos'}
            </button>
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                onDownloadCard();
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600/90 hover:bg-emerald-500 text-xs font-semibold text-white transition-colors whitespace-nowrap"
              title="Unduh Kartu Hasil Siswa (.png)"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Unduh Hasil</span>
            </button>

            {!isConfirmingDelete ? (
              <button
                type="button"
                onClick={onRequestDelete}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                aria-label="Hapus data siswa"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            ) : (
              <div className="inline-flex items-center gap-1">
                <button
                  type="button"
                  onClick={onConfirmDelete}
                  className="px-2 py-1 rounded bg-rose-600 text-xs font-bold text-white whitespace-nowrap"
                >
                  Hapus
                </button>
                <button
                  type="button"
                  onClick={onCancelDelete}
                  className="px-2 py-1 rounded bg-slate-800 text-xs text-slate-300 whitespace-nowrap"
                >
                  Batal
                </button>
              </div>
            )}
          </div>
        </td>
      </tr>

      {isExpanded && (
        <tr className="bg-slate-950/75">
          <td colSpan={9} className="px-6 py-4">
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-300">
                Rincian Tahapan {programName} — {entry?.studentName || 'Siswa'}:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {(stations || []).map((st) => {
                  const done = entry?.completedStationIds?.includes(st?.id);
                  return (
                    <div
                      key={st?.id}
                      className={`flex items-center justify-between gap-2 px-3 py-2 rounded-lg border text-xs ${
                        done
                          ? 'bg-emerald-950/40 border-emerald-800/70 text-emerald-200'
                          : 'bg-slate-900/60 border-slate-800 text-slate-400'
                      }`}
                    >
                      <span className="truncate">
                        <span className="font-mono-num mr-1.5">{st?.stepNumber || 1}.</span>
                        {st?.title || st?.shortLabel || 'Pos Ibadah'}
                      </span>
                      <span className="shrink-0 font-semibold">
                        {done ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[3]" />
                        ) : (
                          'Belum'
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
