import { FormEvent, useEffect, useState } from 'react';
import {
  GraduationCap,
  Maximize2,
  Minimize2,
  Play,
  Smartphone,
  Trophy,
  User,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { GenderType, WorshipType } from '../types/game';
import { WORSHIP_PROGRAMS } from '../data/manasikData';
import { isValidWhatsAppPhone } from '../utils/reportExport';
import { soundEngine } from '../utils/sound';

export interface StartSessionPayload {
  studentName: string;
  teacherPhone: string;
}

interface TitleScreenProps {
  initialName: string;
  initialTeacherPhone: string;
  gender: GenderType;
  worshipType: WorshipType;
  muted: boolean;
  isFullscreen: boolean;
  onChangeGender: (g: GenderType) => void;
  onChangeWorshipType: (w: WorshipType) => void;
  onToggleMute: () => void;
  onToggleFullscreen: () => void;
  onOpenLeaderboard: () => void;
  onOpenTeacherPortal: () => void;
  onStartGame: (payload: StartSessionPayload) => void;
}

const WORSHIP_OPTIONS: WorshipType[] = ['tamattu', 'ifrad', 'qiran', 'umrah'];

export function TitleScreen({
  initialName,
  initialTeacherPhone,
  gender,
  worshipType,
  muted,
  isFullscreen,
  onChangeGender,
  onChangeWorshipType,
  onToggleMute,
  onToggleFullscreen,
  onOpenLeaderboard,
  onOpenTeacherPortal,
  onStartGame,
}: TitleScreenProps) {
  const [nameInput, setNameInput] = useState(initialName);
  const [phoneInput, setPhoneInput] = useState(initialTeacherPhone);
  const [nameError, setNameError] = useState(false);
  const [phoneError, setPhoneError] = useState(false);

  useEffect(() => {
    if (!phoneInput && initialTeacherPhone) {
      setPhoneInput(initialTeacherPhone);
    }
  }, [initialTeacherPhone, phoneInput]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmedName = nameInput.trim();
    const trimmedPhone = phoneInput.trim();

    let hasErr = false;
    if (!trimmedName) {
      setNameError(true);
      hasErr = true;
    }
    if (!isValidWhatsAppPhone(trimmedPhone)) {
      setPhoneError(true);
      hasErr = true;
    }

    if (hasErr) {
      soundEngine.playWarning();
      return;
    }

    soundEngine.playIhramSwap();
    onStartGame({
      studentName: trimmedName,
      teacherPhone: trimmedPhone,
    });
  };

  return (
    <div className="fixed inset-0 z-20 flex flex-col justify-between p-4 sm:p-5 pointer-events-none">
      {/* Top-Right Icon-Only Utility Cluster (Flush Right, No Background) */}
      <header className="flex items-center justify-end gap-1.5 sm:gap-2">
        <button
          type="button"
          onClick={() => {
            soundEngine.playClick();
            onOpenLeaderboard();
          }}
          className="pointer-events-auto p-2 text-slate-900 hover:text-amber-600 hover:scale-110 transition-all drop-shadow-[0_1px_3px_rgba(255,255,255,0.95)]"
          title="Leaderboard"
          aria-label="Leaderboard"
        >
          <Trophy className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.25]" />
        </button>

        <button
          type="button"
          onClick={onToggleMute}
          className="pointer-events-auto p-2 text-slate-900 hover:text-emerald-700 hover:scale-110 transition-all drop-shadow-[0_1px_3px_rgba(255,255,255,0.95)]"
          title={muted ? 'Nyalakan Suara' : 'Matikan Suara'}
          aria-label={muted ? 'Nyalakan Suara' : 'Matikan Suara'}
        >
          {muted ? (
            <VolumeX className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.25] opacity-65" />
          ) : (
            <Volume2 className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.25]" />
          )}
        </button>

        <button
          type="button"
          onClick={() => {
            soundEngine.playClick();
            onToggleFullscreen();
          }}
          className="pointer-events-auto p-2 text-slate-900 hover:text-sky-700 hover:scale-110 transition-all drop-shadow-[0_1px_3px_rgba(255,255,255,0.95)]"
          title={isFullscreen ? 'Keluar Layar Penuh' : 'Layar Penuh'}
          aria-label={isFullscreen ? 'Keluar Layar Penuh' : 'Layar Penuh'}
        >
          {isFullscreen ? (
            <Minimize2 className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.25]" />
          ) : (
            <Maximize2 className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.25]" />
          )}
        </button>

        <button
          type="button"
          onClick={() => {
            soundEngine.playClick();
            onOpenTeacherPortal();
          }}
          className="pointer-events-auto p-2 text-slate-900 hover:text-amber-600 hover:scale-110 transition-all drop-shadow-[0_1px_3px_rgba(255,255,255,0.95)]"
          title="Portal Guru"
          aria-label="Portal Guru"
        >
          <GraduationCap className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.25]" />
        </button>
      </header>

      {/* Centered Transparent Hero Login Card Over Live 3D Masjidil Haram */}
      <div className="flex-1 flex items-center justify-center py-3">
        <div className="w-full max-w-md mx-auto pointer-events-auto bg-slate-950/42 border border-amber-400/35 rounded-2xl p-6 sm:p-7 shadow-2xl">
          {/* Centered Isometric 3D Ka'bah Crest & Title */}
          <div className="text-center mb-5">
            <div className="inline-flex items-center justify-center mb-2.5">
              <svg
                width="54"
                height="54"
                viewBox="0 0 64 64"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                {/* Isometric 3D Blocky Ka'bah Emblem */}
                <polygon points="32,8 54,19 32,30 10,19" fill="#334155" stroke="#FACC15" strokeWidth="1.8" />
                <polygon points="10,19 32,30 32,56 10,45" fill="#0F172A" stroke="#E2E8F0" strokeWidth="1.5" />
                <polygon points="54,19 32,30 32,56 54,45" fill="#1E293B" stroke="#E2E8F0" strokeWidth="1.5" />
                {/* Golden Kiswah Band */}
                <polygon points="10,26 32,37 32,42 10,31" fill="#FACC15" />
                <polygon points="54,26 32,37 32,42 54,31" fill="#EAB308" />
                {/* Multazam Golden Door */}
                <polygon points="41,39 47,36 47,48 41,51" fill="#FACC15" />
              </svg>
            </div>
            <h1
              className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)]"
              style={{ textWrap: 'balance' }}
            >
              Simulasi Manasik <span className="text-amber-400">3D</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-100 drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)] mt-1">
              Masukkan identitasmu untuk memulai petualangan ibadah di Tanah Suci
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {/* 1. Student Full Name */}
            <div>
              <label
                htmlFor="student-name"
                className="block text-xs font-bold text-white drop-shadow mb-1"
              >
                Nama Lengkap Peserta Didik
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-amber-300 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="student-name"
                  type="text"
                  maxLength={40}
                  value={nameInput}
                  onChange={(e) => {
                    setNameInput(e.target.value);
                    if (nameError) setNameError(false);
                  }}
                  placeholder="Ketik nama lengkapmu..."
                  className={`w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-950/60 border text-sm font-semibold text-white placeholder-slate-300/70 focus:outline-none focus:bg-slate-950/80 focus:border-amber-400 transition-colors ${
                    nameError ? 'border-rose-400' : 'border-white/25'
                  }`}
                />
              </div>
              {nameError && (
                <p className="text-xs font-semibold text-rose-300 drop-shadow mt-1">
                  Nama lengkap peserta wajib diisi.
                </p>
              )}
            </div>

            {/* 2. Teacher WhatsApp Phone Number */}
            <div>
              <label
                htmlFor="teacher-phone"
                className="block text-xs font-bold text-white drop-shadow mb-1"
              >
                Nomor WhatsApp Guru
              </label>
              <div className="relative">
                <Smartphone className="w-4 h-4 text-emerald-300 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="teacher-phone"
                  type="tel"
                  maxLength={20}
                  value={phoneInput}
                  onChange={(e) => {
                    setPhoneInput(e.target.value);
                    if (phoneError) setPhoneError(false);
                  }}
                  placeholder="Contoh: 081234567890"
                  className={`w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-950/60 border text-sm font-mono-num font-semibold text-white placeholder-slate-300/70 focus:outline-none focus:bg-slate-950/80 focus:border-amber-400 transition-colors ${
                    phoneError ? 'border-rose-400' : 'border-white/25'
                  }`}
                />
              </div>
              {phoneError && (
                <p className="text-xs font-semibold text-rose-300 drop-shadow mt-1">
                  Masukkan nomor WhatsApp Guru yang valid (contoh: 081234567890).
                </p>
              )}
            </div>

            {/* 3. Roblox-Style Avatar Gender Selector */}
            <div>
              <span className="block text-xs font-bold text-white drop-shadow mb-1">
                Pilih Karakter
              </span>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    onChangeGender('putra');
                  }}
                  className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs sm:text-sm font-bold transition-colors whitespace-nowrap ${
                    gender === 'putra'
                      ? 'bg-sky-500/35 border-sky-300 text-white shadow-md'
                      : 'bg-slate-950/55 border-white/20 text-slate-200 hover:border-white/40'
                  }`}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <rect x="6" y="3" width="12" height="4" rx="1" fill="#0F172A" stroke="#F8FAFC" strokeWidth="1.3" />
                    <rect x="7" y="7" width="10" height="8" rx="2" fill="#FDE68A" />
                    <rect x="5" y="16" width="14" height="6" rx="2" fill="#F8FAFC" />
                  </svg>
                  <span>Putra</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    onChangeGender('putri');
                  }}
                  className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs sm:text-sm font-bold transition-colors whitespace-nowrap ${
                    gender === 'putri'
                      ? 'bg-pink-500/35 border-pink-300 text-white shadow-md'
                      : 'bg-slate-950/55 border-white/20 text-slate-200 hover:border-white/40'
                  }`}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M5 13C5 7.5 8 4 12 4C16 4 19 7.5 19 13V21H5V13Z" fill="#F8FAFC" />
                    <rect x="8" y="8" width="8" height="6" rx="2" fill="#FDE68A" />
                  </svg>
                  <span>Putri</span>
                </button>
              </div>
            </div>

            {/* 4. Clean 2x2 Worship Mode Selector (No Rangkaian Box) */}
            <div>
              <span className="block text-xs font-bold text-white drop-shadow mb-1">
                Pilih Ibadah
              </span>
              <div className="grid grid-cols-2 gap-2">
                {WORSHIP_OPTIONS.map((wId) => {
                  const prog = WORSHIP_PROGRAMS[wId];
                  const active = worshipType === wId;
                  return (
                    <button
                      key={wId}
                      type="button"
                      onClick={() => {
                        soundEngine.playClick();
                        onChangeWorshipType(wId);
                      }}
                      className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-left transition-colors ${
                        active
                          ? 'bg-amber-400/30 border-amber-300 text-white shadow-md'
                          : 'bg-slate-950/55 border-white/20 text-slate-100 hover:border-white/40'
                      }`}
                    >
                      <span className="text-xs sm:text-sm font-bold whitespace-nowrap">
                        {prog.name}
                      </span>
                      <span className="text-[11px] font-mono-num font-bold text-amber-300 shrink-0 ml-1.5">
                        {prog.stations.length} Pos
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Primary Start Button */}
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2.5 py-3.5 px-6 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-sm sm:text-base transition-colors shadow-xl whitespace-nowrap mt-2"
            >
              <Play className="w-5 h-5 fill-slate-950" />
              <span>Mulai Petualangan Ibadah</span>
            </button>
          </form>
        </div>
      </div>

      {/* Bottom Subtle Control Guide */}
      <footer className="text-center pointer-events-none">
        <p className="inline-block px-4 py-1.5 rounded-lg bg-slate-950/45 border border-white/15 text-xs font-medium text-slate-100 drop-shadow">
          WASD / Panah Bergerak · Spasi Aksi Pos · Geser Layar Putar Kamera · F Layar Penuh
        </p>
      </footer>
    </div>
  );
}
