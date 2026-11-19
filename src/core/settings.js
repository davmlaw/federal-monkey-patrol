// Port of util/settings.cpp + util/properties.h: key=value .properties files,
// one "module" per file in data/etc/. A missing module or key throws.

import { readLines } from './assets.js';

const MODULES = ['display', 'story', 'physics', 'game', 'main', 'tuner', 'city'];

export async function loadProperties(path) {
  const props = new Map();
  for (const line of await readLines(path)) {
    const i = line.indexOf('=');
    if (i < 0) continue;
    props.set(line.slice(0, i), line.slice(i + 1));
  }
  return props;
}

class Settings {
  constructor() {
    this.modules = new Map();
  }

  async load(configDir = 'data/etc/') {
    await Promise.all(MODULES.map(async (m) => {
      this.modules.set(m, await loadProperties(`${configDir}${m}.properties`));
    }));
  }

  module(name) {
    const m = this.modules.get(name);
    if (!m) throw new Error(`Settings: cannot find properties for module "${name}"`);
    return m;
  }

  gets(module, key) {
    const m = this.module(module);
    if (!m.has(key)) throw new Error(`Properties: no key "${key}" in module "${module}"`);
    return m.get(key);
  }

  getf(module, key) { return parseFloat(this.gets(module, key)); }

  geti(module, key) { return parseInt(this.gets(module, key), 10); }

  set(module, key, value) {
    console.log(`Settings(${module}, ${key}) = '${value}'`);
    this.module(module).set(key, String(value));
  }

  keys() { return [...this.modules.keys()].sort(); }
}

export const settings = new Settings();

/** "rrggbb[aa]" -> [r, g, b, a], dividing by 256 like the original hexcolor(). */
export function hexcolor(hex) {
  const parts = [];
  for (let i = 0; i + 2 <= hex.length && parts.length < 4; i += 2) {
    const v = parseInt(hex.slice(i, i + 2), 16);
    if (Number.isNaN(v)) break;
    parts.push(v / 256);
  }
  if (parts.length < 3) return null;
  if (parts.length < 4) parts.push(1);
  return parts;
}

/** dircheck(): make sure a directory ends in '/'. */
export function dircheck(d) {
  return d && !d.endsWith('/') ? `${d}/` : d;
}
