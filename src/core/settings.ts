// key=value .properties files,
// one "module" per file in data/etc/. A missing module or key throws.

import { readLines } from './assets.ts';

const MODULES = ['display', 'story', 'physics', 'game', 'main', 'tuner', 'city'];

export type Properties = Map<string, string>;

export async function loadProperties(path: string): Promise<Properties> {
  const props: Properties = new Map();
  for (const line of await readLines(path)) {
    const i = line.indexOf('=');
    if (i < 0) continue;
    props.set(line.slice(0, i), line.slice(i + 1));
  }
  return props;
}

class Settings {
  modules = new Map<string, Properties>();

  async load(configDir = 'data/etc/'): Promise<void> {
    await Promise.all(MODULES.map(async (m) => {
      this.modules.set(m, await loadProperties(`${configDir}${m}.properties`));
    }));
  }

  module(name: string): Properties {
    const m = this.modules.get(name);
    if (!m) throw new Error(`Settings: cannot find properties for module "${name}"`);
    return m;
  }

  gets(module: string, key: string): string {
    const m = this.module(module);
    if (!m.has(key)) throw new Error(`Properties: no key "${key}" in module "${module}"`);
    return m.get(key)!;
  }

  getf(module: string, key: string): number { return parseFloat(this.gets(module, key)); }

  geti(module: string, key: string): number { return parseInt(this.gets(module, key), 10); }

  set(module: string, key: string, value: unknown): void {
    console.log(`Settings(${module}, ${key}) = '${value}'`);
    this.module(module).set(key, String(value));
  }

  keys(): string[] { return [...this.modules.keys()].sort(); }
}

export const settings = new Settings();

export type RGBA = [number, number, number, number];

/** "rrggbb[aa]" -> [r, g, b, a], dividing by 256 (as the 2006 code did). */
export function hexcolor(hex: string): RGBA | null {
  const parts: number[] = [];
  for (let i = 0; i + 2 <= hex.length && parts.length < 4; i += 2) {
    const v = parseInt(hex.slice(i, i + 2), 16);
    if (Number.isNaN(v)) break;
    parts.push(v / 256);
  }
  if (parts.length < 3) return null;
  if (parts.length < 4) parts.push(1);
  return parts as RGBA;
}

/** Make sure a directory ends in '/'. */
export function dircheck(d: string): string {
  return d && !d.endsWith('/') ? `${d}/` : d;
}
