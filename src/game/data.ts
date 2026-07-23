import type { NodeType, ProductCategory, ProductDefinition, Realm } from '@/game/types'

export const categoryLabelMap: Record<ProductCategory, string> = {
  herb: '药材',
  ore: '金石',
  pelt: '毛皮',
  essence: '灵液',
  talisman: '符篆',
  elixir: '丹药',
  equipment: '装备',
}

export const realmLabelMap: Record<Realm, string> = {
  qi: '炼气',
  foundation: '筑基',
  golden: '金丹',
  nascent: '元婴',
}

const categoryNames: Record<ProductCategory, string> = {
  herb: '药材',
  ore: '金石',
  pelt: '毛皮',
  essence: '灵液',
  talisman: '符篆',
  elixir: '丹药',
  equipment: '装备',
}

const realmPrice: Record<Realm, number> = {
  qi: 60,
  foundation: 120,
  golden: 220,
  nascent: 380,
}

const categoryBias: Record<ProductCategory, number> = {
  herb: 1,
  ore: 1.05,
  pelt: 0.92,
  essence: 1.12,
  talisman: 1.18,
  elixir: 1.28,
  equipment: 1.4,
}

const sourceBiasMap: Record<ProductCategory, NodeType[]> = {
  herb: ['town', 'sect', 'special'],
  ore: ['town', 'special', 'ruin'],
  pelt: ['town', 'ruin', 'special'],
  essence: ['special', 'sect', 'ruin'],
  talisman: ['sect', 'town'],
  elixir: ['sect', 'ruin'],
  equipment: ['special', 'sect', 'town'],
}

const equipmentRealmName: Record<Realm, string> = {
  qi: '兵器',
  foundation: '法器',
  golden: '灵器',
  nascent: '法宝',
}

export const allCategories = Object.keys(categoryLabelMap) as ProductCategory[]
export const allRealms = Object.keys(realmLabelMap) as Realm[]
export const rawMaterialCategories: ProductCategory[] = ['herb', 'ore', 'pelt', 'essence']
export const craftedCategories: ProductCategory[] = ['talisman', 'elixir', 'equipment']

export const productDefinitions: ProductDefinition[] = []

for (const category of allCategories) {
  for (const realm of allRealms) {
    const id = `${category}-${realm}`
    const name = category === 'equipment' ? `${realmLabelMap[realm]}${equipmentRealmName[realm]}` : `${realmLabelMap[realm]}${categoryNames[category]}`
    productDefinitions.push({
      id,
      name,
      category,
      realm,
      basePrice: Math.round(realmPrice[realm] * categoryBias[category]),
      sourceBias: sourceBiasMap[category],
    })
  }
}

export const productMap = Object.fromEntries(productDefinitions.map((product) => [product.id, product])) as Record<
  string,
  ProductDefinition
>

export const realmTierMap: Record<Realm, number> = {
  qi: 1,
  foundation: 2,
  golden: 3,
  nascent: 4,
}

export const nodeTypeLabelMap: Record<NodeType, string> = {
  town: '城镇',
  sect: '门派',
  ruin: '遗迹',
  special: '特殊据点',
}

export function getProductsForNodeType(
  nodeType: NodeType,
  options: {
    maxRealmTier?: number
    categories?: ProductCategory[]
  } = {},
): ProductDefinition[] {
  const { maxRealmTier = 4, categories } = options
  return productDefinitions.filter((product) => {
    if (!product.sourceBias.includes(nodeType)) return false
    if (categories && !categories.includes(product.category)) return false
    return realmTierMap[product.realm] <= maxRealmTier
  })
}

export const questNpcNames = [
  '孙掌柜', '李娘子', '赵铁笔', '钱账房', '周行脚',
  '吴采药', '郑猎户', '王执事', '冯库头', '陈管库',
  '褚郎中', '卫老兵', '沈散修', '韩驼子', '杨快嘴',
]

export const itemDefinitions: { id: string; name: string; stackable: boolean }[] = [
  { id: 'treasure-lingzhi', name: '灵芝草', stackable: true },
  { id: 'treasure-huolongguo', name: '火龙果', stackable: true },
  { id: 'treasure-shuangsuihua', name: '霜髓花', stackable: true },
  { id: 'treasure-zidiangu', name: '紫电菇', stackable: true },
  { id: 'treasure-xuanhuangshen', name: '玄黄参', stackable: true },
  { id: 'treasure-yujinglian', name: '玉晶莲', stackable: true },
  { id: 'treasure-xingchenye', name: '星辰叶', stackable: true },
  { id: 'treasure-huntai', name: '混元胎', stackable: false },
]

export const itemNameMap = Object.fromEntries(itemDefinitions.map((item) => [item.id, item.name]))

export function getRandomNpcName(rng: () => number) {
  return questNpcNames[Math.floor(rng() * questNpcNames.length)]
}
