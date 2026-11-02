import express from 'express';
import fs from 'fs';
import path from 'path';
import { createServer as createViteServer } from 'vite';

interface StoredLeaderboardEntry {
  id: string;
  studentName: string;
  teacherPhone?: string;
  gender: 'putra' | 'putri';
  worshipType: 'umrah' | 'tamattu' | 'qiran' | 'ifrad';
  points: number;
  completedStationIds: string[];
  totalStations: number;
  badges: string[];
  updatedAt: number;
  completedAt?: number;
}

interface StoredTeacherConfig {
  teacherName: string;
  teacherPhone: string;
  schoolName: string;
}

interface DataStoreShape {
  results: StoredLeaderboardEntry[];
  teacherConfig: StoredTeacherConfig;
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const STORE_PATH = path.join(DATA_DIR, 'manasik_results.json');

const DEFAULT_STORE: DataStoreShape = {
  results: [],
  teacherConfig: {
    teacherName: '',
    teacherPhone: '',
    schoolName: '',
  },
};

function readStore(): DataStoreShape {
  try {
    if (!fs.existsSync(STORE_PATH)) {
      return {
        results: [],
        teacherConfig: { ...DEFAULT_STORE.teacherConfig },
      };
    }
    const raw = fs.readFileSync(STORE_PATH, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<DataStoreShape>;
    return {
      results: Array.isArray(parsed.results) ? parsed.results : [],
      teacherConfig: {
        teacherName: parsed.teacherConfig?.teacherName ?? '',
        teacherPhone: parsed.teacherConfig?.teacherPhone ?? '',
        schoolName: parsed.teacherConfig?.schoolName ?? '',
      },
    };
  } catch {
    return {
      results: [],
      teacherConfig: { ...DEFAULT_STORE.teacherConfig },
    };
  }
}

function writeStore(data: DataStoreShape): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(STORE_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to persist store:', err);
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '512kb' }));

  // GET all student simulation results & teacher settings
  app.get('/api/results', (_req, res) => {
    const store = readStore();
    res.json(store);
  });

  // Upsert a student's progress/final result
  app.post('/api/results', (req, res) => {
    const body = req.body as Partial<StoredLeaderboardEntry>;
    if (!body || typeof body.id !== 'string' || typeof body.studentName !== 'string') {
      res.status(400).json({ error: 'Data peserta tidak lengkap.' });
      return;
    }

    const store = readStore();
    const sanitized: StoredLeaderboardEntry = {
      id: body.id.slice(0, 100),
      studentName: body.studentName.trim().slice(0, 60),
      teacherPhone: typeof body.teacherPhone === 'string' ? body.teacherPhone.trim().slice(0, 24) : '',
      gender: body.gender === 'putri' ? 'putri' : 'putra',
      worshipType:
        body.worshipType === 'umrah' ||
        body.worshipType === 'tamattu' ||
        body.worshipType === 'qiran' ||
        body.worshipType === 'ifrad'
          ? body.worshipType
          : 'tamattu',
      points: typeof body.points === 'number' && Number.isFinite(body.points) ? Math.max(0, body.points) : 0,
      completedStationIds: Array.isArray(body.completedStationIds)
        ? body.completedStationIds.filter((x): x is string => typeof x === 'string').slice(0, 20)
        : [],
      totalStations:
        typeof body.totalStations === 'number' && body.totalStations > 0 ? body.totalStations : 13,
      badges: Array.isArray(body.badges)
        ? body.badges.filter((x): x is string => typeof x === 'string').slice(0, 20)
        : [],
      updatedAt: Date.now(),
      completedAt: typeof body.completedAt === 'number' ? body.completedAt : undefined,
    };

    const existingIdx = store.results.findIndex((r) => r.id === sanitized.id);
    if (existingIdx >= 0) {
      const prevCompletedAt = store.results[existingIdx].completedAt;
      if (!sanitized.completedAt && prevCompletedAt) {
        sanitized.completedAt = prevCompletedAt;
      }
      store.results[existingIdx] = sanitized;
    } else {
      store.results.push(sanitized);
    }

    writeStore(store);
    res.json({ ok: true, entry: sanitized, results: store.results });
  });

  // Delete a specific student result from Teacher Portal
  app.delete('/api/results/:id', (req, res) => {
    const targetId = req.params.id;
    const store = readStore();
    store.results = store.results.filter((r) => r.id !== targetId);
    writeStore(store);
    res.json({ ok: true, results: store.results });
  });

  // Clear all student results from Teacher Portal
  app.delete('/api/results', (_req, res) => {
    const store = readStore();
    store.results = [];
    writeStore(store);
    res.json({ ok: true, results: [] });
  });

  // Update default Teacher WhatsApp & School configuration
  app.post('/api/teacher-config', (req, res) => {
    const body = req.body as Partial<StoredTeacherConfig>;
    const store = readStore();
    store.teacherConfig = {
      teacherName: typeof body?.teacherName === 'string' ? body.teacherName.trim().slice(0, 60) : '',
      teacherPhone: typeof body?.teacherPhone === 'string' ? body.teacherPhone.trim().slice(0, 24) : '',
      schoolName: typeof body?.schoolName === 'string' ? body.schoolName.trim().slice(0, 80) : '',
    };
    writeStore(store);
    res.json({ ok: true, teacherConfig: store.teacherConfig });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
