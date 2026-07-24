/** 战斗系统：阵型、回合推演与结算 */

/** 九宫格位置索引 */
// 0(後上) 1(後中) 2(後下)
// 3(中上) 4(中中) 5(中下)
// 6(前上) 7(前中) 8(前下)

export const FRONT_ROW = [6, 7, 8]
export const MIDDLE_ROW = [3, 4, 5]
export const BACK_ROW = [0, 1, 2]
/** 己方行动顺序：前排→中排→后排，每排上→中→下 */
export const ACT_ORDER = [6, 7, 8, 3, 4, 5, 0, 1, 2]

export interface BattleCell {
  type: 'ship' | 'crew' | 'empty'
  currentHp: number
  maxHp: number
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
}

export interface BattleState {
  phase: BattlePhase
  playerSide: BattleSide
  enemySide: BattleSide
  whoStarts: 'player' | 'enemy' // 每轮先手方
  roundIndex: number // 第几轮（一轮=双方按阵位交替行动一次）
  logs: BattleLogEntry[]
  playerInitialCrew: number
  shipInitialDurability: number
}

/** 创建一格空位 */
function emptyCell(): BattleCell {
  return { type: 'empty', currentHp: 0, maxHp: 0 }
}

/** 创建一格船员 */
function crewCell(hp: number): BattleCell {
  return { type: 'crew', currentHp: hp, maxHp: hp }
}

/** 创建飞舟（中心格固定） */
function shipCell(hp: number): BattleCell {
  return { type: 'ship', currentHp: hp, maxHp: hp }
}

/** 初始化玩家方阵型 */
export function createPlayerSide(airshipDurability: number): BattleSide {
  const cells = [
    emptyCell(), emptyCell(), emptyCell(), // 后排
    emptyCell(), shipCell(airshipDurability), emptyCell(), // 中排（中心飞舟）
    emptyCell(), emptyCell(), emptyCell(), // 前排
  ] as BattleSide['cells']
  return { cells }
}

/** 初始化敌方阵型（演习默认） */
export function createEnemySide(): BattleSide {
  // 敌方：前排3个各30血，中排中1个20血
  const cells = [
    emptyCell(), emptyCell(), emptyCell(), // 后排
    crewCell(20), emptyCell(), emptyCell(), // 中排
    crewCell(30), crewCell(30), crewCell(30), // 前排
  ] as BattleSide['cells']
  return { cells }
}

/** 获取某方前排第一个有生力量的行索引（0=无，1=后排，2=中排，3=前排） */
function getFrontmostRow(side: BattleSide): number {
  if (FRONT_ROW.some((i) => side.cells[i].currentHp > 0)) return 3
  if (MIDDLE_ROW.some((i) => side.cells[i].currentHp > 0)) return 2
  if (BACK_ROW.some((i) => side.cells[i].currentHp > 0)) return 1
  return 0
}

/** 获取某方前排第一个有生力量的行 */
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

  // 攻击 = 50% 当前 HP，防御 = 30% 当前 HP
  const attack = Math.ceil(unit.currentHp * 0.5)
  const defense = Math.ceil(unit.currentHp * 0.3)
  const baseDamage = Math.max(1, attack - defense)

  // 选择目标
  const targets = getFrontmostRowPositions(defender).filter((i) => defender.cells[i].currentHp > 0)
  if (targets.length === 0) return null

  const toPos = targets[Math.floor(Math.random() * targets.length)]
  const target = defender.cells[toPos]

  const damage = Math.min(baseDamage, target.currentHp)
  target.currentHp -= damage
  const killed = target.currentHp <= 0

  return { side: isPlayerAttacker ? 'player' : 'enemy', fromPos, toPos, damage, killed }
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

/** 初始化战斗状态 */
export function createBattleState(airshipDurability: number): BattleState {
  const playerSide = createPlayerSide(airshipDurability)
  const enemySide = createEnemySide()

  return {
    phase: 'deploy',
    playerSide,
    enemySide,
    whoStarts: 'player', // 演习默认玩家先手
    roundIndex: 0,
    logs: [],
    playerInitialCrew: 0,
    shipInitialDurability: airshipDurability,
  }
}

/** 部署：在指定位置设防船员 */
export function deployCrew(state: BattleState, pos: number, amount: number): void {
  if (pos < 0 || pos > 8 || pos === 4) return // 飞舟格不可部署
  if (state.phase !== 'deploy') return
  const cell = state.playerSide.cells[pos]
  if (amount <= 0) {
    cell.type = 'empty'
    cell.currentHp = 0
    cell.maxHp = 0
  } else {
    cell.type = 'crew'
    cell.currentHp = amount
    cell.maxHp = amount
  }
}

/** 获取已部署总人数 */
export function getDeployedCrew(state: BattleState): number {
  return state.playerSide.cells.reduce((sum, c) => sum + (c.type === 'crew' ? c.currentHp : 0), 0)
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
} {
  // 深拷贝，不影响传入的 state
  const p = JSON.parse(JSON.stringify(playerSide)) as BattleSide
  const e = JSON.parse(JSON.stringify(enemySide)) as BattleSide
  const allLogs: BattleLogEntry[] = []

  while (true) {
    const end = checkBattleEnd(p, e)
    if (end !== 'none') {
      return { allLogs, finalPlayerSide: p, finalEnemySide: e, result: end }
    }
    const roundLogs = executeRound(p, e, whoStarts)
    allLogs.push(...roundLogs)
  }
}

/** 生成随机遭遇战：2~3 组每组 10 人敌军 */
export function generateRandomEncounter(airshipDurability: number): BattleState {
  const groups = 2 + Math.floor(Math.random() * 2) // 2 or 3
  const cells: BattleCell[] = [
    emptyCell(), emptyCell(), emptyCell(),
    emptyCell(), emptyCell(), emptyCell(),
    emptyCell(), emptyCell(), emptyCell(),
  ]
  const positions = [0, 1, 2, 3, 5, 6, 7, 8] // 除飞舟格(4)之外
  for (let g = 0; g < groups; g++) {
    if (positions.length === 0) break
    const idx = Math.floor(Math.random() * positions.length)
    const pos = positions.splice(idx, 1)[0]
    cells[pos] = crewCell(10)
  }
  const enemySide: BattleSide = { cells: cells as BattleSide['cells'] }

  return {
    phase: 'deploy',
    playerSide: createPlayerSide(airshipDurability),
    enemySide,
    whoStarts: 'enemy', // 遭遇战敌方先手
    roundIndex: 0,
    logs: [],
    playerInitialCrew: 0,
    shipInitialDurability: airshipDurability,
  }
}
