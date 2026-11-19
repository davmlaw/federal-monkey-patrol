// Port of game/mission/outcomes/: Scenario -> Condition -> Result, and
// Constraints.
//
// <scenario>
//   <condition> <AND|OR|NOT|stat name="..." op="gte" value="5" /> </condition>
//   <result> <value>next</value> <message>...</message> </result>
// </scenario>

import { statusFromName, statusName } from '../game/component.js';
import { gamestats, statFromName, Stat } from './stats.js';

/** xml_map(): child elements by lower-case name (last one wins). */
export function xmlMap(node) {
  const map = {};
  if (!node) return map;
  for (const c of node.children) map[c.nodeName.toLowerCase()] = c;
  return map;
}

/** xml_map() of children to their text values. */
export function xmlStringMap(node) {
  const map = {};
  for (const [k, v] of Object.entries(xmlMap(node))) map[k] = v.textContent;
  return map;
}

function evalOp(a, op, b) {
  if (op === '<' || op === 'lt') return a < b;
  if (op === '<=' || op === 'lte') return a <= b;
  if (op === '==' || op === 'eq') return a === b;
  if (op === '>=' || op === 'gte') return a >= b;
  if (op === '>' || op === 'gt') return a > b;
  return false;
}

/** condition_space::ConditionBuilder. Returns { isTrue() } or null. */
export function buildCondition(node) {
  if (!node) return null;
  const name = node.nodeName.toLowerCase();
  if (name === 'not') {
    const child = buildCondition(node.firstElementChild);
    return child && { isTrue: () => !child.isTrue() };
  }
  if (name === 'stat') {
    const s = statFromName(node.getAttribute('name') || '');
    const op = node.getAttribute('op') || '';
    const val = parseInt(node.getAttribute('value'), 10) || 0;
    if (s === Stat.NOSUCHSTAT || !op) {
      console.log('Bad Stat property read.');
      return null;
    }
    return { isTrue: () => evalOp(gamestats.get(s), op, val) };
  }
  if (name === 'and' || name === 'or') {
    const conds = [...node.children].map(buildCondition).filter(Boolean);
    if (name === 'and') return { isTrue: () => conds.reduce((r, c) => r && c.isTrue(), true) };
    return { isTrue: () => conds.reduce((r, c) => r || c.isTrue(), false) };
  }
  console.log(`Unknown condition '${name}' read`);
  return null;
}

/** ChangeStatusResult: sets the mission's status (next/lost/quit/playing). */
class ChangeStatusResult {
  constructor(value, message, onceOnly = false) {
    this.toStatus = statusFromName(value);
    this.message = message;
    this.onceOnly = onceOnly;
    this.done = false;
  }

  execute(component) {
    if (this.done) return;
    console.log(`ChangeGameStatus->execute() status = ${statusName(this.toStatus)} (${this.message})`);
    component.setStatus(this.toStatus);
    if (this.onceOnly) this.done = true;
  }
}

class Scenario {
  constructor(node) {
    const x = xmlMap(node);
    if (!(x.condition && x.result)) throw new Error('<scenario> requires <condition> and <result>');
    this.test = buildCondition(x.condition.firstElementChild);
    const r = xmlStringMap(x.result);
    this.result = new ChangeStatusResult(r.value ?? '', r.message ?? '');
  }

  run(mission) {
    if (this.test && this.test.isTrue()) this.result.execute(mission);
  }
}

export class Outcomes {
  constructor(node) {
    this.scenarios = [...node.children]
      .filter((c) => c.nodeName.toLowerCase() === 'scenario')
      .map((c) => new Scenario(c));
  }

  update(mission) {
    for (const s of this.scenarios) s.run(mission);
  }
}

/**
 * outcomes/constraints.cpp. Only the height is ever enforced.
 *
 * Note: the C++ MissionBuilder looked for <max_height>, <min_height>,
 * <max_speed> and <min_speed>, but the mission XML files say <maxheight>
 * etc., so the defaults below were what actually applied in 2006. That is
 * kept here (see buildConstraints in builder.js).
 */
export class Constraints {
  constructor() {
    this.maxHeight = 10000;
    this.minHeight = 0;
    this.maxSpeed = 1000;
    this.minSpeed = 0;
  }

  restrict(player) {
    const p = player.entity.object.position;
    p.y = Math.min(this.maxHeight, Math.max(this.minHeight, p.y));
  }
}
