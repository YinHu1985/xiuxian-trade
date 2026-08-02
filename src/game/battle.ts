/** 战斗系统 v2：三种攻防（飞剑/法术/近身）+ 战斗人员阵型、回合推演与结算 */

import type { CombatantState, CombatSkill, CombatStats } from '@/game/types'

/** 九宫格位置索引 */
// 0(後上) 1(後中) 2(後下)
// 3(中上) 4(中中·飞舟) 5(中下)
// 6(前上) 7(前中) 8(前下)

export const FRONT_ROW = [6, 7, 8]
export const MIDDLE_ROW = [3, 4, 5]
export const BACK_ROW = [0, 1, 2]
/** 己方行动顺序：前排→中排→后排，每排上→中→下 */
export const ACT_ORDER = [6, 7, 8, 3, 4, 5, 0, 1, 2]

/** 五种能力的显示名 */
export const COMBAT_SKILL_LABELS: Record<CombatSkill, string> = {
  sword: '御剑',
  formation: '控阵',
  spirit: '灵力',
  ship: '操船',
  body: '炼体',
}

/** 五种能力的说明 */
export const COMBAT_SKILL_DESCRIPTIONS: Record<CombatSkill, string> = {
  sword: '操控大量飞剑进攻，大幅提升飞剑攻击',
  formation: '布下剑阵抵挡飞剑，大幅提升飞剑防御',
  spirit: '蓄力灵能炮击，大幅提升法术攻击',
  ship: '驾驭飞舟规避灵能炮击，大幅提升法术防御',
  body: '近距离贴身格斗，同时提升近身攻防',
}

/** 战斗人员基础属性：攻击略高于防御，保证任意攻击都保有基础破防可能 */
export const COMBATANT_BASE_STATS: CombatStats = {
  swordAtk: 12,
  swordDef: 10,
  spellAtk: 12,
  spellDef: 10,
  meleeAtk: 12,
  meleeDef: 10,
}

/** 五种能力的属性加成 */
export const SKILL_STAT_BONUS: Record<CombatSkill, CombatStats> = {
  sword: { swordAtk: 30, swordDef: 0, spellAtk: 0, spellDef: 0, meleeAtk: 0, meleeDef: 0 },
  formation: { swordAtk: 0, swordDef: 30, spellAtk: 0, spellDef: 0, meleeAtk: 0, meleeDef: 0 },
  spirit: { swordAtk: 0, swordDef: 0, spellAtk: 30, spellDef: 0, meleeAtk: 0, meleeDef: 0 },
  ship: { swordAtk: 0, swordDef: 0, spellAtk: 0, spellDef: 30, meleeAtk: 0, meleeDef: 0 },
  body: { swordAtk: 0, swordDef: 0, spellAtk: 0, spellDef: 0, meleeAtk: 15, meleeDef: 15 },
}

/** 主飞舟自身攻防属性（飞舟耐久即生命值） */
export const SHIP_STATS: CombatStats = {
  swordAtk: 14,
  swordDef: 20,
  spellAtk: 14,
  spellDef: 20,
  meleeAtk: 10,
  meleeDef: 16,
}

export interface BattleCell {
  type: 'ship' | 'combatant' | 'empty'
  currentHp: number
  maxHp: number
  stats: CombatStats
  name?: string
  skill?: CombatSkill
  combatantId?: string
}

export type BattlePhase = 'deploy' | 'fighting' | 'result'

export interface BattleSide {
  cells: [BattleCell, BattleCell, BattleCell, BattleCell, BattleCell, BattleCell, BattleCell, BattleCell, BattleCell]
}

export interface BattleLogEntry {
  side: 'player' | 'enemy'
  fromPos: number
  toPos: number
  damage: number
  killed: boolean
  /** 三种攻防的伤害明细 */
  breakdown?: { sword: number; spell: number; melee: number }
  fromName?: string
  toName?: string
}

export interface BattleState {
  phase: BattlePhase
  playerSide: BattleSide
  enemySide: BattleSide
  whoStarts: 'player' | 'enemy' // 每轮先手方
  roundIndex: number // 第几轮
  logs: BattleLogEntry[]
  /** 战斗开始时玩家战斗人员编队快照（部署面板使用） */
  playerRoster: CombatantState[]
  /** 本次战斗实际部署的人数（结算统计用） */
  playerDeployedCount: number
  shipInitialDurability: number
  battleEventId?: string // 由事件触发时记录事件 ID，战斗结束后触发 battle_end check
}

/* ====================== 属性与单位 ====================== */

/** 计算战斗人员三种攻防：基础 + 技能加成 */
export function buildStandardStats(skill: CombatSkill): CombatStats {
  const result = {} as CombatStats
  ;(Object.keys(COMBATANT_BASE_STATS) as Array<keyof CombatStats>).forEach((key) => {
    result[key] = COMBATANT_BASE_STATS[key] + SKILL_STAT_BONUS[skill][key]
  })
  return result
}

/** 生成带随机波动的属性（敌方用），scale < 1 表示更弱的敌人 */
export function buildRandomizedStats(skill: CombatSkill, rng: () => number, scale = 1): CombatStats {
  const result = {} as CombatStats
  ;(Object.keys(COMBATANT_BASE_STATS) as Array<keyof CombatStats>).forEach((key) => {
    const raw = (COMBATANT_BASE_STATS[key] + SKILL_STAT_BONUS[skill][key] + Math.floor(rng() * 5) - 2) * scale
    result[key] = Math.max(1, Math.round(raw))
  })
  return result
}

/** 创建一名标准战斗人员（hp 固定 100） */
export function createCombatant(id: string, name: string, skill: CombatSkill): CombatantState {
  return { id, name, skill, stats: buildStandardStats(skill), hp: 100, maxHp: 100 }
}

/** 开局赠送的战斗人员模板：覆盖五种能力（有攻高有防高，方便测试） */
export const STARTING_COMBATANT_TEMPLATES: Array<{ name: string; skill: CombatSkill }> = [
  { name: '沈栖梧', skill: 'sword' },
  { name: '苏含烟', skill: 'spirit' },
  { name: '钟铁衣', skill: 'body' },
  { name: '玄枢子', skill: 'formation' },
  { name: '沧浪客', skill: 'ship' },
]

export function createStartingCombatants(): CombatantState[] {
  return STARTING_COMBATANT_TEMPLATES.map((template, index) =>
    createCombatant(`combatant-start-${index + 1}`, template.name, template.skill),
  )
}

/** 总防御 = 三种防御之和 */
export function getTotalDefense(stats: CombatStats): number {
  return stats.swordDef + stats.spellDef + stats.meleeDef
}

/* ====================== 阵型构造 ====================== */

/** 创建一格空位 */
function emptyCell(): BattleCell {
  return { type: 'empty', currentHp: 0, maxHp: 0, stats: { swordAtk: 0, swordDef: 0, spellAtk: 0, spellDef: 0, meleeAtk: 0, meleeDef: 0 } }
}

/** 创建一格战斗人员 */
function combatantCell(unit: CombatantState): BattleCell {
  return {
    type: 'combatant',
    currentHp: unit.hp,
    maxHp: unit.maxHp,
    stats: { ...unit.stats },
    name: unit.name,
    skill: unit.skill,
    combatantId: unit.id,
  }
}

/** 创建飞舟（中心格固定） */
function shipCell(hp: number): BattleCell {
  return { type: 'ship', currentHp: hp, maxHp: hp, stats: { ...SHIP_STATS } }
}

/** 初始化玩家方阵型（仅飞舟，其余位置由部署填充） */
export function createPlayerSide(airshipDurability: number): BattleSide {
  const cells = [
    emptyCell(), emptyCell(), emptyCell(), // 后排
    emptyCell(), shipCell(airshipDurability), emptyCell(), // 中排（中心飞舟）
    emptyCell(), emptyCell(), emptyCell(), // 前排
  ] as BattleSide['cells']
  return { cells }
}

/** 自动部署时的占位顺序：前排→中排（除中心）→后排 */
const AUTO_DEPLOY_POSITIONS = [6, 7, 8, 3, 5, 0, 1, 2]

/** 生成敌方阵型：随机刷几名攻高/防高的战斗人员，按自动部署逻辑（总防御高者在前）排阵 */
function createEnemySide(strength: 'drill' | 'weak', rng: () => number = Math.random): BattleSide {
  const cells = [
    emptyCell(), emptyCell(), emptyCell(),
    emptyCell(), emptyCell(), emptyCell(),
    emptyCell(), emptyCell(), emptyCell(),
  ] as BattleSide['cells']

  const scale = strength === 'drill' ? 1 : 0.8
  const count = strength === 'drill' ? 4 + Math.floor(rng() * 3) : 3 + Math.floor(rng() * 2)
  const skillPool: CombatSkill[] = ['sword', 'formation', 'spirit', 'ship', 'body']
  const prefix = strength === 'drill' ? '傀儡' : '劫修'

  const units: BattleCell[] = []
  for (let i = 0; i < count; i += 1) {
    const skill = skillPool[Math.floor(rng() * skillPool.length)]
    units.push({
      type: 'combatant',
      currentHp: 100,
      maxHp: 100,
      stats: buildRandomizedStats(skill, rng, scale),
      name: `${prefix}·${COMBAT_SKILL_LABELS[skill]}`,
      skill,
    })
  }

  units.sort((a, b) => getTotalDefense(b.stats) - getTotalDefense(a.stats))
  AUTO_DEPLOY_POSITIONS.forEach((pos, index) => {
    if (units[index]) cells[pos] = units[index]
  })
  return { cells }
}

/* ====================== 伤害计算 ====================== */

/**
 * 一次攻击同时计算三种攻防：飞剑/法术/近身各自以攻减防，伤害叠加。
 * 当某类防御 ≥ 攻击时，该类完全无法破防（伤害为 0）。
 */
export function computeDamage(attacker: CombatStats, defender: CombatStats): {
  sword: number
  spell: number
  melee: number
  total: number
} {
  const sword = Math.max(0, attacker.swordAtk - defender.swordDef)
  const spell = Math.max(0, attacker.spellAtk - defender.spellDef)
  const melee = Math.max(0, attacker.meleeAtk - defender.meleeDef)
  return { sword, spell, melee, total: sword + spell + melee }
}

/* ====================== 战斗推演 ====================== */

/** 获取某方前排第一个有生力量的行位 */
function getFrontmostRowPositions(side: BattleSide): number[] {
  if (FRONT_ROW.some((i) => side.cells[i].currentHp > 0)) return FRONT_ROW
  if (MIDDLE_ROW.some((i) => side.cells[i].currentHp > 0)) return MIDDLE_ROW
  if (BACK_ROW.some((i) => side.cells[i].currentHp > 0)) return BACK_ROW
  return []
}

/** 是否有存活单位 */
function hasAlive(side: BattleSide): boolean {
  return side.cells.some((c) => c.currentHp > 0)
}

/** 某方是否全部消灭 */
export function isWiped(side: BattleSide): boolean {
  return !hasAlive(side)
}

/** 玩家飞舟是否被摧毁（中格=index 4） */
export function isShipDestroyed(side: BattleSide): boolean {
  return side.cells[4].currentHp <= 0
}

/** 执行一次攻击动作 */
function executeAttack(
  attacker: BattleSide,
  defender: BattleSide,
  fromPos: number,
  isPlayerAttacker: boolean,
): BattleLogEntry | null {
  const unit = attacker.cells[fromPos]
  if (unit.currentHp <= 0) return null

  const targets = getFrontmostRowPositions(defender).filter((i) => defender.cells[i].currentHp > 0)
  if (targets.length === 0) return null

  const toPos = targets[Math.floor(Math.random() * targets.length)]
  const target = defender.cells[toPos]

  const dmg = computeDamage(unit.stats, target.stats)
  const damage = Math.min(dmg.total, target.currentHp)
  target.currentHp -= damage
  const killed = target.currentHp <= 0

  return {
    side: isPlayerAttacker ? 'player' : 'enemy',
    fromPos,
    toPos,
    damage,
    killed,
    breakdown: { sword: dmg.sword, spell: dmg.spell, melee: dmg.melee },
    fromName: unit.name,
    toName: target.name,
  }
}

/** 执行一轮（双方按阵位交替行动一次） */
export function executeRound(
  playerSide: BattleSide,
  enemySide: BattleSide,
  whoStarts: 'player' | 'enemy',
): BattleLogEntry[] {
  const logs: BattleLogEntry[] = []
  const first = whoStarts === 'player' ? playerSide : enemySide
  const second = whoStarts === 'player' ? enemySide : playerSide
  const firstIsPlayer = whoStarts === 'player'

  for (const pos of ACT_ORDER) {
    // 先手方在此位置行动
    if (first.cells[pos].currentHp > 0) {
      const log = executeAttack(first, second, pos, firstIsPlayer)
      if (log) logs.push(log)
      if (!hasAlive(second)) break
    }
    // 后手方在此位置行动
    if (second.cells[pos].currentHp > 0) {
      const log = executeAttack(second, first, pos, !firstIsPlayer)
      if (log) logs.push(log)
      if (!hasAlive(first)) break
    }
  }

  return logs
}

/** 检查战斗是否结束 */
export function checkBattleEnd(
  playerSide: BattleSide,
  enemySide: BattleSide,
): 'none' | 'player_victory' | 'enemy_victory' {
  if (isShipDestroyed(playerSide)) return 'enemy_victory'
  if (isWiped(enemySide)) return 'player_victory'
  return 'none'
}

/* ====================== 部署 ====================== */

/** 在指定位置部署一名战斗人员（飞舟格不可部署） */
export function deployCombatant(side: BattleSide, pos: number, unit: CombatantState): void {
  if (pos < 0 || pos > 8 || pos === 4) return
  side.cells[pos] = combatantCell(unit)
}

/** 清空指定位置的战斗人员 */
export function clearCell(side: BattleSide, pos: number): void {
  if (pos < 0 || pos > 8 || pos === 4) return
  side.cells[pos] = emptyCell()
}

/** 获取某方已部署的战斗人员数量 */
export function getDeployedCount(side: BattleSide): number {
  return side.cells.reduce((sum, c) => sum + (c.type === 'combatant' ? 1 : 0), 0)
}

/** 自动部署：优先把总防御高的摆前排（前排→中排→后排） */
export function autoDeployPlayer(side: BattleSide, roster: CombatantState[]): void {
  const sorted = [...roster].sort((a, b) => getTotalDefense(b.stats) - getTotalDefense(a.stats))
  // 先清空非飞舟格
  for (let pos = 0; pos < 9; pos += 1) {
    if (pos !== 4) clearCell(side, pos)
  }
  AUTO_DEPLOY_POSITIONS.forEach((pos, index) => {
    if (sorted[index]) deployCombatant(side, pos, sorted[index])
  })
}

/* ====================== 战斗初始化 ====================== */

/** 初始化战斗状态（演习默认：敌方为常规强度的随机编队） */
export function createBattleState(
  airshipDurability: number,
  roster: CombatantState[],
  options?: { eventId?: string; enemyStrength?: 'drill' | 'weak' },
): BattleState {
  return {
    phase: 'deploy',
    playerSide: createPlayerSide(airshipDurability),
    enemySide: createEnemySide(options?.enemyStrength ?? 'drill'),
    whoStarts: 'player', // 演习默认玩家先手
    roundIndex: 0,
    logs: [],
    playerRoster: structuredClone(roster),
    playerDeployedCount: 0,
    shipInitialDurability: airshipDurability,
    battleEventId: options?.eventId,
  }
}

/** 生成随机遭遇战：敌人更弱（数量更少、属性更低），敌方先手 */
export function generateRandomEncounter(airshipDurability: number, roster: CombatantState[]): BattleState {
  const state = createBattleState(airshipDurability, roster, { enemyStrength: 'weak' })
  state.whoStarts = 'enemy'
  return state
}

/** 完整战斗模拟：在副本上跑完全部回合，返回所有事件记录和最终状态 */
export function simulateFullBattle(
  playerSide: BattleSide,
  enemySide: BattleSide,
  whoStarts: 'player' | 'enemy',
): {
  allLogs: BattleLogEntry[]
  finalPlayerSide: BattleSide
  finalEnemySide: BattleSide
  result: 'none' | 'player_victory' | 'enemy_victory'
  roundCount: number
} {
  // 深拷贝，不影响传入的 state
  const p = JSON.parse(JSON.stringify(playerSide)) as BattleSide
  const e = JSON.parse(JSON.stringify(enemySide)) as BattleSide
  const allLogs: BattleLogEntry[] = []
  let roundCount = 0

  while (true) {
    const end = checkBattleEnd(p, e)
    if (end !== 'none') {
      return { allLogs, finalPlayerSide: p, finalEnemySide: e, result: end, roundCount }
    }
    const roundLogs = executeRound(p, e, whoStarts)
    allLogs.push(...roundLogs)
    roundCount += 1
  }
}
