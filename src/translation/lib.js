// Small helpers shared by the six forms of the Translation mock.
import { items } from '../content.js';

export const STAGES = ['idea', 'sketch', 'prototype', 'built', 'shipped'];
export const KIND = {
  engineering: 'Engineering',
  project: 'Project',
  art: 'Art',
  travel: 'Travel',
  app: 'App',
  life: 'Life',
};

export const itemById = new Map(items.map((it) => [it.id, it]));
export const indexOf = (id) => items.findIndex((it) => it.id === id);
export const YEAR_MIN = Math.min(...items.map((it) => it.years[0]));
export const YEAR_MAX = Math.max(...items.map((it) => it.years[1]));

export const pad2 = (n) => String(n).padStart(2, '0');
export const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

export const yearsText = (y, sep = '–') => (y[0] === y[1] ? String(y[0]) : `${y[0]}${sep}${y[1]}`);
export const duration = (y) => y[1] - y[0] + 1;

export function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

/** Create an element with a class name and optional inner HTML. */
export function el(tag, cls, html) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (html != null) n.innerHTML = html;
  return n;
}

/** Degrees → 41°30′00″ N */
export function dms(value, pos, neg) {
  const a = Math.abs(value);
  let d = Math.floor(a);
  let m = Math.floor((a - d) * 60);
  let s = Math.round(((a - d) * 60 - m) * 60);
  if (s === 60) (s = 0), (m += 1);
  if (m === 60) (m = 0), (d += 1);
  return `${d}°${pad2(m)}′${pad2(s)}″ ${value >= 0 ? pos : neg}`;
}

/**
 * "Concept → CAD → build. Remark." → { steps: ['Concept', 'CAD', 'Build'], remark: 'Remark.' }
 * Returns null when the text is a plain sentence rather than a process.
 */
export function parseSteps(text) {
  if (!text.includes('→')) return null;
  const parts = text.split('→').map((s) => s.trim()).filter(Boolean);
  let remark = '';
  const last = parts[parts.length - 1];
  const dot = last.indexOf('. ');
  if (dot > -1) {
    remark = last.slice(dot + 2).trim();
    parts[parts.length - 1] = last.slice(0, dot);
  }
  return { steps: parts.map((s) => cap(s.replace(/\.$/, ''))), remark };
}

/** Sentences of a short text, without trailing full stops. */
export const sentences = (text) =>
  text
    .split(/(?<=\.)\s+/)
    .map((s) => s.trim().replace(/\.$/, ''))
    .filter(Boolean);

export function haversineKm(a, b) {
  const R = 6371;
  const toRad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * toRad;
  const dLon = (b.lon - a.lon) * toRad;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * toRad) * Math.cos(b.lat * toRad) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

/** Split a block of text into line spans (call once it is laid out). */
export function splitLines(node) {
  const text = node.textContent.trim().replace(/\s+/g, ' ');
  node.innerHTML = text
    .split(' ')
    .map((w) => `<span class="w">${esc(w)}</span>`)
    .join(' ');
  const lines = [];
  let top = null;
  node.querySelectorAll('.w').forEach((w) => {
    if (top === null || Math.abs(w.offsetTop - top) > 4) {
      lines.push([]);
      top = w.offsetTop;
    }
    lines[lines.length - 1].push(w.textContent);
  });
  node.innerHTML = lines
    .map((ws, i) => `<span class="ln"><span class="ln__in" style="--i:${i}">${esc(ws.join(' '))}</span></span>`)
    .join(' ');
  return lines.length;
}
