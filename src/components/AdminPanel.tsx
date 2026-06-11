/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import { Contestant, WeightLog, SyncSettings, PRESET_AVATARS } from "../types";
import { 
  Lock, Settings, Users, History, Database, Plus, Trash2, Edit2, 
  Check, X, FileText, AlertTriangle, RefreshCw, Copy, CheckSquare,
  Trophy
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import Leaderboard from "./Leaderboard";

interface AdminPanelProps {
  contestants: Contestant[];
  logs: WeightLog[];
  syncSettings: SyncSettings;
  onAddContestant: (newC: Contestant) => void;
  onUpdateContestant: (updatedC: Contestant) => void;
  onDeleteContestant: (id: string) => void;
  onUpdateLog: (updatedLog: WeightLog) => void;
  onDeleteLog: (id: string) => void;
  onSaveSyncSettings: (settings: SyncSettings) => void;
  onSyncWithSheets: () => Promise<void>;
  isSyncing: boolean;
}

export default function AdminPanel({
  contestants,
  logs,
  syncSettings,
  onAddContestant,
  onUpdateContestant,
  onDeleteContestant,
  onUpdateLog,
  onDeleteLog,
  onSaveSyncSettings,
  onSyncWithSheets,
  isSyncing
}: AdminPanelProps) {
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [username, setUsername] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [loginError, setLoginError] = useState<string>("");

  // Sub-tabs in Admin Panel
  const [activeSubTab, setActiveSubTab] = useState<"leaderboard" | "players" | "logs" | "sheets">("leaderboard");

  // Managing competitors state
  const [isAddingPlayer, setIsAddingPlayer] = useState<boolean>(false);
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);

  // Player fields (add / edit)
  const [pName, setPName] = useState<string>("");
  const [pPassword, setPPassword] = useState<string>("");
  const [pInitialWeight, setPInitialWeight] = useState<string>("");
  const [pInitialBodyFat, setPInitialBodyFat] = useState<string>("");
  const [pInitialMuscle, setPInitialMuscle] = useState<string>("");
  const [pAvatar, setPAvatar] = useState<string>("nook");
  const [playerFormError, setPlayerFormError] = useState<string>("");

  // Managing logs filters & inline editing
  const [logSearchQuery, setLogSearchQuery] = useState<string>("");
  const [editingLogId, setEditingLogId] = useState<string | null>(null);

  // Inline Log fields (edit)
  const [editLogWeight, setEditLogWeight] = useState<string>("");
  const [editLogBodyFat, setEditLogBodyFat] = useState<string>("");
  const [editLogMuscle, setEditLogMuscle] = useState<string>("");
  const [editLogDate, setEditLogDate] = useState<string>("");

  // Sheet API settings fields
  const [sheetInputUrl, setSheetInputUrl] = useState<string>(syncSettings.sheetsUrl);
  const [sheetSaveMessage, setSheetSaveMessage] = useState<string>("");
  const [copySuccess, setCopySuccess] = useState<boolean>(false);

  // Filter logs for displaying
  const filteredLogs = useMemo(() => {
    let list = [...logs].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime() ||
                                       new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    if (logSearchQuery.trim()) {
      const q = logSearchQuery.toLowerCase();
      list = list.filter(l => {
        const contestant = contestants.find(c => c.id === l.contestantId);
        return (contestant && contestant.name.toLowerCase().includes(q)) || l.date.includes(q);
      });
    }
    return list;
  }, [logs, logSearchQuery, contestants]);

  // Handle Admin Auth Login
  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");

    if (username === "chiaba" && password === "5376") {
      setIsAdmin(true);
      setLoginError("");
    } else {
      setLoginError("管理員帳號或密碼錯誤！請輸入專屬管理帳密。");
    }
  };

  // Log edit save handlers
  const startEditLog = (l: WeightLog) => {
    setEditingLogId(l.id);
    setEditLogWeight(l.weight.toString());
    setEditLogBodyFat(l.bodyFat.toString());
    setEditLogMuscle(l.muscle.toString());
    setEditLogDate(l.date);
  };

  const cancelEditLog = () => {
    setEditingLogId(null);
  };

  const handleSaveEditLog = (id: string, contestantId: string, createdAt: string) => {
    const w = parseFloat(editLogWeight);
    const f = parseFloat(editLogBodyFat);
    const m = parseFloat(editLogMuscle);

    if (isNaN(w) || isNaN(f) || isNaN(m)) {
      alert("請輸入有效的數值！");
      return;
    }

    onUpdateLog({
      id,
      contestantId,
      date: editLogDate,
      weight: w,
      bodyFat: f,
      muscle: m,
      createdAt
    });

    setEditingLogId(null);
  };

  // Competitor field handlers
  const resetPlayerFields = () => {
    setPName("");
    setPPassword("");
    setPInitialWeight("");
    setPInitialBodyFat("");
    setPInitialMuscle("");
    setPAvatar("nook");
    setPlayerFormError("");
  };

  const startAddPlayer = () => {
    resetPlayerFields();
    setEditingPlayerId(null);
    setIsAddingPlayer(true);
  };

  const startEditPlayer = (c: Contestant) => {
    setPName(c.name);
    setPPassword(c.password);
    setPInitialWeight(c.initialWeight.toString());
    setPInitialBodyFat(c.initialBodyFat.toString());
    setPInitialMuscle(c.initialMuscle.toString());
    setPAvatar(c.avatar || "nook");
    setEditingPlayerId(c.id);
    setIsAddingPlayer(false);
  };

  const handleSavePlayer = (e: React.FormEvent) => {
    e.preventDefault();
    setPlayerFormError("");

    if (!pName.trim()) {
      setPlayerFormError("姓名不能為空");
      return;
    }
    if (pPassword.length !== 4 || isNaN(Number(pPassword))) {
      setPlayerFormError("密碼必須為 4 位數純數字");
      return;
    }

    const initW = parseFloat(pInitialWeight);
    const initF = parseFloat(pInitialBodyFat);
    const initM = parseFloat(pInitialMuscle);

    if (isNaN(initW) || initW <= 0 || isNaN(initF) || isNaN(initM)) {
      setPlayerFormError("初始體型數據必須為有效之大於 0 實數");
      return;
    }

    if (editingPlayerId) {
      // Update
      onUpdateContestant({
        id: editingPlayerId,
        name: pName,
        password: pPassword,
        initialWeight: initW,
        initialBodyFat: initF,
        initialMuscle: initM,
        avatar: pAvatar
      });
      setEditingPlayerId(null);
    } else {
      // Create new
      onAddContestant({
        id: "c_" + Date.now(),
        name: pName,
        password: pPassword,
        initialWeight: initW,
        initialBodyFat: initF,
        initialMuscle: initM,
        avatar: pAvatar
      });
      setIsAddingPlayer(false);
    }

    resetPlayerFields();
  };

  // Save Sheets URL Settings
  const handleSaveSheetSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setSheetSaveMessage("");

    onSaveSyncSettings({
      sheetsUrl: sheetInputUrl,
      lastSynced: syncSettings.lastSynced
    });

    setSheetSaveMessage("✅ 同步 URL 設定已更新！");
    setTimeout(() => setSheetSaveMessage(""), 4000);
  };

  // Copy code helper
  const copyAppsScriptCode = () => {
    const rawCode = `/**
 * 減肥大賽後台資料庫 - Google Apps Script
 *
 * 詳情請見網頁後台說明的部署步驟！
 */
function doGet(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
    var data = getDataFromSheets();
    return ContentService.createTextOutput(JSON.stringify(data))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
    var requestData = JSON.parse(e.postData.contents);
    var action = requestData.action;
    
    if (action === "save") {
      saveDataToSheets(requestData.contestants, requestData.logs);
      return ContentService.createTextOutput(JSON.stringify({ success: true, message: "試算表資料更新成功！" }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    return ContentService.createTextOutput(JSON.stringify({ error: "未知的 action" }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

function getOrCreateSheet(name, headers) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
    var range = sheet.getRange(1, 1, 1, headers.length);
    range.setFontWeight("bold");
    range.setBackground("#F3F4F6");
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function getDataFromSheets() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var contestantSheet = getOrCreateSheet("Contestants", ["id", "name", "password", "initialWeight", "initialBodyFat", "initialMuscle", "avatar"]);
  var logsSheet = getOrCreateSheet("WeightLogs", ["id", "contestantId", "date", "weight", "bodyFat", "muscle", "createdAt"]);
  
  var contestants = [];
  var contestantRows = contestantSheet.getDataRange().getValues();
  for (var i = 1; i < contestantRows.length; i++) {
    if (contestantRows[i][0] !== "") {
      contestants.push({
        id: String(contestantRows[i][0]),
        name: String(contestantRows[i][1]),
        password: String(contestantRows[i][2]),
        initialWeight: Number(contestantRows[i][3]),
        initialBodyFat: Number(contestantRows[i][4]),
        initialMuscle: Number(contestantRows[i][5]),
        avatar: contestantRows[i][6] ? String(contestantRows[i][6]) : "nook"
      });
    }
  }
  
  var logs = [];
  var logRows = logsSheet.getDataRange().getValues();
  for (var j = 1; j < logRows.length; j++) {
    if (logRows[j][0] !== "") {
      logs.push({
        id: String(logRows[j][0]),
        contestantId: String(logRows[j][1]),
        date: String(logRows[j][2]),
        weight: Number(logRows[j][3]),
        bodyFat: Number(logRows[j][4]),
        muscle: Number(logRows[j][5]),
        createdAt: String(logRows[j][6])
      });
    }
  }
  
  return { contestants: contestants, logs: logs };
}

function saveDataToSheets(contestants, logs) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var contestantSheet = getOrCreateSheet("Contestants", ["id", "name", "password", "initialWeight", "initialBodyFat", "initialMuscle", "avatar"]);
  var logsSheet = getOrCreateSheet("WeightLogs", ["id", "contestantId", "date", "weight", "bodyFat", "muscle", "createdAt"]);
  
  if (contestantSheet.getLastRow() > 1) {
    contestantSheet.getRange(2, 1, contestantSheet.getLastRow() - 1, 7).clear();
  }
  if (logsSheet.getLastRow() > 1) {
    logsSheet.getRange(2, 1, logsSheet.getLastRow() - 1, 7).clear();
  }
  
  if (contestants && contestants.length > 0) {
    var contestantValues = contestants.map(function(c) {
      return [c.id, c.name, c.password, Number(c.initialWeight), Number(c.initialBodyFat), Number(c.initialMuscle), c.avatar || "nook"];
    });
    contestantSheet.getRange(2, 1, contestantValues.length, 7).setValues(contestantValues);
  }
  
  if (logs && logs.length > 0) {
    var logValues = logs.map(function(l) {
      return [l.id, l.contestantId, l.date, Number(l.weight), Number(l.bodyFat), Number(l.muscle), l.createdAt];
    });
    logsSheet.getRange(2, 1, logValues.length, 7).setValues(logValues);
  }
}`;

    navigator.clipboard.writeText(rawCode).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    });
  };

  return (
    <div className="max-w-5xl mx-auto" id="admin-panel">
      {!isAdmin ? (
        /* Login Form Card */
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-3xl p-8 border border-slate-100 shadow-xl max-w-md mx-auto relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 right-0 h-2 bg-indigo-600"></div>
          
          <div className="flex flex-col items-center text-center space-y-2 mb-6">
            <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 mb-2">
              <Lock className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-slate-800">管理員安全登入</h2>
            <p className="text-xs text-slate-450 text-slate-400">
              輸入預設帳密調閱後台，並獲得修改歷史紀錄與配置雲端資料同步的權能。
            </p>
          </div>

          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500">管理者密鑰帳號</label>
              <input
                type="text"
                placeholder="預設為 admin"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500">系統主控密碼</label>
              <input
                type="password"
                placeholder="預設為 1234"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition"
                required
              />
            </div>

            {loginError && (
              <div className="p-3 bg-rose-50 text-rose-600 text-xs rounded-xl flex items-center gap-2 font-medium">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-lg shadow-indigo-150 transition"
            >
              進入數據管理後台
            </button>
          </form>
        </motion.div>
      ) : (
        /* Authenticated Control Center */
        <div className="space-y-6">
          {/* Menu Selector / Navigation */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-4">
            <h2 className="text-lg font-extrabold text-slate-800 flex items-center gap-2">
              <Settings className="w-5 h-5 text-indigo-500 animate-spin" style={{ animationDuration: '6s' }} />
              管理員維護中心
            </h2>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setActiveSubTab("leaderboard")}
                className={`px-4 py-2 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition ${
                  activeSubTab === "leaderboard"
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-100"
                    : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
                }`}
              >
                <Trophy className="w-4 h-4" />
                討伐數據排行榜 🏆
              </button>
              <button
                onClick={() => setActiveSubTab("players")}
                className={`px-4 py-2 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition ${
                  activeSubTab === "players"
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-100"
                    : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
                }`}
              >
                <Users className="w-4 h-4" />
                選手名單管理
              </button>
              <button
                onClick={() => setActiveSubTab("logs")}
                className={`px-4 py-2 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition ${
                  activeSubTab === "logs"
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-100"
                    : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
                }`}
              >
                <History className="w-4 h-4" />
                歷史數據修正
              </button>
              <button
                onClick={() => setActiveSubTab("sheets")}
                className={`px-4 py-2 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition ${
                  activeSubTab === "sheets"
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-100"
                    : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
                }`}
              >
                <Database className="w-4 h-4" />
                試算表連線設定
              </button>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {/* 0. Live Leaderboard View */}
            {activeSubTab === "leaderboard" && (
              <motion.div
                key="tab-leaderboard"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <Leaderboard contestants={contestants} logs={logs} isAdminMode={true} />
              </motion.div>
            )}

            {/* 1. Players Management View */}
            {activeSubTab === "players" && (
              <motion.div
                key="tab-players"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                {/* Add/Edit Form Panel */}
                {(isAddingPlayer || editingPlayerId) && (
                  <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-6 relative">
                    <button
                      onClick={() => {
                        setIsAddingPlayer(false);
                        setEditingPlayerId(null);
                        resetPlayerFields();
                      }}
                      className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-5 h-5" />
                    </button>
                    <h3 className="font-bold text-slate-800 text-sm mb-4 flex items-center gap-1">
                      {editingPlayerId ? <Edit2 className="w-4 h-4 text-indigo-500" /> : <Plus className="w-4 h-4 text-indigo-500" />}
                      {editingPlayerId ? "修改選手基礎配置" : "全新招募參賽者加入"}
                    </h3>

                    <form onSubmit={handleSavePlayer} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-slate-500">參賽姓名</label>
                          <input
                            type="text"
                            placeholder="輸入選手名字 (例如: 小劉)"
                            value={pName}
                            onChange={(e) => setPName(e.target.value)}
                            className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition"
                            required
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-slate-500">4 位數登入 PIN 密碼</label>
                          <input
                            type="password"
                            maxLength={4}
                            placeholder="例: 1234 (限 4 碼純數字)"
                            value={pPassword}
                            onChange={(e) => setPPassword(e.target.value.replace(/\D/g, ""))}
                            className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 font-mono tracking-widest text-center focus:ring-2 focus:ring-indigo-500 outline-none transition"
                            required
                          />
                        </div>

                        {/* Visual Animal Avatar Picker */}
                        <div className="space-y-1.5 md:col-span-2">
                          <label className="text-xs font-bold text-slate-500 flex items-center gap-1">
                            選擇參賽島民肖像 🐾
                          </label>
                          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 bg-slate-100/50 p-2.5 rounded-xl border border-slate-200">
                            {PRESET_AVATARS.map((av) => {
                              const isSelected = pAvatar === av.id;
                              return (
                                <button
                                  key={av.id}
                                  type="button"
                                  onClick={() => setPAvatar(av.id)}
                                  className={`p-1.5 rounded-lg flex flex-col items-center justify-center transition cursor-pointer ${
                                    isSelected
                                      ? "bg-slate-700 text-white shadow-sm font-bold scale-102"
                                      : "bg-white hover:bg-slate-100 border border-slate-200"
                                  }`}
                                  title={av.title}
                                >
                                  <span className="text-xl mb-0.5 select-none">{av.emoji}</span>
                                  <span className={`text-[9px] truncate w-full text-center ${
                                    isSelected ? "text-white" : "text-slate-500"
                                  }`}>
                                    {av.name}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-slate-500">初始體重 (kg)</label>
                          <input
                            type="number"
                            step="0.1"
                            placeholder="例: 78.5"
                            value={pInitialWeight}
                            onChange={(e) => setPInitialWeight(e.target.value)}
                            className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 font-mono focus:ring-2 focus:ring-indigo-500 outline-none transition"
                            required
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-slate-500">初始體脂率 (%)</label>
                          <input
                            type="number"
                            step="0.1"
                            placeholder="例: 24.2"
                            value={pInitialBodyFat}
                            onChange={(e) => setPInitialBodyFat(e.target.value)}
                            className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 font-mono focus:ring-2 focus:ring-indigo-500 outline-none transition"
                            required
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-slate-500">初始肌肉率 (%)</label>
                          <input
                            type="number"
                            step="0.1"
                            placeholder="例: 35.8"
                            value={pInitialMuscle}
                            onChange={(e) => setPInitialMuscle(e.target.value)}
                            className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 font-mono focus:ring-2 focus:ring-indigo-500 outline-none transition"
                            required
                          />
                        </div>
                      </div>

                      {playerFormError && (
                        <p className="text-xs text-rose-500 font-medium">{playerFormError}</p>
                      )}

                      <div className="flex gap-2.5">
                        <button
                          type="submit"
                          className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-md transition"
                        >
                          儲存送出
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsAddingPlayer(false);
                            setEditingPlayerId(null);
                            resetPlayerFields();
                          }}
                          className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-semibold transition"
                        >
                          取消
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* Title & Add Action Row */}
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-500">
                    目前共有 <strong className="text-indigo-600">{contestants.length}</strong> 位登記之減肥賽事選手：
                  </p>
                  {!isAddingPlayer && !editingPlayerId && (
                    <button
                      onClick={startAddPlayer}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition shadow-sm"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      新增參賽成員
                    </button>
                  )}
                </div>

                {/* Competitors List Table */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-md overflow-hidden">
                  <table className="min-w-full divide-y divide-slate-100 text-left text-xs">
                    <thead className="bg-slate-50 font-semibold text-slate-500 text-center uppercase tracking-wider">
                      <tr>
                        <th scope="col" className="px-5 py-3.5 text-left">選手姓名</th>
                        <th scope="col" className="px-4 py-3.5 w-24">安全密碼</th>
                        <th scope="col" className="px-4 py-3.5">初始體重 (kg)</th>
                        <th scope="col" className="px-4 py-3.5">初始體脂 (%)</th>
                        <th scope="col" className="px-4 py-3.5">初始肌肉 (%)</th>
                        <th scope="col" className="px-5 py-3.5 text-right w-36">維護操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-650 font-medium">
                      {contestants.map((c) => (
                        <tr key={c.id} className="hover:bg-slate-50/50">
                          <td className="px-5 py-4 font-bold text-slate-800 text-sm flex items-center gap-2">
                            {(() => {
                              const av = PRESET_AVATARS.find(a => a.id === c.avatar) || { emoji: "👤", color: "#f1f5f9", name: "未知" };
                              return (
                                <span 
                                  className="w-7 h-7 rounded-lg flex items-center justify-center text-sm"
                                  style={{ backgroundColor: av.color }}
                                  title={av.name}
                                >
                                  {av.emoji}
                                </span>
                              );
                            })()}
                            <span>{c.name}</span>
                          </td>
                          <td className="px-4 py-4 text-center font-mono tracking-widest bg-amber-50/25 text-amber-900 font-bold">{c.password}</td>
                          <td className="px-4 py-4 text-center font-mono">{c.initialWeight.toFixed(1)}</td>
                          <td className="px-4 py-4 text-center font-mono">{c.initialBodyFat.toFixed(1)}%</td>
                          <td className="px-4 py-4 text-center font-mono">{c.initialMuscle.toFixed(1)}%</td>
                          <td className="px-5 py-4 text-right">
                            <div className="flex gap-2 justify-end">
                              <button
                                onClick={() => startEditPlayer(c)}
                                className="p-1 px-2.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition"
                              >
                                <Edit2 className="w-3 h-3" />
                                編輯
                              </button>
                              <button
                                onClick={() => {
                                  if (window.confirm(`確定要將「${c.name}」自選手名單中永久刪除嗎？這將導致此選手與其有關聯的量測歷史數據一併消失且無法復原。`)) {
                                    onDeleteContestant(c.id);
                                  }
                                }}
                                className="p-1 px-2 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg text-[11px] font-semibold flex items-center gap-0.5 transition"
                              >
                                <Trash2 className="w-3 h-3" />
                                刪除
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            {/* 2. Logs Data Modification View */}
            {activeSubTab === "logs" && (
              <motion.div
                key="tab-logs"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                {/* Search / Filter header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <p className="text-xs text-slate-500">
                    目前共有 <strong className="text-indigo-600">{logs.length}</strong> 筆量測歷史申報。管理員可以隨時調整數值及日期，或是刪除錯誤的輸入：
                  </p>
                  <div>
                    <input
                      type="text"
                      placeholder="🔍 搜尋參賽姓名或日期"
                      value={logSearchQuery}
                      onChange={(e) => setLogSearchQuery(e.target.value)}
                      className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500 outline-none w-56 font-medium text-slate-700"
                    />
                  </div>
                </div>

                {/* Logs table list */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-md overflow-hidden">
                  <table className="min-w-full divide-y divide-slate-100 text-left text-xs">
                    <thead className="bg-slate-50 font-semibold text-slate-500 text-center uppercase tracking-wider">
                      <tr>
                        <th scope="col" className="px-5 py-3 w-28 text-left">選手姓名</th>
                        <th scope="col" className="px-4 py-3 w-32">登記日期</th>
                        <th scope="col" className="px-4 py-3 w-28">體重 (kg)</th>
                        <th scope="col" className="px-4 py-3 w-28">體脂率 (%)</th>
                        <th scope="col" className="px-4 py-3 w-28">肌肉率 (%)</th>
                        <th scope="col" className="px-5 py-3 text-right">修改與維護</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-600">
                      {filteredLogs.map((l) => {
                        const isEditing = editingLogId === l.id;
                        const contestant = contestants.find(c => c.id === l.contestantId);
                        
                        return (
                          <tr key={l.id} className="hover:bg-slate-50/40">
                            {/* Contestant Name */}
                            <td className="px-5 py-3 text-left font-bold text-slate-800 text-sm">
                              {contestant ? contestant.name : <span className="text-slate-400 italic font-normal">未知選手</span>}
                            </td>

                            {/* Date Field */}
                            <td className="px-4 py-3 text-center">
                              {isEditing ? (
                                <input
                                  type="date"
                                  value={editLogDate}
                                  onChange={(e) => setEditLogDate(e.target.value)}
                                  className="px-2 py-1 bg-white border border-slate-200 rounded text-center w-28 font-mono outline-none focus:ring-1 focus:ring-indigo-500"
                                />
                              ) : (
                                <span className="font-mono text-slate-700 font-medium">{l.date}</span>
                              )}
                            </td>

                            {/* Weight */}
                            <td className="px-4 py-3 text-center">
                              {isEditing ? (
                                <input
                                  type="number"
                                  step="0.01"
                                  value={editLogWeight}
                                  onChange={(e) => setEditLogWeight(e.target.value)}
                                  className="px-2 py-1 bg-white border border-slate-200 rounded text-center w-20 font-mono outline-none focus:ring-1 focus:ring-indigo-500 font-bold"
                                />
                              ) : (
                                <span className="font-mono text-slate-800 font-semibold">{l.weight.toFixed(1)}</span>
                              )}
                            </td>

                            {/* Body Fat */}
                            <td className="px-4 py-3 text-center">
                              {isEditing ? (
                                <input
                                  type="number"
                                  step="0.1"
                                  value={editLogBodyFat}
                                  onChange={(e) => setEditLogBodyFat(e.target.value)}
                                  className="px-2 py-1 bg-white border border-slate-200 rounded text-center w-16 font-mono outline-none focus:ring-1 focus:ring-indigo-500"
                                />
                              ) : (
                                <span className="font-mono text-slate-800 font-semibold">{l.bodyFat.toFixed(1)}%</span>
                              )}
                            </td>

                            {/* Muscle */}
                            <td className="px-4 py-3 text-center">
                              {isEditing ? (
                                <input
                                  type="number"
                                  step="0.1"
                                  value={editLogMuscle}
                                  onChange={(e) => setEditLogMuscle(e.target.value)}
                                  className="px-2 py-1 bg-white border border-slate-200 rounded text-center w-16 font-mono outline-none focus:ring-1 focus:ring-indigo-500"
                                />
                              ) : (
                                <span className="font-mono text-slate-800 font-semibold">{l.muscle.toFixed(1)}%</span>
                              )}
                            </td>

                            {/* Action Buttons */}
                            <td className="px-5 py-3 text-right">
                              {isEditing ? (
                                <div className="flex gap-1.5 justify-end">
                                  <button
                                    onClick={() => handleSaveEditLog(l.id, l.contestantId, l.createdAt)}
                                    className="p-1 px-2.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg text-[10px] font-bold flex items-center gap-0.5 transition"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                    儲存
                                  </button>
                                  <button
                                    onClick={cancelEditLog}
                                    className="p-1 px-2 bg-slate-100 text-slate-500 hover:bg-slate-200 rounded-lg text-[10px] font-bold flex items-center gap-0.5 transition"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                    放棄
                                  </button>
                                </div>
                              ) : (
                                <div className="flex gap-2 justify-end">
                                  <button
                                    onClick={() => startEditLog(l)}
                                    className="p-1 px-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-md text-[10px] font-semibold transition flex items-center gap-0.5"
                                  >
                                    <Edit2 className="w-2.5 h-2.5" />
                                    修改
                                  </button>
                                  <button
                                    onClick={() => {
                                      if (window.confirm("確定永久刪除這筆量測紀錄嗎？這會直接回溯影響今日的分數和排行榜。")) {
                                        onDeleteLog(l.id);
                                      }
                                    }}
                                    className="p-1 px-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-md text-[10px] font-semibold transition flex items-center gap-0.5"
                                  >
                                    <Trash2 className="w-2.5 h-2.5" />
                                    刪除
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}

                      {filteredLogs.length === 0 && (
                        <tr>
                          <td colSpan={6} className="text-center py-8 text-xs text-slate-400 italic">
                            查無任何記錄。
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            {/* 3. Google Sheets config View */}
            {activeSubTab === "sheets" && (
              <motion.div
                key="tab-sheets"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                {/* Visual indicators */}
                <div className="bg-gradient-to-r from-emerald-50 to-indigo-50 rounded-2xl p-6 border border-emerald-100/50 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-5">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
                      <h3 className="font-bold text-slate-800 text-sm">Google Sheets 試算表同步狀態</h3>
                    </div>
                    <p className="text-xs text-slate-400 max-w-xl">
                      {syncSettings.sheetsUrl 
                        ? `已綁定試算表 API 連線，最後同步時間：${syncSettings.lastSynced || "未曾同步"}`
                        : "目前為「本機沙盒儲存 (LocalStorage)」模式，所有變更將存放在本瀏覽器中。只要在下面绑定 Google 試算表 Web App 網址，即可啟用雲端儲存與跨裝置同步！"}
                    </p>
                  </div>
                  
                  {syncSettings.sheetsUrl && (
                    <button
                      onClick={onSyncWithSheets}
                      disabled={isSyncing}
                      className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shadow-sm disabled:opacity-50 shrink-0"
                    >
                      <RefreshCw className={`w-4 h-4 ${isSyncing ? "animate-spin" : ""}`} />
                      {isSyncing ? "同盟連網中..." : "立即雙向同步"}
                    </button>
                  )}
                </div>

                {/* Integration Inputs & Instruction panels */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  {/* Sync Settings Configuration panel */}
                  <div className="lg:col-span-5 bg-white border border-slate-150 rounded-2xl p-6 shadow-sm space-y-4">
                    <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider pb-2 border-b border-slate-100 flex items-center gap-2">
                      <Settings className="w-4 h-4 text-slate-400" />
                      設定 Google Apps Script 端點
                    </h4>

                    <form onSubmit={handleSaveSheetSettings} className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-600">網頁應用程式 URL (Web App URL)</label>
                        <input
                          type="url"
                          placeholder="https://script.google.com/macros/s/..."
                          value={sheetInputUrl}
                          onChange={(e) => setSheetInputUrl(e.target.value)}
                          className="w-full px-4 py-2 bg-slate-55 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-700 focus:ring-1 focus:ring-indigo-500 focus:bg-white outline-none transition"
                        />
                      </div>

                      {sheetSaveMessage && (
                        <p className="text-xs font-medium text-emerald-600">{sheetSaveMessage}</p>
                      )}

                      <div className="flex gap-2">
                        <button
                          type="submit"
                          className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition"
                        >
                          儲存 API 設定
                        </button>
                        {syncSettings.sheetsUrl && (
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm("解除綁定後網頁將切換回瀏覽器 LocalStorage 狀態。這不會移除試算表中的資料，但網頁將無法連線更新。確定嗎？")) {
                                setSheetInputUrl("");
                                onSaveSyncSettings({ sheetsUrl: "", lastSynced: null });
                              }
                            }}
                            className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-xs font-bold transition"
                          >
                            解除試算表綁定
                          </button>
                        )}
                      </div>
                    </form>

                    <div className="bg-sky-50 rounded-xl p-4 border border-sky-100 text-xs text-sky-800 leading-relaxed font-medium space-y-1">
                      <p className="font-bold flex items-center gap-1">💡 什麼是雙向同步？</p>
                      <p className="text-[11px] font-normal text-sky-750">
                        當您點擊「立即雙向同步」時，網頁與 Google 試算表兩端的數據將進行完全合併。若是初次同步，本地的初始人名與測試紀錄將會直接上傳並建立您的試算表分頁。之後所有人都能在任何裝置看到來自 Google 試算表的同步最新數據！
                      </p>
                    </div>
                  </div>

                  {/* Copy code and installation guides */}
                  <div className="lg:col-span-7 bg-white border border-slate-150 rounded-2xl p-6 shadow-sm space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-2">
                        <FileText className="w-4 h-4 text-slate-400" />
                        萬用 Google Apps Script 貼上程式碼
                      </h4>
                      <button
                        onClick={copyAppsScriptCode}
                        className="px-3 py-1 bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 rounded-lg text-indigo-700 text-xs font-semibold flex items-center gap-1 transition"
                      >
                        {copySuccess ? <CheckSquare className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        {copySuccess ? "已複製到剪貼簿!" : "點我一鍵複製"}
                      </button>
                    </div>

                    <p className="text-xs text-slate-400 leading-relaxed">
                      請在您的 Google 試算表「<strong>擴充功能 &gt; Apps Script</strong>」貼上整份複製的程式碼，並點選右上方「<strong>部署 &gt; 新增部署</strong>」，類型選擇「<strong>網頁應用程式 (Web App)</strong>」，並將存取權設定為「<strong>任何人 (Anyone)</strong>」來取得連線網址！
                    </p>

                    <div className="bg-slate-900 text-slate-200 rounded-xl p-4 font-mono text-[10px] overflow-x-auto h-48 select-all leading-normal whitespace-pre">
{`function doGet(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
    var data = getDataFromSheets();
    return ContentService.createTextOutput(JSON.stringify(data))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) { ... }
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
    var requestData = JSON.parse(e.postData.contents);
    if (requestData.action === "save") {
       saveDataToSheets(requestData.contestants, requestData.logs);
    }
  } ...
}`}
                    </div>
                    <div className="text-[11px] text-slate-400 italic">
                      （以上為代碼大綱。點選「<strong>點我一鍵複製</strong>」會將後台與雙向表格防撞鎖完美整合的完整 180 行程式自動複製妥當）
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
