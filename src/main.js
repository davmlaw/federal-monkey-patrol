// Port of main.cpp: create the display, a GameManager for a .game file, the
// input manager, then loop: read input, play the game, until it quits.
//
// Pick the .game file with ?game=<path> (e.g. ?game=fly.game); the default
// is main.properties' default_game, data/federal_monkey_patrol.game.

import './style.css';
import { display } from './core/display.js';
import { unlockAudio } from './core/assets.js';
import { loadFont } from './core/draw2d.js';
import { Input, InputManager } from './core/input.js';
import { settings } from './core/settings.js';
import { Status } from './game/component.js';
import { GameManager } from './game/manager.js';
import { stopMusic } from './game/simple.js';
import { gamestats } from './mission/stats.js';
import { Tuner } from './tuner.js';
import { TouchControls } from './core/touch.js';
import { Mission } from './mission/mission.js';

const GAMES = [
  { file: 'data/federal_monkey_patrol.game', title: 'Federal Monkey Patrol', note: 'The story: film leader, intro and the four chapters (missions were commented out in 2006)' },
  { file: 'fly.game', title: 'Fly', note: 'Straight into a mission: claw.xml' },
  { file: 'mission.game', title: 'Mission', note: 'test.xml, with its countdown timer' },
  { file: 'fade_test.game', title: 'Transitions', note: 'Demo of the transition effects' },
];

const params = new URLSearchParams(window.location.search);
const overlay = document.getElementById('overlay');
const canvas = document.getElementById('screen');

let game = null;
let tuner = null;
let inputmanager = null;
let touch = null;
let running = false;

function gameUrl(file) {
  const u = new URL(window.location.href);
  u.searchParams.set('game', file);
  return u.pathname + u.search;
}

function showMenu({ ended = false } = {}) {
  const chosen = params.get('game');
  overlay.innerHTML = `
    <div class="panel">
      <h1>Federal Monkey Patrol</h1>
      <p class="sub">${ended ? 'The End.' : 'Dave Lawrence &amp; Sam Norman, 2004&ndash;2006'}</p>
      <ul class="games">
        ${GAMES.map((g) => `
          <li><a href="${gameUrl(g.file)}" data-game="${g.file}" class="${g.file === chosen ? 'chosen' : ''}">
            <span class="t">${g.title}</span><span class="n">${g.note}</span></a></li>`).join('')}
      </ul>
      <p class="keys">Arrow keys: fly &middot; W / S: throttle &middot; Space: fire &middot; Ctrl: bombs &middot;
        M or Tab: switch flying mode &middot; Insert or <kbd>\`</kbd>: tuner &middot; Esc: quit.
        On a touch screen, use the on-screen stick, throttle and buttons.</p>
      <p class="foot"><a href="https://github.com/davmlaw/federal-monkey-patrol">Source on GitHub</a> &middot; GPL v2</p>
    </div>`;
  overlay.hidden = false;
  overlay.querySelectorAll('a[data-game]').forEach((a) => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      window.history.replaceState(null, '', a.getAttribute('href'));
      start(a.dataset.game);
    });
  });
  overlay.querySelector('a.chosen, a[data-game]')?.focus();
}

async function start(file) {
  unlockAudio();
  overlay.hidden = true;
  canvas.focus();
  stop();
  try {
    await settings.load();
    await loadFont();
    tuner = await Tuner.create();
    game = await GameManager.fromFile(file || settings.gets('main', 'default_game'), tuner);
  } catch (e) {
    console.error(e);
    overlay.innerHTML = `<div class="panel"><h1>Uncaught Exception</h1><pre>${String(e.message || e)}</pre></div>`;
    overlay.hidden = false;
    return;
  }
  const input = new Input();
  inputmanager = new InputManager(input);
  touch = new TouchControls(input);
  inputmanager.addDevice(touch);
  running = true;
  console.log('---------- BEGIN MAIN LOOP ----------');
  let last = performance.now();
  const frame = (now) => {
    if (!running) return;
    // Timer::tick(), capped so a backgrounded tab doesn't skip whole scenes
    const msecs = Math.min(250, Math.max(0, Math.round(now - last)));
    last = now;
    inputmanager.update(msecs);
    display.beginFrame();
    try {
      game.play(display, msecs, input);
      // on-screen flight controls only while flying a mission
      const c = game.currentComponent();
      const flying = c instanceof Mission && c.loaded && !c.loadError && !!c.player;
      touch.setVisible(flying && !tuner?.visible);
      if (flying) touch.setMode(c.player.modeName());
    } catch (e) {
      console.error('Uncaught Exception.', e);
      game.status = Status.QUIT;
    }
    if (game.getStatus() === Status.QUIT) {
      console.log(`===== Game Statistics =====\n${gamestats}`);
      stop();
      showMenu({ ended: true });
      return;
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

function stop() {
  running = false;
  stopMusic();
  game?.dispose();
  game = null;
  tuner?.dispose();
  tuner = null;
  inputmanager?.dispose();
  inputmanager = null;
  touch?.dispose();
  touch = null;
}

display.init(canvas);
// A click is needed before the browser lets a page play sound, so always
// start from the menu, with ?game= preselected.
showMenu();
