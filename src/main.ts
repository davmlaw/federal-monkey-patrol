// Entry point: the menu, then the display, a GameManager for a .game file
// and the input manager, and the loop: read input, play the game, until it
// quits.
//
// Pick the .game file with ?game=<path> (e.g. ?game=fly.game); the default
// is main.properties' default_game, data/federal_monkey_patrol.game.

import './style.css';
import { display } from './core/display.ts';
import { setAudioPaused, unlockAudio } from './core/assets.ts';
import { loadFont } from './core/draw2d.ts';
import { Button, Input, InputManager, PointerTap } from './core/input.ts';
import { settings } from './core/settings.ts';
import { Status } from './game/component.ts';
import { GameManager } from './game/manager.ts';
import { stopMusic } from './game/simple.ts';
import { gamestats } from './mission/stats.ts';
import { TouchControls } from './core/touch.ts';
import { lastResult, Mission } from './mission/mission.ts';
import { FlyMode } from './mission/world.ts';
import { StoryTeller } from './game/storyteller.ts';
import { stage } from './game/stage.ts';

// The title screen's choices, each a .game file: the story, then free
// play (single missions, data/missions/*.xml).
type Group = 'story' | 'free';
const GAMES: { file: string; title: string; group: Group }[] = [
  { group: 'story', file: 'data/federal_monkey_patrol.game', title: 'The Story' },
  { group: 'free', file: 'freeplay.game', title: 'Free Play' },
  { group: 'free', file: 'rooftops.game', title: 'Rooftops (top-down)' },
  { group: 'free', file: 'rooftops_steer.game', title: 'Rooftops: Steering (top-down)' },
];
// The story's missions, in order, for the menu's "Jump to mission" links
// (?mission=N starts the story at the Nth's title card).
const STORY_FILE = 'data/federal_monkey_patrol.game';
const STORY_MISSIONS = ['Kill 3 Kongs', 'Survive', 'Save 3 Blondes', 'Survive Again', 'Save 3 Blondes, Lose None, Kill 5 Kongs'];
// "Skip to game" from a story with no missions in it
const FREE_FLIGHT = 'freeplay.game';

const overlay = document.getElementById('overlay') as HTMLDivElement;
const canvas = document.getElementById('screen') as HTMLCanvasElement;

let game: GameManager | null = null;
let inputmanager: InputManager | null = null;
let touch: TouchControls | null = null;
let running = false;
let paused = false;

// Always-there controls while a game runs: a small pause button (top
// centre, out of the way of the flight controls; it opens a menu rather
// than quitting, so a stray tap costs nothing) and, during the story, a
// quiet "skip to game" link.
const hud = document.createElement('div');
hud.id = 'hud';
hud.hidden = true;
hud.innerHTML = `
  <button class="hud-pause" type="button" aria-label="Pause" title="Pause (Esc)">&#10074;&#10074;</button>
  <a class="hud-skip" href="#" hidden>Skip to game &rsaquo;</a>`;
document.body.append(hud);
const pauseBtn = hud.querySelector('.hud-pause') as HTMLButtonElement;
const skipLink = hud.querySelector('.hud-skip') as HTMLAnchorElement;
pauseBtn.addEventListener('click', () => setPaused(true));
skipLink.addEventListener('click', (e) => {
  e.preventDefault();
  skipToGame();
});

function gameUrl(file: string, mission = 0): string {
  const u = new URL(window.location.href);
  u.searchParams.set('game', file);
  u.searchParams.delete('flow');
  if (mission) u.searchParams.set('mission', String(mission));
  else u.searchParams.delete('mission');
  return u.pathname + u.search;
}

function setPaused(p: boolean): void {
  if (!running || p === paused) return;
  paused = p;
  setAudioPaused(p);
  if (p) {
    overlay.innerHTML = `
      <div class="panel pause-panel">
        <h1>Paused</h1>
        <div class="actions">
          <button type="button" class="resume">Resume</button>
          <button type="button" class="menu">Quit to main menu</button>
        </div>
      </div>`;
    overlay.hidden = false;
    const resume = overlay.querySelector('.resume') as HTMLButtonElement;
    resume.addEventListener('click', () => setPaused(false));
    overlay.querySelector('.menu')?.addEventListener('click', () => {
      stop();
      showMenu();
    });
    resume.focus();
  } else {
    overlay.hidden = true;
    canvas.focus();
  }
}

/** Skip the story: on to the next mission, or if the story has none,
 *  straight to flying. */
function skipToGame(): void {
  if (!game) return;
  if (game.skipToMission()) {
    canvas.focus();
  } else {
    window.history.replaceState(null, '', gameUrl(FREE_FLIGHT));
    start(FREE_FLIGHT);
  }
}

/** "Last updated <build time>" (in the viewer's time zone), and the commit. */
function lastUpdated(): string {
  const when = new Date(__BUILD_TIME__).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  const c = __BUILD_COMMIT__;
  const link = c ? ` (<a href="https://github.com/davmlaw/federal-monkey-patrol/commit/${c}">${c}</a>)` : '';
  return `Last updated ${when}${link}`;
}

function showMenu({ ended = false } = {}): void {
  const params = new URLSearchParams(window.location.search);
  const chosen = params.get('game');
  const chosenMission = parseInt(params.get('mission') ?? '', 10) || 0;
  const esc = (t: string): string => t.replace(/[<>&]/g, (c) => `&#${c.charCodeAt(0)};`);
  const sub = !ended ? 'Dave Lawrence &amp; Sam Norman, 2004&ndash;2006 (finished for the web in 2026)'
    : lastResult.title ? `<span class="result">${esc(lastResult.title)}</span> ${esc(lastResult.line)}`
    : 'The End.';
  const link = (g: (typeof GAMES)[number]): string => `
    <a href="${gameUrl(g.file)}" data-game="${g.file}" class="${g.file === chosen && !chosenMission ? 'chosen' : ''}">
      <span class="t">${g.title}</span></a>`;
  const group = (k: Group): (typeof GAMES)[number][] => GAMES.filter((g) => g.group === k);
  overlay.innerHTML = `
    <div class="panel">
      <h1>Federal Monkey Patrol</h1>
      <p class="sub">${sub}</p>
      <h2>Story</h2>
      <ul class="games">${group('story').map((g) => `<li>${link(g)}</li>`).join('')}</ul>
      <h2>Free play</h2>
      <ul class="games">${group('free').map((g) => `<li>${link(g)}</li>`).join('')}</ul>
      <p class="extras">Jump to mission: ${STORY_MISSIONS.map((t, i) => `<a href="${gameUrl(STORY_FILE, i + 1)}" data-game="${STORY_FILE}" data-mission="${i + 1}"
        class="${chosen === STORY_FILE && chosenMission === i + 1 ? 'chosen' : ''}">${i + 1}. ${t}</a>`).join(' &middot; ')}</p>
      <p class="keys">Arrow keys: fly &middot; W / S: throttle &middot; Space: fire &middot; Esc: pause &middot;
        Top-down: up / down change speed &middot; Touch: on-screen stick, throttle and fire.</p>
      ${display.software ? `<p class="warn">Your browser is drawing with a software renderer (${display.gpu.replace(/[<>&]/g, '')}), so the game will be slow.
        Turn on hardware acceleration in the browser's settings (or check chrome://gpu).</p>` : ''}
      <p class="foot"><a href="https://github.com/davmlaw/federal-monkey-patrol">Source on GitHub</a> &middot; GPL v2
        &middot; ${lastUpdated()}</p>
    </div>`;
  overlay.hidden = false;
  overlay.querySelectorAll<HTMLAnchorElement>('a[data-game]').forEach((a) => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      window.history.replaceState(null, '', a.getAttribute('href'));
      start(a.dataset.game ?? null, parseInt(a.dataset.mission ?? '', 10) || 0);
    });
  });
  (overlay.querySelector<HTMLAnchorElement>('a.chosen') ?? overlay.querySelector<HTMLAnchorElement>('a[data-game]'))?.focus();
}

/** `mission`: start the story at its Nth mission (0: the beginning). */
async function start(file: string | null, mission = 0): Promise<void> {
  unlockAudio();
  overlay.hidden = true;
  canvas.focus();
  stop();
  try {
    await settings.load();
    await loadFont();
    game = await GameManager.fromFile(file || settings.gets('main', 'default_game'));
    if (mission && !game.startAtMission(mission)) console.warn(`no mission ${mission} in ${file}`);
  } catch (e) {
    console.error(e);
    overlay.innerHTML = `<div class="panel"><h1>Uncaught Exception</h1><pre>${String(e instanceof Error ? e.message : e)}</pre></div>`;
    overlay.hidden = false;
    return;
  }
  const g = game;
  const input = new Input();
  const im = new InputManager(input);
  const tc = new TouchControls(input);
  inputmanager = im;
  touch = tc;
  im.addDevice(tc);
  im.addDevice(new PointerTap(input, canvas));
  const hasStory = g.components.some((c) => c instanceof StoryTeller);
  let lastEsc: boolean | null = null;
  running = true;
  paused = false;
  hud.hidden = false;
  console.log('---------- BEGIN MAIN LOOP ----------');
  let last = performance.now();
  const frame = (now: number): void => {
    if (!running) return;
    // capped so a backgrounded tab doesn't skip whole scenes
    const msecs = Math.min(250, Math.max(0, Math.round(now - last)));
    last = now;
    im.update(msecs);
    // Esc (or the pause button) pauses; Esc again resumes
    const esc = input.buttonToggled(Button.QUIT);
    if (lastEsc !== null && esc !== lastEsc) setPaused(!paused);
    lastEsc = esc;
    display.beginFrame();
    stage.beginFrame();
    try {
      const c = g.currentComponent();
      if (paused) c?.play(display, 0, null); // frozen
      else g.play(display, msecs, input);
      // on-screen flight controls only while flying a mission
      const player = c instanceof Mission && c.loaded && !c.loadError && !c.cinematic ? c.player : null;
      tc.setVisible(!!player && !paused);
      if (player) tc.showThrottle(player.mode === FlyMode.FOLLOW);
      stage.endFrame();
      pauseBtn.hidden = paused;
      skipLink.hidden = paused || !hasStory || c instanceof Mission;
    } catch (e) {
      console.error('Uncaught Exception.', e);
      g.status = Status.QUIT;
    }
    if (g.getStatus() === Status.QUIT) {
      console.log(`===== Game Statistics =====\n${gamestats}`);
      stop();
      showMenu({ ended: true });
      return;
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

function stop(): void {
  running = false;
  if (paused) setAudioPaused(false);
  paused = false;
  hud.hidden = true;
  stage.clear();
  stopMusic();
  game?.dispose();
  game = null;
  inputmanager?.dispose();
  inputmanager = null;
  touch?.dispose();
  touch = null;
}

display.init(canvas);
// A click is needed before the browser lets a page play sound, so always
// start from the menu, with ?game= preselected.
showMenu();
