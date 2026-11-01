import express from 'express';
import cookieParser from 'cookie-parser';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const dataDir = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(root, 'data');
const uploadDir = process.env.UPLOAD_DIR ? path.resolve(process.env.UPLOAD_DIR) : path.join(root, 'uploads');

fs.mkdirSync(dataDir, { recursive: true });
fs.mkdirSync(uploadDir, { recursive: true });

const dbFile = path.join(dataDir, 'site-data.json');

const initial = {
  settings: {
    whatsapp: '+923413614268',
    socials: { linkedin: '', instagram: '', facebook: '', tiktok: '' },
    seoTitle: 'WebPhase | AI-Native Web Design & Development, Islamabad',
    seoDescription: 'We build digital experiences that deliver results. Strategy, design and technology for brands ready to move forward.',
    contactEmail: 'info@webphase.net',
    location: 'Islamabad, Pakistan',
    heroVideo: '',
    heroPoster: '',
    heroBackground: '#f0ebe6',
    logoImage: '',
    futureImage: '',
    awardsVideo: '',
    awardsPoster: '',
    heroFloatImages: [
      { id: 'hf1', title: 'Branding ↗', url: 'https://webphase.net/assets/reels/reel-1-poster.webp' },
      { id: 'hf2', title: 'Development', url: 'https://webphase.net/assets/reels/reel-2-poster.webp' },
      { id: 'hf3', title: 'Strategy ↗', url: 'https://webphase.net/assets/testimonials/chris-lawrence-poster.webp' },
    ],
    studioMedia: [],
  },
  content: {
    heroTitle: 'We build stuff that delivers results',
    heroEyebrow: 'AI-NATIVE DIGITAL STUDIO · ISLAMABAD',
    heroSub: 'Strategy, design and technology for brands ready to move forward.',
    futureTitle: 'an agency built for the future. from AI to Agents',
    flickTitle: 'Inside the studio',
    teamTitle: 'selected work from an award-winning studio in islamabad.',
    testimonialTitle: 'Wholesale Central',
    awardsTitle: 'good enough for google, awwwards and tommy hilfiger.',
    servicesTitle: 'how we can help:',
  },
  projects: [
    {
      id: 'p1',
      name: 'Digital commerce, reimagined',
      category: 'E-commerce · Strategy',
      image: 'https://webphase.net/assets/reels/reel-2-poster.webp',
      description: 'A considered digital experience built to turn attention into action.',
    },
    {
      id: 'p2',
      name: 'A better way to connect',
      category: 'Brand platform · Development',
      image: 'https://webphase.net/assets/testimonials/chris-lawrence-poster.webp',
      description: 'Clear storytelling with a confident, conversion-focused digital presence.',
    },
    {
      id: 'p3',
      name: 'The next chapter',
      category: 'Creative technology',
      image: 'https://webphase.net/assets/reels/reel-6-poster.webp',
      description: 'A flexible platform designed for what comes next.',
    },
  ],
  services: [
    'Web design & development',
    'AI integrations & agents',
    'Brand identity & strategy',
    'E-commerce experiences',
  ],
  testimonials: [
    {
      name: 'Chris Lawrence',
      role: 'Founder · Wholesale Central',
      quote: 'A thoughtful team that understands how to turn ambitious ideas into real digital experiences.',
      image: 'https://webphase.net/assets/testimonials/chris-lawrence-poster.webp',
    },
    {
      name: 'Dorota Pietrzak',
      role: 'Brand partner',
      quote: 'The process felt collaborative, considered and focused on the details that matter.',
      image: 'https://webphase.net/assets/testimonials/dorota-pietrzak-poster.webp',
    },
  ],
  leads: [],
  clientLogos: [
    { id: 'cl1', name: 'British Council', image: '', url: '' }, { id: 'cl2', name: 'Marisa Peer', image: '', url: '' },
    { id: 'cl3', name: 'Immersive Gamebox', image: '', url: '' }, { id: 'cl4', name: 'UNFPA', image: '', url: '' },
    { id: 'cl5', name: 'Tommy Hilfiger', image: '', url: '' }, { id: 'cl6', name: 'SadaPay', image: '', url: '' },
    { id: 'cl7', name: 'SOL Foundation', image: '', url: '' }, { id: 'cl8', name: 'ED & I', image: '', url: '' },
  ],
  awards: [
    { id: 'aw1', name: 'Google Mobile Excellence Award', issuer: 'Google', year: '', url: '' },
    { id: 'aw2', name: 'Awwwards Honors Award', issuer: 'Awwwards', year: '', url: '' },
    { id: 'aw3', name: 'BestCSS Site of the Day', issuer: 'BestCSS', year: '', url: '' },
  ],
  navigation: [{ id: 'nav1', label: 'Work', href: '#work' }, { id: 'nav2', label: 'Studio', href: '#studio' }, { id: 'nav3', label: 'Services', href: '#services' }, { id: 'nav4', label: 'Contact', href: '#contact' }],
};

function readDB() {
  let raw;
  try { raw = fs.readFileSync(dbFile, 'utf8'); }
  catch (error) {
    if (error.code !== 'ENOENT') throw error;
    fs.writeFileSync(dbFile, JSON.stringify(initial, null, 2));
    return structuredClone(initial);
  }
  let parsed;
  try { parsed = JSON.parse(raw); }
  catch (error) {
    // Never silently replace a corrupt database with defaults: that can destroy content.
    throw new Error(`Cannot parse ${dbFile}. Back up the file and restore a valid JSON backup. ${error.message}`);
  }
  // Merge with initial so new app versions gain defaults without deleting saved content.
  return {
    settings: { ...initial.settings, ...parsed.settings, socials: { ...initial.settings.socials, ...(parsed.settings?.socials || {}) } },
    content: { ...initial.content, ...parsed.content },
    projects: Array.isArray(parsed.projects) ? parsed.projects : initial.projects,
    services: Array.isArray(parsed.services) ? parsed.services : initial.services,
    testimonials: Array.isArray(parsed.testimonials) ? parsed.testimonials : initial.testimonials,
    leads: Array.isArray(parsed.leads) ? parsed.leads : [],
    clientLogos: Array.isArray(parsed.clientLogos) ? parsed.clientLogos : initial.clientLogos,
    awards: Array.isArray(parsed.awards) ? parsed.awards : initial.awards,
    navigation: Array.isArray(parsed.navigation) ? parsed.navigation : initial.navigation,
  };
}

function writeDB(nextDB) {
  const tempFile = dbFile + '.' + crypto.randomBytes(6).toString('hex') + '.tmp';
  try {
    fs.writeFileSync(tempFile, JSON.stringify(nextDB, null, 2), { mode: 0o600, flag: 'wx' });
    fs.renameSync(tempFile, dbFile);
  } finally {
    try { fs.unlinkSync(tempFile); } catch {}
  }
}

function writeJsonAtomic(file, value) {
  const tempFile = file + '.' + crypto.randomBytes(6).toString('hex') + '.tmp';
  try {
    fs.writeFileSync(tempFile, JSON.stringify(value, null, 2), { mode: 0o600, flag: 'wx' });
    fs.renameSync(tempFile, file);
  } finally {
    try { fs.unlinkSync(tempFile); } catch {}
  }
}

let db = readDB();

const app = express();
app.disable('x-powered-by');
if (process.env.TRUST_PROXY === '1') app.set('trust proxy', 1);
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});
app.use(express.json({ limit: '5mb', strict: true }));
app.use(cookieParser());
const allowedOrigins = (process.env.CORS_ORIGIN || '').split(',').map(v => v.trim()).filter(Boolean);
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && (allowedOrigins.includes(origin) || (!process.env.CORS_ORIGIN && /^http:\/\/localhost(:\d+)?$/.test(origin)))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  }
  if (req.method === 'OPTIONS') return res.status(204).end();
  next();
});
app.use('/uploads', express.static(uploadDir));

// Keep the signing key stable between server restarts so admin sessions remain valid.
const secretFile = path.join(dataDir, 'jwt-secret.txt');
let persistedSecret = process.env.JWT_SECRET;
if (!persistedSecret) {
  try { persistedSecret = fs.readFileSync(secretFile, 'utf8').trim(); } catch {}
  if (!persistedSecret) {
    persistedSecret = crypto.randomBytes(48).toString('hex');
    fs.writeFileSync(secretFile, persistedSecret, { mode: 0o600 });
  }
}
const secret = persistedSecret;
const cookieOptions = { httpOnly: true, sameSite: process.env.CORS_ORIGIN ? 'none' : 'lax', secure: process.env.NODE_ENV === 'production' || Boolean(process.env.CORS_ORIGIN), maxAge: 8 * 3600 * 1000 };
const clearCookieOptions = { httpOnly: true, sameSite: cookieOptions.sameSite, secure: cookieOptions.secure };

const adminFile = path.join(dataDir, 'admin.json');

// ── Auth middleware ──────────────────────────────────────
const auth = (req, res, next) => {
  try {
    const token = req.cookies.adminToken;
    if (!token) throw new Error('No token');
    req.admin = jwt.verify(token, secret);
    next();
  } catch {
    res.status(401).json({ error: 'Please log in again.' });
  }
};

// ── File upload ──────────────────────────────────────────
const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, Date.now() + '-' + crypto.randomBytes(4).toString('hex') + ext);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowed = new Map([
      ['.jpg', 'image/jpeg'], ['.jpeg', 'image/jpeg'], ['.png', 'image/png'], ['.webp', 'image/webp'],
      ['.gif', 'image/gif'], ['.mp4', 'video/mp4'], ['.webm', 'video/webm'],
    ]);
    if (allowed.get(ext) !== file.mimetype) return cb(Object.assign(new Error('Unsupported file type. Use JPG, PNG, WebP, GIF, MP4 or WebM.'), { status: 400 }));
    cb(null, true);
  },
});

function isPlainObject(value) {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}
function validateCollection(value, key) {
  if (!Array.isArray(value) || value.length > 2000) return false;
  if (key === 'services') return value.every(item => typeof item === 'string' ? item.length <= 500 : isPlainObject(item));
  return value.every(item => isPlainObject(item));
}

// ── Public data endpoint ─────────────────────────────────
app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'webphase-api' }));
app.get('/api/public', (_req, res) => {
  const { leads, ...publicDB } = db;
  res.json(publicDB);
});

// ── Auth endpoints ───────────────────────────────────────
app.get('/api/auth/status', (req, res) => {
  let authenticated = false;
  try { authenticated = Boolean(req.cookies.adminToken && jwt.verify(req.cookies.adminToken, secret)?.admin); } catch {}
  res.json({ configured: fs.existsSync(adminFile), authenticated });
});

app.post('/api/auth/setup', async (req, res) => {
  try {
    if (fs.existsSync(adminFile)) return res.status(409).json({ error: 'Admin account already exists.' });
    const password = String(req.body?.password || '');
    if (password.length < 10 || password.length > 200) return res.status(400).json({ error: 'Use a password between 10 and 200 characters.' });
    const tempAdminFile = adminFile + '.' + crypto.randomBytes(6).toString('hex') + '.tmp';
    try {
      fs.writeFileSync(tempAdminFile, JSON.stringify({ hash: await bcrypt.hash(password, 12) }), { mode: 0o600, flag: 'wx' });
      try { fs.copyFileSync(tempAdminFile, adminFile, fs.constants.COPYFILE_EXCL); }
      catch (error) {
        if (error.code === 'EEXIST') return res.status(409).json({ error: 'Admin account already exists.' });
        throw error;
      }
    } finally { try { fs.unlinkSync(tempAdminFile); } catch {} }
    const token = jwt.sign({ admin: true }, secret, { expiresIn: '8h' });
    res.cookie('adminToken', token, cookieOptions);
    res.json({ ok: true });
  } catch (error) {
    console.error('Admin setup failed:', error);
    res.status(500).json({ error: 'Could not create the admin account. Check backend storage permissions.' });
  }
});

const loginAttempts = new Map();
app.post('/api/auth/login', async (req, res) => {
  try {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const attempt = loginAttempts.get(ip) || { count: 0, firstAt: Date.now() };
    if (Date.now() - attempt.firstAt > 10 * 60 * 1000) { attempt.count = 0; attempt.firstAt = Date.now(); }
    if (attempt.count >= 10) return res.status(429).json({ error: 'Too many login attempts. Wait 10 minutes and try again.' });
    if (!fs.existsSync(adminFile)) return res.status(400).json({ error: 'Set up your admin password first.' });
    const saved = JSON.parse(fs.readFileSync(adminFile, 'utf8'));
    const submittedPassword = String(req.body?.password || '');
    if (submittedPassword.length > 200 || !saved.hash || !await bcrypt.compare(submittedPassword, saved.hash)) {
      attempt.count += 1; loginAttempts.set(ip, attempt);
      return res.status(401).json({ error: 'Incorrect password.' });
    }
    loginAttempts.delete(ip);
    const token = jwt.sign({ admin: true }, secret, { expiresIn: '8h' });
    res.cookie('adminToken', token, cookieOptions);
    res.json({ ok: true });
  } catch (error) {
    console.error('Admin login failed:', error);
    res.status(500).json({ error: 'Could not sign in. Check the backend logs.' });
  }
});

app.post('/api/auth/logout', (_req, res) => {
  res.clearCookie('adminToken', clearCookieOptions);
  res.json({ ok: true });
});

app.post('/api/auth/password', auth, async (req, res) => {
  try {
    const current = String(req.body?.currentPassword || '');
    const nextPassword = String(req.body?.newPassword || '');
    const saved = JSON.parse(fs.readFileSync(adminFile, 'utf8'));
    if (!await bcrypt.compare(current, saved.hash)) return res.status(401).json({ error: 'Current password is incorrect.' });
    if (nextPassword.length < 10 || nextPassword.length > 200) return res.status(400).json({ error: 'New password must be between 10 and 200 characters.' });
    writeJsonAtomic(adminFile, { hash: await bcrypt.hash(nextPassword, 12) });
    res.clearCookie('adminToken', clearCookieOptions);
    res.json({ ok: true, message: 'Password changed. Please sign in again.' });
  } catch (error) { res.status(500).json({ error: 'Could not change password.' }); }
});

// ── Admin CRUD ───────────────────────────────────────────
app.get('/api/admin', auth, (_req, res) => res.json(db));

app.put('/api/admin', auth, (req, res) => {
  const allowed = ['settings', 'content', 'projects', 'services', 'testimonials', 'clientLogos', 'awards', 'navigation'];
  if (!isPlainObject(req.body)) return res.status(400).json({ error: 'Request body must be an object.' });
  const nextDB = structuredClone(db);
  for (const k of allowed) {
    if (req.body[k] === undefined) continue;
    if (['projects', 'services', 'testimonials', 'clientLogos', 'awards', 'navigation'].includes(k) && !validateCollection(req.body[k], k)) return res.status(400).json({ error: `${k} must be a valid list of objects (maximum 2000 entries).` });
    if (k === 'settings' && !isPlainObject(req.body[k])) return res.status(400).json({ error: 'settings must be an object.' });
    if (k === 'content' && !isPlainObject(req.body[k])) return res.status(400).json({ error: 'content must be an object.' });
    if (['settings', 'content'].includes(k) && Object.values(req.body[k]).some(v => typeof v === 'string' && v.length > 10000)) return res.status(400).json({ error: `${k} contains text longer than 10000 characters.` });
    nextDB[k] = req.body[k];
  }
  try { writeDB(nextDB); db = nextDB; }
  catch (error) { console.error('Could not persist website data:', error); return res.status(500).json({ error: 'Could not save website data. Check storage permissions and disk space.' }); }
  res.json({ ok: true });
});

// ── File upload ──────────────────────────────────────────
app.post('/api/upload', auth, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Choose an image or video file (JPEG, PNG, WebP, GIF, MP4 or WebM).' });
  // Check basic file signatures rather than trusting the browser-supplied MIME type alone.
  const head = fs.readFileSync(req.file.path).subarray(0, 16);
  const ext = path.extname(req.file.originalname).toLowerCase();
  const signatures = {
    '.jpg': head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff,
    '.jpeg': head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff,
    '.png': head.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])),
    '.gif': head.toString('ascii', 0, 3) === 'GIF',
    '.webp': head.toString('ascii', 0, 4) === 'RIFF' && head.toString('ascii', 8, 12) === 'WEBP',
    '.mp4': head.toString('ascii', 4, 8) === 'ftyp',
    '.webm': head[0] === 0x1a && head[1] === 0x45 && head[2] === 0xdf && head[3] === 0xa3,
  };
  if (!signatures[ext]) {
    try { fs.unlinkSync(req.file.path); } catch {}
    return res.status(400).json({ error: 'File contents do not match a supported image/video format.' });
  }
  res.json({ url: '/uploads/' + req.file.filename, filename: req.file.filename, size: req.file.size, mimetype: req.file.mimetype });
});

// ── Leads ────────────────────────────────────────────────
const leadAttempts = new Map();
app.post('/api/leads', (req, res) => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const attempt = leadAttempts.get(ip) || { count: 0, firstAt: Date.now() };
  if (Date.now() - attempt.firstAt > 10 * 60 * 1000) { attempt.count = 0; attempt.firstAt = Date.now(); }
  if (attempt.count >= 15) return res.status(429).json({ error: 'Too many inquiries from this connection. Please try again later.' });
  const { name = '', phone = '', email = '', message = '', type = 'General inquiry' } = req.body || {};
  if (typeof name !== 'string' || typeof message !== 'string' || typeof email !== 'string' || typeof phone !== 'string') return res.status(400).json({ error: 'Please provide valid contact details.' });
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Please enter a valid email address.' });
  if (!name.trim() || !message.trim())
    return res.status(400).json({ error: 'Name and message are required.' });
  if (name.trim().length > 160 || phone.trim().length > 80 || email.trim().length > 254 || message.trim().length > 10000 || typeof type !== 'string' || type.length > 120)
    return res.status(400).json({ error: 'One or more contact fields exceed the allowed length.' });
  const lead = {
    id: crypto.randomUUID(),
    name: name.trim(),
    phone: phone.trim(),
    email: email.trim(),
    message: message.trim(),
    type,
    createdAt: new Date().toISOString(),
    status: 'New',
  };
  attempt.count += 1; leadAttempts.set(ip, attempt);
  const nextDB = { ...db, leads: [lead, ...db.leads] };
  try { writeDB(nextDB); db = nextDB; }
  catch (error) { console.error('Could not save inquiry:', error); return res.status(500).json({ error: 'Could not save your inquiry. Please try again later.' }); }
  res.json({ ok: true, id: lead.id });
});

app.patch('/api/leads/:id', auth, (req, res) => {
  const lead = db.leads.find(x => x.id === req.params.id);
  if (!lead) return res.status(404).json({ error: 'Lead not found.' });
  if (!req.body || !['New', 'Contacted', 'Qualified', 'Closed'].includes(req.body.status)) return res.status(400).json({ error: 'Invalid lead status.' });
  const nextDB = { ...db, leads: db.leads.map(item => item.id === lead.id ? { ...item, status: req.body.status } : item) };
  try { writeDB(nextDB); db = nextDB; } catch (error) { console.error('Could not update inquiry:', error); return res.status(500).json({ error: 'Could not update inquiry.' }); }
  res.json({ ok: true });
});

app.delete('/api/leads/:id', auth, (req, res) => {
  const nextDB = { ...db, leads: db.leads.filter(x => x.id !== req.params.id) };
  try { writeDB(nextDB); db = nextDB; } catch (error) { console.error('Could not delete inquiry:', error); return res.status(500).json({ error: 'Could not delete inquiry.' }); }
  res.json({ ok: true });
});

// ── Backup ───────────────────────────────────────────────
app.get('/api/admin/backup', auth, (_req, res) => {
  const backup = JSON.stringify(db, null, 2);
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="webphase-backup-${new Date().toISOString().slice(0,10)}.json"`);
  res.send(backup);
});

// ── Restore ──────────────────────────────────────────────
app.post('/api/admin/restore', auth, (req, res) => {
  try {
    const incoming = req.body;
    if (!isPlainObject(incoming))
      return res.status(400).json({ error: 'Invalid backup file. Expected a JSON object.' });
    for (const key of ['settings', 'content']) if (incoming[key] !== undefined && !isPlainObject(incoming[key])) return res.status(400).json({ error: `Backup ${key} must be an object.` });
    for (const key of ['projects','services','testimonials','clientLogos','awards','navigation','leads']) if (incoming[key] !== undefined && !validateCollection(incoming[key], key)) return res.status(400).json({ error: `Backup ${key} must be a valid list with at most 2000 entries.` });
    // Merge restored data with current, preserving structure
    const restored = {
      settings: { ...initial.settings, ...(incoming.settings || {}), socials: { ...initial.settings.socials, ...(incoming.settings?.socials || {}) } },
      content: { ...initial.content, ...(incoming.content || {}) },
      projects: Array.isArray(incoming.projects) ? incoming.projects : db.projects,
      services: Array.isArray(incoming.services) ? incoming.services : db.services,
      testimonials: Array.isArray(incoming.testimonials) ? incoming.testimonials : db.testimonials,
      leads: Array.isArray(incoming.leads) ? incoming.leads : db.leads,
      clientLogos: Array.isArray(incoming.clientLogos) ? incoming.clientLogos : db.clientLogos,
      awards: Array.isArray(incoming.awards) ? incoming.awards : db.awards,
      navigation: Array.isArray(incoming.navigation) ? incoming.navigation : db.navigation,
    };
    writeDB(restored);
    db = restored;
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: 'Restore failed: ' + e.message });
  }
});

// API errors should be readable JSON rather than an HTML stack trace.
app.use('/api', (err, _req, res, _next) => {
  console.error('API error:', err);
  if (res.headersSent) return;
  const status = err.status || err.statusCode || 500;
  res.status(status).json({ error: status === 500 ? 'Server error. Check the backend console for details.' : err.message });
});

// ── Serve built frontend (production) ────────────────────
const builtIndex = path.join(root, 'dist', 'index.html');
if (fs.existsSync(builtIndex)) {
  app.use(express.static(path.join(root, 'dist')));
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) return res.status(404).end();
    res.sendFile(builtIndex);
  });
} else {
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) return res.status(404).end();
    res.status(200).send('Development mode: Frontend is served by Vite at http://localhost:5173');
  });
}

const port = process.env.PORT || 3001;
app.listen(port, () => console.log(`WebPhase API running on http://localhost:${port}`));
