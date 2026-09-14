export type JourneyWin = {
  key: string;
  label: string;
  detail: string;
  done: boolean;
  icon: string;
  color: string;
  group: "Foundation" | "Study time" | "Consistency" | "Papers" | "Coverage" | "Revision" | "Class learning" | "Independence" | "Readiness";
};

export type JourneyWinMetrics = {
  onboardingComplete: boolean;
  totalSeconds: number;
  todaySeconds: number;
  sessionCount: number;
  active7: number;
  papers: number;
  scoredQuestions: number;
  syllabusCoverage: number;
  revisionConsistency: number;
  examReadiness: number;
  paperPractice: number;
  classTopics: number;
  manualTopics: number;
  totalTopics: number;
  classRecords: number;
  revisionSessions: number;
  tuteSessions: number;
  paperReviewSessions: number;
  distinctSubjectsStudied: number;
  longSessions: number;
};

const hrs = (seconds: number) => Math.floor(seconds / 3600);
const c = ["#B784FF", "#72D1A0", "#77AEFF", "#F0B869", "#D995F2", "#8BD4A7", "#F2D072", "#F0A96B", "#AEB8FF", "#77C9D8"];

export function buildJourneyWins(m: JourneyWinMetrics): JourneyWin[] {
  const wins: JourneyWin[] = [];
  const add = (key:string,label:string,detail:string,done:boolean,icon:string,color:string,group:JourneyWin["group"]) => wins.push({key,label,detail,done,icon,color,group});

  add("start","Journey started","Your StudyArc roadmap is active",m.onboardingComplete,"rocket-outline",c[0],"Foundation");
  add("session-1","First study session",`${m.sessionCount} sessions recorded`,m.sessionCount>=1,"play-circle-outline",c[1],"Foundation");
  add("session-5","Five sessions","You are building a repeatable routine",m.sessionCount>=5,"repeat-outline",c[2],"Foundation");
  add("session-10","Ten sessions",`${m.sessionCount} sessions in your record`,m.sessionCount>=10,"layers-outline",c[3],"Foundation");
  add("session-25","25 sessions","A meaningful body of focused work",m.sessionCount>=25,"sparkles-outline",c[4],"Foundation");
  add("session-50","50 sessions","StudyArc has become part of your workflow",m.sessionCount>=50,"ribbon-outline",c[5],"Foundation");

  [1,3,5,10,15,25,40,50,75,100,150,200,300,500].forEach((h,i)=>add(`hours-${h}`,`${h} study hour${h===1?"":"s"}`,`${hrs(m.totalSeconds)} total hours recorded`,m.totalSeconds>=h*3600,i<3?"timer-outline":i<7?"flash-outline":"trophy-outline",c[i%c.length],"Study time"));
  add("today-1","One-hour day","At least one focused hour today",m.todaySeconds>=3600,"sunny-outline",c[3],"Study time");
  add("today-3","Three-hour day","Three hours invested today",m.todaySeconds>=3*3600,"today-outline",c[4],"Study time");
  add("today-5","Five-hour day","A strong focused study day",m.todaySeconds>=5*3600,"flame-outline",c[6],"Study time");
  add("today-10","Ten-hour day","An exceptional high-volume study day",m.todaySeconds>=10*3600,"bonfire-outline",c[7],"Study time");
  add("long-1","Deep work unlocked",`${m.longSessions} sessions reached 60+ minutes`,m.longSessions>=1,"hourglass-outline",c[5],"Study time");
  add("long-10","Deep work regular",`${m.longSessions} long sessions completed`,m.longSessions>=10,"hourglass-outline",c[6],"Study time");

  add("active-2","Two-day rhythm",`${m.active7}/7 active days this week`,m.active7>=2,"pulse-outline",c[1],"Consistency");
  add("active-3","Three-day rhythm",`${m.active7}/7 active days this week`,m.active7>=3,"pulse-outline",c[2],"Consistency");
  add("active-5","Five-day rhythm",`${m.active7}/7 active days this week`,m.active7>=5,"flame-outline",c[3],"Consistency");
  add("active-6","Six-day rhythm",`${m.active7}/7 active days this week`,m.active7>=6,"flame-outline",c[7],"Consistency");
  add("active-7","Perfect study week","Active on all seven days",m.active7>=7,"calendar-outline",c[6],"Consistency");

  [1,3,5,10,15,25,40,60].forEach((n,i)=>add(`papers-${n}`,n===1?"First past paper":`${n} past papers`,`${m.papers} past-paper sessions completed`,m.papers>=n,i<3?"document-text-outline":"documents-outline",c[(i+3)%c.length],"Papers"));
  add("paper-practice-40","Paper habit forming",`${m.paperPractice}% paper-practice score`,m.paperPractice>=40,"stats-chart-outline",c[2],"Papers");
  add("paper-practice-70","Paper practice strong",`${m.paperPractice}% paper-practice score`,m.paperPractice>=70,"analytics-outline",c[5],"Papers");
  add("paper-review-5","Review what you wrote",`${m.paperReviewSessions} paper-review sessions`,m.paperReviewSessions>=5,"search-outline",c[8],"Papers");

  [10,25,40,50,60,75,90,95,100].forEach((p,i)=>add(`coverage-${p}`,p===100?"Syllabus complete":`${p}% syllabus covered`,`${m.syllabusCoverage}% current coverage`,m.syllabusCoverage>=p,i<4?"book-outline":"library-outline",c[(i+2)%c.length],"Coverage"));

  [1,5,10,20,40].forEach((n,i)=>add(`revision-${n}`,n===1?"First revision session":`${n} revision sessions`,`${m.revisionSessions} revision sessions recorded`,m.revisionSessions>=n,"refresh-outline",c[(i+1)%c.length],"Revision"));
  add("revision-score-40","Revision taking shape",`${m.revisionConsistency}% revision consistency`,m.revisionConsistency>=40,"sync-outline",c[2],"Revision");
  add("revision-score-70","Revision strong",`${m.revisionConsistency}% revision consistency`,m.revisionConsistency>=70,"shield-checkmark-outline",c[5],"Revision");
  add("revision-score-90","Revision elite",`${m.revisionConsistency}% revision consistency`,m.revisionConsistency>=90,"medal-outline",c[6],"Revision");

  [1,5,10,20,40].forEach((n,i)=>add(`class-${n}`,n===1?"Class trail started":`${n} class-taught lessons`,`${m.classTopics}/${m.totalTopics} lessons taught in class`,m.classTopics>=n,"school-outline",c[(i+4)%c.length],"Class learning"));
  add("class-records-10","Class learning logged",`${m.classRecords} class-learning records`,m.classRecords>=10,"clipboard-outline",c[4],"Class learning");
  add("class-records-25","Class pace visible",`${m.classRecords} class-learning records`,m.classRecords>=25,"trending-up-outline",c[5],"Class learning");

  [1,5,10,20,40].forEach((n,i)=>add(`manual-${n}`,n===1?"First self-covered lesson":n===5?"Independent learner":`${n} self-covered lessons`,`${m.manualTopics}/${m.totalTopics} independently covered`,m.manualTopics>=n,"person-outline",c[(i+5)%c.length],"Independence"));
  add("tute-5","Question practice started",`${m.tuteSessions} tute-question sessions`,m.tuteSessions>=5,"create-outline",c[2],"Independence");
  add("tute-20","Question practice regular",`${m.tuteSessions} tute-question sessions`,m.tuteSessions>=20,"create-outline",c[5],"Independence");
  add("subjects-2","Across subjects",`${m.distinctSubjectsStudied} subjects studied`,m.distinctSubjectsStudied>=2,"apps-outline",c[8],"Independence");
  add("subjects-3","Balanced learner",`${m.distinctSubjectsStudied} subjects studied`,m.distinctSubjectsStudied>=3,"grid-outline",c[6],"Independence");

  [10,25,50,100].forEach((n,i)=>add(`questions-${n}`,`${n} scored questions`,`${m.scoredQuestions} questions analyzed`,m.scoredQuestions>=n,"checkmark-done-outline",c[(i+2)%c.length],"Readiness"));
  [40,55,70,80,90].forEach((p,i)=>add(`ready-${p}`,p===70?"Exam-ready territory":`${p}% readiness`,`${m.examReadiness}% current readiness`,m.examReadiness>=p,i<2?"speedometer-outline":"shield-checkmark-outline",c[(i+3)%c.length],"Readiness"));

  return wins;
}
