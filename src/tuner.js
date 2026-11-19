// The in-game tuner (game/tuner/): live edits of settings, as described by
// data/etc/toggles.xml. The original drew its own menu; this uses lil-gui.
// Toggle with Insert (or `). The game is paused while it is open.

import GUI from 'lil-gui';
import { fetchText } from './core/assets.js';
import { settings } from './core/settings.js';

export class Tuner {
  static async create() {
    const t = new Tuner();
    const title = settings.gets('tuner', 'title');
    t.gui = new GUI({ title });
    t.gui.domElement.classList.add('tuner');
    t.gui.hide();
    const togglesFile = settings.gets('tuner', 'toggles');
    let root;
    try {
      const doc = new DOMParser().parseFromString(await fetchText(`data/etc/${togglesFile}`), 'application/xml');
      root = doc.documentElement;
    } catch (e) {
      console.warn('Tuner: could not read toggles', e);
      return t;
    }
    for (const mod of root.children) {
      const module = mod.nodeName;
      let folder = null;
      for (const keyNode of mod.children) {
        const key = keyNode.nodeName;
        let value;
        try { value = settings.gets(module, key); } catch { continue; }
        const get = (n) => keyNode.querySelector(`:scope > ${n}`)?.textContent;
        const label = get('label') || key;
        const type = get('type');
        folder ??= t.gui.addFolder(module);
        const obj = { v: value };
        let ctl;
        if (type === 'float') {
          const min = parseFloat(get('min'));
          const max = parseFloat(get('max'));
          const mod = parseFloat(get('mod'));
          obj.v = parseFloat(value);
          ctl = folder.add(obj, 'v', min, max, Number.isNaN(mod) ? (max - min) / 100 : mod);
        } else if (type === 'list') {
          const vals = [...keyNode.querySelectorAll(':scope > val')].map((v) => v.textContent);
          ctl = folder.add(obj, 'v', vals.includes(value) ? vals : [value, ...vals]);
        } else if (type === 'switch') {
          obj.v = value === 'true' || value === '1';
          ctl = folder.add(obj, 'v');
        } else {
          continue;
        }
        ctl.name(label).onChange((v) => settings.set(module, key, v));
      }
      folder?.close();
    }
    return t;
  }

  setVisible(v) {
    if (!this.gui || v === this.visible) return;
    this.visible = v;
    if (v) this.gui.show(); else this.gui.hide();
  }

  dispose() { this.gui?.destroy(); }
}
