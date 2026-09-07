import * as ImagePicker from "expo-image-picker";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { findTopic, type StudyMedium, type SubjectName } from "../data/subjects";
import { cacheKey, enqueueMutation, makeUuid, queuedMutationsFor, readJson, removeQueuedMutation, writeJson } from "../lib/offlineStore";
import { supabase } from "../lib/supabase";
import { useAuth } from "./AuthContext";
import { useOffline } from "./OfflineContext";

export type StudentProfile = {
  fullName: string;
  school: string;
  district: string;
  examYear: number | null;
  wakeTime: string;
  morningRoutineMinutes: number;
  sleepTime: string;
  selfStudyHours: number;
  subjectChoices: string[];
  medium: StudyMedium;
  avatarUrl: string | null;
  onboardingComplete: boolean;
};

export type ClassSchedule = {
  id: string;
  subjectName: string;
  title: string;
  classType: "Theory" | "Revision" | "Paper" | "Extra Class" | "Paper Discussion";
  deliveryMode: "Physical" | "Online";
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  preReviewMinutes: number;
  travelMinutes: number;
};

export type TestMark = {
  id: string;
  subjectName: string;
  testDate: string;
  title: string;
  mcqScore: number | null;
  mcqTotal: number | null;
  essayScore: number | null;
  essayTotal: number | null;
  mcqPercent: number | null;
  essayPercent: number | null;
  weakTopics: string[];
};

export type TopicProgress = {
  id: string;
  subjectName: string;
  topicName: string;
  coverage: number;
  knowledge: number;
  memory: number;
  performance: number;
  lastStudiedAt: string | null;
  nextRecallAt: string | null;
};

export type SubtopicCoverage = {
  id: string;
  subjectName: string;
  topicName: string;
  subtopicName: string;
  covered: boolean;
  source: "Manual" | "Class";
  coveredAt: string | null;
};

export type DailyReview = {
  id: string;
  reviewDate: string;
  pagesStudied: number;
  pagesRevised: number;
  completedBlocks: number;
  dayRating: number;
  attentionTopics: string[];
  createdAt: string;
};

export type NewClass = Omit<ClassSchedule, "id"> & { id?: string };
export type NewTestMark = Omit<TestMark, "id" | "mcqPercent" | "essayPercent">;
export type TopicProgressInput = Omit<TopicProgress, "id">;
export type DailyReviewInput = Omit<DailyReview, "id" | "createdAt">;

const DEFAULT_PROFILE: StudentProfile = {
  fullName: "",
  school: "",
  district: "",
  examYear: null,
  wakeTime: "06:00",
  morningRoutineMinutes: 90,
  sleepTime: "22:30",
  selfStudyHours: 3,
  subjectChoices: [],
  medium: "English",
  avatarUrl: null,
  onboardingComplete: false,
};

type StudentCache = {
  profile: StudentProfile;
  classes: ClassSchedule[];
  testMarks: TestMark[];
  topicProgress: TopicProgress[];
  subtopicCoverage: SubtopicCoverage[];
  dailyReviews: DailyReview[];
};

type StudentContextValue = {
  profile: StudentProfile;
  classes: ClassSchedule[];
  testMarks: TestMark[];
  topicProgress: TopicProgress[];
  subtopicCoverage: SubtopicCoverage[];
  dailyReviews: DailyReview[];
  todayReview: DailyReview | null;
  loading: boolean;
  error: string | null;
  refreshStudentData: () => Promise<void>;
  saveProfile: (updates: Partial<StudentProfile>) => Promise<void>;
  completeOnboarding: (profile: StudentProfile) => Promise<void>;
  addClass: (value: NewClass) => Promise<void>;
  deleteClass: (id: string) => Promise<void>;
  addTestMark: (value: NewTestMark) => Promise<void>;
  deleteTestMark: (id: string) => Promise<void>;
  upsertTopicProgress: (value: TopicProgressInput) => Promise<void>;
  setSubtopicCovered: (subjectName: string, topicName: string, subtopicName: string, covered: boolean, source?: "Manual" | "Class") => Promise<void>;
  setSubtopicsCovered: (subjectName: string, topicName: string, subtopicNames: string[], covered: boolean, source?: "Manual" | "Class") => Promise<void>;
  setLessonCovered: (subjectName: string, topicName: string, covered: boolean, source?: "Manual" | "Class") => Promise<void>;
  saveDailyReview: (value: DailyReviewInput) => Promise<void>;
  uploadAvatar: () => Promise<string | null>;
};

const StudentContext = createContext<StudentContextValue | null>(null);
const KINDS = [
  "student_profile_upsert",
  "class_upsert",
  "class_delete",
  "test_mark_upsert",
  "test_mark_delete",
  "topic_progress_upsert",
  "syllabus_coverage_upsert",
  "daily_review_upsert",
];

const dateKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const percent = (score: number | null, total: number | null) => score == null || total == null || total <= 0 ? null : Math.max(0, Math.min(100, score / total * 100));
const mediumFrom = (value: unknown): StudyMedium => value === "Sinhala" ? "Sinhala" : "English";
const mapProfile = (r: any): StudentProfile => ({
  fullName: r?.full_name ?? "",
  school: r?.school ?? "",
  district: r?.district ?? "",
  examYear: r?.exam_year ?? null,
  wakeTime: r?.wake_time ?? "06:00",
  morningRoutineMinutes: Number(r?.morning_routine_minutes ?? 90),
  sleepTime: r?.sleep_time ?? "22:30",
  selfStudyHours: Number(r?.self_study_hours ?? 3),
  subjectChoices: r?.subject_choices ?? [],
  medium: mediumFrom(r?.medium),
  avatarUrl: r?.avatar_url ?? null,
  onboardingComplete: Boolean(r?.onboarding_complete),
});

export function StudentProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { isOnline, checking, syncTick, refreshConnectivity } = useOffline();
  const [profile, setProfile] = useState(DEFAULT_PROFILE);
  const [classes, setClasses] = useState<ClassSchedule[]>([]);
  const [testMarks, setTestMarks] = useState<TestMark[]>([]);
  const [topicProgress, setTopicProgress] = useState<TopicProgress[]>([]);
  const [subtopicCoverage, setSubtopicCoverage] = useState<SubtopicCoverage[]>([]);
  const [dailyReviews, setDailyReviews] = useState<DailyReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const currentUser = useRef(user?.id);
  const profileRevision = useRef(0);
  const latestProfile = useRef(profile);
  const [loadedUser, setLoadedUser] = useState<string | undefined>();
  if (currentUser.current !== user?.id) {
    currentUser.current = user?.id;
    profileRevision.current += 1;
    latestProfile.current = DEFAULT_PROFILE;
  }
  const applyProfile = useCallback((value: StudentProfile) => {
    latestProfile.current = value;
    setProfile(value);
  }, []);


  const persist = useCallback(async (
    p = profile,
    c = classes,
    t = testMarks,
    tp = topicProgress,
    sc = subtopicCoverage,
    r = dailyReviews,
  ) => {
    if (!user) return;
    await writeJson(cacheKey(user.id, "student"), {
      profile: latestProfile.current.onboardingComplete && !p.onboardingComplete ? latestProfile.current : p,
      classes: c,
      testMarks: t,
      topicProgress: tp,
      subtopicCoverage: sc,
      dailyReviews: r,
    } satisfies StudentCache);
  }, [classes, dailyReviews, profile, subtopicCoverage, testMarks, topicProgress, user]);

  const loadCache = useCallback(async () => {
    if (!user) return;
    const revision = profileRevision.current;
    const x = await readJson<StudentCache>(cacheKey(user.id, "student"), {
      profile: DEFAULT_PROFILE,
      classes: [],
      testMarks: [],
      topicProgress: [],
      subtopicCoverage: [],
      dailyReviews: [],
    });
    if (currentUser.current !== user.id || revision !== profileRevision.current) return;
    const pending = await queuedMutationsFor(user.id, ["student_profile_upsert"]);
    if (currentUser.current !== user.id || revision !== profileRevision.current) return;
    const cachedProfile = { ...DEFAULT_PROFILE, .5מ�����k�w��`��ජනය", "සම්බන්ධීකරණය", "ප්‍රජනනය", "චලනය"]),
      t("BIO-06", "Genetics", ["Mendelian genetics", "Chromosomal basis", "Linkage", "Pedigrees", "Population genetics"], "Unit 06", "ජාන විද්‍යාව", ["මෙන්ඩලීය ජාන විද්‍යාව", "වර්ණදේහීය පදනම", "සම්බන්ධතාව", "වංශාවලි", "ජනගහන ජාන විද්‍යාව"]),
      t("BIO-07", "Molecular Biology & Recombinant DNA Technology", ["DNA organization", "Replication", "Gene expression", "Mutations", "Recombinant DNA", "Biotechnology"], "Unit 07", "අණුක ජීව විද්‍යාව හා ප්‍රතිසංයෝජිත DNA තාක්ෂණය", ["DNA සංවිධානය", "ප්‍රතිවලනය", "ජාන ප්‍රකාශනය", "විකෘති", "ප්‍රතිසංයෝජිත DNA", "ජෛව තාක්ෂණය"]),
      t("BIO-08", "Environmental Biology", ["Populations", "Communities", "Ecosystems", "Biodiversity", "Conservation", "Pollution"], "Unit 08", "පාරිසරික ජීව විද්‍යාව", ["ජනගහන", "සමූහ", "පරිසර පද්ධති", "ජෛව විවිධත්වය", "සංරක්ෂණය", "දූෂණය"]),
      t("BIO-09", "Microbiology", ["Microbial diversity", "Growth", "Control", "Microbes and disease", "Useful microorganisms"], "Unit 09", "ක්ෂුද්‍රජීව විද්‍යාව", ["ක්ෂුද්‍රජීව විවිධත්වය", "වර්ධනය", "පාලනය", "ක්ෂුද්‍රජීවීන් හා රෝග", "ප්‍රයෝජනවත් ක්ෂුද්‍රජීවීන්"]),
      t("BIO-10", "Applied Biology", ["Health applications", "Agriculture", "Food and industry", "Biological resources", "Modern applications"], "Unit 10", "ව්‍යවහාරික ජීව විද්‍යාව", ["සෞඛ්‍ය යෙදුම්", "කෘෂිකර්මය", "ආහාර හා කර්මාන්ත", "ජීව සම්පත්", "නවීන යෙදුම්"]),
    ],
  },
  Physics: {
    icon: "atom", color: "#63B8FF", accent: "#2A7DD0",
    topics: [
      t("PHY-01", "Measurement", ["SI units", "Dimensions", "Measuring instruments", "Errors and uncertainty"], "Unit 01", "මිනුම්", ["SI ඒකක", "මාන", "මිනුම් උපකරණ", "දෝෂ හා අවිනිශ්චිතතාව"]),
      t("PHY-02A", "Kinematics", ["Motion in one dimension", "Motion graphs", "Projectile motion"], "Unit 02A", "චලිත විද්‍යාව", ["ඒකමාන චලිතය", "චලිත ප්‍රස්තාර", "ප්‍රක්ෂේප චලිතය"]),
      t("PHY-02B", "Forces", ["Newton's laws", "Friction", "Equilibrium of forces"], "Unit 02B", "බල", ["නිව්ටන් නියම", "ඝර්ෂණය", "බල සමතුලිතතාව"]),
      t("PHY-02C", "Momentum", ["Linear momentum", "Impulse", "Collisions and conservation"], "Unit 02C", "ගම්‍යතාව", ["රේඛීය ගම්‍යතාව", "ආවේගය", "ගැටීම් හා සංස්ථිතිය"]),
      t("PHY-02D", "Work and Energy", ["Work", "Kinetic and potential energy", "Power and energy conservation"], "Unit 02D", "කාර්යය හා ශක්තිය", ["කාර්යය", "චාලක හා විභව ශක්තිය", "ක්ෂමතාව හා ශක්ති සංස්ථිතිය"]),
      t("PHY-02E", "Rotational Mechanics", ["Angular motion", "Torque", "Angular momentum"], "Unit 02E", "භ්‍රමණ යාන්ත්‍ර විද්‍යාව", ["කෝණික චලිතය", "ව්‍යාවර්තය", "කෝණික ගම්‍යතාව"]),
      t("PHY-02F", "Fluid Mechanics", ["Pressure in fluids", "Buoyancy", "Fluid flow"], "Unit 02F", "ද්‍රව යාන්ත්‍ර විද්‍යාව", ["ද්‍රව පීඩනය", "උත්ප්ලාවකතාව", "ද්‍රව ප්‍රවාහය"]),
      t("PHY-03", "Oscillations & Waves", ["SHM", "Wave motion", "Sound", "Interference", "Diffraction", "Geometrical optics"], "Unit 03", "දෝලන හා තරංග", ["සරල අනුවර්තී චලිතය", "තරංග චලිතය", "ශබ්දය", "අන්තරායනය", "විවර්තනය", "ජ්‍යාමිතික ප්‍රකාශ විද්‍යාව"]),
      t("PHY-LIGHT", "Light", ["Propagation of light", "Reflection", "Refraction", "Total internal reflection", "Prisms and dispersion", "Spherical mirrors", "Thin lenses", "Optical instruments", "Interference", "Diffraction", "Polarization"], "Unit 03 · Light", "ආලෝකය", ["ආලෝකයේ ප්‍රචාරණය", "පරාවර්තනය", "වර්තනය", "පූර්ණ අභ්‍යන්තර පරාවර්තනය", "ප්‍රිස්ම හා වර්ණ වික්ෂේපණය", "ගෝලීය දර්පණ", "තුනී කාච", "ප්‍රකාශ උපකරණ", "අන්තරායනය", "විවර්තනය", "ධ්‍රැවණය"]),
      t("PHY-04", "Thermal Physics", ["Temperature", "Thermal expansion", "Calorimetry", "Gas laws", "Thermodynamics"], "Unit 04", "තාප භෞතික විද්‍යාව", ["උෂ්ණත්වය", "තාප ප්‍රසාරණය", "තාපමානමිතිය", "වායු නීති", "තාපගති විද්‍යාව"]),
      t("PHY-05", "Gravitational Field", ["Field strength", "Potential", "Satellites", "Planetary motion"], "Unit 05", "ගුරුත්වාකර්ෂණ ක්ෂේත්‍රය", ["ක්ෂේත්‍ර තීව්‍රතාව", "විභවය", "උපග්‍රහ", "ග්‍රහ චලිතය"]),
      t("PHY-06", "Electrostatic Field", ["Coulomb law", "Electric field", "Potential", "Capacitance"], "Unit 06", "විද්‍යුත් ස්ථිතික ක්ෂේත්‍රය", ["කූලොම්බ් නීතිය", "විද්‍යුත් ක්ෂේත්‍රය", "විභවය", "ධාරිතාව"]),
      t("PHY-07", "Magnetic Field", ["Magnetic force", "Fields due to currents", "Electromagnetic induction", "AC principles"], "Unit 07", "චුම්බක ක්ෂේත්‍රය", ["චුම්බක බලය", "ධාරා නිසා ඇති ක්ෂේත්‍ර", "විද්‍යුත් චුම්බක ප්‍රේරණය", "ප්‍රත්‍යාවර්ත ධාරා මූලධර්ම"]),
      t("PHY-08", "Current Electricity", ["Current and resistance", "DC circuits", "Kirchhoff laws", "Electrical measurements"], "Unit 08", "ධාරා විද්‍යුතය", ["ධාරාව හා ප්‍රතිරෝධය", "සෘජු ධාරා පරිපථ", "කර්චොෆ් නීති", "විද්‍යුත් මිනුම්"]),
      t("PHY-09", "Electronics", ["Semiconductors", "Diodes", "Transistors", "Operational circuits", "Digital electronics"], "Unit 09", "ඉලෙක්ට්‍රොනික විද්‍යාව", ["අර්ධ සන්නායක", "ඩයෝඩ", "ට්‍රාන්සිස්ටර", "ක්‍රියාකාරී පරිපථ", "ඩිජිටල් ඉලෙක්ට්‍රොනික විද්‍යාව"]),
      t("PHY-10", "Mechanical Properties of Matter", ["Elasticity", "Surface tension", "Viscosity", "Material behaviour"], "Unit 10", "පදාර්ථයේ යාන්ත්‍රික ගුණ", ["ප්‍රත්‍යාස්ථතාව", "පෘෂ්ඨ ආතතිය", "දුස්ස්‍රාවිතාව", "ද්‍රව්‍ය හැසිරීම"]),
      t("PHY-11", "Matter & Radiation", ["Thermal radiation", "Photoelectric effect", "Matter waves", "X-rays", "Radioactivity", "Nuclear physics"], "Unit 11", "පදාර්ථය හා විකිරණ", ["තාප විකිරණ", "ප්‍රකාශ විද්‍යුත් ආචරණය", "පදාර්ථ තරංග", "එක්ස් කිරණ", "විකිරණශීලීතාව", "න්‍යෂ්ටික භෞතික විද්‍යාව"]),
    ],
  },
  "Agricultural Science": {
    icon: "sprout", color: "#E9B35B", accent: "#B77625",
    topics: [
      t("AGR-01", "Agricultural Environment", ["Agro-ecosystems", "Climate", "Soil", "Water resources", "Sustainability"], "Grade 12", "කෘෂිකාර්මික පරිසරය", ["කෘෂි පරිසර පද්ධති", "දේශගුණය", "පස", "ජල සම්පත්", "තිරසාරභාවය"]),
      t("AGR-02", "Soil & Plant Nutrition", ["Soil properties", "Soil fertility", "Plant nutrients", "Fertilizers", "Soil conservation"], "Grade 12", "පස හා ශාක පෝෂණය", ["පසේ ගුණ", "පසේ සාරවත්භාවය", "ශාක පෝෂක", "පොහොර", "පස සංරක්ෂණය"]),
      t("AGR-03", "Crop Production", ["Land preparation", "Planting material", "Crop establishment", "Cultural practices", "Harvesting"], "Grade 12", "බෝග නිෂ්පාදනය", ["භූමි සකස් කිරීම", "රෝපණ ද්‍රව්‍ය", "බෝග ස්ථාපනය", "වගා ක්‍රියාකාරකම්", "අස්වනු නෙලීම"]),
      t("AGR-04", "Plant Propagation & Improvement", ["Seeds", "Vegetative propagation", "Nursery management", "Crop improvement"], "Grade 12", "ශාක ප්‍රචාරණය හා වැඩිදියුණු කිරීම", ["බීජ", "ශාකීය ප්‍රචාරණය", "තවාන් කළමනාකරණය", "බෝග වැඩිදියුණු කිරීම"]),
      t("AGR-05", "Pest, Disease & Weed Management", ["Pest classification", "Crop diseases", "Weeds", "Integrated pest management", "Safe pesticide use"], "Grade 13", "පළිබෝධ, රෝග හා වල්පැළ කළමනාකරණය", ["පළිබෝධ වර්ගීකරණය", "බෝග රෝග", "වල්පැළ", "ඒකාබද්ධ පළිබෝධ කළමනාකරණය", "ආරක්ෂිත පළිබෝධනාශක භාවිතය"]),
      t("AGR-06", "Animal Production", ["Livestock systems", "Nutrition", "Breeding", "Health", "Housing"], "Grade 13", "සත්ත්ව නිෂ්පාදනය", ["පශු පාලන පද්ධති", "පෝෂණය", "අභිජනනය", "සෞඛ්‍යය", "නවාතැන්"]),
      t("AGR-07", "Agricultural Engineering", ["Farm power", "Machinery", "Irrigation", "Drainage", "Protected agriculture"], "Grade 13", "කෘෂිකාර්මික ඉංජිනේරු විද්‍යාව", ["ගොවිපළ බලශක්තිය", "යන්ත්‍රෝපකරණ", "වාරිමාර්ග", "ජලාපවහනය", "ආරක්ෂිත කෘෂිකර්මය"]),
      t("AGR-08", "Post-harvest & Food Technology", ["Post-harvest losses", "Storage", "Processing", "Food quality and safety"], "Grade 13", "පශ්චාත් අස්වනු හා ආහාර තාක්ෂණය", ["පශ්චාත් අස්වනු හානි", "ගබඩා කිරීම", "සැකසීම", "ආහාර ගුණාත්මකභාවය හා ආරක්ෂාව"]),
      t("AGR-09", "Agribusiness & Farm Management", ["Farm records", "Economics", "Marketing", "Entrepreneurship", "Decision making"], "Grade 13", "කෘෂි ව්‍යාපාර හා ගොවිපළ කළමනාකරණය", ["ගොවිපළ වාර්තා", "ආර්ථික විද්‍යාව", "අලෙවිකරණය", "ව්‍යවසායකත්වය", "තීරණ ගැනීම"]),
      t("AGR-10", "Sustainable Agriculture", ["Resource management", "Climate challenges", "Organic approaches", "Health and safety", "Current issues"], "Grade 13", "තිරසාර කෘෂිකර්මය", ["සම්පත් කළමනාකරණය", "දේශගුණික අභියෝග", "කාබනික ප්‍රවේශ", "සෞඛ්‍ය හා ආරක්ෂාව", "වත්මන් ගැටලු"]),
    ],
  },
  Chemistry: {
    icon: "flask-outline", color: "#FF8DA1", accent: "#D84E6B",
    topics: [
      t("CHE-01", "Atomic Structure", ["Atomic models", "Electronic structure", "Spectra", "Periodic trends"], "Unit 01", "පරමාණුක ව්‍යුහය", ["පරමාණුක ආකෘති", "ඉලෙක්ට්‍රෝනික ව්‍යුහය", "වර්ණාවලි", "ආවර්තිතා ප්‍රවණතා"]),
      t("CHE-02", "Structure & Bonding", ["Ionic bonding", "Covalent bonding", "Shapes", "Intermolecular forces", "Solids"], "Unit 02", "ව්‍යුහය හා බන්ධන", ["අයනික බන්ධන", "සහසංයුජ බන්ධන", "අණුක හැඩ", "අන්තර්අණුක බල", "ඝන ද්‍රව්‍ය"]),
      t("CHE-03", "Chemical Calculations", ["Mole concept", "Stoichiometry", "Solutions", "Titrations"], "Unit 03", "රසායනික ගණනය", ["මෝල් සංකල්පය", "ස්ටොයිකියෝමිතිය", "ද්‍රාවණ", "ටයිට්‍රේෂන්"]),
      t("CHE-04", "Gaseous State of Matter", ["Gas laws", "Ideal gas equation", "Kinetic theory", "Real gases"], "Unit 04", "පදාර්ථයේ වායුමය තත්ත්වය", ["වායු නීති", "පරිපූර්ණ වායු සමීකරණය", "චාලක වාදය", "සැබෑ වායු"]),
      t("CHE-05", "Energetics", ["Enthalpy", "Hess law", "Bond energies", "Entropy and feasibility"], "Unit 05", "ශක්ති විද්‍යාව", ["එන්තැල්පිය", "හෙස් නීතිය", "බන්ධන ශක්ති", "එන්ට්‍රොපිය හා ස්වයංසිද්ධතාව"]),
      t("CHE-06", "Chemistry of s, p & d Block Elements", ["s-block", "p-block", "d-block", "Coordination chemistry", "Qualitative analysis"], "Unit 06", "s, p හා d කාණ්ඩ මූලද්‍රව්‍ය රසායනය", ["s කාණ්ඩය", "p කාණ්ඩය", "d කාණ්ඩය", "සංකීර්ණ සංයෝග රසායනය", "ගුණාත්මක විශ්ලේෂණය"]),
      t("CHE-07", "Basic Concepts of Organic Chemistry", ["Nomenclature", "Isomerism", "Electronic effects", "Reaction mechanisms"], "Unit 07", "කාබනික රසායනයේ මූලික සංකල්ප", ["නාමකරණය", "සමාවයවිකතාව", "ඉලෙක්ට්‍රෝනික ආචරණ", "ප්‍රතික්‍රියා යාන්ත්‍රණ"]),
      t("CHE-08", "Hydrocarbons & Halohydrocarbons", ["Alkanes", "Alkenes", "Alkynes", "Aromatic compounds", "Halogeno compounds"], "Unit 08", "හයිඩ්‍රොකාබන හා හැලෝහයිඩ්‍රොකාබන", ["ඇල්කේන", "ඇල්කීන", "ඇල්කයින", "ඇරෝමැටික් සංයෝග", "හැලෝජනිත සංයෝග"]),
      t("CHE-09", "Oxygen-containing Organic Compounds", ["Alcohols", "Phenols", "Aldehydes", "Ketones", "Carboxylic acids", "Derivatives"], "Unit 09", "ඔක්සිජන් අඩංගු කාබනික සංයෝග", ["ඇල්කොහොල්", "ෆීනෝල්", "ඇල්ඩිහයිඩ", "කීටෝන", "කාබොක්සිලික් අම්ල", "ව්‍යුත්පන්න"]),
      t("CHE-10", "Nitrogen-containing Organic Compounds", ["Amines", "Amides", "Amino acids", "Nitrogen compounds"], "Unit 10", "නයිට්‍රජන් අඩංගු කාබනික සංයෝග", ["ඇමීන", "ඇමයිඩ", "ඇමයිනෝ අම්ල", "නයිට්‍රජන් සංයෝග"]),
      t("CHE-11", "Chemical Kinetics", ["Rate laws", "Order", "Activation energy", "Catalysis"], "Unit 11", "රසායනික චාලක විද්‍යාව", ["වේග නීති", "ප්‍රතික්‍රියා අනුපිළිවෙළ", "සක්‍රීයන ශක්තිය", "උත්ප්‍රේරණය"]),
      t("CHE-12", "Equilibrium", ["Chemical equilibrium", "Acid-base", "Solubility", "Ionic equilibrium"], "Unit 12", "සමතුලිතතාව", ["රසායනික සමතුලිතතාව", "අම්ල-භස්ම", "ද්‍රාව්‍යතාව", "අයනික සමතුලිතතාව"]),
      t("CHE-13", "Electrochemistry", ["Redox", "Electrochemical cells", "Electrode potentials", "Electrolysis"], "Unit 13", "විද්‍යුත් රසායනය", ["ඔක්සිකරණ-අඩුකිරීම", "විද්‍යුත් රසායනික කෝෂ", "ඉලෙක්ට්‍රෝඩ විභව", "විද්‍යුත් විච්ඡේදනය"]),
      t("CHE-14", "Industrial Chemistry & Environmental Pollution", ["Industrial processes", "Raw materials", "Polymers", "Air and water pollution", "Green chemistry"], "Unit 14", "කාර්මික රසායනය හා පාරිසරික දූෂණය", ["කාර්මික ක්‍රියාවලි", "අමුද්‍රව්‍ය", "බහුඅණුක", "වායු හා ජල දූෂණය", "හරිත රසායනය"]),
    ],
  },
  ICT: {
    icon: "laptop", color: "#48D6D2", accent: "#168C91",
    topics: [
      t("ICT-01", "Concept of ICT", ["Data and information", "Information systems", "ICT in society", "Emerging trends"], "Competency 01", "තොරතුරු හා සන්නිවේදන තාක්ෂණ සංකල්පය", ["දත්ත හා තොරතුරු", "තොරතුරු පද්ධති", "සමාජයේ ICT", "නව ප්‍රවණතා"]),
      t("ICT-02", "Computer Fundamentals", ["Hardware", "Software", "Computer architecture", "Input/output", "Storage"], "Competency 02", "පරිගණක මූලධර්ම", ["දෘඩාංග", "මෘදුකාංග", "පරිගණක වාස්තු විද්‍යාව", "ආදානය/ප්‍රතිදානය", "ගබඩා කිරීම"]),
      t("ICT-03", "Data Representation", ["Number systems", "Boolean logic", "Character encoding", "Digital media"], "Competency 03", "දත්ත නිරූපණය", ["සංඛ්‍යා පද්ධති", "බූලීය තර්කය", "අක්ෂර කේතනය", "ඩිජිටල් මාධ්‍ය"]),
      t("ICT-04", "Operating Systems", ["Processes", "Memory", "File systems", "Utilities", "User interfaces"], "Competency 04", "මෙහෙයුම් පද්ධති", ["ක්‍රියාවලි", "මතකය", "ගොනු පද්ධති", "උපයෝගිතා", "පරිශීලක අතුරුමුහුණත්"]),
      t("ICT-05", "Computer Networks", ["Network models", "Media", "Protocols", "Internet", "Network security"], "Competency 05", "පරිගණක ජාල", ["ජාල ආකෘති", "සම්ප්‍රේෂණ මාධ්‍ය", "ප්‍රොටෝකෝල", "අන්තර්ජාලය", "ජාල ආරක්ෂාව"]),
      t("ICT-06", "Systems Analysis & Design", ["Requirements", "Models", "Development life cycle", "Testing", "Implementation"], "Competency 06", "පද්ධති විශ්ලේෂණය හා සැලසුම", ["අවශ්‍යතා", "ආකෘති", "සංවර්ධන ජීවන චක්‍රය", "පරීක්ෂණය", "ක්‍රියාත්මක කිරීම"]),
      t("ICT-07", "Database Management", ["Data models", "Relational databases", "Normalization", "SQL", "Database security"], "Competency 07", "දත්ත සමුදා කළමනාකරණය", ["දත්ත ආකෘති", "සම්බන්ධතා දත්ත සමුදා", "සාමාන්‍යකරණය", "SQL", "දත්ත සමුදා ආරක්ෂාව"]),
      t("ICT-08", "Programming", ["Algorithms", "Control structures", "Functions", "Data structures", "Problem solving"], "Competency 08", "ක්‍රමලේඛනය", ["ඇල්ගොරිතම", "පාලන ව්‍යුහ", "ශ්‍රිත", "දත්ත ව්‍යුහ", "ගැටලු විසඳීම"]),
      t("ICT-09", "Web Development", ["Web architecture", "HTML", "CSS", "Client/server concepts", "Web applications"], "Competency 09", "වෙබ් සංවර්ධනය", ["වෙබ් වාස්තු විද්‍යාව", "HTML", "CSS", "සේවාදායක/ග්‍රාහක සංකල්ප", "වෙබ් යෙදුම්"]),
      t("ICT-10", "Internet of Things & New Technologies", ["Sensors", "Embedded systems", "Cloud concepts", "Mobile computing", "AI awareness"], "Competency 10", "වස්තු අන්තර්ජාලය හා නව තාක්ෂණ", ["සංවේදක", "අන්තර්ගත පද්ධති", "වලාකුළු සංකල්ප", "ජංගම පරිගණනය", "කෘත්‍රිම බුද්ධිය පිළිබඳ අවබෝධය"]),
      t("ICT-11", "Information Security", ["Threats", "Authentication", "Cryptography concepts", "Privacy", "Safe use"], "Competency 11", "තොරතුරු ආරක්ෂාව", ["තර්ජන", "සත්‍යාපනය", "ගුප්තකේතන සංකල්ප", "පෞද්ගලිකත්වය", "ආරක්ෂිත භාවිතය"]),
      t("ICT-12", "ICT Project & Problem Solving", ["Planning", "Documentation", "Implementation", "Evaluation", "Presentation"], "Competency 12", "ICT ව්‍යාපෘතිය හා ගැටලු විසඳීම", ["සැලසුම් කිරීම", "ලේඛනගත කිරීම", "ක්‍රියාත්මක කිරීම", "ඇගයීම", "ඉදිරිපත් කිරීම"]),
    ],
  },
};

export const ONBOARDING_SUBJECT_GROUPS: { title: string; options: OnboardingSubjectChoice[] }[] = [
  { title: "Choose your first subject", options: ["Biology", "Combined Mathematics"] },
  { title: "Choose your second subject", options: ["Physics", "Agricultural Science"] },
  { title: "Choose your third subject", options: ["Chemistry", "ICT"] },
];

export function expandSubjectChoices(choices: string[]): SubjectName[] {
  const result: SubjectName[] = [];
  choices.forEach((choice) => {
    if (choice === "Combined Mathematics") {
      result.push("Pure Mathematics", "Applied Mathematics");
      return;
    }
    if (choice in SUBJECTS) result.push(choice as SubjectName);
  });
  return Array.from(new Set(result));
}

export function firstTopicFor(subjectName: string): TopicConfig | undefined {
  return SUBJECTS[subjectName as SubjectName]?.topics[0];
}

export function findTopic(subjectName: string, topicName: string): TopicConfig | undefined {
  return SUBJECTS[subjectName as SubjectName]?.topics.find((topic) => topic.title === topicName || topic.id === topicName);
}

export function topicDisplayName(subjectName: string, topicName: string, medium: StudyMedium = "English") {
  const topic = findTopic(subjectName, topicName);
  if (!topic) return topicName;
  return medium === "Sinhala" ? topic.sinhala : topic.title;
}

export function subtopicDisplayName(subjectName: string, topicName: string, subtopicName: string, medium: StudyMedium = "English") {
  const topic = findTopic(subjectName, topicName);
  if (!topic || medium === "English") return subtopicName;
  const index = topic.subtopics.indexOf(subtopicName);
  return index >= 0 ? (topic.subtopicsSinhala[index] ?? subtopicName) : subtopicName;
}
