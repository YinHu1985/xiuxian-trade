import { create } from 'zustand'
import { defaultConfig, mergeConfig } from '@/game/config'
import {
  acceptQuest,
  clearPendingPlan,
  completeQuest,
  createTradeLink,
  createTradeLinkBetween,
  donateToCity,
  executePendingPlan,
  establishBranch,
  increaseCargoCapacity,
  increaseMoveRange,
  increaseRetainerCapacity,
  removeTradeLink,
  scheduleConstruction,
  scheduleRepairGate,
  scheduleRetainerDispatch,
  scheduleTravel,
  selectNode,
  sellCargo,
  tavernRumor,
  buyProduct,
} from '@/game/engine'
import { createNewGame } from '@/game/generator'
import { deleteSave, importSaveJson, listSaves, loadSave, saveGame } from '@/game/save'
import type { BuildingType, GameSession, SaveMeta } from '@/game/types'

interface GameStore {
  session: GameSession | null
  saves: SaveMeta[]
  createSession: (overrides?: Partial<typeof defaultConfig>, guildName?: string) => void
  loadSession: (session: GameSession) => void
  refreshSaves: () => void
  selectNode: (nodeId: string) => void
  tavernRumor: () => void
  buyProduct: (productId: string) => void
  sellCargo: (cargoId: string) => void
  scheduleTravel: (targetNodeId: string) => void
  establishBranch: () => void
  donateToCity: () => void
  buildBuilding: (nodeId: string, type: BuildingType) => void
  createTradeLink: (targetNodeId: string) => void
  createTradeLinkBetween: (fromNodeId: string, toNodeId: string) => void
  removeTradeLink: (linkId: string) => void
  increaseRetainerCapacity: () => void
  increaseCargoCapacity: () => void
  increaseMoveRange: () => void
  scheduleRetainerDispatch: (targetNodeId: string) => void
  scheduleRepairGate: () => void
  clearPendingPlan: () => void
  executePendingPlan: () => void
  acceptQuest: (questId: string) => void
  completeQuest: (questId: string) => void
  saveCurrent: (title: string, existingId?: string) => void
  loadSaveById: (id: string) => void
  deleteSaveById: (id: string) => void
  importJson: (raw: string) => void
}

export const useGameStore = create<GameStore>((set, get) => ({
  session: null,
  saves: [],
  createSession: (overrides, guildName) =>
    set({
      session: createNewGame(mergeConfig(defaultConfig, overrides ?? {}), Date.now(), guildName),
    }),
  loadSession: (session) => set({ session }),
  refreshSaves: () => set({ saves: listSaves() }),
  selectNode: (nodeId) => set((state) => ({ session: state.session ? selectNode(state.session, nodeId) : null })),
  tavernRumor: () => set((state) => ({ session: state.session ? tavernRumor(state.session) : null })),
  buyProduct: (productId) => set((state) => ({ session: state.session ? buyProduct(state.session, productId) : null })),
  sellCargo: (cargoId) => set((state) => ({ session: state.session ? sellCargo(state.session, cargoId) : null })),
  scheduleTravel: (targetNodeId) => set((state) => ({ session: state.session ? scheduleTravel(state.session, targetNodeId) : null })),
  establishBranch: () => set((state) => ({ session: state.session ? establishBranch(state.session) : null })),
  donateToCity: () => set((state) => ({ session: state.session ? donateToCity(state.session) : null })),
  buildBuilding: (nodeId, type) =>
    set((state) => ({ session: state.session ? scheduleConstruction(state.session, nodeId, type) : null })),
  createTradeLink: (targetNodeId) =>
    set((state) => ({ session: state.session ? createTradeLink(state.session, targetNodeId) : null })),
  createTradeLinkBetween: (fromNodeId, toNodeId) =>
    set((state) => ({ session: state.session ? createTradeLinkBetween(state.session, fromNodeId, toNodeId) : null })),
  removeTradeLink: (linkId) =>
    set((state) => ({ session: state.session ? removeTradeLink(state.session, linkId) : null })),
  increaseRetainerCapacity: () =>
    set((state) => ({ session: state.session ? increaseRetainerCapacity(state.session) : null })),
  increaseCargoCapacity: () =>
    set((state) => ({ session: state.session ? increaseCargoCapacity(state.session) : null })),
  increaseMoveRange: () =>
    set((state) => ({ session: state.session ? increaseMoveRange(state.session) : null })),
  scheduleRetainerDispatch: (targetNodeId) =>
    set((state) => ({ session: state.session ? scheduleRetainerDispatch(state.session, targetNodeId) : null })),
  scheduleRepairGate: () => set((state) => ({ session: state.session ? scheduleRepairGate(state.session) : null })),
  clearPendingPlan: () => set((state) => ({ session: state.session ? clearPendingPlan(state.session) : null })),
  executePendingPlan: () => set((state) => ({ session: state.session ? executePendingPlan(state.session) : null })),
  acceptQuest: (questId) => set((state) => ({ session: state.session ? acceptQuest(state.session, questId) : null })),
  completeQuest: (questId) => set((state) => ({ session: state.session ? completeQuest(state.session, questId) : null })),
  saveCurrent: (title, existingId) => {
    const { session } = get()
    if (!session) return
    saveGame(session, title, existingId)
    set({ saves: listSaves() })
  },
  loadSaveById: (id) => {
    const record = loadSave(id)
    if (!record) return
    set({ session: record.data, saves: listSaves() })
  },
  deleteSaveById: (id) => {
    deleteSave(id)
    set({ saves: listSaves() })
  },
  importJson: (raw) => {
    importSaveJson(raw)
    set({ saves: listSaves() })
  },
}))
