/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Contestant, WeightLog, SyncSettings } from "./types";
import { MOCK_CONTESTANTS, MOCK_LOGS } from "./mockData";
import Leaderboard from "./components/Leaderboard";
import ParticipantInput from "./components/ParticipantInput";
import AdminPanel from "./components/AdminPanel";
import { Trophy, Scale, Settings, Flame, RefreshCw, Sparkles, CheckCircle, AlertCircle, Leaf, HelpCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

// =========================================================================
// 🌐 全域預設 Google 試算表 Web App 同步網址 (如果你想讓每個人進來都自動讀取同一個試算表)
// 1. 你可以直接在下方引號中貼上您的 Google Apps Script 取得的「網頁應用程式 Web App」網址。
// 2. 或者，如果你是用 Netlify，也可以直接在 Netlify 的環境變數 (Environment Variables) 
//    中設定一組 VITE_SHEETS_URL = 你的網址。如此一來不需修改程式碼，每個人打開也會直接連到同一個試算表！
// =========================================================================
const GLOBAL_DEFAULT_SHEETS_URL = "https://script.google.com/macros/s/AKfycbxC9KTrmlc4pBYslBIomW8kKUIiKos0TXFMKkhpAf4A7tZipkMWOssg14KLgF08oiF56Q/exec"; 

export default function App() {
  const [activeTab, setActiveTab ] = useState<"leaderboard" | "checkin" | "admin">("leaderboard");
  
  // App States
  const [contestants, setContestants] = useState<Contestant[]>([]);
  const [logs, setLogs] = useState<WeightLog[]>([]);
  const [syncSettings, setSyncSettings] = useState<SyncSettings>({
    sheetsUrl: "",
    lastSynced: null,
  });
  
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncFeedback, setSyncFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // 1. Initial State Loading from LocalStorage or Seeding Mock Data
  useEffect(() => {
    try {
      const storedContestants = localStorage.getItem("weight_loss_contestants");
      const storedLogs = localStorage.getItem("weight_loss_logs");
      const storedSync = localStorage.getItem("weight_loss_sync");

      // 載入全域預設之 Google 試算表連結
      const defaultSheetsUrl = (import.meta as any).env?.VITE_SHEETS_URL || GLOBAL_DEFAULT_SHEETS_URL || "";
      const isSheetsMode = !!defaultSheetsUrl;

      let initialContestants: Contestant[] = [];
      let initialLogs: WeightLog[] = [];

      if (isSheetsMode) {
        // 如果已啟用試算表同步：極力避免加載任何本地 Mock 電腦雜訊
        if (storedContestants) {
          const parsed = JSON.parse(storedContestants);
          initialContestants = parsed.filter((c: Contestant) => !["c1", "c2", "c3", "c4", "c5", "c6"].includes(c.id));
        } else {
          initialContestants = [];
        }

        if (storedLogs) {
          const parsed = JSON.parse(storedLogs);
          initialLogs = parsed.filter((l: WeightLog) => 
            !["c1", "c2", "c3", "c4", "c5", "c6"].includes(l.contestantId) && 
            !l.id.startsWith("l1_") && !l.id.startsWith("l2_") && !l.id.startsWith("l3_") && 
            !l.id.startsWith("l4_") && !l.id.startsWith("l5_") && !l.id.startsWith("l6_")
          );
        } else {
          initialLogs = [];
        }

        localStorage.setItem("weight_loss_contestants", JSON.stringify(initialContestants));
        localStorage.setItem("weight_loss_logs", JSON.stringify(initialLogs));
      } else {
        // 本地離線沙盒模式：帶入初始示範資料
        if (storedContestants) {
          initialContestants = JSON.parse(storedContestants);
        } else {
          initialContestants = MOCK_CONTESTANTS;
          localStorage.setItem("weight_loss_contestants", JSON.stringify(MOCK_CONTESTANTS));
        }

        if (storedLogs) {
          initialLogs = JSON.parse(storedLogs);
        } else {
          initialLogs = MOCK_LOGS;
          localStorage.setItem("weight_loss_logs", JSON.stringify(MOCK_LOGS));
        }
      }

      setContestants(initialContestants);
      setLogs(initialLogs);

      if (storedSync) {
        const parsedSync = JSON.parse(storedSync);
        if (parsedSync.sheetsUrl !== defaultSheetsUrl && defaultSheetsUrl) {
          parsedSync.sheetsUrl = defaultSheetsUrl;
          localStorage.setItem("weight_loss_sync", JSON.stringify(parsedSync));
        }
        setSyncSettings(parsedSync);
      } else {
        const initialSync: SyncSettings = {
          sheetsUrl: defaultSheetsUrl,
          lastSynced: null,
        };
        setSyncSettings(initialSync);
        if (defaultSheetsUrl) {
          localStorage.setItem("weight_loss_sync", JSON.stringify(initialSync));
        }
      }
    } catch (e) {
      console.error("Failed to load local storage state:", e);
    }
  }, []);

  // 1.5 Startup Background Auto Sync Check
  const [hasAutoSynced, setHasAutoSynced] = useState<boolean>(false);

  useEffect(() => {
    if (syncSettings.sheetsUrl && !hasAutoSynced) {
      setHasAutoSynced(true);
      const performInitialSync = async () => {
        setIsSyncing(true);
        try {
          const getUrl = `${syncSettings.sheetsUrl}?t=${Date.now()}`;
          const response = await fetch(getUrl, { method: "GET", mode: "cors" });
          if (response.ok) {
            const remoteData = await response.json();
            if (remoteData && !remoteData.error) {
              const remoteContestants: Contestant[] = remoteData.contestants || [];
              const remoteLogs: WeightLog[] = remoteData.logs || [];
              
              // 強力清洗排除任何示範噪點（包含歷史殘存在試算表端的）
              const cleanContestants = remoteContestants.filter(c => !["c1", "c2", "c3", "c4", "c5", "c6"].includes(c.id));
              const cleanLogs = remoteLogs.filter(l => 
                !["c1", "c2", "c3", "c4", "c5", "c6"].includes(l.contestantId) && 
                !l.id.startsWith("l1_") && !l.id.startsWith("l2_") && !l.id.startsWith("l3_") && 
                !l.id.startsWith("l4_") && !l.id.startsWith("l5_") && !l.id.startsWith("l6_")
              );

              setContestants(cleanContestants);
              localStorage.setItem("weight_loss_contestants", JSON.stringify(cleanContestants));

              const sortedLogs = [...cleanLogs];
              sortedLogs.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime() ||
                                       new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
              setLogs(sortedLogs);
              localStorage.setItem("weight_loss_logs", JSON.stringify(sortedLogs));
              
              console.log("🚀 啟動時已完全覆蓋本地，拉取雲端試算表最新最乾淨的真實數據！");
            }
          }
        } catch (err) {
          console.error("Startup auto pull failed:", err);
        } finally {
          setIsSyncing(false);
        }
      };

      const timer = setTimeout(performInitialSync, 500);
      return () => clearTimeout(timer);
    }
  }, [syncSettings.sheetsUrl, hasAutoSynced]);

  // Helpers to persist state locally
  const saveContestantsLocally = (newList: Contestant[]) => {
    localStorage.setItem("weight_loss_contestants", JSON.stringify(newList));
    setContestants(newList);
  };

  const saveLogsLocally = (newList: WeightLog[]) => {
    localStorage.setItem("weight_loss_logs", JSON.stringify(newList));
    setLogs(newList);
  };

  // 1.9 Centralized Robust Pull-Merge-Push Synchronization Flow
  // Ensures any edit is merged with the latest remote data before posting,
  // preventing race conditions, over-writing and multi-user data-loss!
  const pullMergePushSync = async (
    localContestantsSnapshot: Contestant[],
    localLogsSnapshot: WeightLog[]
  ): Promise<{ contestants: Contestant[]; logs: WeightLog[] }> => {
    if (!syncSettings.sheetsUrl) {
      saveContestantsLocally(localContestantsSnapshot);
      saveLogsLocally(localLogsSnapshot);
      return { contestants: localContestantsSnapshot, logs: localLogsSnapshot };
    }

    try {
      // Step A: Pull latest remote database state first to avoid overwriting others' edits
      const getUrl = `${syncSettings.sheetsUrl}?t=${Date.now()}`;
      const response = await fetch(getUrl, { method: "GET", mode: "cors" });
      
      // 當前最新本地操作（排除任何示範噪點）
      const cleanLocalContestants = localContestantsSnapshot.filter(c => !["c1", "c2", "c3", "c4", "c5", "c6"].includes(c.id));
      const cleanLocalLogs = localLogsSnapshot.filter(l => 
        !["c1", "c2", "c3", "c4", "c5", "c6"].includes(l.contestantId) && 
        !l.id.startsWith("l1_") && !l.id.startsWith("l2_") && !l.id.startsWith("l3_") && 
        !l.id.startsWith("l4_") && !l.id.startsWith("l5_") && !l.id.startsWith("l6_")
      );

      let mergedContestants = [...cleanLocalContestants];
      let mergedLogs = [...cleanLocalLogs];

      if (response.ok) {
        const remoteData = await response.json();
        if (remoteData && !remoteData.error) {
          const remoteContestants: Contestant[] = remoteData.contestants || [];
          const remoteLogs: WeightLog[] = remoteData.logs || [];

          // 清洗雲端讀過來的舊有殘留示範資料
          const cleanRemoteContestants = remoteContestants.filter(c => !["c1", "c2", "c3", "c4", "c5", "c6"].includes(c.id));
          const cleanRemoteLogs = remoteLogs.filter(l => 
            !["c1", "c2", "c3", "c4", "c5", "c6"].includes(l.contestantId) && 
            !l.id.startsWith("l1_") && !l.id.startsWith("l2_") && !l.id.startsWith("l3_") && 
            !l.id.startsWith("l4_") && !l.id.startsWith("l5_") && !l.id.startsWith("l6_")
          );

          // Merge Contestants (Union based on ID):
          const contestantsMap = new Map<string, Contestant>();
          // 1. 先用雲端
          cleanRemoteContestants.forEach(c => contestantsMap.set(c.id, c));
          // 2. 本地最新有編輯權重覆寫
          cleanLocalContestants.forEach(c => contestantsMap.set(c.id, c));
          mergedContestants = Array.from(contestantsMap.values());

          // Merge Logs (Union based on unique ID):
          const logsMap = new Map<string, WeightLog>();
          cleanRemoteLogs.forEach(l => logsMap.set(l.id, l));
          cleanLocalLogs.forEach(l => logsMap.set(l.id, l));
          mergedLogs = Array.from(logsMap.values());
          mergedLogs.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime() ||
                                   new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        }
      }

      // Step B: Commit merged dataset to memory and local storage
      saveContestantsLocally(mergedContestants);
      saveLogsLocally(mergedLogs);

      // Step C: Push the merged clean state back to Google Sheets Web App (主動幫忙把雲端的噪點一起刷掉)
      await fetch(syncSettings.sheetsUrl, {
        method: "POST",
        mode: "cors",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({
          action: "save",
          contestants: mergedContestants,
          logs: mergedLogs,
        }),
      });

      // Update sync timestamp
      const now = new Date().toLocaleString("zh-TW", { timeZone: "Asia/Taipei" });
      handleSaveSyncSettings({
        ...syncSettings,
        lastSynced: now,
      });

      return { contestants: mergedContestants, logs: mergedLogs };
    } catch (e) {
      console.error("Auto Sync (Pull-Merge-Push) Flow Failed:", e);
      saveContestantsLocally(localContestantsSnapshot);
      saveLogsLocally(localLogsSnapshot);
      throw e;
    }
  };

  // 2. Data Action Handlers (CRUD)
  const handleAddContestant = async (newC: Contestant) => {
    const newList = [...contestants, newC];
    saveContestantsLocally(newList);
    try {
      await pullMergePushSync(newList, logs);
    } catch (e) {
      console.warn("Background upload failed, saved locally", e);
    }
  };

  const handleUpdateContestant = async (updatedC: Contestant) => {
    const newList = contestants.map(c => (c.id === updatedC.id ? updatedC : c));
    saveContestantsLocally(newList);
    try {
      await pullMergePushSync(newList, logs);
    } catch (e) {
      console.warn("Background upload failed, saved locally", e);
    }
  };

  const handleDeleteContestant = async (id: string) => {
    const newContestants = contestants.filter(c => c.id !== id);
    const newLogs = logs.filter(l => l.contestantId !== id);
    saveContestantsLocally(newContestants);
    saveLogsLocally(newLogs);
    try {
      await pullMergePushSync(newContestants, newLogs);
    } catch (e) {
      console.warn("Background upload failed, saved locally", e);
    }
  };

  const handleAddLog = async (newLogFields: Omit<WeightLog, "id" | "createdAt">) => {
    const newLog: WeightLog = {
      ...newLogFields,
      id: "log_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
      createdAt: new Date().toISOString(),
    };
    const newList = [...logs, newLog];
    saveLogsLocally(newList);
    // Explicitly returning promise so the caller can wait/display correct success feedback
    await pullMergePushSync(contestants, newList);
  };

  const handleUpdateLog = async (updatedLog: WeightLog) => {
    const newList = logs.map(l => (l.id === updatedLog.id ? updatedLog : l));
    saveLogsLocally(newList);
    try {
      await pullMergePushSync(contestants, newList);
    } catch (e) {
      console.warn("Background upload failed, saved locally", e);
    }
  };

  const handleDeleteLog = async (id: string) => {
    const newList = logs.filter(l => l.id !== id);
    saveLogsLocally(newList);
    try {
      await pullMergePushSync(contestants, newList);
    } catch (e) {
      console.warn("Background upload failed, saved locally", e);
    }
  };

  const handleSaveSyncSettings = (settings: SyncSettings) => {
    localStorage.setItem("weight_loss_sync", JSON.stringify(settings));
    setSyncSettings(settings);
  };

  // 3. Google Sheets Synchronization (Two-Way Union Merge)
  const handleSyncWithSheets = async () => {
    if (!syncSettings.sheetsUrl) return;
    
    setIsSyncing(true);
    setSyncFeedback(null);

    try {
      await pullMergePushSync(contestants, logs);
      const now = new Date().toLocaleString("zh-TW", { timeZone: "Asia/Taipei" });
      setSyncFeedback({ type: "success", text: `🎉 雙向雲端同步成功！${now}` });
    } catch (error: any) {
      console.error("Google Sheets manual sync failed:", error);
      setSyncFeedback({
        type: "error",
        text: `❌ 同步失敗。請檢查您的 Web App URL 權限設置或網路狀態。錯誤：${error.message}`,
      });
    } finally {
      setIsSyncing(false);
      // Auto dismiss feedback after 5s
      setTimeout(() => setSyncFeedback(null), 5000);
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f4e9] text-[#5d4037] font-sans flex flex-col antialiased border-t-8 border-[#74be62]">
      {/* Animal Crossing inspired header banner */}
      <header className="bg-[#fcfaf2] border-b-4 border-[#ebdcb9] shadow-inner sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col lg:flex-row items-center justify-between gap-4">
          
          <div className="text-center lg:text-left space-y-1 w-full lg:w-auto">
            <h1 className="text-xl sm:text-2xl font-black text-[#5c3e35] tracking-tight flex flex-wrap items-center justify-center lg:justify-start gap-2">
              💪 2026體脂肪討伐任務
              <span className="text-[10px] sm:text-[11px] bg-[#f79d5c] text-white border-2 border-white px-2 py-0.5 rounded-full uppercase tracking-wider font-extrabold shadow-sm">
                實驗中🧪
              </span>
            </h1>
            <p className="text-[10px] sm:text-xs text-[#a37e72] font-semibold flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-1">
              <span>暑期聯合實驗：</span>
              <span className="bg-[#ebdcb9]/50 px-2 py-0.5 rounded text-[#5d4037] border border-[#d8c89f] italic font-medium inline-block text-center mt-1 sm:mt-0">
                研究生體態對口試委員滿意度之顯著性影響 (P-value &lt; 0.05 警告!)
              </span>
            </p>
          </div>

          {/* Whimsical Wood-themed Navigation Controls */}
          <nav className="flex flex-wrap lg:flex-nowrap items-center justify-center gap-1.5 p-1.5 bg-[#e3d7ba] rounded-2xl border-3 border-[#ebdcb9] shadow-inner w-full lg:w-auto">
            <button
              onClick={() => setActiveTab("leaderboard")}
              className={`px-3 py-2 sm:px-5 sm:py-2.5 text-[10px] sm:text-xs font-black rounded-xl flex items-center gap-1 sm:gap-1.5 transition-all duration-150 cursor-pointer ${
                activeTab === "leaderboard"
                  ? "bg-[#f89b5c] text-white border-b-4 border-[#e07b3c] shadow-md scale-[1.03]"
                  : "text-[#5d4037] hover:bg-[#fcfaf2]/50 hover:text-[#38241d]"
              }`}
            >
              <Trophy className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 fill-[#fff]/20" />
              <span>排行榜 🏆</span>
            </button>
            
            <button
              onClick={() => setActiveTab("checkin")}
              className={`px-3 py-2 sm:px-5 sm:py-2.5 text-[10px] sm:text-xs font-black rounded-xl flex items-center gap-1 sm:gap-1.5 transition-all duration-150 cursor-pointer ${
                activeTab === "checkin"
                  ? "bg-[#74be62] text-white border-b-4 border-[#5aa148] shadow-md scale-[1.03]"
                  : "text-[#5d4037] hover:bg-[#fcfaf2]/50 hover:text-[#38241d]"
              }`}
            >
              <Scale className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span>數據申報 🍃</span>
            </button>
            
            <button
              onClick={() => setActiveTab("admin")}
              className={`px-3 py-2 sm:px-5 sm:py-2.5 text-[10px] sm:text-xs font-black rounded-xl flex items-center gap-1 sm:gap-1.5 transition-all duration-150 cursor-pointer ${
                activeTab === "admin"
                  ? "bg-[#8f6a48] text-white border-b-4 border-[#6e4e30] shadow-md scale-[1.03]"
                  : "text-[#5d4037] hover:bg-[#fcfaf2]/50 hover:text-[#38241d]"
              }`}
            >
              <Settings className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span>維護後台 ⚙️</span>
            </button>
          </nav>

        </div>
      </header>

      {/* Sheets Sync Notification Prompt Toast */}
      {syncFeedback && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-5">
          <div className={`p-4 rounded-3xl text-sm border-3 flex items-center justify-between gap-4 shadow-md ${
            syncFeedback.type === "success" 
              ? "bg-[#eaf5e6] border-[#74be62] text-[#3e7232] font-bold" 
              : "bg-[#feece7] border-[#f89b5c] text-[#863725] font-bold"
          }`}>
            <div className="flex items-center gap-2.5">
              {syncFeedback.type === "success" ? <CheckCircle className="w-5 h-5 text-[#5aa148] shrink-0" /> : <AlertCircle className="w-5 h-5 text-[#f89b5c] shrink-0" />}
              <span>{syncFeedback.text}</span>
            </div>
            <button 
              onClick={() => setSyncFeedback(null)} 
              className="text-[#a37e72] hover:text-[#5d4037] font-black text-lg px-2 py-0.5 rounded-full hover:bg-black/5"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Main Container Stage */}
      <main className="flex-1 py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <AnimatePresence mode="wait">
          {activeTab === "leaderboard" && (
            <motion.div
              key="leaderboard"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
            >
              <Leaderboard contestants={contestants} logs={logs} />
            </motion.div>
          )}

          {activeTab === "checkin" && (
            <motion.div
              key="checkin"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
            >
              <ParticipantInput 
                contestants={contestants} 
                logs={logs} 
                onAddLog={handleAddLog} 
                onUpdateContestant={handleUpdateContestant}
              />
            </motion.div>
          )}

          {activeTab === "admin" && (
            <motion.div
              key="admin"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
            >
              <AdminPanel
                contestants={contestants}
                logs={logs}
                syncSettings={syncSettings}
                onAddContestant={handleAddContestant}
                onUpdateContestant={handleUpdateContestant}
                onDeleteContestant={handleDeleteContestant}
                onUpdateLog={handleUpdateLog}
                onDeleteLog={handleDeleteLog}
                onSaveSyncSettings={handleSaveSyncSettings}
                onSyncWithSheets={handleSyncWithSheets}
                isSyncing={isSyncing}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Aesthetic Animal Crossing Footer */}
      <footer className="bg-[#fcfaf2] border-t-4 border-[#ebdcb9] py-8 mt-12 text-center text-xs text-[#a37e72]">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4 font-bold">
          <p className="flex items-center gap-1.5 justify-center">
            <span>🍃 2026體脂肪討伐任務研究生討伐委員會</span>
            <span className="text-[#ebdcb9]">|</span>
            <span>口試滿意度顯著提升保證小組 🌲</span>
          </p>
          <div className="flex gap-4">
            <span className="hover:text-[#5d4037] transition cursor-pointer">論文P-Value計算機</span>
            <span className="text-[#ebdcb9]">|</span>
            <span className="hover:text-[#5d4037] transition cursor-pointer">教授開恩咖啡因推薦 ☕</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
