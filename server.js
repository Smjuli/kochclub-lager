'use strict';

const express    = require('express');
const cors       = require('cors');
const cron       = require('node-cron');
const path       = require('path');
const nodemailer = require('nodemailer');
const db         = require('./database');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ─── HELPER ────────────────────────────────────────────────────────
function heute() { const d = new Date(); d.setHours(0,0,0,0); return d; }
function tagesBis(mhd) { return Math.floor((new Date(mhd) - heute()) / 86400000); }
function status(a) {
  const d = tagesBis(a.mhd);
  if (d < 0 || d <= 14) return 'crit';
  if (d <= 30 || a.menge < a.min_menge) return 'warn';
  return 'ok';
}
function withStatus(a) { return { ...a, status: status(a) }; }

// ─── KATEGORIEN ────────────────────────────────────────────────────
app.get('/api/kategorien', (req, res) => {
  res.json(db.data.kategorien);
});

app.post('/api/kategorien', (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Name erforderlich' });
  const clean = name.trim();
  if (db.data.kategorien.includes(clean)) return res.status(400).json({ error: 'Kategorie existiert bereits' });
  db.data.kategorien.push(clean);
  db.data.kategorien.sort();
  db.save();
  res.status(201).json({ name: clean });
});

app.delete('/api/kategorien/:name', (req, res) => {
  const name = decodeURIComponent(req.params.name);
  db.data.kategorien = db.data.kategorien.filter(k => k !== name);
  db.save();
  res.json({ success: true });
});

// ─── ARTIKEL ───────────────────────────────────────────────────────
app.get('/api/artikel', (req, res) => {
  res.json(db.data.artikel.map(withStatus).sort((a,b) => a.name.localeCompare(b.name)));
});

app.get('/api/artikel/:id', (req, res) => {
  const a = db.data.artikel.find(x => x.id === parseInt(req.params.id));
  if (!a) return res.status(404).json({ error: 'Nicht gefunden' });
  res.json(withStatus(a));
});

app.get('/api/barcode/:code', (req, res) => {
  const code = req.params.code.trim();
  const a = db.data.artikel.find(x => x.barcode && x.barcode.trim() === code);
  if (!a) return res.status(404).json({ error: 'Barcode nicht gefunden' });
  res.json(withStatus(a));
});

app.post('/api/artikel', (req, res) => {
  const { name, barcode, kat, ort, menge, einheit, min_menge, mhd } = req.body;
  if (!name || !mhd) return res.status(400).json({ error: 'Name und MHD erforderlich' });
  const neu = {
    id: db.data.nextArtikelId++,
    name, barcode: barcode ? barcode.trim() : '',
    kat: kat||'Sonstiges', ort: ort||'Regal A',
    menge: menge||0, einheit: einheit||'Stück',
    min_menge: min_menge||0, mhd,
    erstellt: new Date().toISOString()
  };
  db.data.artikel.push(neu);
  db.save();
  res.status(201).json(withStatus(neu));
});

app.put('/api/artikel/:id', (req, res) => {
  const idx = db.data.artikel.findIndex(x => x.id === parseInt(req.params.id));
  if (idx === -1) return res.status(404).json({ error: 'Nicht gefunden' });
  const upd = { ...req.body };
  if (upd.barcode) upd.barcode = upd.barcode.trim();
  db.data.artikel[idx] = { ...db.data.artikel[idx], ...upd, id: db.data.artikel[idx].id };
  db.save();
  res.json({ success: true });
});

app.delete('/api/artikel/:id', (req, res) => {
  db.data.artikel = db.data.artikel.filter(x => x.id !== parseInt(req.params.id));
  db.save();
  res.json({ success: true });
});

// ─── BUCHUNGEN ─────────────────────────────────────────────────────
app.get('/api/buchungen', (req, res) => {
  const limit = parseInt(req.query.limit) || 100;
  res.json([...db.data.buchungen].reverse().slice(0, limit));
});

app.post('/api/buchung', (req, res) => {
  const { typ, artikel_id, menge, neu_mhd, user_name } = req.body;
  const idx = db.data.artikel.findIndex(x => x.id === parseInt(artikel_id));
  if (idx === -1) return res.status(404).json({ error: 'Artikel nicht gefunden' });
  const a = db.data.artikel[idx];

  if (typ === 'ein') {
    a.menge = Math.round((a.menge + menge) * 1000) / 1000;
  } else if (typ === 'aus') {
    if (a.menge < menge) return res.status(400).json({ error: 'Nicht genug auf Lager' });
    a.menge = Math.round((a.menge - menge) * 1000) / 1000;
  } else if (typ === 'mhd') {
    a.mhd = neu_mhd;
  }

  db.data.buchungen.push({
    id: db.data.nextBuchungId++,
    typ, artikel_id: a.id, artikel_name: a.name,
    menge: typ !== 'mhd' ? menge : null,
    neu_mhd: typ === 'mhd' ? neu_mhd : null,
    einheit: a.einheit,
    user_name: user_name || 'Unbekannt',
    zeit: new Date().toISOString()
  });
  db.save();
  res.json({ success: true });
});

// ─── STATS ─────────────────────────────────────────────────────────
app.get('/api/stats', (req, res) => {
  const alle = db.data.artikel;
  res.json({
    gesamt: alle.length,
    ok:   alle.filter(a => status(a) === 'ok').length,
    warn: alle.filter(a => status(a) === 'warn').length,
    crit: alle.filter(a => status(a) === 'crit').length,
  });
});

app.get('/api/einkaufsliste', (req, res) => {
  res.json(db.data.artikel.filter(a => a.menge < a.min_menge));
});

// ─── EMAIL-WARNUNGEN ───────────────────────────────────────────────
cron.schedule('0 8 * * 1', async () => {
  const ablaufend = db.data.artikel.filter(a => tagesBis(a.mhd) <= 14 && tagesBis(a.mhd) >= 0);
  const knapp     = db.data.artikel.filter(a => a.menge < a.min_menge);
  if (!ablaufend.length && !knapp.length) return;
  const smtpUser = process.env.SMTP_USER || '';
  const smtpPass = process.env.SMTP_PASS || '';
  const mailTo   = process.env.MAIL_TO   || '';
  if (!smtpUser || !smtpPass || !mailTo) return;
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    auth: { user: smtpUser, pass: smtpPass }
  });
  let text = '=== Kochclub Lager – Woechentliche Warnung ===\n\n';
  if (ablaufend.length) text += 'BALD ABLAUFEND:\n' + ablaufend.map(a => `  • ${a.name} – MHD: ${a.mhd}`).join('\n') + '\n\n';
  if (knapp.length)     text += 'BESTAND KNAPP:\n'  + knapp.map(a => `  • ${a.name} – ${a.menge} ${a.einheit}`).join('\n');
  await transporter.sendMail({
    from: `"Kochclub Lager" <${smtpUser}>`, to: mailTo,
    subject: `[Kochclub] Lager-Warnung: ${ablaufend.length + knapp.length} Artikel beachten`, text
  });
});

app.listen(PORT, () => {
  console.log(`Kochclub-Lager laeuft auf http://localhost:${PORT}`);
});
