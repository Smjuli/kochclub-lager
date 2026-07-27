'use strict';

const fs      = require('fs');
const path    = require('path');
const initSqlJs = require('sql.js');

const DB_PATH = path.join(__dirname, 'lager.json');

// Wir speichern Daten als JSON (kein nativer Treiber noetig)
// Einfachste moegliche Loesung ohne Python/Kompilierung

let data = {
  artikel: [],
  buchungen: [],
  nextArtikelId: 1,
  nextBuchungId: 1,
};

// Laden falls vorhanden
if (fs.existsSync(DB_PATH)) {
  try {
    data = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  } catch(e) {
    console.log('Datenbank neu erstellt.');
  }
}

function save() {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
}

// Demodaten beim ersten Start
if (data.artikel.length === 0) {
  const demo = [
    { name:'Weizenmehl Type 405', barcode:'4000521002749', kat:'Trockenware', ort:'Regal A', menge:3.5, einheit:'kg', min_menge:2, mhd:'2026-12-15' },
    { name:'Weissweinessig',      barcode:'4003586016134', kat:'Öle & Säuren', ort:'Regal B', menge:0.4, einheit:'l',  min_menge:1, mhd:'2026-08-20' },
    { name:'Olivenöl extra vergine', barcode:'4056489012345', kat:'Öle & Säuren', ort:'Regal B', menge:1.2, einheit:'l', min_menge:0.5, mhd:'2027-03-01' },
    { name:'Zucker',              barcode:'4000521007843', kat:'Trockenware', ort:'Regal A', menge:0.8, einheit:'kg', min_menge:1, mhd:'2027-06-01' },
    { name:'Paprikapulver edelsüss', barcode:'4002167023451', kat:'Gewürze', ort:'Gewürzschrank', menge:3, einheit:'Stück', min_menge:1, mhd:'2026-08-10' },
    { name:'Parmigiano Reggiano', barcode:'8002330190123', kat:'Kühlware', ort:'Kühlschrank', menge:0.3, einheit:'kg', min_menge:0.2, mhd:'2026-08-05' },
    { name:'Passata di Pomodoro', barcode:'8001030010234', kat:'Trockenware', ort:'Regal A', menge:6, einheit:'Stück', min_menge:4, mhd:'2026-07-30' },
    { name:'Salz',                barcode:'4000862009014', kat:'Gewürze', ort:'Gewürzschrank', menge:5, einheit:'kg', min_menge:1, mhd:'2028-01-01' },
    { name:'Balsamico',           barcode:'4056489087654', kat:'Öle & Säuren', ort:'Regal B', menge:0.2, einheit:'l', min_menge:0.3, mhd:'2026-09-01' },
    { name:'Tiefkühl-Erbsen',     barcode:'4000521043215', kat:'TK', ort:'TK-Truhe', menge:2, einheit:'Packung', min_menge:1, mhd:'2027-01-01' },
  ];
  demo.forEach(a => {
    data.artikel.push({ id: data.nextArtikelId++, ...a, erstellt: new Date().toISOString() });
  });
  save();
}

module.exports = { data, save };
