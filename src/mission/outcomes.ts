// Mission outcomes (Scenario -> Condition -> Result) and Constraints.
//
// <scenario>
//   <condition> <AND|OR|NOT|stat name="..." op="gte" value="5" /> </condition>
//   <result> <value>next</value> <message>...</message> </result>
// </scenario>
//
// A message can quote stats in braces: "{monkey_deaths} kongs downed".

import { statusFromName, statusName, type Status } from '../game/component.ts';
import { gamestats, statFromName, Stat } from './stats.ts';
import { settings } from '../core/settings.ts';

/** Something whose status a Result can change (a Mission): it shows the
 *  message, then takes the status. */
export interface StatusTarget { finish(s: Status, message: string): void }

/** The player, as far as Constraints needs it. */
export interface Constrained { entity: { object: { position: { y: number } } } }

export interface Condition { isTrue(): boolean }

/** Child elements by lower-case name (last one wins). */
export function xmlMap(node: Element | null | undefined): Partial<Record<string, Element>> {
  const map: Partial<Record<string, Element>> = {};
  if (!node) return map;
  for (const c of node.children) map[c.nodeName.toLowerCase()] = c;
  return map;
}

/** xmlMap() of children to their text values. */
export function xmlStringMap(node: Element | null | undefined): Partial<Record<string, string>> {
  const map: Partial<Record<string, string>> = {};
  for (const [k, v] of Object.entries(xmlMap(node))) map[k] = v?.textContent ?? '';
  return map;
}

function evalOp(a: number, op: string, b: number): boolean {
  if (op === '<' || op === 'lt') return a < b;
  if (op === '<=' || op === 'lte') return a <= b;
  if (op === '==' || op === 'eq') return a === b;
  if (op === '>=' || op === 'gte') return a >= b;
  if (op === '>' || op === 'gt') return a > b;
  return false;
}

/** Builds a condition from XML. Returns null if it can't. */
export function buildCondition(node: Element | null): Condition | null {
  if (!node) return null;
  const name = node.nodeName.toLowerCase();
  if (name === 'not') {
    const child = buildCondition(node.firstElementChild);
    return child && { isTrue: () => !child.isTrue() };
  }
  if (name === 'stat') {
    const s = statFromName(node.getAttribute('name') || '');
    const op = node.getAttribute('op') || '';
    const val = parseInt(node.getAttribute('value') ?? '', 10) || 0;
    if (s === Stat.NOSUCHSTAT || !op) {
      console.log('Bad Stat property read.');
      return null;
    }
    return { isTrue: () => evalOp(gamestats.get(s), op, val) };
  }
  if (name === 'and' || name === 'or') {
    const conds = [...node.children].map(buildCondition).filter((c): c is Condition => c !== null);
    if (name === 'and') return { isTrue: () => conds.reduce((r, c) => r && c.isTrue(), true) };
    return { isTrue: () => conds.reduce((r, c) => r || c.isTrue(), false) };
  }
  console.log(`Unknown condition '${name}' read`);
  return null;
}

/** ChangeStatusResult: sets the mission's status (next/lost/quit/playing). */
class ChangeStatusResult {
  private toStatus: Status;
  private done = false;

  constructor(value: string, private message: string, private onceOnly = false) {
    this.toStatus = statusFromName(value);
  }

  execute(component: StatusTarget): void {
    if (this.done) return;
    const message = this.message.replace(/\{(\w+)\}/g, (m, name: string) => {
      const s = statFromName(name);
      return s === Stat.NOSUCHSTAT ? m : String(gamestats.get(s));
    });
    console.log(`ChangeGameStatus->execute() status = ${statusName(this.toStatus)} (${message})`);
    component.finish(this.toStatus, message);
    if (this.onceOnly) this.done = true;
  }
}

class Scenario {
  private test: Condition | null;
  private result: ChangeStatusResult;

  constructor(node: Element) {
    const x = xmlMap(node);
    if (!(x.condition && x.result)) throw new Error('<scenario> requires <condition> and <result>');
    this.test = buildCondition(x.condition.firstElementChild);
    const r = xmlStringMap(x.result);
    this.result = new ChangeStatusResult(r.value ?? '', r.message ?? '');
  }

  run(mission: StatusTarget): void {
    if (this.test && this.test.isTrue()) this.result.execute(mission);
  }
}

export class Outcomes {
  private scenarios: Scenario[];

  constructor(node: Element) {
    this.scenarios = [...node.children]
      .filter((c) => c.nodeName.toLowerCase() === 'scenario')
      .map((c) => new Scenario(c));
  }

  update(mission: StatusTarget): void {
    for (const s of this.scenarios) s.run(mission);
  }
}

/** game.properties' speed range at `height` (above the street): the
 *  plane's slowest and fastest, from *_low at speed_low_height and below
 *  to *_high at speed_high_height and above, in proportion in between.
 *  Low down it can creep along the streets; high up, where the city
 *  below scrolls past slowly, it goes faster. */
function altitudeSpeeds(height: number): { min: number; max: number } {
  const g = (k: string, d: number): number => {
    const v = settings.getf('game', k);
    return Number.isFinite(v) ? v : d;
  };
  const lo = g('speed_low_height', 100);
  const hi = g('speed_high_height', 2500);
  const t = Math.max(0, Math.min(1, (height - lo) / Math.max(1, hi - lo)));
  const at = (k: string, low: number, high: number): number => g(`${k}_low`, low) + t * (g(`${k}_high`, high) - g(`${k}_low`, low));
  const min = at('min_speed', 80, 600);
  return { min, max: Math.max(min, at('max_speed', 600, 1500)) };
}

/**
 * Limits on the player: the height is enforced here; speeds() is what the
 * throttle maps to (the plane never flies slower than its min).
 *
 * Note: the mission builder looks for <max_height>, <min_height>,
 * <max_speed> and <min_speed>, but the mission XML files say <maxheight>
 * etc., so in practice the defaults apply (see mission.ts).
 */
export class Constraints {
  maxHeight = 10000;
  minHeight = 0;
  /** Fixed speeds from the mission; unset, they go by altitude. */
  maxSpeed: number | null = null;
  minSpeed: number | null = null;

  /** The speed range at `height`. */
  speeds(height: number): { min: number; max: number } {
    const s = altitudeSpeeds(height);
    const min = this.minSpeed ?? s.min;
    return { min, max: Math.max(min, this.maxSpeed ?? s.max) };
  }

  restrict(player: Constrained): void {
    const p = player.entity.object.position;
    p.y = Math.min(this.maxHeight, Math.max(this.minHeight, p.y));
  }
}
