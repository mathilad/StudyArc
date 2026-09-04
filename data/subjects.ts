export type SubjectName =
  | "Pure Mathematics"
  | "Applied Mathematics"
  | "Biology"
  | "Physics"
  | "Agricultural Science"
  | "Chemistry"
  | "ICT";

export type StudyMedium = "English" | "Sinhala";

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
  sinhala: string;
  unit?: string;
  subtopics: string[];
  subtopicsSinhala: string[];
};

export type SubjectConfig = {
  icon: any;
  color: string;
  accent: string;
  topics: TopicConfig[];
};

const t = (
  id: string,
  title: string,
  subtopics: string[],
  unit: string | undefined,
  sinhala: string,
  subtopicsSinhala: string[],
): TopicConfig => ({ id, title, subtopics, unit, sinhala, subtopicsSinhala });

export const SUBJECTS: Record<SubjectName, SubjectConfig> = {
  "Pure Mathematics": {
    icon: "function-variant", color: "#B784FF", accent: "#7B4DD8",
    topics: [
      t("PM-01", "Mathematical Induction", ["Principle of induction", "Proofs by induction", "Recursive results"], "I-01", "ගණිතමය අභ්‍යුහනය", ["අභ්‍යුහන මූලධර්මය", "අභ්‍යුහනයෙන් සාධන", "පුනරාවර්තී ප්‍රතිඵල"]),
      t("PM-02", "Functions", ["Domain and range", "Composite functions", "Inverse functions", "Graphs and transformations"], "I-02", "ශ්‍රිත", ["වසම හා පරාසය", "සංයුක්ත ශ්‍රිත", "ප්‍රතිලෝම ශ්‍රිත", "ප්‍රස්තාර හා පරිවර්තන"]),
      t("PM-03", "Quadratic Equations", ["Roots and coefficients", "Nature of roots", "Quadratic inequalities"], "I-03", "වර්ගජ සමීකරණ", ["මූල හා සංගුණක", "මූලවල ස්වභාවය", "වර්ගජ අසමීකරණ"]),
      t("PM-04", "Polynomials", ["Factor and remainder theorems", "Polynomial equations", "Relations between roots"], "I-04", "බහුපද", ["සාධක හා ශේෂ ප්‍රමේය", "බහුපද සමීකරණ", "මූල අතර සම්බන්ධතා"]),
      t("PM-05", "Permutations & Combinations", ["Counting principles", "Permutations", "Combinations", "Restricted arrangements"], "I-05", "සංචරණ හා සංයෝජන", ["ගණන් කිරීමේ මූලධර්ම", "සංචරණ", "සංයෝජන", "සීමා සහිත සැකසුම්"]),
      t("PM-06", "Binomial Theorem", ["Expansion", "General term", "Approximations", "Identities"], "I-06", "ද්විපද ප්‍රමේයය", ["ප්‍රසාරණය", "සාමාන්‍ය පදය", "ආසන්නීකරණ", "අනන්‍යතා"]),
      t("PM-07", "Sequences & Series", ["Arithmetic progressions", "Geometric progressions", "Sigma notation", "Series"], "I-07", "අනුක්‍රම හා ශ්‍රේණි", ["සමාන්තර අනුක්‍රම", "ගුණෝත්තර අනුක්‍රම", "සිග්මා සංකේතනය", "ශ්‍රේණි"]),
      t("PM-08", "Complex Numbers", ["Argand diagram", "Modulus and argument", "Polar form", "De Moivre theorem"], "I-08", "සංකීර්ණ සංඛ්‍යා", ["ආර්ගන්ඩ් සටහන", "මාපාංකය හා කෝණය", "ධ්‍රුවීය ආකාරය", "ඩි මොයිව්‍රේ ප්‍රමේයය"]),
      t("PM-09", "Trigonometry", ["Identities", "Equations", "Inverse trigonometric functions", "Applications"], "I-09", "ත්‍රිකෝණමිතිය", ["අනන්‍යතා", "සමීකරණ", "ප්‍රතිලෝම ත්‍රිකෝණමිතික ශ්‍රිත", "යෙදුම්"]),
      t("PM-10", "Coordinate Geometry", ["Straight lines", "Circles", "Conics", "Parametric forms"], "I-10", "ඛණ්ඩාංක ජ්‍යාමිතිය", ["සරල රේඛා", "වෘත්ත", "කොණික", "පරාමිතික ආකාර"]),
      t("PM-11", "Limits", ["Algebraic limits", "Trigonometric limits", "Continuity", "Asymptotic behaviour"], "I-11", "සීමා", ["බීජීය සීමා", "ත්‍රිකෝණමිතික සීමා", "අඛණ්ඩතාව", "අසම්පතීය හැසිරීම"]),
      t("PM-12", "Differentiation", ["Rules of differentiation", "Implicit differentiation", "Tangents and normals", "Maxima and minima"], "I-12", "අවකලනය", ["අවකලන නීති", "අනුහිත අවකලනය", "ස්පර්ශක හා ලම්බක", "උපරිම හා අවපරිම"]),
      t("PM-13", "Integration", ["Standard integrals", "Substitution", "Integration by parts", "Definite integrals and area"], "I-13", "අනුකලනය", ["සම්මත අනුකල", "ප්‍රතිස්ථාපනය", "කොටස් අනුව අනුකලනය", "නිශ්චිත අනුකල හා වර්ගඵල"]),
      t("PM-14", "Differential Equations", ["First-order equations", "Variable separable equations", "Applications"], "I-14", "අවකල සමීකරණ", ["පළමු අනුපිළිවෙළ සමීකරණ", "විචල්‍ය වෙන් කළ හැකි සමීකරණ", "යෙදුම්"]),
    ],
  },
  "Applied Mathematics": {
    icon: "vector-line", color: "#8E9CFF", accent: "#5265D8",
    topics: [
      t("AM-01", "Vectors", ["Vector algebra", "Scalar product", "Vector equations", "Geometric applications"], "II-01", "දෛශික", ["දෛශික බීජගණිතය", "අදිශ ගුණිතය", "දෛශික සමීකරණ", "ජ්‍යාමිතික යෙදුම්"]),
      t("AM-02", "Rectilinear Motion", ["Displacement and velocity", "Acceleration", "Motion graphs", "Kinematic equations"], "II-02", "සරල රේඛීය චලිතය", ["විස්ථාපනය හා ප්‍රවේගය", "ත්වරණය", "චලිත ප්‍රස්තාර", "චලිත විද්‍යා සමීකරණ"]),
      t("AM-03", "Statics", ["Forces", "Equilibrium", "Moments", "Friction"], "II-03", "ස්ථිති විද්‍යාව", ["බල", "සමතුලිතතාව", "බල ඝූර්ණ", "ඝර්ෂණය"]),
      t("AM-04", "Dynamics", ["Newton's laws", "Connected particles", "Friction", "Variable forces"], "II-04", "ගති විද්‍යාව", ["නිව්ටන් නීති", "සම්බන්ධිත අංශු", "ඝර්ෂණය", "විචල්‍ය බල"]),
      t("AM-05", "Projectile Motion", ["Two-dimensional motion", "Range", "Greatest height", "Trajectory"], "II-05", "ප්‍රක්ෂේප චලිතය", ["ද්විමාන චලිතය", "පරාසය", "උපරිම උස", "ගමන් මාර්ගය"]),
      t("AM-06", "Work, Energy & Power", ["Work-energy principle", "Power", "Conservation of energy", "Potential energy"], "II-06", "කාර්යය, ශක්තිය හා බලය", ["කාර්ය-ශක්ති මූලධර්මය", "බලය", "ශක්ති සංරක්ෂණය", "විභව ශක්තිය"]),
      t("AM-07", "Impulse & Momentum", ["Impulse", "Linear momentum", "Collisions", "Conservation laws"], "II-07", "ආවේගය හා ගම්‍යතාව", ["ආවේගය", "රේඛීය ගම්‍යතාව", "ඝට්ටන", "සංරක්ෂණ නීති"]),
      t("AM-08", "Circular Motion", ["Angular motion", "Centripetal force", "Vertical circle", "Banked motion"], "II-08", "වෘත්තීය චලිතය", ["කෝණීය චලිතය", "කේන්ද්‍රාභිමුඛ බලය", "සිරස් වෘත්තය", "ඇලවූ චලිතය"]),
      t("AM-09", "Simple Harmonic Motion", ["SHM equation", "Energy in SHM", "Period", "Applications"], "II-09", "සරල අනුවර්තී චලිතය", ["සරල අනුවර්තී චලිත සමීකරණය", "සරල අනුවර්තී චලිතයේ ශක්තිය", "කාලාවර්තය", "යෙදුම්"]),
      t("AM-10", "Centre of Gravity & Frameworks", ["Centre of mass", "Laminae", "Frameworks", "Equilibrium"], "II-10", "ගුරුත්ව කේන්ද්‍රය හා රාමු", ["ස්කන්ධ කේන්ද්‍රය", "පත්‍රක", "රාමු", "සමතුලිතතාව"]),
      t("AM-11", "Probability", ["Sample spaces", "Conditional probability", "Independent events", "Random variables"], "II-11", "සම්භාවිතාව", ["නියැදි අවකාශ", "කොන්දේසිගත සම්භාවිතාව", "ස්වාධීන සිදුවීම්", "අහඹු විචල්‍ය"]),
      t("AM-12", "Statistics", ["Data summaries", "Measures of dispersion", "Distributions", "Correlation and regression"], "II-12", "සංඛ්‍යානය", ["දත්ත සාරාංශ", "විසරණ මිනුම්", "ව්‍යාප්ති", "සහසම්බන්ධය හා ප්‍රතිපායනය"]),
    ],
  },
  Biology: {
    icon: "dna", color: "#65D79A", accent: "#2B9D67",
    topics: [
      t("BIO-01", "Introduction to Biology", ["Nature of life", "Scientific method", "Levels of organization", "Biological investigations"], "Unit 01", "ජීව විද්‍යාවට හැඳින්වීම", ["ජීවයේ ස්වභාවය", "විද්‍යාත්මක ක්‍රමය", "සංවිධාන මට්ටම්", "ජීව විද්‍යාත්මක පරීක්ෂණ"]),
      t("BIO-02", "Chemical & Cellular Basis of Life", ["Biomolecules", "Cell structure", "Membranes", "Enzymes", "Cell cycle and division"], "Unit 02", "ජීවයේ රසායනික හා සෛලීය පදනම", ["ජෛව අණු", "සෛල ව්‍යුහය", "පටල", "එන්සයිම", "සෛල චක්‍රය හා බෙදීම"]),
      t("BIO-03", "Evolution & Diversity of Organisms", ["Origin and evolution", "Classification", "Microorganisms", "Plant diversity", "Animal diversity"], "Unit 03", "ජීවීන්ගේ පරිණාමය හා විවිධත්වය", ["උත්පත්තිය හා පරිණාමය", "වර්ගීකරණය", "ක්ෂුද්‍රජීවීන්", "ශාක විවිධත්වය", "සත්ත්ව විවිධත්වය"]),
      t("BIO-04", "Plant Form & Function", ["Plant tissues", "Water relations", "Mineral nutrition", "Transport", "Photosynthesis", "Plant growth and reproduction"], "Unit 04", "ශාක ආකෘතිය හා ක්‍රියාකාරීත්වය", ["ශාක පටක", "ජල සම්බන්ධතා", "ඛනිජ පෝෂණය", "ප්‍රවාහනය", "ප්‍රභාසංස්ලේෂණය", "ශාක වර්ධනය හා ප්‍රජනනය"]),
      t("BIO-05", "Animal Form & Function", ["Nutrition", "Gas exchange", "Transport", "Excretion", "Coordination", "Reproduction", "Movement"], "Unit 05", "සත්ත්ව ආකෘතිය හා ක්‍රියාකාරීත්වය", ["පෝෂණය", "වායු හුවමාරුව", "ප්‍රවාහනය", "විස්සර්ජනය", "සම්බන්ධීකරණය", "ප්‍රජනනය", "චලනය"]),
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
      t("PHY-02", "Mechanics", ["Kinematics", "Forces", "Momentum", "Work and energy", "Rotational mechanics", "Fluid mechanics"], "Unit 02", "යාන්ත්‍ර විද්‍යාව", ["චලිත විද්‍යාව", "බල", "ගම්‍යතාව", "කාර්යය හා ශක්තිය", "භ්‍රමණ යාන්ත්‍ර විද්‍යාව", "ද්‍රව යාන්ත්‍ර විද්‍යාව"]),
      t("PHY-03", "Oscillations & Waves", ["SHM", "Wave motion", "Sound", "Interference", "Diffraction", "Geometrical optics"], "Unit 03", "දෝලන හා තරංග", ["සරල අනුවර්තී චලිතය", "තරංග චලිතය", "ශබ්දය", "අන්තරායනය", "විවර්තනය", "ජ්‍යාමිතික ප්‍රකාශ විද්‍යාව"]),
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
