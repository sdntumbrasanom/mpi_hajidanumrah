import { useState } from 'react';
import { Award, Check, Copy, Download, RotateCcw, Send, Trophy } from 'lucide-react';
import {
  LeaderboardEntry,
  StationConfig,
  TeacherConfig,
  WorshipProgram,
} from '../types/game';
import { BadgeIcon } from './BadgeIcon';
import {
  buildWhatsAppReportMessage,
  buildWhatsAppUrl,
  computeStudentGrade,
  downloadStudentResultCardPng,
  isValidWhatsAppPhone,
} from '../utils/reportExport';
import { soundEngine } from '../utils/sound';

interface VictoryModalProps {
  entry: LeaderboardEntry;
  program: WorshipProgram;
  rank: number;
  teacherConfig: TeacherConfig;
  onUpdateTeacherPhone: (phone: string) => void;
  onOpenLeaderboard: () => void;
  onPlayAgain: () => void;
}

export function VictoryModal({
  entry,
  program,
  rank,
  teacherConfig,
  onUpdateTeacherPhone,
  onOpenLeaderboard,
  onPlayAgain,
}: VictoryModalProps) {
  const [phoneField, setPhoneField] = useState(
    entry.teacherPhone || teacherConfig.teacherPhone || ''
  );
  const [copiedNotice, setCopiedNotice] = useState(false);

  const grade = computeStudentGrade(entry);
  const effectiveEntry: LeaderboardEntry = {
    ...entry,
    teacherPhone: phoneField,
  };

  const waMessage = buildWhatsAppReportMessage(effectiveEntry, teacherConfig.teacherName);
  const waHref = buildWhatsAppUrl(phoneField, waMessage);
  const phoneValid = isValidWhatsAppPhone(phoneField);

  const handleCopyMessage = async () => {
    try {
      await navigator.clipboard.writeText(waMessage);
      setCopiedNotice(true);
      setTimeout(() => setCopiedNotice(false), 2500);
    } catch {
      // Clipboard fallback ignored
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-slate-950/88 pointer-events-auto">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden text-slate-100">
        {/* Header */}
        <div className="px-6 py-5 bg-slate-950 border-b border-slate-800 text-center space-y-1.5">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-amber-400/15 border border-amber-400/40 text-amber-300 mb-1">
            <Award className="w-6 h-6" />
          </div>
          <p className="text-xs font-semibold text-emerald-400">
            Alhamdulillah · Evaluasi Simulasi Manasik Selesai
          </p>
          <h2 className="text-2xl font-extrabold text-white" style={{ textWrap: 'balance' }}>
            Selamat, {entry.studentName}!
          </h2>
          <p className="text-xs sm:text-sm text-slate-300">
            Program <strong>{program.name}</strong> telah dituntaskan dengan baik.
          </p>
        </div>

        <div className="p-6 space-y-5 max-h-[72vh] overflow-y-auto">
          {/* Score & Evaluation Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <p className="text-xs text-slate-400">Nilai Akhir</p>
              <p className="text-xl font-extrabold text-emerald-400 font-mono-num mt-0.5">
                {grade.score100}/100
              </p>
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <p className="text-xs text-slate-400">Predikat</p>
              <p className="text-base font-bold text-white mt-1">
                {grade.letter} · {grade.predicate}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <p className="text-xs text-slate-400">Total Poin</p>
              <p className="text-xl font-extrabold text-amber-300 font-mono-num mt-0.5">
                {entry.points}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <p className="text-xs text-slate-400">Tahapan Pos</p>
              <p className="text-xl font-extrabold text-sky-400 font-mono-num mt-0.5">
                {entry.completedStationIds.length}/{program.stations.length} ✓
              </p>
            </div>
          </div>

          {/* Primary WhatsApp Report Submission Box */}
          <div className="p-4 rounded-xl bg-slate-950 border border-emerald-800/70 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-white">
                  Kirim Laporan Hasil ke WhatsApp Guru
                </h3>
                <p className="text-xs text-slate-400">
                  Klik tombol hijau di bawah untuk mengirimkan rincian nilai dan ketuntasan pos kepada Guru Pembimbing.
                </p>
              </div>
              <span className="text-xs font-mono-num text-slate-400">Peringkat #{rank}</span>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              <div className="sm:w-56 shrink-0">
                <label htmlFor="victory-wa-phone" className="sr-only">
                  Nomor WhatsApp Guru
                </label>
                <input
                  id="victory-wa-phone"
                  type="tel"
                  value={phoneField}
                  onChange={(e) => {
                    setPhoneField(e.target.value);
                    onUpdateTeacherPhone(e.target.value);
                  }}
                  placeholder="No. WA Guru (0812...)"
                  className="w-full px-3 py-2.5 rounded-lg bg-slate-900 border border-slate-700 text-xs sm:text-sm font-mono-num text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400"
                />
              </div>

              {phoneValid ? (
                <a
                  href={waHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => soundEngine.playClick()}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold transition-colors whitespace-nowrap shadow-md"
                >
                  <Send className="w-4 h-4" />
                  <span>Kirim Hasil via WhatsApp</span>
                </a>
              ) : (
                <span className="flex-1 inline-flex items-center justify-center px-4 py-2.5 rounded-lg bg-slate-800 text-slate-400 text-xs font-semibold">
                  Isi nomor WhatsApp Guru yang valid terlebih dahulu
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleCopyMessage}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-medium text-slate-300 hover:text-white transition-colors whitespace-nowrap"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{copiedNotice ? 'Pesan Laporan Tersalin ✓' : 'Salin Teks Laporan'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  downloadStudentResultCardPng(effectiveEntry, teacherConfig);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-medium text-amber-300 hover:text-amber-200 transition-colors whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Unduh Kartu Hasil (.png)</span>
              </button>
            </div>
          </div>

          {/* Unlocked Digital Badges */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-slate-300">
              Lencana Digital &amp; Tahapan Pos yang Telah Dilaksanakan:
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {program.stations.map((st: StationConfig) => (
                <div
                  key={st.id}
                  className="flex items-center gap-2.5 p-2 rounded-lg bg-slate-950 border border-slate-800"
                >
                  <BadgeIcon emblem={st.badge.emblem} size={36} />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-white truncate">{st.shortLabel}</p>
                    <p className="text-[11px] text-emerald-400 flex items-center gap-1">
                      <Check className="w-3 h-3 stroke-[3]" /> Terlaksana
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Navigation Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                onOpenLeaderboard();
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs sm:text-sm font-semibold text-slate-200 transition-colors whitespace-nowrap"
            >
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>Lihat Papan Peringkat</span>
            </button>

            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                onPlayAgain();
              }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs sm:text-sm font-bold transition-colors whitespace-nowrap"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Kembali ke Halaman Awal</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
