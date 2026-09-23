import type { RewardCategory } from "./rewardsCatalog";

export const REWARD_FLAG_DEFAULTS = {
  rewardsSystem: true,
  xpLevels: true,
  arcCoins: true,
  arcStore: true,
  rewardHistory: true,
  rewardMilestones: true,
  rewardPopups: true,
  appThemes: true,
  pageThemes: true,
  clockFaces: true,
  stopwatchLayouts: true,
  timerAnimations: true,
  completionEffects: true,
  focusEffects: true,
  focusSounds: true,
  loadingScreens: true,
  milestoneEffects: true,
} as const;

export type RewardFeatureKey = keyof typeof REWARD_FLAG_DEFAULTS;

export const REWARD_FEATURE_META: Array<{
  key: RewardFeatureKey;
  title: string;
  subtitle: string;
  icon: string;
  group: "core" | "store";
}> = [
  { key: "rewardsSystem", title: "Rewards system", subtitle: "Master switch for StudyArc XP, Arc Coins and reward customizations. Existing data is preserved while off.", icon: "gift-outline", group: "core" },
  { key: "xpLevels", title: "XP & Levels", subtitle: "Allow students to earn XP, level up and see progression.", icon: "sparkles-outline", group: "core" },
  { key: "arcCoins", title: "Arc Coins", subtitle: "Allow Arc Coin earnings, balances and spending.", icon: "diamond-outline", group: "core" },
  { key: "arcStore", title: "Arc Store", subtitle: "Show the Arc Store and allow students to buy customizations.", icon: "bag-handle-outline", group: "core" },
  { key: "rewardHistory", title: "Arc Coin history", subtitle: "Show students their reward and purchase transaction history.", icon: "receipt-outline", group: "core" },
  { key: "rewardMilestones", title: "Milestones & achievements", subtitle: "Award milestone rewards for study hours, streaks, syllabus progress and similar achievements.", icon: "trophy-outline", group: "core" },
  { key: "rewardPopups", title: "Reward pop-ups", subtitle: "Show lightweight XP/coin feedback and level-up celebrations.", icon: "notifications-outline", group: "core" },
  { key: "appThemes", title: "App theme variations", subtitle: "Allow full-app themes bought from the Arc Store to be previewed, purchased and equipped.", icon: "color-palette-outline", group: "store" },
  { key: "pageThemes", title: "Individual page themes", subtitle: "Allow page-specific StudyArc visual themes.", icon: "albums-outline", group: "store" },
  { key: "clockFaces", title: "Clock faces", subtitle: "Allow alternate timer clock faces and their animated previews.", icon: "time-outline", group: "store" },
  { key: "stopwatchLayouts", title: "Stopwatch layouts", subtitle: "Allow alternate timer/stopwatch page layouts.", icon: "stopwatch-outline", group: "store" },
  { key: "timerAnimations", title: "Timer animations", subtitle: "Allow animated timer rings, waves, particles and motion styles.", icon: "pulse-outline", group: "store" },
  { key: "completionEffects", title: "Completion effects", subtitle: "Allow purchased completion celebrations after study sessions.", icon: "sparkles-outline", group: "store" },
  { key: "focusEffects", title: "Focus effects", subtitle: "Allow visual focus effects while a study timer is active.", icon: "radio-button-on-outline", group: "store" },
  { key: "focusSounds", title: "Focus sounds", subtitle: "Allow purchased ambient focus sounds and previews.", icon: "headset-outline", group: "store" },
  { key: "loadingScreens", title: "Loading screens", subtitle: "Allow alternate StudyArc loading experiences.", icon: "hourglass-outline", group: "store" },
  { key: "milestoneEffects", title: "Milestone effects", subtitle: "Allow purchased level-up and achievement celebration styles.", icon: "ribbon-outline", group: "store" },
];

const categoryFlagMap: Record<RewardCategory, RewardFeatureKey> = {
  "clock-faces": "clockFaces",
  "stopwatch-layouts": "stopwatchLayouts",
  themes: "appThemes",
  "page-themes": "pageThemes",
  "completion-effects": "completionEffects",
  "focus-effects": "focusEffects",
  "timer-animations": "timerAnimations",
  "focus-sounds": "focusSounds",
  "loading-screens": "loadingScreens",
  "milestone-effects": "milestoneEffects",
};

export const rewardFlagEnabled = (flags: Record<string, boolean> | null | undefined, key: RewardFeatureKey) =>
  flags?.[key] !== false;

export const rewardCategoryEnabled = (flags: Record<string, boolean> | null | undefined, category: RewardCategory) =>
  rewardFlagEnabled(flags, "rewardsSystem") &&
  rewardFlagEnabled(flags, "arcStore") &&
  rewardFlagEnabled(flags, categoryFlagMap[category]);

export const rewardStoreEnabled = (flags: Record<string, boolean> | null | undefined) =>
  rewardFlagEnabled(flags, "rewardsSystem") &&
  rewardFlagEnabled(flags, "arcCoins") &&
  rewardFlagEnabled(flags, "arcStore");

export const rewardProgressEnabled = (flags: Record<string, boolean> | null | undefined) =>
  rewardFlagEnabled(flags, "rewardsSystem") &&
  (rewardFlagEnabled(flags, "xpLevels") || rewardFlagEnabled(flags, "arcCoins"));

export const rewardFeatureDefaults = () => ({ ...REWARD_FLAG_DEFAULTS });
