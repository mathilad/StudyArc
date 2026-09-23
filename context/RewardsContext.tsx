import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { cacheKey, enqueueMutation, makeUuid, markQueuedMutationFailed, queuedMutationsFor, readJson, removeQueuedMutation, writeJson } from "../lib/offlineStore";
import { HOUR_MILESTONES, STREAK_MILESTONES, SYLLABUS_MILESTONES, levelFromXp, levelProgress, rewardLabelForMilestone, studySessionReward } from "../lib/rewardEngine";
import { REWARD_CATALOG, type RewardCategory, type RewardItem, rewardItemById } from "../lib/rewardsCatalog";
import { rewardCategoryEnabled, rewardFlagEnabled, rewardStoreEnabled } from "../lib/rewardFeatureFlags";
import { supabase } from "../lib/supabase";
import { useAuth } from "./AuthContext";
import { useAppConfig } from "./AppConfigContext";
import { useOffline } from "./OfflineContext";
import type { PaperSection, StudyType } from "./StudyContext";

export type RewardTransaction = {
  id: string;
  eventKey: string;
  kind: "study" | "assignment" | "task" | "daily" | "paper" | "milestone" | "test" | "purchase";
  coins: number;
  xp: number;
  label: string;
  itemId: string | null;
  createdAt: string;
};

type RewardSnapshot = {
  transactions: RewardTransaction[];
  ownedItemIds: string[];
  equipped: Partial<Record<RewardCategory, string>>;
};

export type RewardFeedback = {
  transaction: RewardTransaction;
  levelBefore: number;
  levelAfter: number;
  levelUp: boolean;
};

type RewardContextValue = {
  transactions: RewardTransaction[];
  coinBalance: number;
  lifetimeCoins: number;
  xp: number;
  level: number;
  levelCurrentXp: number;
  levelRequiredXp: number;
  levelRatio: number;
  ownedItemIds: string[];
  equipped: Partial<Record<RewardCategory, string>>;
  lastReward: RewardFeedback | null;
  loading: boolean;
  catalog: RewardItem[];
  purchaseItem: (itemId: string) => Promise<void>;
  equipItem: (itemId: string) => Promise<void>;
  awardStudySession: (value: { id: string; durationSeconds: number; studyType: StudyType; paperSection?: PaperSection | null }) => Promise<void>;
  awardAssignment: (assignmentId: string, label?: string) => Promise<void>;
  awardTask: (taskId: string, label?: string) => Promise<void>;
  awardDailyPlan: (date: string) => Promise<void>;
  awardPersonalBest: (testId: string, label?: string) => Promise<void>;
  awardMilestone: (code: string) => Promise<void>;
  clearLastReward: () => void;
  refreshRewards: () => Promise<void>;
  isOwned: (itemId: string) => boolean;
  isEquipped: (itemId: string) => boolean;
  equippedItem: (category: RewardCategory) => RewardItem | undefined;
};

const EMPTY: RewardSnapshot = { transactions: [], ownedItemIds: [], equipped: {} };
const KINDS = ["reward_event", "reward_purchase", "reward_equip"];
const RewardsContext = createContext<RewardContextValue | null>(null);

const mapLedger = (row: any): RewardTransaction => ({
  id: row.id,
  eventKey: row.event_key,
  kind: row.kind,
  coins: Number(row.coins_delta ?? 0),
  xp: Number(row.xp_delta ?? 0),
  label: row.label ?? "StudyArc reward",
  itemId: row.item_id ?? null,
  createdAt: row.created_at,
});

export function RewardsProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { settings } = useAppConfig();
  const { isOnline, syncTick } = useOffline();
  const featureFlags = settings.featureFlags;
  const rewardsOn = rewardFlagEnabled(featureFlags, "rewardsSystem");
  const xpOn = rewardsOn && rewardFlagEnabled(featureFlags, "xpLevels");
  const coinsOn = rewardsOn && rewardFlagEnabled(featureFlags, "arcCoins");
  const storeOn = rewardStoreEnabled(featureFlags);
  const milestonesOn = rewardsOn && rewardFlagEnabled(featureFlags, "rewardMilestones");
  const popupsOn = rewardsOn && rewardFlagEnabled(featureFlags, "rewardPopups");
  const [snapshot, setSnapshot] = useState<RewardSnapshot>(EMPTY);
  const snapshotRef = useRef<RewardSnapshot>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [lastReward, setLastReward] = useState<RewardFeedback | null>(null);
  const key = user ? cacheKey(user.id, "arc-rewards") : "";

  const applySnapshot = useCallback(async (next: RewardSnapshot) => {
    const normalized: RewardSnapshot = {
      transactions: [...next.transactions].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 500),
      ownedItemIds: [...new Set(next.ownedItemIds)],
      equipped: next.equipped ?? {},
    };
    snapshotRef.current = normalized;
    setSnapshot(normalized);
    if (user) await writeJson(key, normalized);
  }, [key, user]);

  const loadCache = useCallback(async () => {
    if (!user) {
      snapshotRef.current = EMPTY;
      setSnapshot(EMPTY);
      setLoading(false);
      return;
    }
    const cached = await readJson<RewardSnapshot>(key, EMPTY);
    snapshotRef.current = cached;
    setSnapshot(cached);
    setLoading(false);
  }, [key, user]);

  const refreshRewards = useCallback(async () => {
    if (!user) return;
    if (!isOnline) { await loadCache(); return; }
    try {
      const [ledger, inventory, loadout] = await Promise.all([
        supabase.from("reward_ledger").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(500),
        supabase.from("reward_inventory").select("item_id").eq("user_id", user.id),
        supabase.from("reward_loadout").select("category,item_id").eq("user_id", user.id),
      ]);
      if (ledger.error || inventory.error || loadout.error) throw ledger.error ?? inventory.error ?? loadout.error;
      const equipped: Partial<Record<RewardCategory, string>> = {};
      for (const row of loadout.data ?? []) equipped[row.category as RewardCategory] = row.item_id;
      await applySnapshot({
        transactions: (ledger.data ?? []).map(mapLedger),
        ownedItemIds: (inventory.data ?? []).map((row: any) => row.item_id),
        equipped,
      });
    } catch {
      await loadCache();
    } finally {
      setLoading(false);
    }
  }, [applySnapshot, isOnline, loadCache, user]);

  const syncQueue = useCallback(async () => {
    if (!user || !isOnline) return;
    const queue = await queuedMutationsFor(user.id, KINDS);
    for (const item of queue) {
      try {
        let result: any;
        if (item.kind === "reward_event") {
          result = await supabase.rpc("apply_studyarc_reward_event", {
            p_event_key: item.payload.eventKey,
            p_kind: item.payload.eventKind,
            p_source_id: item.payload.sourceId ?? null,
            p_label: item.payload.label,
          });
        } else if (item.kind === "reward_purchase") {
          result = await supabase.rpc("purchase_studyarc_reward", { p_item_id: item.payload.itemId });
        } else {
          result = await supabase.rpc("equip_studyarc_reward", { p_item_id: item.payload.itemId });
        }
        if (result?.error) throw result.error;
        await removeQueuedMutation(item.id);
      } catch (error) {
        await markQueuedMutationFailed(item.id, error);
        break;
      }
    }
  }, [isOnline, user]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { void loadCache(); return; }
    void loadCache().then(async () => {
      if (isOnline) {
        await syncQueue();
        await refreshRewards();
      }
    });
  }, [authLoading, isOnline, loadCache, refreshRewards, syncQueue, user]);

  useEffect(() => {
    if (!user || !isOnline) return;
    void syncQueue().then(refreshRewards);
  }, [isOnline, refreshRewards, syncQueue, syncTick, user]);

  useEffect(() => { if (!popupsOn && lastReward) setLastReward(null); }, [lastReward, popupsOn]);

  const totals = useMemo(() => {
    const coins = snapshot.transactions.reduce((sum, row) => sum + row.coins, 0);
    const lifetime = snapshot.transactions.reduce((sum, row) => sum + Math.max(0, row.coins), 0);
    const totalXp = snapshot.transactions.reduce((sum, row) => sum + Math.max(0, row.xp), 0);
    return { coins: Math.max(0, coins), lifetime, xp: totalXp };
  }, [snapshot.transactions]);
  const progress = useMemo(() => levelProgress(totals.xp), [totals.xp]);

  const grant = useCallback(async (value: { eventKey: string; eventKind: string; sourceId?: string | null; label: string; coins: number; xp: number; kind: RewardTransaction["kind"] }) => {
    if (!user || !rewardsOn) return;
    const awardedCoins = coinsOn ? Math.max(0, Math.floor(value.coins)) : 0;
    const awardedXp = xpOn ? Math.max(0, Math.floor(value.xp)) : 0;
    if (awardedCoins <= 0 && awardedXp <= 0) return;
    const current = snapshotRef.current;
    if (current.transactions.some(row => row.eventKey === value.eventKey)) return;
    const beforeXp = current.transactions.reduce((sum, row) => sum + Math.max(0, row.xp), 0);
    const transaction: RewardTransaction = {
      id: makeUuid(),
      eventKey: value.eventKey,
      kind: value.kind,
      coins: awardedCoins,
      xp: awardedXp,
      label: value.label,
      itemId: null,
      createdAt: new Date().toISOString(),
    };
    await applySnapshot({ ...current, transactions: [transaction, ...current.transactions] });
    const beforeLevel = levelFromXp(beforeXp);
    const afterLevel = levelFromXp(beforeXp + transaction.xp);
    if (popupsOn) setLastReward({ transaction, levelBefore: beforeLevel, levelAfter: afterLevel, levelUp: xpOn && afterLevel > beforeLevel });
    await enqueueMutation({ userId: user.id, kind: "reward_event", payload: { eventKey: value.eventKey, eventKind: value.eventKind, sourceId: value.sourceId ?? null, label: value.label } });
    if (isOnline) void syncQueue().then(refreshRewards);
  }, [applySnapshot, coinsOn, isOnline, popupsOn, refreshRewards, rewardsOn, syncQueue, user, xpOn]);

  const awardStudySession = useCallback(async (value: { id: string; durationSeconds: number; studyType: StudyType; paperSection?: PaperSection | null }) => {
    const reward = studySessionReward(value);
    await grant({ eventKey: `study:${value.id}`, eventKind: "study_session", sourceId: value.id, label: reward.label, coins: reward.coins, xp: reward.xp, kind: value.studyType === "Past Papers" ? "paper" : "study" });
  }, [grant]);

  const awardAssignment = useCallback((assignmentId: string, label = "Assignment completed") =>
    grant({ eventKey: `assignment:${assignmentId}`, eventKind: "assignment_completion", sourceId: assignmentId, label, coins: 8, xp: 25, kind: "assignment" }), [grant]);

  const awardTask = useCallback((taskId: string, label = "Planned task completed") =>
    grant({ eventKey: `task:${taskId}`, eventKind: "task_completion", sourceId: taskId, label, coins: 3, xp: 10, kind: "task" }), [grant]);

  const awardDailyPlan = useCallback((date: string) =>
    grant({ eventKey: `daily-plan:${date}`, eventKind: "daily_plan", sourceId: date, label: "Daily plan completed", coins: 8, xp: 20, kind: "daily" }), [grant]);

  const awardPersonalBest = useCallback((testId: string, label = "New test personal best") =>
    grant({ eventKey: `test-best:${testId}`, eventKind: "test_personal_best", sourceId: testId, label, coins: 10, xp: 30, kind: "test" }), [grant]);

  const awardMilestone = useCallback(async (code: string) => {
    if (!milestonesOn) return;
    const hour = HOUR_MILESTONES.find(x => code === `hours:${x.hours}`);
    const streak = STREAK_MILESTONES.find(x => code === `streak:${x.days}`);
    const syllabus = SYLLABUS_MILESTONES.find(x => code === `syllabus:${x.percent}`);
    const fixed = code === "first-paper" ? { coins: 15, xp: 40 } : null;
    const reward = hour ?? streak ?? syllabus ?? fixed;
    if (!reward) return;
    await grant({ eventKey: `milestone:${code}`, eventKind: "milestone", sourceId: code, label: rewardLabelForMilestone(code), coins: reward.coins, xp: reward.xp, kind: "milestone" });
  }, [grant, milestonesOn]);

  const purchaseItem = useCallback(async (itemId: string) => {
    if (!user) throw new Error("Sign in to use the Arc Store.");
    if (!storeOn) throw new Error("The Arc Store is currently disabled by the StudyArc administrator.");
    const item = rewardItemById(itemId);
    if (!item || !rewardCategoryEnabled(featureFlags, item.category)) throw new Error("This customization category is currently disabled by the StudyArc administrator.");
    const current = snapshotRef.current;
    if (current.ownedItemIds.includes(itemId)) return;
    const balance = Math.max(0, current.transactions.reduce((sum, row) => sum + row.coins, 0));
    const currentXp = current.transactions.reduce((sum, row) => sum + Math.max(0, row.xp), 0);
    const level = levelFromXp(currentXp);
    if (xpOn && level < item.levelRequired) throw new Error(`Reach Level ${item.levelRequired} before unlocking this item.`);
    if (balance < item.price) throw new Error(`You need ${item.price - balance} more Arc Coins.`);
    const transaction: RewardTransaction = {
      id: makeUuid(), eventKey: `purchase:${itemId}`, kind: "purchase", coins: -item.price, xp: 0,
      label: `Purchased ${item.name}`, itemId, createdAt: new Date().toISOString(),
    };
    await applySnapshot({ ...current, transactions: [transaction, ...current.transactions], ownedItemIds: [...current.ownedItemIds, itemId] });
    await enqueueMutation({ userId: user.id, kind: "reward_purchase", payload: { itemId } });
    if (isOnline) void syncQueue().then(refreshRewards);
  }, [applySnapshot, featureFlags, isOnline, refreshRewards, storeOn, syncQueue, user, xpOn]);

  const equipItem = useCallback(async (itemId: string) => {
    if (!user) return;
    const item = rewardItemById(itemId);
    if (!item || !rewardCategoryEnabled(featureFlags, item.category)) throw new Error("This customization category is currently disabled by the StudyArc administrator.");
    const current = snapshotRef.current;
    if (!current.ownedItemIds.includes(itemId)) throw new Error("Buy this customization before equipping it.");
    const next = { ...current, equipped: { ...current.equipped, [item.category]: itemId } };
    await applySnapshot(next);
    await enqueueMutation({ userId: user.id, kind: "reward_equip", payload: { itemId } });
    if (isOnline) void syncQueue().then(refreshRewards);
  }, [applySnapshot, featureFlags, isOnline, refreshRewards, syncQueue, user]);

  const isOwned = useCallback((itemId: string) => snapshot.ownedItemIds.includes(itemId), [snapshot.ownedItemIds]);
  const isEquipped = useCallback((itemId: string) => Object.values(snapshot.equipped).includes(itemId), [snapshot.equipped]);
  const equippedItem = useCallback((category: RewardCategory) => rewardCategoryEnabled(featureFlags, category) ? rewardItemById(snapshot.equipped[category]) : undefined, [featureFlags, snapshot.equipped]);

  const value = useMemo<RewardContextValue>(() => ({
    transactions: snapshot.transactions,
    coinBalance: totals.coins,
    lifetimeCoins: totals.lifetime,
    xp: totals.xp,
    level: progress.level,
    levelCurrentXp: progress.current,
    levelRequiredXp: progress.required,
    levelRatio: progress.ratio,
    ownedItemIds: snapshot.ownedItemIds,
    equipped: snapshot.equipped,
    lastReward,
    loading,
    catalog: storeOn ? REWARD_CATALOG.filter(item => rewardCategoryEnabled(featureFlags, item.category)) : [],
    purchaseItem,
    equipItem,
    awardStudySession,
    awardAssignment,
    awardTask,
    awardDailyPlan,
    awardPersonalBest,
    awardMilestone,
    clearLastReward: () => setLastReward(null),
    refreshRewards,
    isOwned,
    isEquipped,
    equippedItem,
  }), [awardAssignment, awardDailyPlan, awardMilestone, awardPersonalBest, awardStudySession, awardTask, equipItem, equippedItem, featureFlags, isEquipped, isOwned, lastReward, loading, progress, purchaseItem, refreshRewards, snapshot.equipped, snapshot.ownedItemIds, snapshot.transactions, storeOn, totals]);

  return <RewardsContext.Provider value={value}>{children}</RewardsContext.Provider>;
}

export function useRewards() {
  const value = useContext(RewardsContext);
  if (!value) throw new Error("useRewards must be used inside RewardsProvider.");
  return value;
}
