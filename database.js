'use strict';
const fs   = require('fs');
const path = require('path');
const DB_PATH = path.join(__dirname, 'lager.json');

let data = {
  artikel: [],
  buchungen: [],
  kategorien: ['Alkohol','Gewürze','Kühlware','Mehl & Backen','Öle & Säuren','Sonstiges','TK','Trockenware','Weine'],
  lagerorte: ['Gewürzschrank','Keller','Kühlschrank','Regal A','Regal B','TK-Truhe','Weinregal'],
  nextArtikelId: 1,
  nextBuchungId: 1,
};

if (fs.existsSync(DB_PATH)) {
  try {
    const loaded = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    data = { ...data, ...loaded };
    // Sicherstellen dass kategorien/lagerorte vorhanden
    if (!data.kategorien) data.kategorien = ['Trockenware','Öle & Säuren','Gewürze','Kühlware','TK','Alkohol','Weine','Sonstiges'];
    if (!data.lagerorte)  data.lagerorte  = ['Regal A','Regal B','Gewürzschrank','Kühlschrank','TK-Truhe','Keller','Weinregal'];
  } catch(e) { console.log('Neue Datenbank erstellt.'); }
}

function save() {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
}

// Demodaten nur wenn leer
if (data.artikel.length === 0) {
  const demo = [
    { name:'Weizenmehl Type 405', barcode:'4000521002749', kat:'Mehl & Backen', ort:'Regal A', menge:3.5, einheit:'kg', min_menge:2, mhd:'2026-12-15' },
    { name:'Weissweinessig',      barcode:'4003586016134', kat:'Öle & Säuren',  ort:'Regal B', menge:0.4, einheit:'l',  min_menge:1, mhd:'2026-08-20' },
    { name:'Olivenöl extra vergine', barcode:'4056489012345', kat:'Öle & Säuren', ort:'Regal B', menge:1.2, einheit:'l', min_menge:0.5, mhd:'2027-03-01' },
    { name:'Zucker',              barcode:'4000521007843', kat:'Trockenware',   ort:'Regal A', menge:0.8, einheit:'kg', min_menge:1,   mhd:'2027-06-01' },
    { name:'Paprikapulver',       barcode:'4002167023451', kat:'Gewürze',       ort:'Gewürzschrank', menge:3, einheit:'Stück', min_menge:1, mhd:'2026-08-10' },
    { name:'Parmigiano Reggiano', barcode:'8002330190123', kat:'Kühlware',      ort:'Kühlschrank', menge:0.3, einheit:'kg', min_menge:0.2, mhd:'2026-08-05' },
    { name:'Passata di Pomodoro', barcode:'8001030010234', kat:'Trockenware',   ort:'Regal A', menge:6, einheit:'Stück', min_menge:4, mhd:'2026-07-30' },
    { name:'Salz',                barcode:'4000862009014', kat:'Gewürze',       ort:'Gewürzschrank', menge:5, einheit:'kg', min_menge:1, mhd:'2028-01-01' },
    { name:'Rotwein Chianti',     barcode:'8056188037590', kat:'Weine',         ort:'Weinregal', menge:6, einheit:'Flasche', min_menge:2, mhd:'2028-12-31' },
    { name:'Tiefkühl-Erbsen',     barcode:'4000521043215', kat:'TK',            ort:'TK-Truhe', menge:2, einheit:'Packung', min_menge:1, mhd:'2027-01-01' },
  ];
  demo.forEach(a => data.artikel.push({ id: data.nextArtikelId++, ...a, erstellt: new Date().toISOString() }));
  save();
}

module.exports = { data, save };
