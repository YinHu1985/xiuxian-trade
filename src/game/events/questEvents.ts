import type { StoryEvent } from '@/game/types'

const base = import.meta.env.BASE_URL
const characterPortraitUrl = `${base}images/portraits/char-01.webp`

/**
 * 任务类剧情事件
 * - sect_collection ~ stolen_cargo：各地触发的任务类事件
 */
export const questEvents: StoryEvent[] = [
  // ── 1. 宗门灵材搜集 ──
  {
    id: 'sect_collection',
    title: '宗门灵材搜集',
    trigger: 'arrive',
    condition: { nodeType: 'sect', randomChance: 0.3 },
    priority: 25,
    repeatable: false,
    steps: [
      {
        mode: 'portrait-right',
        characterName: '执事弟子',
        portraitUrl: characterPortraitUrl,
        content:
          '会长来得正好！本门正在炼制一批丹药，急需一味灵材。听说贵商会路子广，想托您帮忙寻一寻。',
      },
      {
        mode: 'portrait-left',
        characterName: '会长',
        portraitUrl: characterPortraitUrl,
        content: '什么灵材？说来听听。',
      },
      {
        mode: 'portrait-right',
        characterName: '执事弟子',
        portraitUrl: characterPortraitUrl,
        content: '一批筑基期药材。若能弄到，本门愿出五百灵石收购。不知会长意下如何？',
      },
      {
        content: '你决定怎么做？',
        choices: [
          {
            label: '这单生意我接了',
            effects: [
              {
                type: 'add_quest',
                questTitle: '宗门灵材搜集',
                questType: 'purchase',
                questDesc: '为宗门采购一批筑基期药材。',
                productId: 'herb-foundation',
                questReward: 500,
                questDifficulty: 2,
                questCompletePrompt: '将药材交付宗门执事。',
              },
            ],
          },
          {
            label: '我们主要做符篆生意，丹药这块不熟',
            effects: [],
          },
        ],
      },
    ],
  },

  // ── 2. 遗迹密卷 ──
  {
    id: 'ruin_scroll_quest',
    title: '遗迹密卷',
    trigger: 'arrive',
    condition: { nodeType: 'town', randomChance: 0.2, excludeStartingNode: true },
    priority: 25,
    repeatable: false,
    steps: [
      {
        mode: 'portrait-right',
        characterName: '城主府幕僚',
        portraitUrl: characterPortraitUrl,
        content:
          '会长可曾探索过附近的遗迹？前些日子有探险队带回半卷古修手札，剩下一半据说还在遗迹深处。',
      },
      {
        mode: 'portrait-left',
        characterName: '会长',
        portraitUrl: characterPortraitUrl,
        content: '你想让我找到另外半卷？',
      },
      {
        mode: 'portrait-right',
        characterName: '幕僚',
        portraitUrl: characterPortraitUrl,
        content:
          '正是。城主愿出高价收购——八百灵石，如何？那手札记载的似乎是某种失传的功法。',
      },
      {
        content: '你决定怎么做？',
        choices: [
          {
            label: '接下这个寻物委托',
            effects: [
              {
                type: 'add_quest',
                questTitle: '遗迹密卷',
                questType: 'deliver',
                questDesc: '前往附近遗迹寻找古修手札的另一半。',
                questTargetNodeId: '',
                questReward: 800,
                questDifficulty: 3,
                questCompletePrompt: '将古修手札交付城主府幕僚。',
              },
            ],
          },
          {
            label: '风险不小，得加钱',
            effects: [
              {
                type: 'add_quest',
                questTitle: '遗迹密卷（加价）',
                questType: 'deliver',
                questDesc: '前往附近遗迹寻找古修手札的另一半。',
                questTargetNodeId: '',
                questReward: 1000,
                questDifficulty: 4,
                questCompletePrompt: '将古修手札交付城主府幕僚。',
              },
            ],
          },
        ],
      },
    ],
  },

  // ── 3. 商会比拼 ──
  {
    id: 'guild_rivalry',
    title: '商会比拼',
    trigger: 'arrive',
    condition: { nodeType: 'town', turnMin: 15, excludeStartingNode: true },
    priority: 25,
    repeatable: false,
    steps: [
      {
        mode: 'portrait-right',
        characterName: '管事',
        portraitUrl: characterPortraitUrl,
        content:
          '会长，不好了。对面那家商会在本地设了分号，正在低价收购灵材，抢了我们不少生意。',
      },
      {
        mode: 'portrait-left',
        characterName: '会长',
        portraitUrl: characterPortraitUrl,
        content: '他们货源从哪来的？查到了吗？',
      },
      {
        mode: 'portrait-right',
        characterName: '管事',
        portraitUrl: characterPortraitUrl,
        content:
          '还没查清楚。但要是由着他们这么搞，咱们在本地这半年的功夫就白费了。',
      },
      {
        content: '你决定怎么做？',
        choices: [
          {
            label: '收购一批紧俏货，压回去',
            effects: [
              {
                type: 'add_quest',
                questTitle: '商会比拼·采购',
                questType: 'purchase',
                questDesc: '收购一批紧俏灵材，压住对手。',
                productId: 'ore-golden',
                questReward: 600,
                questDifficulty: 3,
                questCompletePrompt: '将收购的灵材交给管事。',
              },
            ],
          },
          {
            label: '派供奉去打探他们的货源',
            effects: [
              {
                type: 'add_quest',
                questTitle: '商会比拼·打探',
                questType: 'deliver',
                questDesc: '派供奉去打探对手的货源渠道。',
                questTargetNodeId: '',
                questReward: 350,
                questDifficulty: 2,
                questCompletePrompt: '将打探到的情报带回给管事。',
              },
            ],
          },
          {
            label: '不用管，做我们自己的',
            effects: [],
          },
        ],
      },
    ],
  },

  // ── 4. 散修的请求 ──
  {
    id: 'scattered_cultivator_task',
    title: '散修的请求',
    trigger: 'arrive',
    condition: { randomChance: 0.2, excludeStartingNode: true },
    priority: 25,
    repeatable: true,
    steps: [
      {
        mode: 'portrait-right',
        characterName: '年轻散修',
        portraitUrl: characterPortraitUrl,
        content:
          '会长您好！我想委托您一件事……我需要一味炼气药材来突破瓶颈，但实在买不起。',
      },
      {
        mode: 'portrait-left',
        characterName: '会长',
        portraitUrl: characterPortraitUrl,
        content: '你的意思是？',
      },
      {
        mode: 'portrait-right',
        characterName: '散修',
        portraitUrl: characterPortraitUrl,
        content: '若能帮我弄到，我愿意以劳力相报。加入商会效力几年也行！',
      },
      {
        content: '你决定怎么做？',
        choices: [
          {
            label: '这个忙我帮了',
            effects: [
              {
                type: 'add_quest',
                questTitle: '散修的请求',
                questType: 'purchase',
                questDesc: '为散修采购一味炼气药材。',
                productId: 'herb-qi',
                questReward: 150,
                questDifficulty: 1,
                questCompletePrompt: '将药材交给散修。',
              },
            ],
          },
          {
            label: '给你点灵石，自己去买',
            effects: [
              { type: 'remove_spirit_stone', amount: 60 },
            ],
          },
          {
            label: '推荐你去宗门碰碰运气',
            effects: [],
          },
        ],
      },
    ],
  },

  // ── 5. 被劫的货物 ──
  {
    id: 'stolen_cargo',
    title: '被劫的货物',
    trigger: 'arrive',
    condition: { nodeType: 'town', randomChance: 0.15, excludeStartingNode: true },
    priority: 25,
    repeatable: true,
    steps: [
      {
        mode: 'portrait-right',
        characterName: '焦急的商人',
        portraitUrl: characterPortraitUrl,
        content:
          '会长！我的货被人劫了！一群散修抢走了我一批药材，就藏在附近某个据点！',
      },
      {
        mode: 'portrait-left',
        characterName: '会长',
        portraitUrl: characterPortraitUrl,
        content: '你想让我帮你要回来？',
      },
      {
        mode: 'portrait-right',
        characterName: '商人',
        portraitUrl: characterPortraitUrl,
        content:
          '您商会人多势众，肯定有办法。若能追回，我愿意出四百灵石作为酬谢！',
      },
      {
        content: '你决定怎么做？',
        choices: [
          {
            label: '这事我接了',
            effects: [
              {
                type: 'add_quest',
                questTitle: '被劫的货物',
                questType: 'purchase',
                questDesc: '为商人追回被劫的药材。',
                productId: 'herb-foundation',
                questReward: 400,
                questDifficulty: 2,
                questCompletePrompt: '将追回的货物交给商人。',
              },
            ],
          },
          {
            label: '找城主府去，这事儿归他们管',
            effects: [],
          },
        ],
      },
    ],
  },
]

