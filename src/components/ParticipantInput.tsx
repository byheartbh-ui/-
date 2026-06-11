/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import { Contestant, WeightLog, PRESET_AVATARS } from "../types";
import { Lock, UserCheck, Scale, Percent, Dumbbell, History, Sparkles, TrendingDown, TrendingUp, Calendar, AlertCircle } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { motion, AnimatePresence } from "motion/react";

interface ParticipantInputProps {
  contestants: Contestant[];
  logs: WeightLog[];
  onAddLog: (newLog: Omit<WeightLog, "id" | "createdAt">) => void;
  onUpdateContestant: (updatedC: Contestant) => void;
}

export default function ParticipantInput({ contestants, logs, onAddLog, onUpdateContestant }: ParticipantInputProps) {
  const [selectedId, setSelectedId] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string>("");
  const [showAvatarSelector, setShowAvatarSelector] = useState<boolean>(false);

  // Form Fields
  const [weight, setWeight] = useState<string>("");
  const [bodyFat, setBodyFat] = useState<string>("");
  const [muscle, setMuscle] = useState<string>("");
  const [date, setDate] = useState<string>(() => {
    // Current local date in Taipei/Asia time YYYY-MM-DD
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  });

  const [submitMessage, setSubmitMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const activeContestant = useMemo(() => {
    return contestants.find(c => c.id === selectedId) || null;
  }, [contestants, selectedId]);

  // Handle Authentication Click
  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setSubmitMessage(null);

    if (!activeContestant) {
      setAuthError("請選擇您的姓名");
      return;
    }

    if (activeContestant.password === password) {
      setIsAuthenticated(true);
      // Autofill values from their latest log if exists
      const userLogs = logs
        .filter(l => l.contestantId === activeContestant.id)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      if (userLogs.length > 0) {
        setWeight(userLogs[0].weight.toString());
        setBodyFat(userLogs[0].bodyFat.toString());
        setMuscle(userLogs[0].muscle.toString());
      } else {
        setWeight(activeContestant.initialWeight.toString());
        setBodyFat(activeContestant.initialBodyFat.toString());
        setMuscle(activeContestant.initialMuscle.toString());
      }
    } else {
      setAuthError("四位數密碼錯誤，請重新輸入");
    }
  };

  // Switch/Logout account
  const handleSignOut = () => {
    setIsAuthenticated(false);
    setPassword("");
    setSubmitMessage(null);
    setShowAvatarSelector(false);
  };

  // Change participant avatar
  const handleChangeMyAvatar = (avatarId: string) => {
    if (!activeContestant) return;
    onUpdateContestant({
      ...activeContestant,
      avatar: avatarId
    });
  };

  // Submit Daily Log Form
  const handleSubmitLog = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitMessage(null);

    const w = parseFloat(weight);
    const f = parseFloat(bodyFat);
    const m = parseFloat(muscle);

    if (isNaN(w) || w <= 0 || w > 300) {
      setSubmitMessage({ type: "error", text: "請輸入有效的體重 (預設 30-300 kg)" });
      return;
    }
    if (isNaN(f) || f <= 0 || f > 100) {
      setSubmitMessage({ type: "error", text: "請輸入有效的體脂率 (預設 1-100 %)" });
      return;
    }
    if (isNaN(m) || m <= 0 || m > 100) {
      setSubmitMessage({ type: "error", text: "請輸入有效的肌肉率 (預設 1-100 %)" });
      return;
    }
    if (!date) {
      setSubmitMessage({ type: "error", text: "請填寫量測日期" });
      return;
    }

    onAddLog({
      contestantId: selectedId,
      date,
      weight: w,
      bodyFat: f,
      muscle: m
    });

    setSubmitMessage({ type: "success", text: "🎉 數據上傳成功！排行榜將即時更新。" });
  };

  // Stats summary for the verified contestant
  const myStats = useMemo(() => {
    if (!activeContestant) return null;

    const userLogs = logs
      .filter(l => l.contestantId === activeContestant.id)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const latest = userLogs.length > 0 ? userLogs[userLogs.length - 1] : null;

    // Weight difference, fat difference, muscle difference
    const weightDiff = latest ? latest.weight - activeContestant.initialWeight : 0;
    const fatDiff = latest ? latest.bodyFat - activeContestant.initialBodyFat : 0;
    const muscleDiff = latest ? latest.muscle - activeContestant.initialMuscle : 0;

    // Z calculations
    const weightZ = latest ? ((activeContestant.initialWeight - latest.weight) / activeContestant.initialWeight) * 100 : 0;
    const fatZ = latest ? ((activeContestant.initialBodyFat - latest.bodyFat) / activeContestant.initialBodyFat) * 100 : 0;
    const muscleZ = latest ? ((latest.muscle - activeContestant.initialMuscle) / activeContestant.initialMuscle) * 100 : 0;

    const score = (fatZ * 0.5) + (muscleZ * 0.3) + (weightZ * 0.2);

    return {
      weightDiff,
      fatDiff,
      muscleDiff,
      score,
      totalEntries: userLogs.length,
      history: userLogs,
      latest
    };
  }, [activeContestant, logs]);

  // format history for charts: Combine initial values and subsequent logs
  const chartData = useMemo(() => {
    if (!activeContestant || !myStats) return [];
    
    // Add initial as the very first entry
    const initialEntry = {
      displayDate: "初始配置",
      weight: activeContestant.initialWeight,
      bodyFat: activeContestant.initialBodyFat,
      muscle: activeContestant.initialMuscle,
    };

    const logEntries = myStats.history.map(h => ({
      displayDate: h.date,
      weight: h.weight,
      bodyFat: h.bodyFat,
      muscle: h.muscle,
    }));

    return [initialEntry, ...logEntries];
  }, [activeContestant, myStats]);

  return (
    <div className="max-w-4xl mx-auto" id="participant-portal">
      <AnimatePresence mode="wait">
        {!isAuthenticated ? (
          /* Authentication Card */
          <motion.div
            key="auth"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="ac-card p-8 max-w-md mx-auto relative overflow-hidden bg-[#fcfaf2] text-[#5d4037]"
          >
            <div className="absolute top-0 left-0 right-0 h-2 bg-[#74be62]"></div>
            
            <div className="flex flex-col items-center text-center space-y-2 mb-6">
              <div className="w-14 h-14 bg-[#eaf5e6] rounded-2xl flex items-center justify-center text-[#74be62] border-2 border-[#ebdcb9] mb-2 shadow-sm">
                <Lock className="w-6 h-6 stroke-[2.5]" />
              </div>
              <h2 className="text-xl font-black text-[#5c3e35] flex items-center gap-1.5">
                島民數據同步裝置 🍃
              </h2>
              <p className="text-xs text-[#a37e72] font-semibold leading-relaxed">
                「狸克：誠實申報今日體組成，口試委員對論文的滿意度才會顯著提升哦！」輸入你的 4 位數逃學密碼，解鎖今日登入。
              </p>
            </div>

            <form onSubmit={handleVerify} className="space-y-5">
              {/* Select contestant */}
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-[#5c3e35]">島民（研究生）姓名</label>
                <select
                  value={selectedId}
                  onChange={(e) => {
                    setSelectedId(e.target.value);
                    setAuthError("");
                  }}
                  className="w-full px-4 py-3 bg-[#e3d7ba]/30 border-2 border-[#ebdcb9] rounded-xl text-[#5d4037] font-bold focus:ring-2 focus:ring-[#74be62] focus:bg-[#fcfaf2] outline-none transition"
                >
                  <option value="">-- 請選擇您的姓名 --</option>
                  {contestants.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Password field */}
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-[#5c3e35]">4 位數安全研究暗號</label>
                <div className="relative">
                  <input
                    type="password"
                    maxLength={4}
                    placeholder="請輸入 4 位數密碼"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value.replace(/\D/g, ""));
                      setAuthError("");
                    }}
                    className="w-full pl-4 pr-10 py-3 bg-[#e3d7ba]/30 border-2 border-[#ebdcb9] rounded-xl text-[#5d4037] tracking-widest text-center text-lg font-black focus:ring-2 focus:ring-[#74be62] focus:bg-[#fcfaf2] outline-none transition"
                  />
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#ebdcb9] text-lg">
                    🔒
                  </div>
                </div>
              </div>

              {/* Error messages */}
              {authError && (
                <div className="p-3 bg-[#feece7] border-2 border-[#f89b5c] text-[#863725] text-xs rounded-xl flex items-center gap-2 font-bold">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{authError}</span>
                </div>
              )}

              {/* Login submit */}
              <button
                type="submit"
                className="w-full py-3.5 ac-button-green text-white font-black rounded-xl shadow-lg transition duration-200 flex items-center justify-center gap-2 cursor-pointer"
              >
                <UserCheck className="w-5 h-5" />
                進入體脂審判研究室！ ☕
              </button>
            </form>
          </motion.div>
        ) : (
          /* Participant Form and Personal Progress Page */
          <motion.div
            key="portal"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.3 }}
            className="space-y-8"
          >
             {/* Header section with cute animal profile picture and customizable panel */}
            <div className="bg-[#fcfaf2] rounded-3xl p-6 border-3 border-[#ebdcb9] shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 relative overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 w-full">
                {(() => {
                  const av = PRESET_AVATARS.find(a => a.id === activeContestant?.avatar) || { emoji: "👤", color: "#e2e8f0", title: "研究員" };
                  return (
                    <div className="relative group shrink-0">
                      <div 
                        className="w-16 h-16 rounded-2xl flex items-center justify-center text-4xl border-2 border-[#ebdcb9] shadow-sm font-bold select-none"
                        style={{ backgroundColor: av.color }}
                      >
                        {av.emoji}
                      </div>
                      <button
                        onClick={() => setShowAvatarSelector(!showAvatarSelector)}
                        className="absolute -bottom-1 -right-1 bg-[#74be62] hover:bg-[#5aa148] text-white w-6 h-6 rounded-full flex items-center justify-center text-[10px] shadow border border-white cursor-pointer"
                        title="更換您的大頭照 🎨"
                      >
                        ✏️
                      </button>
                    </div>
                  );
                })()}

                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-extrabold text-[#5c3e35]">
                      {activeContestant?.name}
                    </h2>
                    <span className="px-2 py-0.5 bg-[#e1ecd8] border border-[#cbdcb9] rounded-lg text-[10px] text-[#5aa148] font-bold">島民登入中 🍃</span>
                  </div>
                  <p className="text-xs text-[#a37e72] mt-1 font-semibold">
                    初始配置之約：重量 <strong className="font-mono text-[#5c3e35]">{activeContestant?.initialWeight.toFixed(1)}</strong> kg &nbsp;/&nbsp;
                    體脂 <strong className="font-mono text-[#5c3e35]">{activeContestant?.initialBodyFat.toFixed(1)}</strong> % &nbsp;/&nbsp;
                    肌肉 <strong className="font-mono text-[#5c3e35]">{activeContestant?.initialMuscle.toFixed(1)}</strong> %
                  </p>
                </div>
              </div>
              
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => setShowAvatarSelector(!showAvatarSelector)}
                  className="px-3.5 py-2 hover:bg-[#e3d7ba]/40 border-2 border-[#ebdcb9] text-[#5d4037] rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1"
                >
                  🎭 肖像照
                </button>
                <button
                  onClick={handleSignOut}
                  className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 border-2 border-rose-200 text-rose-700 rounded-xl text-xs font-black transition cursor-pointer"
                >
                  切換帳號 🏠
                </button>
              </div>
            </div>

            {/* Slide-down Avatar Selector Panel */}
            <AnimatePresence>
              {showAvatarSelector && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-[#faf8f0] border-2 border-[#ebdcb9] rounded-2xl p-4 overflow-hidden shadow-inner space-y-3"
                >
                  <p className="text-xs font-black text-[#5c3e35] mb-1 flex items-center gap-1">
                    🍃 選擇你的代表動物肖像（排行榜上會同步顯示大頭照喔）：
                  </p>
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                    {PRESET_AVATARS.map((av) => {
                      const isSelected = activeContestant?.avatar === av.id;
                      return (
                        <button
                          key={av.id}
                          onClick={() => {
                            handleChangeMyAvatar(av.id);
                            setShowAvatarSelector(false);
                          }}
                          className={`p-2 rounded-xl flex flex-col items-center justify-center transition cursor-pointer border ${
                            isSelected
                              ? "bg-[#74be62] text-white border-transparent scale-102 font-bold"
                              : "bg-white hover:bg-[#ebdcb9]/40 border-slate-200"
                          }`}
                        >
                          <span className="text-2xl mb-1 select-none">{av.emoji}</span>
                          <span className={`text-[10px] font-extrabold truncate w-full text-center ${
                            isSelected ? "text-white" : "text-[#8a685d]"
                          }`}>
                            {av.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Main grid */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
              {/* Left Column: Stats & Submission Form */}
              <div className="lg:col-span-2 space-y-6">
                {/* Score Progress Card */}
                <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white rounded-2xl p-6 border border-indigo-950 shadow-md relative overflow-hidden">
                  <div className="absolute right-4 top-4 text-indigo-400/20">
                    <Sparkles className="w-20 h-20" />
                  </div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-200 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-indigo-300" />
                    個人當前總分數
                  </h3>
                  <div className="text-4xl font-black text-amber-300 font-mono mt-1">
                    {myStats?.score.toFixed(2)} <span className="text-sm font-normal text-slate-400">分</span>
                  </div>
                  <p className="text-[10px] text-indigo-200/80 mt-2 leading-relaxed">
                    分數會根據體脂變化率、肌肉變化率及體重變化率綜合權重計算，任何細微進步都會被系統忠實轉換成領先積分。
                  </p>

                  <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-indigo-800/40 text-center">
                    <div className="bg-white/5 rounded-lg p-2 border border-white/5">
                      <p className="text-[10px] text-indigo-200">體重增減</p>
                      <p className={`font-semibold font-mono text-xs mt-1 ${
                        myStats && myStats.weightDiff <= 0 ? "text-emerald-400" : "text-rose-450 text-rose-400"
                      }`}>
                        {myStats && myStats.weightDiff > 0 ? "+" : ""}{myStats?.weightDiff.toFixed(1)} kg
                      </p>
                    </div>
                    <div className="bg-white/5 rounded-lg p-2 border border-white/5">
                      <p className="text-[10px] text-indigo-200">體脂率增減</p>
                      <p className={`font-semibold font-mono text-xs mt-1 ${
                        myStats && myStats.fatDiff <= 0 ? "text-emerald-400" : "text-rose-400"
                      }`}>
                        {myStats && myStats.fatDiff > 0 ? "+" : ""}{myStats?.fatDiff.toFixed(1)}%
                      </p>
                    </div>
                    <div className="bg-white/5 rounded-lg p-2 border border-white/5">
                      <p className="text-[10px] text-indigo-200">肌肉率增減</p>
                      <p className={`font-semibold font-mono text-xs mt-1 ${
                        myStats && myStats.muscleDiff >= 0 ? "text-emerald-400" : "text-rose-400"
                      }`}>
                        {myStats && myStats.muscleDiff > 0 ? "+" : ""}{myStats?.muscleDiff.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                </div>

                {/* Submission Form Card */}
                <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-xl space-y-4">
                  <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5 pb-2 border-b border-slate-100">
                    <Scale className="w-4 h-4 text-indigo-500" />
                    申報今日體組成數據
                  </h3>

                  <form onSubmit={handleSubmitLog} className="space-y-4">
                    {/* Weight field */}
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                        <Scale className="w-3.5 h-3.5" />
                        當前體重 (kg)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="例如: 75.40"
                        value={weight}
                        onChange={(e) => setWeight(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-semibold focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition font-mono"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      {/* Body Fat % */}
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                          <Percent className="w-3.5 h-3.5 text-rose-500" />
                          體脂率 (%)
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          placeholder="例如: 24.5"
                          value={bodyFat}
                          onChange={(e) => setBodyFat(e.target.value)}
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-semibold focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition font-mono"
                          required
                        />
                      </div>

                      {/* Muscle % */}
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                          <Dumbbell className="w-3.5 h-3.5 text-emerald-500" />
                          肌肉率 (%)
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          placeholder="例如: 35.8"
                          value={muscle}
                          onChange={(e) => setMuscle(e.target.value)}
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-semibold focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition font-mono"
                          required
                        />
                      </div>
                    </div>

                    {/* Measurement Date */}
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        量測登記日期
                      </label>
                      <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition font-mono"
                        required
                      />
                    </div>

                    {/* Status Feedback Message */}
                    {submitMessage && (
                      <div className={`p-3 text-xs rounded-xl flex items-center gap-2 font-medium ${
                        submitMessage.type === "success" 
                          ? "bg-emerald-50 text-emerald-700" 
                          : "bg-rose-50 text-rose-600"
                      }`}>
                        <AlertCircle className="w-4.5 h-4.5 shrink-0" />
                        <span>{submitMessage.text}</span>
                      </div>
                    )}

                    <button
                      type="submit"
                      className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl shadow-md transition duration-150"
                    >
                      送出量測儲存
                    </button>
                  </form>
                </div>
              </div>

              {/* Right Column: Historical Charts and History Items list */}
              <div className="lg:col-span-3 space-y-6">
                {/* Trend Chart Card */}
                <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-xl space-y-4">
                  <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5 pb-2 border-b border-slate-100">
                    <TrendingDown className="w-4 h-4 text-indigo-500" />
                    個人進度趨勢圖表
                  </h3>

                  {chartData.length > 1 ? (
                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={chartData}
                          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                          <XAxis 
                            dataKey="displayDate" 
                            stroke="#94A3B8" 
                            fontSize={10} 
                            tickLine={false} 
                          />
                          <YAxis 
                            stroke="#94A3B8" 
                            fontSize={10} 
                            tickLine={false}
                            domain={['dataMin - 2', 'dataMax + 2']} 
                          />
                          <Tooltip 
                            contentStyle={{ backgroundColor: "#0F172A", color: "#FFF", borderRadius: "8px", fontSize: "11px", border: "none" }}
                          />
                          <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }} />
                          <Line
                            name="體重 (kg)"
                            type="monotone"
                            dataKey="weight"
                            stroke="#3B82F6"
                            strokeWidth={2}
                            dot={{ r: 4 }}
                            activeDot={{ r: 6 }}
                          />
                          <Line
                            name="體脂 (%)"
                            type="monotone"
                            dataKey="bodyFat"
                            stroke="#EF4444"
                            strokeWidth={2}
                            dot={{ r: 4 }}
                          />
                          <Line
                            name="肌肉 (%)"
                            type="monotone"
                            dataKey="muscle"
                            stroke="#10B981"
                            strokeWidth={2}
                            dot={{ r: 4 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-56 flex flex-col items-center justify-center text-slate-450 text-xs italic">
                      <History className="w-10 h-10 text-slate-350 mb-2 stroke-1" />
                      <span>尚未有累積的量測紀錄，請在左側填寫提交。</span>
                    </div>
                  )}
                </div>

                {/* History list Card */}
                <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-xl space-y-4">
                  <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5 pb-2 border-b border-slate-100">
                    <History className="w-4 h-4 text-indigo-500" />
                    歷史測量記錄清單 ({myStats?.totalEntries})
                  </h3>

                  <div className="max-h-52 overflow-y-auto space-y-2.5 pr-1">
                    {/* Active values display */}
                    <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-150 text-xs">
                      <span className="font-bold text-slate-500">初始基礎值</span>
                      <div className="font-mono text-slate-600 flex gap-4">
                        <span>體重: <strong className="text-slate-800">{activeContestant?.initialWeight.toFixed(1)}</strong>kg</span>
                        <span>體脂: <strong className="text-slate-800">{activeContestant?.initialBodyFat.toFixed(1)}</strong>%</span>
                        <span>肌肉: <strong className="text-slate-800">{activeContestant?.initialMuscle.toFixed(1)}</strong>%</span>
                      </div>
                    </div>

                    {myStats?.history && myStats.history.length > 0 ? (
                      [...myStats.history].reverse().map((h) => (
                        <div 
                          key={h.id} 
                          className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-100 hover:border-slate-200 transition text-xs font-medium"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-slate-700 font-mono">{h.date}</span>
                          </div>
                          <div className="font-mono text-slate-600 flex gap-4">
                            <span>體重: <strong className="text-slate-800">{h.weight.toFixed(1)}</strong>kg</span>
                            <span>體脂: <strong className="text-slate-850 text-slate-800">{h.bodyFat.toFixed(1)}</strong>%</span>
                            <span>肌肉: <strong className="text-slate-850 text-slate-800">{h.muscle.toFixed(1)}</strong>%</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-6 text-xs text-slate-400 italic">
                        尚未上報任何測量。
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
