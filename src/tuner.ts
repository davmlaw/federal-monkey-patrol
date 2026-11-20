// The in-game tuner: live edits of settings, as described by
// data/etc/toggles.xml, in a lil-gui panel.
// Toggle with Insert (or `). The game is paused while it is open.

import GUI, { type Controller } from 'lil-gui';
import { fetchText } from './core/assets.ts';
import { settings } from './core/settings.ts';

export class Tuner {
  gui: GUI | null = null;
  visible = false;

  static async create(): Promise<Tuner> {
    const t = new Tuner();
    const title = settings.gets('tuner', 'title');
    const gui = new GUI({ title });
    t.gui = gui;
    gui.domElement.classList.add('tuner');
    gui.hide();
    const togglesFile = settings.gets('tuner', 'toggles');
    let root: Element;
    try {
      const doc = new DOMParser().parseFromString(await fetchText(`data/etc/${togglesFile}`), 'application/xml');
      root = doc.documentElement;
    } catch (e) {
      console.warn('Tuner: could not read toggles', e);
      return t;
    }
    for (const mod of root.children) {
      const module = mod.nodeName;
      let folder: GUI | null = null;
      for (const keyNode of mod.children) {
        const key = keyNode.nodeName;
        let value: string;
        try { value = settings.gets(module, key); } catch { continue; }
        const get = (n: string): string => keyNode.querySelector(`:scope > ${n}`)?.textContent ?? '';
        const label = get('label') || key;
        const type = get('type');
        folder ??= gui.addFolder(module);
        let ctl: Controller;
        if (type === 'float') {
          const min = parseFloat(get('min'));
          const max = parseFloat(get('max'));
          const mod = parseFloat(get('mod'));
          const obj = { v: parseFloat(value) };
          ctl = folder.add(obj, 'v', min, max, Number.isNaN(mod) ? (max - min) / 100 : mod);
        } else if (type === 'list') {
          const vals = [...keyNode.querySelectorAll(':scope > val')].map((v) => v.textContent ?? '');
          const obj = { v: value };
          ctl = folder.add(obj, 'v', vals.includes(value) ? vals : [value, ...vals]);
        } else if (type === 'switch') {
          const obj = { v: value === 'true' || value === '1' };
          ctl = folder.add(obj, 'v');
        } else {
          continue;
        }
        ctl.name(label).onChange((v: unknown) => settings.set(module, key, v));
      }
      folder?.close();
    }
    return t;
  }

  setVisible(v: boolean): void {
    if (!this.gui || v === this.visible) return;
    this.visible = v;
    if (v) this.gui.show(); else this.gui.hide();
  }

  dispose(): void { this.gui?.destroy(); }
}
