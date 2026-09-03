export type SubjectName =
  | "Pure Mathematics"
  | "Applied Mathematics"
  | "Biology"
  | "Physics"
  | "Agricultural Science"
  | "Chemistry"
  | "ICT";

export type OnboardingSubjectChoice =
  | "Biology"
  | "Combined Mathematics"
  | "Physics"
  | "Agricultural Science"
  | "Chemistry"
  | "ICT";

export type TopicConfig = {
  id: string;
  title: string;
  sinhala?: string;
  unit?: string;
  subtopics: string[];
};

export type SubjectConfig = {
  icon: any;
  color: string;
  accent: string;
  topics: TopicConfig[];
};

const t = (id: string, title: string, subtopics: string[], unit?: string, sinhala?: string): TopicConfig => ({
  id,
  title,
  subtopics,
  unit,
  sinhala,
});

/**
 * Syllabus structure follows Sri Lankan G.C.E. A/L curriculum/resource-book
 * organization from the National Institute of Education (NIE). Topic labels are
 * intentionally concise for mobile navigation; subtopics are study-planning labels,
 * not a replacement for the official syllabus.
 */
export const SUBJECTS: Record<SubjectName, SubjectConfig> = {
  "Pure Mathematics": {
    icon: "function-variant",
    color: "#B784FF",
    accent: "#7B4DD8",
    topics: [
      t("PM-01", "Mathematical Induction", ["Principle of induction", "Proofs by induction", "Recursive results"], "I-01", "ගණිතමය අභ්‍යුහනය"),
      t("PM-02", "Functions", ["Domain and range", "Composite functions", "Inverse functions", "Graphs and transformations"], "I-02", "ශ්‍රිත"),
      t("PM-03", "Quadratic Equations", ["Roots and coefficients", "Nature of roots", "Quadratic inequalities"], "I-03", "වර්ගජ සමීකරණ"),
      t("PM-04", "Polynomials", ["Factor and remainder theorems", "Polynomial equations", "Relations between roots"], "I-04", "බහුපද"),
      t("PM-05", "Permutations & Combinations", ["Counting principles", "Permutations", "Combinations", "Restricted arrangements"], "I-05", "සංකරණ හා සංයෝජන"),
      t("PM-06", "Binomial Theorem", ["Expansion", "General term", "Approximations", "Identities"], "I-06", "ද්විපද ප්‍රමේයය"),
      t("PM-07", "Sequences & Series", ["Arithmetic progressions", "Geometric progressions", "Sigma notation", "Series"], "I-07", "අනුක්‍රම හා ශ්‍රේණි"),
      t("PM-08", "Complex Numbers", ["Argand diagram", "Modulus and argument", "Polar form", "De Moivre theorem"], "I-08", "සංකීර්ණ සංඛ්‍යා"),
      t("PM-09", "Trigonometry", ["Identities", "Equations", "Inverse trigonometric functions", "Applications"], "I-09", "ත්‍රිකෝණමිතිය"),
      t("PM-10", "Coordinate Geometry", ["Straight lines", "Circles", "Conics", "Parametric forms"], "I-10", "ඛණ්ඩාංක ජ්‍යාමිතිය"),
      t("PM-11", "Limits", ["Algebraic limits", "Trigonometric limits", "Continuity", "Asymptotic behaviour"], "I-11", "සීමා"),
      t("PM-12", "Differentiation", ["Rules of differentiation", "Implicit differentiation", "Tangents and normals", "Maxima and minima"], "I-12", "අවකලනය"),
      t("PM-13", "Integration", ["Standard integrals", "Substitution", "Integration by parts", "Definite integrals and area"], "I-13", "අනුකලනය"),
      t("PM-14", "Differential Equations", ["First-order equations", "Variable separable equations", "Applications"], "I-14", "අවකල සමීකරණ"),
    ],
  },
  "Applied Mathematics": {
    icon: "vector-line",
    color: "#8E9CFF",
    accent: "#5265D8",
    topics: [
      t("AM-01", "Vectors", ["Vector algebra", "Scalar product", "Vector equations", "Geometric applications"], "II-01", "දෛශික"),
      t("AM-02", "Rectilinear Motion", ["Displacement and velocity", "Acceleration", "Motion graphs", "Kinematic equations"], "II-02", "සරල රේඛීය චලිතය"),
      t("AM-03", "Statics", ["Forces", "Equilibrium", "Moments", "Friction"], "II-03", "ස්ථිති විද්‍යාව"),
      t("AM-04", "Dynamics", ["Newton's laws", "Connected particles", "Friction", "Variable forces"], "II-04", "ගති විද්‍යාව"),
      t("AM-05", "Projectile Motion", ["Two-dimensional motion", "Range", "Greatest height", "Trajectory"], "II-05", "ප්‍රක්ෂේප චලිතය"),
      t("AM-06", "Work, Energy & Power", ["Work-energy principle", "Power", "Conservation of energy", "Potential energy"], "II-06", "කාර්යය, ශක්තිය හා බලය"),
      t("AM-07", "Impulse & Momentum", ["Impulse", "Linear momentum", "Collisions", "Conservation laws"], "II-07", "ආවේගය හා ගම්‍යතාව"),
      t("AM-08", "Circular Motion", ["Angular motion", "Centripetal force", "Vertical circle", "Banked motion"], "II-08", "වෘත්තීය චලිතය"),
      t("AM-09", "Simple Harmonic Motion", ["SHM equation", "Energy in SHM", "Period", "Applications"], "II-09", "සරල අනුවර්තී චලිතය"),
      t("AM-10", "Centre of Gravity & Frameworks", ["Centre of mass", "Laminae", "Frameworks", "Equilibrium"], "II-10", "ගුරුත්ව කේන්ද්‍රය හා රාමු"),
      t("AM-11", "Probability", ["Sample spaces", "Conditional probability", "Independent events", "Random variables"], "II-11", "සම්භාවිතාව"),
      t("AM-12", "Statistics", ["Data summaries", "Measures of dispersion", "Distributions", "Correlation and regression"], "II-12", "සංඛ්‍යානය"),
    ],
  },
  Biology: {
    icon: "dna",
    color: "#65D79A",
    accent: "#2B9D67",
    topics: [
      t("BIO-01", "Introduction to Biology", ["Nature of life", "Scientific method", "Levels of organization", "Biological investigations"], "Unit 01"),
      t("BIO-02", "Chemical & Cellular Basis of Life", ["Biomolecules", "Cell structure", "Membranes", "Enzymes", "Cell cycle and division"], "Unit 02"),
      t("BIO-03", "Evolution & Diversity of Organisms", ["Origin and evolution", "Classification", "Microorganisms", "Plant diversity", "Animal diversity"], "Unit 03"),
      t("BIO-04", "Plant Form & Function", ["Plant tissues", "Water relations", "Mineral nutrition", "Transport", "Photosynthesis", "Plant growth and reproduction"], "Unit 04"),
      t("BIO-05", "Animal Form & Function", ["Nutrition", "Gas exchange", "Transport", "Excretion", "Coordination", "Reproduction", "Movement"], "Unit 05"),
      t("BIO-06", "Genetics", ["Mendelian genetics", "Chromosomal basis", "Linkage", "Pedigrees", "Population genetics"], "Unit 06"),
      t("BIO-07", "Molecular Biology & Recombinant DNA Technology", ["DNA organization", "Replication", "Gene expression", "Mutations", "Recombinant DNA", "Biotechnology"], "Unit 07"),
      t("BIO-08", "Environmental Biology", ["Populations", "Communities", "Ecosystems", "Biodiversity", "Conservation", "Pollution"], "Unit 08"),
      t("BIO-09", "Microbiology", ["Microbial diversity", "Growth", "Control", "Microbes and disease", "Useful microorganisms"], "Unit 09"),
      t("BIO-10", "Applied Biology", ["Health applications", "Agriculture", "Food and industry", "Biological resources", "Modern applications"], "Unit 10"),
    ],
  },
  Physics: {
    icon: "atom",
    color: "#63B8FF",
    accent: "#2A7DD0",
    topics: [
      t("PHY-01", "Measurement", ["SI units", "Dimensions", "Measuring instruments", "Errors and uncertainty"], "Unit 01"),
      t("PHY-02", "Mechanics", ["Kinematics", "Forces", "Momentum", "Work and energy", "Rotational mechanics", "Fluid mechanics"], "Unit 02"),
      t("PHY-03", "Oscillations & Waves", ["SHM", "Wave motion", "Sound", "Interference", "Diffraction", "Geometrical optics"], "Unit 03"),
      t("PHY-04", "Thermal Physics", ["Temperature", "Thermal expansion", "Calorimetry", "Gas laws", "Thermodynamics"], "Unit 04"),
      t("PHY-05", "Gravitational Field", ["Field strength", "Potential", "Satellites", "Planetary motion"], "Unit 05"),
      t("PHY-06", "Electrostatic Field", ["Coulomb law", "Electric field", "Potential", "Capacitance"], "Unit 06"),
      t("PHY-07", "Magnetic Field", ["Magnetic force", "Fields due to currents", "Electromagnetic induction", "AC principles"], "Unit 07"),
      t("PHY-08", "Current Electricity", ["Current and resistance", "DC circuits", "Kirchhoff laws", "Electrical measurements"], "Unit 08"),
      t("PHY-09", "Electronics", ["Semiconductors", "Diodes", "Transistors", "Operational circuits", "Digital electronics"], "Unit 09"),
      t("PHY-10", "Mechanical Properties of Matter", ["Elasticity", "Surface tension", "Viscosity", "Material behaviour"], "Unit 10"),
      t("PHY-11", "Matter & Radiation", ["Thermal radiation", "Photoelectric effect", "Matter waves", "X-rays", "Radioactivity", "Nuclear physics"], "Unit 11"),
    ],
  },
  "Agricultural Science": {
    icon: "sprout",
    color: "#E9B35B",
    accent: "#B77625",
    topics: [
      t("AGR-01", "Agricultural Environment", ["Agro-ecosystems", "Climate", "Soil", "Water resources", "Sustainability"], "Grade 12"),
      t("AGR-02", "Soil & Plant Nutrition", ["Soil properties", "Soil fertility", "Plant nutrients", "Fertilizers", "Soil conservation"], "Grade 12"),
      t("AGR-03", "Crop Production", ["Land preparation", "Planting material", "Crop establishment", "Cultural practices", "Harvesting"], "Grade 12"),
      t("AGR-04", "Plant Propagation & Improvement", ["Seeds", "Vegetative propagation", "Nursery management", "Crop improvement"], "Grade 12"),
      t("AGR-05", "Pest, Disease & Weed Management", ["Pest classification", "Crop diseases", "Weeds", "Integrated pest management", "Safe pesticide use"], "Grade 13"),
      t("AGR-06", "Animal Production", ["Livestock systems", "Nutrition", "Breeding", "Health", "Housing"], "Grade 13"),
      t("AGR-07", "Agricultural Engineering", ["Farm power", "Machinery", "Irrigation", "Drainage", "Protected agriculture"], "Grade 13"),
      t("AGR-08", "Post-harvest & Food Technology", ["Post-harvest losses", "Storage", "Processing", "Food quality and safety"], "Grade 13"),
      t("AGR-09", "Agribusiness & Farm Management", ["Farm records", "Economics", "Marketing", "Entrepreneurship", "Decision making"], "Grade 13"),
      t("AGR-10", "Sustainable Agriculture", ["Resource management", "Climate challenges", "Organic approaches", "Health and safety", "Current issues"], "Grade 13"),
    ],
  },
  Chemistry: {
    icon: "flask-outline",
    color: "#FF8DA1",
    accent: "#D84E6B",
    topics: [
      t("CHE-01", "Atomic Structure", ["Atomic models", "Electronic structure", "Spectra", "Periodic trends"], "Unit 01"),
      t("CHE-02", "Structure & Bonding", ["Ionic bonding", "Covalent bonding", "Shapes", "Intermolecular forces", "Solids"], "Unit 02"),
      t("CHE-03", "Chemical Calculations", ["Mole concept", "Stoichiometry", "Solutions", "Titrations"], "Unit 03"),
      t("CHE-04", "Gaseous State of Matter", ["Gas laws", "Ideal gas equation", "Kinetic theory", "Real gases"], "Unit 04"),
      t("CHE-05", "Energetics", ["Enthalpy", "Hess law", "Bond energies", "Entropy and feasibility"], "Unit 05"),
      t("CHE-06", "Chemistry of s, p & d Block Elements", ["s-block", "p-block", "d-block", "Coordination chemistry", "Qualitative analysis"], "Unit 06"),
      t("CHE-07", "Basic Concepts of Organic Chemistry", ["Nomenclature", "Isomerism", "Electronic effects", "Reaction mechanisms"], "Unit 07"),
      t("CHE-08", "Hydrocarbons & Halohydrocarbons", ["Alkanes", "Alkenes", "Alkynes", "Aromatic compounds", "Halogeno compounds"], "Unit 08"),
      t("CHE-09", "Oxygen-containing Organic Compounds", ["Alcohols", "Phenols", "Aldehydes", "Ketones", "Carboxylic acids", "Derivatives"], "Unit 09"),
      t("CHE-10", "Nitrogen-containing Organic Compounds", ["Amines", "Amides", "Amino acids", "Nitrogen compounds"], "Unit 10"),
      t("CHE-11", "Chemical Kinetics", ["Rate laws", "Order", "Activation energy", "Catalysis"], "Unit 11"),
      t("CHE-12", "Equilibrium", ["Chemical equilibrium", "Acid-base", "Solubility", "Ionic equilibrium"], "Unit 12"),
      t("CHE-13", "Electrochemistry", ["Redox", "Electrochemical cells", "Electrode potentials", "Electrolysis"], "Unit 13"),
      t("CHE-14", "Industrial Chemistry & Environmental Pollution", ["Industrial processes", "Raw materials", "Polymers", "Air and water pollution", "Green chemistry"], "Unit 14"),
    ],
  },
  ICT: {
    icon: "laptop",
    color: "#48D6D2",
    accent: "#168C91",
    topics: [
      t("ICT-01", "Concept of ICT", ["Data and information", "Information systems", "ICT in society", "Emerging trends"], "Competency 01"),
      t("ICT-02", "Computer Fundamentals", ["Hardware", "Software", "Computer architecture", "Input/output", "Storage"], "Competency 02"),
      t("ICT-03", "Data Representation", ["Number systems", "Boolean logic", "Character encoding", "Digital media"], "Competency 03"),
      t("ICT-04", "Operating Systems", ["Processes", "Memory", "File systems", "Utilities", "User interfaces"], "Competency 04"),
      t("ICT-05", "Computer Networks", ["Network models", "Media", "Protocols", "Internet", "Network security"], "Competency 05"),
      t("ICT-06", "Systems Analysis & Design", ["Requirements", "Models", "Development life cycle", "Testing", "Implementation"], "Competency 06"),
      t("ICT-07", "Database Management", ["Data models", "Relational databases", "Normalization", "SQL", "Database security"], "Competency 07"),
      t("ICT-08", "Programming", ["Algorithms", "Control structures", "Functions", "Data structures", "Problem solving"], "Competency 08"),
      t("ICT-09", "Web Development", ["Web architecture", "HTML", "CSS", "Client/server concepts", "Web applications"], "Competency 09"),
      t("ICT-10", "Internet of Things & New Technologies", ["Sensors", "Embedded systems", "Cloud concepts", "Mobile computing", "AI awareness"], "Competency 10"),
      t("ICT-11", "Information Security", ["Threats", "Authentication", "Cryptography concepts", "Privacy", "Safe use"], "Competency 11"),
      t("ICT-12", "ICT Project & Problem Solving", ["Planning", "Documentation", "Implementation", "Evaluation", "Presentation"], "Competency 12"),
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
