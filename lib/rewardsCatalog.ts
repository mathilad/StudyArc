export type RewardCategory =
  | "clock-faces"
  | "stopwatch-layouts"
  | "themes"
  | "page-themes"
  | "completion-effects"
  | "focus-effects"
  | "timer-animations"
  | "focus-sounds"
  | "loading-screens"
  | "milestone-effects";

export type RewardItem = {
  id: string;
  name: string;
  category: RewardCategory;
  price: number;
  levelRequired: number;
  description: string;
  colors: [string, string, string];
  icon: string;
  previewVariant: number;
};

export const REWARD_CATEGORY_META: Record<RewardCategory, { label: string; shortLabel: string; description: string; icon: string }> = {
  "clock-faces": { label: "Clock Faces", shortLabel: "Clocks", description: "Change the main timer clock treatment.", icon: "time-outline" },
  "stopwatch-layouts": { label: "Stopwatch Layouts", shortLabel: "Layouts", description: "Change how the stopwatch workspace is arranged.", icon: "stopwatch-outline" },
  "themes": { label: "Full App Themes", shortLabel: "Themes", description: "A complete visual treatment for StudyArc.", icon: "color-palette-outline" },
  "page-themes": { label: "Page Themes", shortLabel: "Pages", description: "Style a specific StudyArc workspace.", icon: "albums-outline" },
  "completion-effects": { label: "Completion Effects", shortLabel: "Complete", description: "Effects shown after meaningful completed work.", icon: "sparkles-outline" },
  "focus-effects": { label: "Focus Effects", shortLabel: "Focus", description: "Subtle visual effects while a timer is running.", icon: "radio-button-on-outline" },
  "timer-animations": { label: "Timer Animations", shortLabel: "Timer FX", description: "Motion around the active study timer.", icon: "pulse-outline" },
  "focus-sounds": { label: "Focus Sounds", shortLabel: "Sounds", description: "Optional soundscapes for focused study.", icon: "headset-outline" },
  "loading-screens": { label: "Loading Screens", shortLabel: "Loading", description: "Alternative StudyArc loading experiences.", icon: "hourglass-outline" },
  "milestone-effects": { label: "Milestone Effects", shortLabel: "Milestones", description: "Special effects for major achievements and level-ups.", icon: "trophy-outline" },
};

const palettes: [string, string, string][] = [
  ["#7C4DFF", "#B784FF", "#181022"],
  ["#2D7DFF", "#79B8FF", "#071625"],
  ["#00A884", "#76E6C3", "#071A17"],
  ["#D96A2B", "#FFC173", "#211208"],
  ["#DD4B87", "#FF9FC4", "#220B17"],
  ["#7759D5", "#A99AF7", "#0F0B25"],
  ["#0D8DAA", "#72D7E8", "#07191E"],
  ["#B99A28", "#F6DB75", "#201A06"],
  ["#B34C4C", "#F09898", "#210A0A"],
  ["#576A7E", "#A7B8CB", "#0B1118"],
  ["#5F8A3B", "#A7D477", "#0D1708"],
  ["#8C4AA8", "#DB9AF4", "#17091D"],
];

const definitions: Array<{
  category: RewardCategory;
  names: string[];
  min: number;
  max: number;
  descriptions: string[];
}> = [
  {
    category: "clock-faces",
    names: ["Classic Digital","Precision","Minimal Line","Analog Arc","Flip Board","Arc Ring","Segment","Neon Grid","Aurora","Academic","Deep Space","Nature Dial","Glass","Retro LCD","Cyber","Focus"],
    min: 300, max: 550,
    descriptions: ["Balanced digital face","Technical timing face","Clean low-distraction face","Analog-inspired timer","Mechanical flip treatment","Circular progress clock","Segmented display","Bright grid clock","Soft aurora clock","Study-first clock","Space-inspired timer","Organic dial","Layered glass face","Retro calculator display","High-energy cyber face","Distraction-minimal focus clock"],
  },
  {
    category: "stopwatch-layouts",
    names: ["Classic","Circular","Digital Deck","Lap Studio","Ring Workspace","Neon Console","Split Focus","Wide Desk","Compact Flow","Zen Timer"],
    min: 450, max: 700,
    descriptions: ["Balanced default-style layout","Circular timer-first layout","Large digital workspace","Lap-focused workspace","Progress-ring layout","High-contrast console","Split timer and context","Desktop-first wide layout","Small-phone optimized layout","Minimal low-noise layout"],
  },
  {
    category: "themes",
    names: ["Midnight","Aurora","Forest","Ocean","Cosmic","Neon","Ember","Minimal","Paper","Glass","Monochrome","StudyArc Signature"],
    min: 700, max: 1000,
    descriptions: ["Deep violet night system","Aurora-inspired surfaces","Calm green study system","Cool ocean workspace","Dark cosmic surfaces","Electric accent system","Warm ember surfaces","Quiet reduced-chrome theme","Academic paper-inspired theme","Layered translucent surfaces","Near-monochrome focus theme","Premium StudyArc visual system"],
  },
  {
    category: "page-themes",
    names: ["Timer Night","Planner Aurora","Subjects Archive","Paper Lab Pro","Journey Glow","Revise Calm","Assignments Grid","Statistics Glass","Study Hub Focus","Exam Room"],
    min: 550, max: 700,
    descriptions: ["Timer-specific dark treatment","Planner-specific aurora treatment","Library-style Subjects view","Paper practice treatment","Journey progress treatment","Calm Revise treatment","Structured assignment treatment","Glass analytics treatment","Focused Study Hub treatment","Exam simulation treatment"],
  },
  {
    category: "completion-effects",
    names: ["Arc Spark","Confetti","Glow Burst","Arc Wave","Stars","Fireworks","Pulse Bloom","Ribbon Sweep","Crystal Pop","Orbit Burst","Comet Trail","Gold Finish"],
    min: 250, max: 500,
    descriptions: ["Signature completion sparkle","Light confetti finish","Expanding glow finish","StudyArc wave finish","Star field finish","Celebration burst","Soft pulse bloom","Ribbon motion","Crystal-style pop","Orbiting particles","Fast comet finish","Premium gold finish"],
  },
  {
    category: "focus-effects",
    names: ["Soft Glow","Circle Fill","Energy Wave","Calm Fade","Minimal","Breathing Halo","Study Beam","Deep Focus","Orbit","Quiet Pulse"],
    min: 300, max: 550,
    descriptions: ["Subtle active glow","Progressive circle fill","Moving energy wave","Slow calming fade","Very restrained effect","Breathing focus halo","Directional focus beam","Dimmed deep-focus field","Slow orbit treatment","Low-motion pulse"],
  },
  {
    category: "timer-animations",
    names: ["Filling Circle","Gradient Flow","Particle Ring","Nature Bloom","Wave Motion","Minimal Tick","Arc Sweep","Orbit Clock","Liquid Fill","Focus Grid"],
    min: 350, max: 600,
    descriptions: ["Circular progress motion","Flowing gradient motion","Particle-based ring","Growing organic progress","Wave-based progress","Minimal ticking accent","Sweeping arc animation","Orbital timer motion","Liquid progress fill","Grid-based progress"],
  },
  {
    category: "focus-sounds",
    names: ["Rain","Forest","Library","Ocean","Cafe","Brown Noise","Fireplace","Night Rain","River","Wind","Soft Train","Deep Noise"],
    min: 250, max: 450,
    descriptions: ["Steady rain soundscape","Forest ambience","Quiet library ambience","Ocean ambience","Low cafe ambience","Low-frequency noise","Fireplace ambience","Darker rain ambience","Flowing river ambience","Soft wind ambience","Distant train ambience","Deeper neutral noise"],
  },
  {
    category: "loading-screens",
    names: ["Arc Rise","Orbit","Study Desk","Constellation","Minimal Line","Aurora Load"],
    min: 350, max: 600,
    descriptions: ["Signature rising arc","Orbital StudyArc loader","Study-desk inspired loader","Constellation loading scene","Reduced-motion loader","Aurora loading scene"],
  },
  {
    category: "milestone-effects",
    names: ["Level Arc","Trophy Burst","Crown Glow","Constellation Win","Mastery Ring","Signature Ascend"],
    min: 400, max: 700,
    descriptions: ["Arc-shaped level-up effect","Trophy celebration","Crown-like achievement glow","Constellation milestone effect","Mastery ring celebration","Premium StudyArc level-up effect"],
  },
];

const iconFor: Record<RewardCategory, string> = {
  "clock-faces": "time-outline",
  "stopwatch-layouts": "stopwatch-outline",
  themes: "color-palette-outline",
  "page-themes": "albums-outline",
  "completion-effects": "sparkles-outline",
  "focus-effects": "radio-button-on-outline",
  "timer-animations": "pulse-outline",
  "focus-sounds": "headset-outline",
  "loading-screens": "hourglass-outline",
  "milestone-effects": "trophy-outline",
};

const slug = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
const round25 = (value: number) => Math.round(value / 25) * 25;

export const REWARD_CATALOG: RewardItem[] = definitions.flatMap((group, groupIndex) =>
  group.names.map((name, index) => {
    const ratio = group.names.length <= 1 ? 0 : index / (group.names.length - 1);
    const price = round25(group.min + (group.max - group.min) * ratio);
    const levelRequired = index >= group.names.length - 1 ? 30 : index >= group.names.length - 3 ? 20 : index >= group.names.length - 5 ? 10 : 0;
    const colors = palettes[(groupIndex * 3 + index) % palettes.length];
    return {
      id: `${group.category}:${slug(name)}`,
      name,
      category: group.category,
      price,
      levelRequired,
      description: group.descriptions[index] ?? `${name} customization for StudyArc.`,
      colors,
      icon: iconFor[group.category],
      previewVariant: index % 6,
    };
  }),
);

export const rewardItemById = (id: string | null | undefined) => REWARD_CATALOG.find(item => item.id === id);
export const rewardItemsFor = (category: RewardCategory) => REWARD_CATALOG.filter(item => item.category === category);
export const REWARD_ITEM_COUNT = REWARD_CATALOG.length;
