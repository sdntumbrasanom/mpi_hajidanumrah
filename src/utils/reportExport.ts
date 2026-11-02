import { WORSHIP_PROGRAMS } from '../data/manasikData';
import { LeaderboardEntry, TeacherConfig, WorshipType } from '../types/game';

export const WORSHIP_DISPLAY_NAMES: Record<WorshipType, string> = {
  tamattu: "Haji Tamattu'",
  ifrad: 'Haji Ifrad',
  qiran: 'Haji Qiran',
  umrah: 'Ibadah Umrah',
};

/**
 * Normalizes an Indonesian or international phone number into digits suitable for wa.me links (e.g. 6281234567890).
 */
export function normalizeWhatsAppPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('0')) {
    return `62${digits.slice(1)}`;
  }
  if (digits.startsWith('8')) {
    return `62${digits}`;
  }
  return digits;
}

export function isValidWhatsAppPhone(raw: string): boolean {
  const normalized = normalizeWhatsAppPhone(raw);
  return /^\d{10,15}$/.test(normalized);
}

export function formatPhoneDisplay(raw?: string): string {
  if (!raw) return '-';
  const norm = normalizeWhatsAppPhone(raw);
  if (!norm) return '-';
  if (norm.startsWith('62')) {
    return `+${norm.slice(0, 2)} ${norm.slice(2, 5)}-${norm.slice(5, 9)}-${norm.slice(9)}`;
  }
  return `+${norm}`;
}

export function computeStudentGrade(entry: {
  points: number;
  completedStationIds: string[];
  totalStations: number;
  worshipType: WorshipType;
}): {
  completionPct: number;
  score100: number;
  letter: string;
  predicate: string;
  isComplete: boolean;
} {
  const prog = WORSHIP_PROGRAMS[entry?.worshipType] || WORSHIP_PROGRAMS.tamattu;
  const completedIds = Array.isArray(entry?.completedStationIds) ? entry.completedStationIds : [];
  const totalSt = Math.max(1, entry?.totalStations || prog.stations.length);
  const doneCount = Math.min(totalSt, completedIds.length);
  const completionRatio = doneCount / totalSt;
  const completionPct = Math.round(completionRatio * 100);

  const maxExpectedPoints = prog.stations.reduce((acc, s) => acc + s.pointsReward + 90, 0);
  const pointRatio = Math.min(1, (entry?.points || 0) / Math.max(1, maxExpectedPoints));

  const rawScore = completionRatio * 75 + pointRatio * 25;
  const score100 = Math.min(100, Math.max(0, Math.round(rawScore)));

  let letter = 'C';
  let predicate = 'Cukup';
  if (score100 >= 90) {
    letter = 'A';
    predicate = 'Sangat Baik';
  } else if (score100 >= 80) {
    letter = 'B';
    predicate = 'Baik';
  } else if (score100 >= 70) {
    letter = 'C';
    predicate = 'Cukup Baik';
  } else {
    letter = 'D';
    predicate = 'Perlu Bimbingan';
  }

  return {
    completionPct,
    score100,
    letter,
    predicate,
    isComplete: doneCount >= totalSt,
  };
}

export function formatTimestampId(ts?: number): string {
  if (!ts) return '-';
  try {
    return new Intl.DateTimeFormat('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(ts));
  } catch {
    return new Date(ts).toLocaleString('id-ID');
  }
}

export function buildWhatsAppReportMessage(
  entry: LeaderboardEntry,
  teacherName?: string
): string {
  const prog = WORSHIP_PROGRAMS[entry.worshipType] || WORSHIP_PROGRAMS.tamattu;
  const completedIds = Array.isArray(entry.completedStationIds) ? entry.completedStationIds : [];
  const grade = computeStudentGrade(entry);
  const greetingTarget = teacherName?.trim() ? `Bapak/Ibu ${teacherName.trim()}` : 'Bapak/Ibu Guru';

  const completedLines = prog.stations.map((s) => {
    const done = completedIds.includes(s.id);
    return `${done ? '✅' : '⬜'} ${s.stepNumber}. ${s.title}`;
  });

  return [
    `Assalamu'alaikum Wr. Wb. ${greetingTarget},`,
    `Berikut laporan hasil penyelesaian *Simulasi Manasik Haji & Umrah 3D*:`,
    ``,
    `*Nama Siswa* : ${entry.studentName}`,
    `*Kategori* : ${entry.gender === 'putra' ? 'Putra' : 'Putri'}`,
    `*Program Ibadah* : ${WORSHIP_DISPLAY_NAMES[entry.worshipType] || "Haji Tamattu'"}`,
    `*Ketuntasan Pos* : ${completedIds.length}/${prog.stations.length} Pos (${grade.completionPct}%)`,
    `*Nilai Akhir* : ${grade.score100}/100 (Predikat ${grade.letter} - ${grade.predicate})`,
    `*Total Poin* : ${entry.points} Poin`,
    `*Waktu Selesai* : ${formatTimestampId(entry.completedAt || entry.updatedAt)}`,
    ``,
    `*Rincian Tahapan Ibadah:*`,
    ...completedLines,
    ``,
    `Terima kasih. Wassalamu'alaikum Wr. Wb.`,
  ].join('\n');
}

export function buildWhatsAppUrl(phoneRaw: string, message: string): string {
  const normPhone = normalizeWhatsAppPhone(phoneRaw);
  const encoded = encodeURIComponent(message);
  if (!normPhone) {
    return `https://wa.me/?text=${encoded}`;
  }
  return `https://wa.me/${normPhone}?text=${encoded}`;
}

function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function escapeCsvCell(val: string | number): string {
  const str = String(val ?? '');
  if (/[",\n;]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Downloads all student results as a UTF-8 BOM CSV file ready for Microsoft Excel & Google Sheets.
 */
export function downloadAllResultsCSV(entries: LeaderboardEntry[]) {
  const sorted = [...entries].sort((a, b) => b.points - a.points);
  const headers = [
    'Peringkat',
    'Nama Peserta Didik',
    'Karakter',
    'Program Ibadah',
    'Pos Selesai',
    'Total Pos',
    'Ketuntasan (%)',
    'Nilai Akhir (0-100)',
    'Predikat',
    'Total Poin',
    'Status',
    'No. WhatsApp Guru',
    'Waktu Pembaruan',
    'Daftar Pos Terlaksana',
  ];

  const rows = sorted.map((entry, idx) => {
    const prog = WORSHIP_PROGRAMS[entry.worshipType] || WORSHIP_PROGRAMS.tamattu;
    const completedIds = Array.isArray(entry.completedStationIds) ? entry.completedStationIds : [];
    const grade = computeStudentGrade(entry);
    const completedTitles = prog.stations
      .filter((s) => completedIds.includes(s.id))
      .map((s) => `${s.stepNumber}. ${s.shortLabel}`)
      .join(' | ');

    return [
      idx + 1,
      entry.studentName,
      entry.gender === 'putra' ? 'Putra' : 'Putri',
      WORSHIP_DISPLAY_NAMES[entry.worshipType] || "Haji Tamattu'",
      completedIds.length,
      prog.stations.length,
      `${grade.completionPct}%`,
      grade.score100,
      `${grade.letter} (${grade.predicate})`,
      entry.points,
      grade.isComplete ? 'Tuntas' : 'Belum Tuntas',
      entry.teacherPhone ? normalizeWhatsAppPhone(entry.teacherPhone) : '-',
      formatTimestampId(entry.completedAt || entry.updatedAt),
      completedTitles || '-',
    ]
      .map(escapeCsvCell)
      .join(',');
  });

  const csvContent = '\uFEFF' + [headers.map(escapeCsvCell).join(','), ...rows].join('\r\n');
  const dateTag = new Date().toISOString().slice(0, 10);
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  triggerBlobDownload(blob, `Rekap_Hasil_Manasik_Siswa_${dateTag}.csv`);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Downloads a formatted Excel-compatible .xls report table for teachers.
 */
export function downloadAllResultsExcel(entries: LeaderboardEntry[], teacherConfig?: TeacherConfig) {
  const sorted = [...entries].sort((a, b) => b.points - a.points);
  const dateStr = formatTimestampId(Date.now());
  const schoolLine = teacherConfig?.schoolName?.trim()
    ? escapeHtml(teacherConfig.schoolName.trim())
    : 'Media Pembelajaran Manasik Haji & Umrah 3D';
  const teacherLine = teacherConfig?.teacherName?.trim()
    ? `Guru Pembimbing: ${escapeHtml(teacherConfig.teacherName.trim())}`
    : '';

  const tableRows = sorted
    .map((entry, idx) => {
      const prog = WORSHIP_PROGRAMS[entry.worshipType] || WORSHIP_PROGRAMS.tamattu;
      const completedIds = Array.isArray(entry.completedStationIds) ? entry.completedStationIds : [];
      const grade = computeStudentGrade(entry);
      const completedTitles = prog.stations
        .filter((s) => completedIds.includes(s.id))
        .map((s) => `${s.stepNumber}. ${s.shortLabel}`)
        .join(', ');

      return `
        <tr>
          <td style="text-align:center;">${idx + 1}</td>
          <td><b>${escapeHtml(entry.studentName)}</b></td>
          <td style="text-align:center;">${entry.gender === 'putra' ? 'Putra' : 'Putri'}</td>
          <td>${escapeHtml(WORSHIP_DISPLAY_NAMES[entry.worshipType] || "Haji Tamattu'")}</td>
          <td style="text-align:center;">${completedIds.length} / ${prog.stations.length}</td>
          <td style="text-align:center;">${grade.completionPct}%</td>
          <td style="text-align:center;"><b>${grade.score100}</b></td>
          <td style="text-align:center;">${grade.letter} - ${grade.predicate}</td>
          <td style="text-align:right;">${entry.points}</td>
          <td style="text-align:center;">${grade.isComplete ? 'Tuntas' : 'Proses'}</td>
          <td>${escapeHtml(completedTitles || '-')}</td>
          <td>${escapeHtml(formatTimestampId(entry.completedAt || entry.updatedAt))}</td>
        </tr>`;
    })
    .join('');

  const htmlDoc = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="UTF-8" />
      <style>
        body { font-family: Arial, sans-serif; font-size: 12px; color: #0f172a; }
        table { border-collapse: collapse; width: 100%; margin-top: 12px; }
        th { background-color: #0f172a; color: #ffffff; padding: 8px 10px; border: 1px solid #334155; font-size: 12px; }
        td { padding: 6px 10px; border: 1px solid #cbd5e1; vertical-align: middle; }
        tr:nth-child(even) td { background-color: #f8fafc; }
      </style>
    </head>
    <body>
      <h2>REKAPITULASI HASIL SIMULASI MANASIK HAJI &amp; UMRAH 3D</h2>
      <p><b>${schoolLine}</b> ${teacherLine ? `| ${teacherLine}` : ''} | Dicetak: ${escapeHtml(dateStr)}</p>
      <table>
        <thead>
          <tr>
            <th>No</th>
            <th>Nama Peserta Didik</th>
            <th>Kategori</th>
            <th>Program Ibadah</th>
            <th>Tahapan Pos</th>
            <th>Ketuntasan</th>
            <th>Nilai (0-100)</th>
            <th>Predikat</th>
            <th>Total Poin</th>
            <th>Status</th>
            <th>Rincian Pos Terlaksana</th>
            <th>Waktu Selesai</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>
    </body>
    </html>
  `;

  const dateTag = new Date().toISOString().slice(0, 10);
  const blob = new Blob(['\uFEFF' + htmlDoc], {
    type: 'application/vnd.ms-excel;charset=utf-8;',
  });
  triggerBlobDownload(blob, `Laporan_Nilai_Manasik_Kelas_${dateTag}.xls`);
}

/**
 * Generates and downloads a crisp high-resolution PNG report card for an individual student.
 */
export function downloadStudentResultCardPng(
  entry: LeaderboardEntry,
  teacherConfig?: TeacherConfig
) {
  const prog = WORSHIP_PROGRAMS[entry.worshipType] || WORSHIP_PROGRAMS.tamattu;
  const grade = computeStudentGrade(entry);

  const canvas = document.createElement('canvas');
  canvas.width = 1280;
  canvas.height = 880;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.fillStyle = '#0F172A';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = '#F59E0B';
  ctx.lineWidth = 4;
  ctx.strokeRect(28, 28, canvas.width - 56, canvas.height - 56);

  ctx.strokeStyle = '#1E293B';
  ctx.lineWidth = 2;
  ctx.strokeRect(42, 42, canvas.width - 84, canvas.height - 84);

  ctx.fillStyle = '#1E293B';
  ctx.fillRect(44, 44, canvas.width - 88, 130);

  ctx.fillStyle = '#0F172A';
  ctx.fillRect(76, 68, 82, 82);
  ctx.strokeStyle = '#FACC15';
  ctx.lineWidth = 3;
  ctx.strokeRect(76, 68, 82, 82);
  ctx.fillStyle = '#FACC15';
  ctx.fillRect(92, 92, 50, 10);
  ctx.fillRect(122, 112, 12, 22);

  ctx.fillStyle = '#FACC15';
  ctx.font = 'bold 18px "Plus Jakarta Sans", Arial, sans-serif';
  ctx.fillText(
    teacherConfig?.schoolName?.trim()
      ? teacherConfig.schoolName.trim().toUpperCase()
      : 'LAPORAN HASIL EVALUASI MEDIA PEMBELAJARAN MANASIK 3D',
    182,
    88
  );

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 34px "Outfit", Arial, sans-serif';
  ctx.fillText('KARTU HASIL SIMULASI HAJI & UMRAH', 182, 128);

  ctx.fillStyle = '#94A3B8';
  ctx.font = '16px "Plus Jakarta Sans", Arial, sans-serif';
  ctx.fillText(
    `Dicetak: ${formatTimestampId(entry.completedAt || entry.updatedAt)}${
      teacherConfig?.teacherName?.trim() ? `  ·  Guru Pembimbing: ${teacherConfig.teacherName.trim()}` : ''
    }`,
    182,
    156
  );

  ctx.fillStyle = '#131C31';
  ctx.fillRect(68, 200, 680, 165);
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(68, 200, 680, 165);

  ctx.fillStyle = '#94A3B8';
  ctx.font = '15px "Plus Jakarta Sans", Arial, sans-serif';
  ctx.fillText('Nama Peserta Didik', 94, 234);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 28px "Outfit", Arial, sans-serif';
  ctx.fillText(entry.studentName, 94, 268);

  ctx.fillStyle = '#94A3B8';
  ctx.font = '15px "Plus Jakarta Sans", Arial, sans-serif';
  ctx.fillText('Kategori Peserta', 94, 308);
  ctx.fillStyle = '#E2E8F0';
  ctx.font = 'bold 20px "Plus Jakarta Sans", Arial, sans-serif';
  ctx.fillText(entry.gender === 'putra' ? 'Peserta Putra' : 'Peserta Putri', 94, 336);

  ctx.fillStyle = '#94A3B8';
  ctx.font = '15px "Plus Jakarta Sans", Arial, sans-serif';
  ctx.fillText('Program Ibadah', 380, 308);
  ctx.fillStyle = '#FACC15';
  ctx.font = 'bold 22px "Plus Jakarta Sans", Arial, sans-serif';
  ctx.fillText(WORSHIP_DISPLAY_NAMES[entry.worshipType], 380, 336);

  ctx.fillStyle = '#131C31';
  ctx.fillRect(772, 200, 440, 165);
  ctx.strokeStyle = '#10B981';
  ctx.lineWidth = 2;
  ctx.strokeRect(772, 200, 440, 165);

  ctx.fillStyle = '#94A3B8';
  ctx.font = '15px "Plus Jakarta Sans", Arial, sans-serif';
  ctx.fillText('Nilai Akhir', 800, 234);
  ctx.fillStyle = '#34D399';
  ctx.font = 'bold 54px "JetBrains Mono", monospace';
  ctx.fillText(`${grade.score100}`, 800, 294);
  ctx.fillStyle = '#94A3B8';
  ctx.font = '20px "Plus Jakarta Sans", Arial, sans-serif';
  ctx.fillText('/ 100', 910, 294);

  ctx.fillStyle = '#FACC15';
  ctx.font = 'bold 20px "Plus Jakarta Sans", Arial, sans-serif';
  ctx.fillText(`Predikat ${grade.letter} (${grade.predicate})`, 800, 336);

  ctx.fillStyle = '#E2E8F0';
  ctx.font = 'bold 18px "JetBrains Mono", monospace';
  ctx.fillText(`${entry.points} Poin`, 1055, 255);
  ctx.fillStyle = '#38BDF8';
  ctx.font = 'bold 17px "JetBrains Mono", monospace';
  ctx.fillText(`${entry.completedStationIds.length}/${prog.stations.length} Pos`, 1055, 290);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 20px "Plus Jakarta Sans", Arial, sans-serif';
  ctx.fillText(
    `Rincian Ketuntasan Tahapan ${WORSHIP_DISPLAY_NAMES[entry.worshipType]} (${grade.completionPct}%):`,
    68,
    408
  );

  const stations = prog.stations;
  const colCount = 2;
  const rowHeight = 48;
  stations.forEach((st, idx) => {
    const col = idx % colCount;
    const row = Math.floor(idx / colCount);
    const x = 68 + col * 580;
    const y = 428 + row * (rowHeight + 8);
    const checked = entry.completedStationIds.includes(st.id);

    ctx.fillStyle = checked ? '#064E3B' : '#1E293B';
    ctx.fillRect(x, y, 560, rowHeight);
    ctx.strokeStyle = checked ? '#10B981' : '#334155';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(x, y, 560, rowHeight);

    ctx.fillStyle = checked ? '#34D399' : '#64748B';
    ctx.font = 'bold 18px "Plus Jakarta Sans", Arial, sans-serif';
    ctx.fillText(checked ? '✓' : '○', x + 16, y + 30);

    ctx.fillStyle = checked ? '#F8FAFC' : '#94A3B8';
    ctx.font = '16px "Plus Jakarta Sans", Arial, sans-serif';
    const titleText = `${st.stepNumber}. ${st.title}`;
    ctx.fillText(titleText.length > 48 ? `${titleText.slice(0, 46)}...` : titleText, x + 44, y + 30);
  });

  canvas.toBlob((blob) => {
    if (!blob) return;
    const safeName = entry.studentName.replace(/[^a-zA-Z0-9_-]/g, '_');
    triggerBlobDownload(blob, `Hasil_Manasik_${safeName}.png`);
  }, 'image/png');
}
