/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from "react";
import { Contestant, WeightLog, LeaderboardRow, PRESET_AVATARS } from "../types";
import { 
  Trophy, ArrowUp, ArrowDown, Minus, Info, Flame, Target, Dumbbell,
  Shield, ShieldCheck, Unlock, Lock, Eye, EyeOff 
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

const getAvatarConfig = (avatarKey?: string) => {
  const defaultAva = { emoji: "👤", color: "#e2e8f0", title: "研究探索者" };
  if (!avatarKey) return defaultAva;
  return PRESET_AVATARS.find(a => a.id === avatarKey) || defaultAva;
};

interface LeaderboardProps {
  contestants: Contestant[];
  logs: WeightLog[];
  isAdminMode?: boolean;
}

export default function Leaderboard({ contestants, logs, isAdminMode = false }: LeaderboardProps) {
  // Privacy is strictly enabled to protect raw metrics from unauthorized public disclosure
  const isPrivacyActive = true;
  const leaderboardData = useMemo(() => {
    // Determine the reference "today" date based on the latest log date or actual date
    const todayStr = "2026-06-11"; // Baseline from metadata
    let latestLogDate = new Date(todayStr);
    
    logs.forEach(log => {
      const d = new Date(log.date);
      if (d > latestLogDate) {
        latestLogDate = d;
      }
    });

    // Helper to get start of calendar week (Monday)
    const getStartOfWeek = (d: Date) => {
      const date = new Date(d);
      const day = date.getDay();
      const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday (0) to get Monday
      const start = new Date(date.setDate(diff));
      start.setHours(0, 0, 0, 0);
      return start;
    };

    const anchorDate = latestLogDate;
    const thisWeekStart = getStartOfWeek(anchorDate);
    const lastWeekStart = new Date(thisWeekStart.getTime() - 7 * 24 * 60 * 60 * 1000);
    const lastWeekEnd = new Date(thisWeekStart.getTime() - 1);

    const rows: LeaderboardRow[] = contestants.map(c => {
      // Find all logs for this contestant sorted by date + time
      const cLogs = logs
        .filter(l => l.contestantId === c.id)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime() || 
                        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

      const latestLog = cLogs.length > 0 ? cLogs[cLogs.length - 1] : null;

      // Deltas relative to initial configuration
      let weightDelta = 0;
      let bodyFatDelta = 0;
      let muscleDelta = 0;

      let weightZ = 0;
      let bodyFatZ = 0;
      let muscleZ = 0;

      let totalScore = 0;

      if (latestLog) {
        weightDelta = latestLog.weight - c.initialWeight;
        bodyFatDelta = latestLog.bodyFat - c.initialBodyFat;
        muscleDelta = latestLog.muscle - c.initialMuscle;

        // Weight loss is positive for Z: ((Initial - Current)/Initial)*100
        weightZ = ((c.initialWeight - latestLog.weight) / c.initialWeight) * 100;
        // Body fat loss is positive for Z: ((Initial - Current)/Initial)*100
        bodyFatZ = ((c.initialBodyFat - latestLog.bodyFat) / c.initialBodyFat) * 100;
        // Muscle gain is positive for Z: ((Current - Initial)/Initial)*100
        muscleZ = ((latestLog.muscle - c.initialMuscle) / c.initialMuscle) * 100;

        // Score = (bodyFatZ * 0.5) + (muscleZ * 0.3) + (weightZ * 0.2)
        totalScore = (bodyFatZ * 0.5) + (muscleZ * 0.3) + (weightZ * 0.2);
      }

      // Calculate last week's score for weekly delta
      // Find the latest record prior to this week (i.e. before lastWeekEnd)
      const logsBeforeThisWeek = cLogs.filter(l => new Date(l.date) <= lastWeekEnd);
      let lastWeekScore = 0;

      if (logsBeforeThisWeek.length > 0) {
        const lastWeekLatestLog = logsBeforeThisWeek[logsBeforeThisWeek.length - 1];
        
        const prevWeightZ = ((c.initialWeight - lastWeekLatestLog.weight) / c.initialWeight) * 100;
        const prevBodyFatZ = ((c.initialBodyFat - lastWeekLatestLog.bodyFat) / c.initialBodyFat) * 100;
        const prevMuscleZ = ((lastWeekLatestLog.muscle - c.initialMuscle) / c.initialMuscle) * 100;

        lastWeekScore = (prevBodyFatZ * 0.5) + (prevMuscleZ * 0.3) + (prevWeightZ * 0.2);
      }

      // If they had no logs before this week, their initial score is 0,
      // so if they made logs this week, the delta is Current - 0.
      const weeklyScoreDelta = totalScore - lastWeekScore;

      return {
        rank: 0, // Assigned later
        contestant: c,
        latestLog,
        weightDelta,
        bodyFatDelta,
        muscleDelta,
        weightZ,
        bodyFatZ,
        muscleZ,
        totalScore,
        weeklyScoreDelta
      };
    });

    // Sort descending by score. If tied, sort by weight loss percentage (weightZ)
    rows.sort((a, b) => b.totalScore - a.totalScore || b.weightZ - a.weightZ);

    // Assign ranks
    rows.forEach((row, idx) => {
      row.rank = idx + 1;
    });

    return rows;
  }, [contestants, logs]);

  // Top 3 contestants for the podium display
  const topThree = useMemo(() => {
    return leaderboardData.slice(0, 3);
  }, [leaderboardData]);

  const formatDelta = (value: number, unit: string, isBonusGreen: boolean = true) => {
    if (value === 0) return <span className="text-gray-400 font-medium font-mono">-</span>;
    
    // Determine colors
    // weight loss is good -> value < 0 is good (green)
    // body fat loss is good -> value < 0 is good (green)
    // muscle gain is good -> value > 0 is good (green)
    // score gain is good -> value > 0 is good (green)
    const isGood = isBonusGreen ? value > 0 : value < 0;
    const sign = value > 0 ? "+" : "";
    const colorClass = isGood ? "text-emerald-600 font-semibold" : "text-rose-500 font-semibold";
    const Icon = isGood ? ArrowUp : ArrowDown;

    return (
      <div className={`flex items-center gap-0.5 justify-center ${colorClass}`}>
        <Icon className="w-3.5 h-3.5 inline" />
        <span className="font-mono">{sign}{value.toFixed(1)}{unit}</span>
      </div>
    );
  };

  const formatPodiumDelta = (value: number, unit: string, isBonusGreen: boolean = true) => {
    if (value === 0) return <span className="text-gray-400 font-mono">-</span>;
    const isGood = isBonusGreen ? value > 0 : value < 0;
    const sign = value > 0 ? "+" : "";
    const colorClass = isGood ? "text-emerald-600 font-bold" : "text-rose-500 font-bold";
    const Icon = isGood ? ArrowUp : ArrowDown;

    return (
      <span className={`inline-flex items-center gap-0.5 font-mono ${colorClass}`}>
        <Icon className="w-3 h-3 shrink-0" />
        {sign}{value.toFixed(1)}{unit}
      </span>
    );
  };

  const getRankBadgeClass = (rank: number) => {
    switch (rank) {
      case 1:
        return "bg-amber-100 text-amber-800 border-amber-300 ring-4 ring-amber-50";
      case 2:
        return "bg-slate-100 text-slate-800 border-slate-300 ring-4 ring-slate-50";
      case 3:
        return "bg-orange-100 text-orange-800 border-orange-200 ring-4 ring-orange-50";
      default:
        return "bg-gray-100 text-gray-600 border-gray-200";
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="w-5 h-5 text-amber-500 fill-amber-300" />;
      case 2:
        return <Trophy className="w-5 h-5 text-slate-400 fill-slate-200" />;
      case 3:
        return <Trophy className="w-5 h-5 text-orange-400 fill-orange-200" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-8" id="live-leaderboard">
      {/* Overview Intro Banner */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-4 sm:p-5 border border-blue-100/50 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1 my-auto">
          <h2 className="text-base sm:text-lg font-black text-slate-800 flex items-center gap-1.5 flex-wrap">
            <Flame className="w-5 h-5 text-orange-500 fill-orange-100 animate-pulse shrink-0" />
            <span>減肥大賽即時排行榜 🏆</span>
            <span className="text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded-full font-bold flex items-center gap-0.5 shadow-xs shrink-0">
              <Shield className="w-3 h-3 text-emerald-600 shrink-0" /> 隱私防護模式
            </span>
          </h2>
          <p className="text-[11px] sm:text-xs text-slate-500 font-medium">
            🔒 基於個人隱私防護，排行榜僅公開體態積分、本週加減與相對自身初始時的相對變化量，絕不公開任何人的原始體重或體脂等絕對數字。
          </p>
        </div>

        {/* Legend indicators */}
        <div className="flex flex-wrap gap-2 text-[10px] sm:text-xs text-slate-500 bg-white/60 p-2 sm:px-3 sm:py-2 rounded-xl border border-slate-100 shrink-0 w-max">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-sky-500 rounded-full"></div>
            <span>體重 20%</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-rose-500 rounded-full"></div>
            <span>體脂 50%</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
            <span>肌肉 30%</span>
          </div>
        </div>
      </div>

      {/* Top 3 Podium Visualizer */}
      {topThree.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 pt-2 pb-2">
          {/* Rank 2 */}
          {topThree[1] && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="bg-white rounded-2xl p-4 sm:p-5 md:p-6 border border-slate-100 shadow-sm flex flex-col items-center justify-between relative overflow-hidden order-2 md:order-1"
            >
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-slate-400"></div>
              <div className="flex flex-col items-center">
                <span className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-bold text-base sm:text-lg bg-slate-100 text-slate-700 border border-slate-300 ring-4 ring-slate-50 mb-3">2</span>
                
                {/* Animal Avatar Profile Badges */}
                <div 
                  className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl flex items-center justify-center text-2xl sm:text-3xl border-2 border-[#ebdcb9] shadow-sm mb-2 sm:mb-3 select-none animate-pulse"
                  style={{ backgroundColor: getAvatarConfig(topThree[1].contestant.avatar).color }}
                  title={getAvatarConfig(topThree[1].contestant.avatar).title}
                >
                  {getAvatarConfig(topThree[1].contestant.avatar).emoji}
                </div>

                <h3 className="font-extrabold text-base sm:text-lg text-slate-800">{topThree[1].contestant.name}</h3>
                <p className="text-[10px] sm:text-xs text-slate-450 text-slate-400 mt-1">目前分數</p>
                <div className="text-xl sm:text-2xl font-black text-slate-700 font-mono mt-0.5">
                  {topThree[1].totalScore.toFixed(2)}
                </div>
              </div>
              <div className="w-full mt-4 pt-3.5 border-t border-slate-100 grid grid-cols-3 gap-1 text-center text-[10px] sm:text-xs">
                <div>
                  <p className="text-slate-400 mb-0.5">體重增減</p>
                  <p className="font-semibold font-mono text-slate-700 text-xs">
                    {topThree[1].latestLog ? formatPodiumDelta(topThree[1].weightDelta, "kg", false) : "-"}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400 mb-0.5">體脂增減</p>
                  <p className="font-semibold font-mono text-slate-700 text-xs">
                    {topThree[1].latestLog ? formatPodiumDelta(topThree[1].bodyFatDelta, "%", false) : "-"}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400 mb-0.5">肌肉增減</p>
                  <p className="font-semibold font-mono text-slate-700 text-xs">
                    {topThree[1].latestLog ? formatPodiumDelta(topThree[1].muscleDelta, "%", true) : "-"}
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Rank 1 */}
          {topThree[0] && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="bg-white rounded-2xl p-5 sm:p-6 md:p-8 border-2 border-amber-200/80 shadow-md flex flex-col items-center justify-between relative overflow-hidden order-1 md:order-2 md:-translate-y-2 ring-8 ring-amber-50/30"
            >
              <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-amber-400 to-yellow-300"></div>
              <div className="absolute -right-6 -top-6 w-14 h-14 sm:w-16 sm:h-16 bg-amber-50 rounded-full flex items-center justify-center rotate-12">
                <Trophy className="w-7 h-7 sm:w-8 sm:h-8 text-amber-405/40 text-amber-500 fill-amber-100" />
              </div>
              
              <div className="flex flex-col items-center">
                <span className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center font-bold text-lg sm:text-xl bg-amber-100 text-amber-805 text-amber-800 border-2 border-amber-300 ring-4 ring-amber-100/55 mb-2.5 sm:mb-3 animate-bounce">
                  1
                </span>

                {/* Large Animal Avatar */}
                <div 
                  className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl flex items-center justify-center text-3xl sm:text-4xl border-2 border-amber-300 shadow-sm mb-2 sm:mb-3 select-none"
                  style={{ backgroundColor: getAvatarConfig(topThree[0].contestant.avatar).color }}
                  title={getAvatarConfig(topThree[0].contestant.avatar).title}
                >
                  {getAvatarConfig(topThree[0].contestant.avatar).emoji}
                </div>

                <h3 className="font-black text-lg sm:text-xl text-slate-900 flex items-center gap-1.5">
                  {topThree[0].contestant.name}
                </h3>
                <p className="text-[10px] text-amber-800 font-bold bg-amber-50 border border-amber-200/50 px-2 py-0.5 rounded-full mt-1.5">島上究極學霸 💪</p>
                <p className="text-[10px] sm:text-xs text-slate-450 text-slate-400 mt-2">目前分數</p>
                <div className="text-3xl sm:text-4xl font-black text-amber-500 font-mono mt-0.5">
                  {topThree[0].totalScore.toFixed(2)}
                </div>
              </div>
              <div className="w-full mt-5 pt-4 border-t border-slate-100 grid grid-cols-3 gap-1 text-center text-[10px] sm:text-xs">
                <div>
                  <p className="text-slate-400 mb-0.5">體重增減</p>
                  <p className="font-bold font-mono text-slate-800 text-xs sm:text-sm">
                    {topThree[0].latestLog ? formatPodiumDelta(topThree[0].weightDelta, "kg", false) : "-"}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400 mb-0.5">體脂增減</p>
                  <p className="font-bold font-mono text-slate-800 text-xs sm:text-sm">
                    {topThree[0].latestLog ? formatPodiumDelta(topThree[0].bodyFatDelta, "%", false) : "-"}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400 mb-0.5">肌肉增減</p>
                  <p className="font-bold font-mono text-slate-800 text-xs sm:text-sm">
                    {topThree[0].latestLog ? formatPodiumDelta(topThree[0].muscleDelta, "%", true) : "-"}
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Rank 3 */}
          {topThree[2] && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="bg-white rounded-2xl p-4 sm:p-5 md:p-6 border border-slate-100 shadow-sm flex flex-col items-center justify-between relative overflow-hidden order-3"
            >
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-orange-400"></div>
              <div className="flex flex-col items-center">
                <span className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-bold text-base sm:text-lg bg-orange-50 text-orange-850 border border-orange-200 ring-4 ring-orange-100 mb-3">3</span>
                
                {/* Animal Avatar Profile Badges */}
                <div 
                  className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl flex items-center justify-center text-2xl sm:text-3xl border-2 border-[#ebdcb9] shadow-sm mb-2 sm:mb-3 select-none"
                  style={{ backgroundColor: getAvatarConfig(topThree[2].contestant.avatar).color }}
                  title={getAvatarConfig(topThree[2].contestant.avatar).title}
                >
                  {getAvatarConfig(topThree[2].contestant.avatar).emoji}
                </div>

                <h3 className="font-extrabold text-base sm:text-lg text-slate-800">{topThree[2].contestant.name}</h3>
                <p className="text-[10px] sm:text-xs text-slate-450 text-slate-400 mt-1">目前分數</p>
                <div className="text-xl sm:text-2xl font-black text-orange-600 font-mono mt-0.5">
                  {topThree[2].totalScore.toFixed(2)}
                </div>
              </div>
              <div className="w-full mt-4 pt-3.5 border-t border-slate-100 grid grid-cols-3 gap-1 text-center text-[10px] sm:text-xs">
                <div>
                  <p className="text-slate-400 mb-0.5">體重增減</p>
                  <p className="font-semibold font-mono text-slate-700 text-xs">
                    {topThree[2].latestLog ? formatPodiumDelta(topThree[2].weightDelta, "kg", false) : "-"}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400 mb-0.5">體脂增減</p>
                  <p className="font-semibold font-mono text-slate-700 text-xs">
                    {topThree[2].latestLog ? formatPodiumDelta(topThree[2].bodyFatDelta, "%", false) : "-"}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400 mb-0.5">肌肉增減</p>
                  <p className="font-semibold font-mono text-slate-700 text-xs">
                    {topThree[2].latestLog ? formatPodiumDelta(topThree[2].muscleDelta, "%", true) : "-"}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      )}

      {/* Full Leaderboard Table Card */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xl overflow-hidden">
        <div className="overflow-x-auto min-w-full">
          <table className="min-w-full divide-y divide-slate-100 text-left text-xs sm:text-sm">
            <thead className="bg-slate-50 text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider text-center">
              <tr>
                <th scope="col" className="px-2 py-3 sm:px-4 sm:py-4 w-12 sm:w-16">名次</th>
                <th scope="col" className="px-3 py-3 sm:px-6 sm:py-4 text-left">參賽成員</th>
                <th scope="col" className="px-2 py-3 sm:px-4 sm:py-4 w-20 sm:w-28">當前總分數</th>
                <th scope="col" className="px-2 py-3 sm:px-4 sm:py-4 w-24 sm:w-32">本週加減分<br/><span className="text-[9px] text-slate-400 italic">(與上週比)</span></th>
                <th scope="col" className="px-2 py-3 sm:px-4 sm:py-4">體重增減<br/><span className="text-[9px] text-slate-400 italic">(對比初始)</span></th>
                <th scope="col" className="px-2 py-3 sm:px-4 sm:py-4">體脂率增減<br/><span className="text-[9px] text-slate-400 italic">(對比初始)</span></th>
                <th scope="col" className="px-2 py-3 sm:px-4 sm:py-4">肌肉率增減<br/><span className="text-[9px] text-slate-400 italic">(對比初始)</span></th>
                <th scope="col" className="px-3 py-3 sm:px-6 sm:py-4 text-right w-24 sm:w-36">申報日期/狀態</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-600 text-center">
              {leaderboardData.map((row) => {
                const isTop3 = row.rank <= 3;
                return (
                  <tr 
                    key={row.contestant.id} 
                    className={`hover:bg-slate-50/80 transition-colors ${
                      isTop3 ? "bg-slate-50/20 font-medium" : ""
                    }`}
                  >
                    {/* Rank */}
                    <td className="px-2 py-4 sm:py-5">
                      <div className="flex justify-center items-center gap-1">
                        {getRankIcon(row.rank)}
                        <span className={`inline-block w-5 h-5 sm:w-6 sm:h-6 rounded-full text-[11px] sm:text-xs font-bold flex items-center justify-center border ${getRankBadgeClass(row.rank)}`}>
                          {row.rank}
                        </span>
                      </div>
                    </td>

                    {/* Name */}
                    <td className="px-3 py-4 sm:py-5 text-left font-bold text-slate-800">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div 
                          className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center text-lg sm:text-xl shrink-0 border-2 border-[#ebdcb9] shadow-sm font-semibold select-none" 
                          style={{ backgroundColor: getAvatarConfig(row.contestant.avatar).color }}
                          title={getAvatarConfig(row.contestant.avatar).title}
                        >
                          {getAvatarConfig(row.contestant.avatar).emoji}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs sm:text-sm truncate">{row.contestant.name}</span>
                          <span className="text-[10px] text-slate-400 font-medium mt-0.5 truncate max-w-[80px] sm:max-w-none">
                            {getAvatarConfig(row.contestant.avatar).title}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Total Score */}
                    <td className="px-2 py-4 sm:py-5">
                      <span className={`text-sm sm:text-base font-black font-mono ${
                        isTop3 ? "text-indigo-600" : "text-slate-700"
                      }`}>
                        {row.totalScore.toFixed(2)}
                      </span>
                    </td>

                    {/* Weekly Score Delta */}
                    <td className="px-2 py-4 sm:py-5 text-xs">
                      {formatDelta(row.weeklyScoreDelta, "", true)}
                    </td>

                    {/* Weight Delta */}
                    <td className="px-2 py-4 sm:py-5 text-xs">
                      {formatDelta(row.weightDelta, "kg", false)}
                    </td>

                    {/* Body Fat Delta */}
                    <td className="px-2 py-4 sm:py-5 text-xs">
                      {formatDelta(row.bodyFatDelta, "%", false)}
                    </td>

                    {/* Muscle Delta */}
                    <td className="px-2 py-4 sm:py-5 text-xs">
                      {formatDelta(row.muscleDelta, "%", true)}
                    </td>

                    {/* Current Stats / Privacy Badge */}
                    <td className="px-3 py-4 sm:py-5 text-right text-xs font-sans">
                      {row.latestLog ? (
                        <div className="flex flex-col items-end gap-0.5">
                          <span className="text-emerald-700 font-extrabold text-[10px] sm:text-[11px] bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 sm:px-2 rounded-lg flex items-center gap-0.5 w-max">
                            <ShieldCheck className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
                            已安全
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium hidden sm:inline">
                            持續累積中 🚀
                          </span>
                          <span className="text-[9px] text-slate-450 text-slate-400/75 font-mono">
                            {row.latestLog.date}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">尚未上報</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dynamic Instruction panel for formula */}
      <div className="bg-slate-50 rounded-2xl p-4 sm:p-5 border border-slate-200/50 flex gap-3 text-xs text-slate-500 shadow-sm leading-relaxed">
        <Info className="w-4.5 h-4.5 text-blue-500 shrink-0 mt-0.5" />
        <div className="space-y-1.5">
          <p className="font-bold text-slate-700">✍️ 減重競賽規則與評分標準說明：</p>
          <ul className="list-disc pl-4 space-y-1">
            <li><strong>分數公式</strong>：<code className="bg-slate-200 px-1 py-0.5 rounded text-amber-700 font-mono font-semibold">分數 = (體脂變化率Z * 0.5) + (肌肉變化率Z * 0.3) + (體重變化率Z * 0.2)</code>。分數越高代表鍛鍊體態的綜合成效越佳。</li>
            <li><strong>指標定義中的 Z (變化率 %)</strong>：</li>
            <ul className="list-circle pl-4 space-y-0.5">
              <li>體重變化率Z = <code className="bg-slate-200 px-0.5 rounded">((初始體重 - 當前體重) / 初始體重) * 100</code> (體重降低，Z 為正值)</li>
              <li>體脂變化率Z = <code className="bg-slate-200 px-0.5 rounded">((初始體脂 - 當前體脂) / 初始體脂) * 100</code> (體脂降低，Z 為正值)</li>
              <li>肌肉變化率Z = <code className="bg-slate-200 px-0.5 rounded">((當前肌肉 - 初始肌肉) / 初始肌肉) * 100</code> (肌肉增加，Z 為正值)</li>
            </ul>
            <li><strong>本週加減分</strong> 代表參賽者「本週最新申報成績」相較於「上週最新申報成績」的分數淨增減。這能清晰反映出大家近 7 天是否認真控制飲食與運動！</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
