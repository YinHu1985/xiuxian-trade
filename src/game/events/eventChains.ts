import type { StoryEvent } from '@/game/types'

const base = import.meta.env.BASE_URL
const characterPortraitUrl = `${base}images/portraits/char-01.webp`

export const eventChains: StoryEvent[] = [
  // ════════════════════════════════════════════
  // Chain A: 古修洞府
  // ════════════════════════════════════════════

  // ── A1: 酒馆传闻 ──
  {
    id: 'chain_a_rumor',
    trigger: 'arrive',
    condition: { randomChance: 0.2, flagsBlocked: ['chain_a_started'], excludeStartingNode: true },
    priority: 25,
    repeatable: false,
    steps: [
      {
        mode: 'portrait-right',
        characterName: '独眼老修',
        portraitUrl: characterPortraitUrl,
        content: '嘿，新来的。知道千年前那位"阵魔"白眉真人吗？他的洞府就在这片区域，里面好东西可不少。',
      },
      {
        mode: 'portrait-left',
        characterName: '会长',
        portraitUrl: characterPortraitUrl,
        content: '空口无凭，我怎么知道你说的是真是假？',
      },
      {
        mode: 'portrait-right',
        characterName: '老修',
        portraitUrl: characterPortraitUrl,
        content: '（拍了拍桌上的半张兽皮图）老夫有半张地图，另一半在一处遗迹里。八十灵石，图你拿去——信不信由你。',
      },
      {
        content: '你决定怎么做？',
        choices: [
          {
            label: '买了',
            effects: [
              { type: 'remove_spirit_stone', amount: 80 },
              { type: 'add_item', itemName: '残图·左' },
              { type: 'set_flag', flag: 'chain_a_started' },
            ],
          },
          {
            label: '算了，骗子的把戏',
            effects: [],
          },
        ],
      },
    ],
  },

  // ── A2: 遗迹寻图 ──
  {
    id: 'chain_a_ruin',
    trigger: 'arrive',
    condition: { flagsRequired: ['chain_a_started'], flagsBlocked: ['chain_a_got_right_map'], nodeType: 'ruin' },
    priority: 25,
    repeatable: false,
    steps: [
      {
        mode: 'portrait-right',
        characterName: '探路弟子',
        portraitUrl: characterPortraitUrl,
        content: '会长，这边有发现！一面倒塌的石墙后面好像有暗格。',
      },
      {
        mode: 'portrait-left',
        characterName: '会长',
        portraitUrl: characterPortraitUrl,
        content: '小心点，慢慢打开。',
      },
      {
        content: '你决定怎么做？',
        choices: [
          {
            label: '仔细搜索废墟',
            effects: [
              { type: 'add_item', itemName: '残图·右' },
              { type: 'set_flag', flag: 'chain_a_got_right_map' },
            ],
          },
          {
            label: '用灵力探测地下',
            effects: [
              { type: 'remove_crew', amount: 2 },
              { type: 'add_item', itemName: '残图·右' },
              { type: 'set_flag', flag: 'chain_a_got_right_map' },
            ],
          },
        ],
      },
    ],
  },

  // ── A3: 洞府入口 ──
  {
    id: 'chain_a_entrance',
    trigger: 'arrive',
    condition: { itemsRequired: ['残图·左', '残图·右'], flagsBlocked: ['chain_a_treasure_taken'] },
    priority: 25,
    repeatable: false,
    steps: [
      {
        mode: 'portrait-right',
        characterName: '助理',
        portraitUrl: characterPortraitUrl,
        content: '会长，地图显示就是这里了。但前面有扇大门，上面刻着——"阵道三千，取一瓢饮"。',
      },
      {
        mode: 'portrait-left',
        characterName: '会长',
        portraitUrl: characterPortraitUrl,
        content: '门上三个阵眼。剑气、毒瘴、阵法……各有一道禁制。',
      },
      {
        mode: 'portrait-right',
        characterName: '助理',
        portraitUrl: characterPortraitUrl,
        content: '需要对应的方法来破解。咱们之前买的那些秘制之物，可能正好派上用场。',
      },
      {
        content: '禁制一·剑气',
        choices: [
          {
            label: '用金甲符',
            effects: [{ type: 'remove_item', itemName: '金甲符' }],
          },
          {
            label: '强行突破',
            effects: [{ type: 'remove_crew', amount: 5 }],
          },
        ],
      },
      {
        content: '禁制二·毒瘴',
        choices: [
          {
            label: '用避毒丹',
            effects: [{ type: 'remove_item', itemName: '避毒丹' }],
          },
          {
            label: '闭气强闯',
            effects: [{ type: 'remove_crew', amount: 4 }],
          },
        ],
      },
      {
        content: '禁制三·阵法',
        choices: [
          {
            label: '用破阵珠',
            effects: [{ type: 'remove_item', itemName: '破阵珠' }],
          },
          {
            label: '蛮力破阵',
            effects: [{ type: 'damage_airship', amount: 20 }],
          },
        ],
      },
      {
        mode: 'portrait-right',
        characterName: '',
        portraitUrl: characterPortraitUrl,
        content: '三关已破，大门缓缓打开。石室中端坐着一具枯骨，面前摆着三样东西。',
      },
      {
        content: '你决定怎么做？',
        choices: [
          {
            label: '取走阵道玉简',
            effects: [
              { type: 'add_item', itemName: '破阵珠' },
              { type: 'add_spirit_stone', amount: 300 },
              { type: 'set_flag', flag: 'chain_a_treasure_taken' },
            ],
          },
          {
            label: '取走护身法宝',
            effects: [
              { type: 'add_item', itemName: '金甲符' },
              { type: 'add_spirit_stone', amount: 300 },
              { type: 'set_flag', flag: 'chain_a_treasure_taken' },
            ],
          },

        ],
      },
    ],
  },

  // ════════════════════════════════════════════
  // Chain B: 商会暗战
  // ════════════════════════════════════════════

  // ── B1: 神秘大单 ──
  {
    id: 'chain_b_mystery_order',
    trigger: 'arrive',
    condition: { turnMin: 10, randomChance: 0.15, flagsBlocked: ['chain_b_started'] },
    priority: 25,
    repeatable: false,
    steps: [
      {
        mode: 'portrait-right',
        characterName: '蒙面修士',
        portraitUrl: characterPortraitUrl,
        content: '（递上一封密信）有人托我将此信交给会长。报酬丰厚。',
      },
      {
        mode: 'portrait-left',
        characterName: '会长',
        portraitUrl: characterPortraitUrl,
        content: '（拆信阅读）"高价求购一批高阶灵材，送至偏远据点。双倍市价。"',
      },
      {
        content: '你决定怎么做？',
        choices: [
          {
            label: '接下这单',
            effects: [
              { type: 'set_flag', flag: 'chain_b_started' },
              {
                type: 'add_quest',
                questTitle: '神秘订单·送信',
                questType: 'deliver',
                questDesc: '将密信送至指定据点。',
                questTargetNodeId: '',
                questReward: 500,
                questDifficulty: 2,
                questCompletePrompt: '将密信送达目的地。',
              },
            ],
          },
          {
            label: '太可疑了，婉拒',
            effects: [],
          },
        ],
      },
    ],
  },

  // ── B2: 发现陷阱 ──
  {
    id: 'chain_b_trap',
    trigger: 'quest_complete',
    condition: { flagsRequired: ['chain_b_started'], flagsBlocked: ['chain_b_trap_discovered'] },
    priority: 35,
    repeatable: false,
    steps: [
      {
        mode: 'portrait-right',
        characterName: '敌对商会头目',
        portraitUrl: characterPortraitUrl,
        content: '哈哈哈哈！多谢会长亲自送货上门。这批灵材我们笑纳了——灵石嘛，下次再说。',
      },
      {
        mode: 'portrait-left',
        characterName: '会长',
        portraitUrl: characterPortraitUrl,
        content: '你们这是要明抢？',
      },
      {
        mode: 'portrait-right',
        characterName: '头目',
        portraitUrl: characterPortraitUrl,
        content: '是又怎样？你的人少，打不过我们。识相的，自己走。',
      },
      {
        content: '你决定怎么做？',
        choices: [
          {
            label: '翻脸，抢回货物',
            effects: [{ type: 'set_flag', flag: 'chain_b_trap_discovered' }],
          },
          {
            label: '忍了，日后再算账',
            effects: [
              { type: 'remove_spirit_stone', amount: 300 },
            ],
          },
        ],
      },
    ],
  },

  // ── B3: 搜集证据 ──
  {
    id: 'chain_b_evidence',
    trigger: 'arrive',
    condition: { flagsRequired: ['chain_b_trap_discovered'], flagsBlocked: ['chain_b_evidence_done'], nodeType: 'town' },
    priority: 25,
    repeatable: false,
    steps: [
      {
        mode: 'portrait-right',
        characterName: '酒馆散修',
        portraitUrl: characterPortraitUrl,
        content: '听说了吗？黑风商会最近手笔大得很。到处收灵材——也不知道哪来那么多灵石。',
      },
      {
        mode: 'portrait-left',
        characterName: '会长',
        portraitUrl: characterPortraitUrl,
        content: '他们可能跟邪修有勾结。你知道什么内情吗？',
      },
      {
        mode: 'portrait-right',
        characterName: '散修',
        portraitUrl: characterPortraitUrl,
        content: '（左右看了看，压低声音）他们在西北某个据点藏了一批违禁品……我亲眼看到的。',
      },
      {
        content: '你决定怎么做？',
        choices: [
          {
            label: '给散修灵石套话',
            effects: [
              { type: 'remove_spirit_stone', amount: 50 },
              { type: 'add_item', itemName: '黑风商会罪证' },
              { type: 'set_flag', flag: 'chain_b_evidence_done' },
            ],
          },
          {
            label: '亲自去那个据点查',
            effects: [
              { type: 'add_item', itemName: '黑风商会罪证' },
              { type: 'set_flag', flag: 'chain_b_evidence_done' },
            ],
          },
        ],
      },
    ],
  },

  // ── B4: 清算 ──
  {
    id: 'chain_b_final',
    trigger: 'arrive',
    condition: { itemsRequired: ['黑风商会罪证'], flagsBlocked: ['chain_b_final_done'] },
    priority: 25,
    repeatable: false,
    steps: [
      {
        mode: 'portrait-right',
        characterName: '城主',
        portraitUrl: characterPortraitUrl,
        content: '（看完证据，脸色一沉）黑风商会竟敢做这等勾当。会长，你立了大功。',
      },
      {
        mode: 'portrait-left',
        characterName: '会长',
        portraitUrl: characterPortraitUrl,
        content: '城主打算怎么处置他们？',
      },
      {
        content: '你决定怎么做？',
        choices: [
          {
            label: '查封黑风商会',
            effects: [
              { type: 'add_spirit_stone', amount: 800 },
              { type: 'add_item', itemName: '混元胎' },
              { type: 'set_flag', flag: 'chain_b_final_done' },
            ],
          },
          {
            label: '收编他们的人手和渠道',
            effects: [
              { type: 'add_spirit_stone', amount: 400 },
              { type: 'add_crew', amount: 8 },
              { type: 'set_flag', flag: 'chain_b_final_done' },
            ],
          },
        ],
      },
    ],
  },

  // ════════════════════════════════════════════
  // Chain C: 仙缘试炼
  // ════════════════════════════════════════════

  // ── C1: 偶得令牌 ──
  {
    id: 'chain_c_token',
    trigger: 'arrive',
    condition: { nodeType: 'ruin', randomChance: 0.15, flagsBlocked: ['chain_c_started'] },
    priority: 25,
    repeatable: false,
    steps: [
      {
        mode: 'portrait-right',
        characterName: '探路弟子',
        portraitUrl: characterPortraitUrl,
        content: '会长！我踢到个硬东西——好像是块玉牌！',
      },
      {
        mode: 'portrait-left',
        characterName: '会长',
        portraitUrl: characterPortraitUrl,
        content: '（接过玉牌，注入灵力）"持此牌者，可入三关试炼。过三关者，得吾衣钵。"',
      },
      {
        content: '你决定怎么做？',
        choices: [
          {
            label: '收好玉牌，准备试炼',
            effects: [
              { type: 'add_item', itemName: '试炼令牌' },
              { type: 'set_flag', flag: 'chain_c_started' },
            ],
          },
          {
            label: '先放放，以后再说',
            effects: [],
          },
        ],
      },
    ],
  },

  // ── C2: 剑道关 ──
  {
    id: 'chain_c_trial_1',
    trigger: 'arrive',
    condition: { flagsRequired: ['chain_c_started'], itemsRequired: ['试炼令牌'], flagsBlocked: ['chain_c_trial_1_done'] },
    priority: 25,
    repeatable: false,
    steps: [
      {
        mode: 'portrait-right',
        characterName: '助理',
        portraitUrl: characterPortraitUrl,
        content: '玉牌把我们引到了这处山谷。谷口立了块碑——"剑者，心之锋也"。谷中剑气纵横。',
      },
      {
        mode: 'portrait-left',
        characterName: '会长',
        portraitUrl: characterPortraitUrl,
        content: '要穿过这片剑阵才能拿到传承。大家有什么办法？',
      },
      {
        content: '你决定怎么做？',
        choices: [
          {
            label: '用金甲符硬闯',
            effects: [
              { type: 'remove_item', itemName: '金甲符' },
            ],
          },
          {
            label: '以力破阵',
            effects: [
              { type: 'remove_crew', amount: 10 },
            ],
          },
          {
            label: '坐下感悟剑意',
            effects: [{ type: 'set_flag', flag: 'chain_c_trial_1_done' }],
          },
        ],
      },
    ],
  },

  // ── C3: 丹心关 ──
  {
    id: 'chain_c_trial_2',
    trigger: 'arrive',
    condition: { flagsRequired: ['chain_c_trial_1_done'], itemsRequired: ['试炼令牌'], flagsBlocked: ['chain_c_trial_2_done'] },
    priority: 25,
    repeatable: false,
    steps: [
      {
        mode: 'portrait-right',
        characterName: '村民',
        portraitUrl: characterPortraitUrl,
        content: '您是商会会长吧？镇外那间废弃丹房一直闹怪事。听说里面有个丹炉，炉火自己烧了几百年都没灭……',
      },
      {
        mode: 'portrait-left',
        characterName: '会长',
        portraitUrl: characterPortraitUrl,
        content:
          '（来到丹房。丹炉上刻着："丹者，心之火也。济世为怀，方得真丹。"）',
      },
      {
        content: '你决定怎么做？',
        choices: [
          {
            label: '用避毒丹中和丹毒',
            effects: [
              { type: 'remove_item', itemName: '避毒丹' },
            ],
          },
          {
            label: '灵石催动地火强炼',
            effects: [
              { type: 'remove_spirit_stone', amount: 120 },
            ],
          },
          {
            label: '将灵材分给镇上病人',
            effects: [
              { type: 'remove_spirit_stone', amount: 100 },
              { type: 'set_flag', flag: 'chain_c_trial_2_done' },
            ],
          },
        ],
      },
    ],
  },

  // ── C4: 阵道关 ──
  {
    id: 'chain_c_trial_3',
    trigger: 'arrive',
    condition: { flagsRequired: ['chain_c_trial_2_done'], itemsRequired: ['试炼令牌'], flagsBlocked: ['chain_c_trial_3_done'] },
    priority: 25,
    repeatable: false,
    steps: [
      {
        mode: 'portrait-right',
        characterName: '助理',
        portraitUrl: characterPortraitUrl,
        content: '好大一片石林！这些石头的排列……是天然形成的幻阵。',
      },
      {
        mode: 'portrait-left',
        characterName: '会长',
        portraitUrl: characterPortraitUrl,
        content: '用破阵珠，还是……等等，这块石头的纹路我好像在哪见过。',
      },
      {
        content: '你决定怎么做？',
        choices: [
          {
            label: '用破阵珠开路',
            effects: [
              { type: 'remove_item', itemName: '破阵珠' },
            ],
          },
          {
            label: '让人摸着肩膀走',
            effects: [
              { type: 'remove_crew', amount: 3 },
              { type: 'set_flag', flag: 'chain_c_trial_3_done' },
            ],
          },
        ],
      },
    ],
  },

  // ── C5: 获得传承 ──
  {
    id: 'chain_c_final',
    trigger: 'arrive',
    condition: {
      flagsRequired: ['chain_c_trial_1_done', 'chain_c_trial_2_done', 'chain_c_trial_3_done'],
      flagsBlocked: ['chain_c_final_done'],
    },
    priority: 25,
    repeatable: false,
    steps: [
      {
        mode: 'portrait-right',
        characterName: '白须老者（虚影）',
        portraitUrl: characterPortraitUrl,
        content: '三关试炼皆过。心性、智慧、毅力，你都具备了。老夫毕生所学，今托付于你。三道灵光没入你眉心。',
      },
      {
        content: '你决定怎么做？',
        choices: [
          {
            label: '接受剑道传承',
            effects: [
              { type: 'add_crew', amount: 20 },
              { type: 'set_flag', flag: 'chain_c_final_done' },
            ],
          },
          {
            label: '接受丹道传承',
            effects: [
              { type: 'add_spirit_stone', amount: 800 },
              { type: 'set_flag', flag: 'chain_c_final_done' },
            ],
          },

        ],
      },
    ],
  },

  // ════════════════════════════════════════════
  // Chain D: 遗迹秘藏
  // ════════════════════════════════════════════

  // ── D1: 发现秘藏 ──
  {
    id: 'chain_d_secret_vault',
    trigger: 'arrive',
    condition: { nodeType: 'ruin', randomChance: 0.2, flagsBlocked: ['chain_d_vault_discovered'] },
    priority: 25,
    repeatable: false,
    steps: [
      {
        mode: 'portrait-right',
        characterName: '探路弟子',
        portraitUrl: characterPortraitUrl,
        content: '会长！这面石壁上有符文！中间还有个凹槽，好像是放什么东西的。',
      },
      {
        mode: 'portrait-left',
        characterName: '会长',
        portraitUrl: characterPortraitUrl,
        content: '（仔细观察凹槽）嗯，这形状……似乎在哪里见过类似的东西。先记下来，以后有缘再来。',
      },
      {
        content: '你决定怎么做？',
        choices: [
          {
            label: '记下凹槽形状和符文排列',
            effects: [{ type: 'set_flag', flag: 'chain_d_vault_discovered' }],
          },
          {
            label: '用灵力强行轰开',
            effects: [
              { type: 'remove_crew', amount: 5 },
              { type: 'add_spirit_stone', amount: 80 },
              { type: 'set_flag', flag: 'chain_d_vault_smashed' },
            ],
          },
        ],
      },
    ],
  },

  // ── D2: 开启秘藏 ──
  {
    id: 'chain_d_open_vault',
    trigger: 'arrive',
    condition: { flagsRequired: ['chain_d_vault_discovered'], flagsBlocked: ['chain_d_vault_smashed', 'chain_d_opened'] },
    priority: 25,
    repeatable: false,
    steps: [
      {
        mode: 'portrait-left',
        characterName: '会长',
        portraitUrl: characterPortraitUrl,
        content: '就是这个凹槽。我身上的这件东西……（将物品嵌入凹槽）正好吻合！符文逐一亮起，石壁缓缓打开。',
      },
      {
        mode: 'portrait-right',
        characterName: '助理',
        portraitUrl: characterPortraitUrl,
        content: '恭喜会长！这秘藏中的东西，足够咱们商会再上一层楼了！',
      },
      {
        content: '你决定怎么做？',
        choices: [
          {
            label: '进入秘藏',
            effects: [
              { type: 'add_spirit_stone', amount: 400 },
              { type: 'add_item', itemName: '混元胎' },
              { type: 'set_flag', flag: 'chain_d_opened' },
            ],
          },
        ],
      },
    ],
  },
]
