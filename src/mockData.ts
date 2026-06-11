/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Contestant, WeightLog } from "./types";

export const MOCK_CONTESTANTS: Contestant[] = [
  {
    id: "c1",
    name: "王小明",
    password: "1111",
    initialWeight: 88.0,
    initialBodyFat: 31.5,
    initialMuscle: 32.0,
    avatar: "dom"
  },
  {
    id: "c2",
    name: "林美玲",
    password: "2222",
    initialWeight: 66.5,
    initialBodyFat: 34.8,
    initialMuscle: 25.5,
    avatar: "isabelle"
  },
  {
    id: "c3",
    name: "張家豪",
    password: "3333",
    initialWeight: 95.2,
    initialBodyFat: 32.0,
    initialMuscle: 34.5,
    avatar: "nook"
  },
  {
    id: "c4",
    name: "陳雅婷",
    password: "4444",
    initialWeight: 59.0,
    initialBodyFat: 28.5,
    initialMuscle: 28.0,
    avatar: "celeste"
  },
  {
    id: "c5",
    name: "黃冠宇",
    password: "5555",
    initialWeight: 79.5,
    initialBodyFat: 25.0,
    initialMuscle: 37.5,
    avatar: "raymond"
  },
  {
    id: "c6",
    name: "許志強",
    password: "6666",
    initialWeight: 91.2,
    initialBodyFat: 29.8,
    initialMuscle: 33.0,
    avatar: "blathers"
  }
];

export const MOCK_LOGS: WeightLog[] = [
  // --- 王小明 (c1) ---
  {
    id: "l1_1",
    contestantId: "c1",
    date: "2026-05-20",
    weight: 88.0,
    bodyFat: 31.5,
    muscle: 32.0,
    createdAt: "2026-05-20T08:30:00Z",
  },
  {
    id: "l1_2",
    contestantId: "c1",
    date: "2026-05-27",
    weight: 86.5,
    bodyFat: 30.2,
    muscle: 32.5,
    createdAt: "2026-05-27T08:15:00Z",
  },
  {
    id: "l1_3",
    contestantId: "c1",
    date: "2026-06-03",
    weight: 85.0,
    bodyFat: 28.8,
    muscle: 33.1,
    createdAt: "2026-06-03T07:45:00Z",
  },
  {
    id: "l1_4",
    contestantId: "c1",
    date: "2026-06-10",
    weight: 83.8,
    bodyFat: 27.5,
    muscle: 33.8,
    createdAt: "2026-06-10T08:00:00Z",
  },

  // --- 林美玲 (c2) ---
  {
    id: "l2_1",
    contestantId: "c2",
    date: "2026-05-20",
    weight: 66.5,
    bodyFat: 34.8,
    muscle: 25.5,
    createdAt: "2026-05-20T09:00:00Z",
  },
  {
    id: "l2_2",
    contestantId: "c2",
    date: "2026-05-27",
    weight: 65.2,
    bodyFat: 33.5,
    muscle: 25.8,
    createdAt: "2026-05-27T09:10:00Z",
  },
  {
    id: "l2_3",
    contestantId: "c2",
    date: "2026-06-03",
    weight: 64.0,
    bodyFat: 32.0,
    muscle: 26.2,
    createdAt: "2026-06-03T08:40:00Z",
  },
  {
    id: "l2_4",
    contestantId: "c2",
    date: "2026-06-10",
    weight: 63.1,
    bodyFat: 30.5,
    muscle: 26.8,
    createdAt: "2026-06-10T08:50:00Z",
  },

  // --- 張家豪 (c3) ---
  {
    id: "l3_1",
    contestantId: "c3",
    date: "2026-05-20",
    weight: 95.2,
    bodyFat: 32.0,
    muscle: 34.5,
    createdAt: "2026-05-20T07:10:00Z",
  },
  {
    id: "l3_2",
    contestantId: "c3",
    date: "2026-05-27",
    weight: 94.0,
    bodyFat: 31.0,
    muscle: 35.0,
    createdAt: "2026-05-27T07:20:00Z",
  },
  {
    id: "l3_3",
    contestantId: "c3",
    date: "2026-06-03",
    weight: 93.1,
    bodyFat: 30.2,
    muscle: 35.4,
    createdAt: "2026-06-03T07:15:00Z",
  },
  {
    id: "l3_4",
    contestantId: "c3",
    date: "2026-06-10",
    weight: 92.0,
    bodyFat: 29.0,
    muscle: 36.1,
    createdAt: "2026-06-10T07:05:00Z",
  },

  // --- 陳雅婷 (c4) ---
  {
    id: "l4_1",
    contestantId: "c4",
    date: "2026-05-20",
    weight: 59.0,
    bodyFat: 28.5,
    muscle: 28.0,
    createdAt: "2026-05-20T08:00:00Z",
  },
  {
    id: "l4_2",
    contestantId: "c4",
    date: "2026-05-27",
    weight: 58.5,
    bodyFat: 28.0,
    muscle: 28.2,
    createdAt: "2026-05-27T08:05:00Z",
  },
  {
    id: "l4_3",
    contestantId: "c4",
    date: "2026-06-03",
    weight: 57.8,
    bodyFat: 27.2,
    muscle: 28.5,
    createdAt: "2026-06-03T08:12:00Z",
  },
  {
    id: "l4_4",
    contestantId: "c4",
    date: "2026-06-10",
    weight: 57.1,
    bodyFat: 26.0,
    muscle: 29.1,
    createdAt: "2026-06-10T08:00:00Z",
  },

  // --- 黃冠宇 (c5) ---
  {
    id: "l5_1",
    contestantId: "c5",
    date: "2026-05-20",
    weight: 79.5,
    bodyFat: 25.0,
    muscle: 37.5,
    createdAt: "2026-05-20T06:50:00Z",
  },
  {
    id: "l5_2",
    contestantId: "c5",
    date: "2026-05-27",
    weight: 78.8,
    bodyFat: 24.5,
    muscle: 37.8,
    createdAt: "2026-05-27T06:45:00Z",
  },
  {
    id: "l5_3",
    contestantId: "c5",
    date: "2026-06-03",
    weight: 78.2,
    bodyFat: 23.9,
    muscle: 38.2,
    createdAt: "2026-06-03T06:55:00Z",
  },
  {
    id: "l5_4",
    contestantId: "c5",
    date: "2026-06-10",
    weight: 77.5,
    bodyFat: 23.1,
    muscle: 38.8,
    createdAt: "2026-06-10T07:00:00Z",
  },

  // --- 許志強 (c6) ---
  {
    id: "l6_1",
    contestantId: "c6",
    date: "2026-05-20",
    weight: 91.2,
    bodyFat: 29.8,
    muscle: 33.0,
    createdAt: "2026-05-20T08:20:00Z",
  },
  {
    id: "l6_2",
    contestantId: "c6",
    date: "2026-05-27",
    weight: 90.5,
    bodyFat: 29.3,
    muscle: 33.2,
    createdAt: "2026-05-27T08:25:00Z",
  },
  {
    id: "l6_3",
    contestantId: "c6",
    date: "2026-06-03",
    weight: 89.8,
    bodyFat: 28.8,
    muscle: 33.5,
    createdAt: "2026-06-03T08:15:00Z",
  },
  {
    id: "l6_4",
    contestantId: "c6",
    date: "2026-06-10",
    weight: 89.1,
    bodyFat: 28.0,
    muscle: 34.0,
    createdAt: "2026-06-10T08:10:00Z",
  }
];
