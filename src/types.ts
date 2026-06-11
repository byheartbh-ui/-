/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Contestant {
  id: string;
  name: string;
  password: string; // 4-digit code
  initialWeight: number; // in kg
  initialBodyFat: number; // in %
  initialMuscle: number; // in %
  avatar?: string; // key of PRESET_AVATARS or emoji/url
}

export interface PresetAvatar {
  id: string;
  emoji: string;
  name: string;
  color: string;
  title: string;
}

export const PRESET_AVATARS: PresetAvatar[] = [
  { id: "fat_piggy", emoji: "🐷", name: "脂肪守護豬", color: "#ffe4e6", title: "呼吸就會胖的終身戰士 🐽" },
  { id: "bubble_tea_sloth", emoji: "🦥", name: "微糖微冰樹懶", color: "#f5e6d3", title: "嚼珍珠才是高強度有氧 🧋" },
  { id: "excuse_orange_cat", emoji: "🐱", name: "明天再減胖橘", color: "#ffedd5", title: "吃飽才有力氣面對論文 💤" },
  { id: "shaking_kangaroo", emoji: "🦘", name: "深蹲腿抖袋鼠", color: "#fef9c3", title: "做完一組後悔來到這世界 🧗" },
  { id: "heavy_weight_mouse", emoji: "🐹", name: "無情重訓鼠", color: "#faf5ff", title: "推起兩倍體重但超愛偷啃葵瓜子 🌰" },
  { id: "midnight_shiba", emoji: "🐶", name: "夜襲冰箱柴犬", color: "#ffe4e6", title: "夢遊咬住麥克鷄塊 🍟" },
  { id: "ghost_student", emoji: "👻", name: "口試爆肝怨靈", color: "#e2e8f0", title: "體重下降但都是流失的靈魂 💀" },
  { id: "fairy_water", emoji: "🧚", name: "光合作用仙子", color: "#e1ecd8", title: "只喝白開水就能高血糖的奇蹟 💧" },
  { id: "hippo_sweat", emoji: "🦛", name: "汗流浹背河馬", color: "#e0f2fe", title: "跑步機上洗澡的第一人 💦" },
  { id: "shark_interval", emoji: "🦈", name: "間歇跑豹鯊", color: "#dbeafe", title: "瘋狂快跑但還是追不上進度 🏃" },
  { id: "bunny_cardio", emoji: "🐰", name: "心跳兩百兔", color: "#fce7f3", title: "一上踏步機就開啟震動模式 💓" },
  { id: "polar_fatty", emoji: "🐻", name: "極寒囤脂熊", color: "#f1f5f9", title: "抗寒能力點滿 體脂率也點滿 ❄️" }
];

export interface WeightLog {
  id: string;
  contestantId: string;
  date: string; // YYYY-MM-DD
  weight: number; // in kg
  bodyFat: number; // in %
  muscle: number; // in %
  createdAt: string; // ISO datetime string
}

export interface SyncSettings {
  sheetsUrl: string; // Google Apps Script web app URL
  lastSynced: string | null;
}

export interface LeaderboardRow {
  rank: number;
  contestant: Contestant;
  latestLog: WeightLog | null;
  // Progress metrics (Current - Initial)
  weightDelta: number; // kg
  bodyFatDelta: number; // %
  muscleDelta: number; // %
  // Change rates (Z values)
  weightZ: number;
  bodyFatZ: number;
  muscleZ: number;
  // Total Score
  totalScore: number;
  // Week-over-week score delta
  weeklyScoreDelta: number; // current week score minus last week score
}
