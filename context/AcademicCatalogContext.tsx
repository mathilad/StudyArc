import React,{createContext,useCallback,useContext,useEffect,useMemo,useState}from"react";
import{SUBJECTS,type SubjectConfig,type TopicConfig}from"../data/subjects";
import{cacheKey,readJson,writeJson}from"../lib/offlineStore";
import{supabase}from"../lib/supabase";
import{useAuth}from"./AuthContext";
import{useOffline}from"./OfflineContext";

export type CatalogSubject={subjectName:string;streams:string[];paperComponents:string[];enabled:boolean;sourceLabel:string;sourceUrl:string;verificationStatus:"verified"|"needs_review"|"draft";verifiedAt:string|null};
export type CatalogTopic={id:string;subjectName:string;topicKey:string;titleEn:string;titleSi:string|null;titleTa:string|null;unitName:string|null;sortOrder:number;enabled:boolean;sourceLabel:string;sourceUrl:string;verificationStatus:"verified"|"needs_review"|"draft";verifiedAt:string|null};
type Cache={subjects:CatalogSubject[];topics:CatalogTopic[]};
type Value=Cache&{loading:boolean;refreshCatalog:()=>Promise<void>;paperComponentsFor:(subjectName:string)=>string[]};
const CatalogContext=createContext<Value|null>(null);
const EMPTY:Cache={subjects:[],topics:[]};

const palette=[["#B784FF","#7651B4"],["#63B8FF","#2A7DD0"],["#65D79A","#2B9D67"],["#FF9AAE","#CC536E"],["#F0BE6B","#B77A28"],["#48D6D2","#168C91"],["#A5A9FF","#6168C9"],["#E79AEF","#A84BB4"]]as const;
function hash(value:string){let h=0;for(let i=0;i<value.length;i++)h=(h*31+value.charCodeAt(i))>>>0;return h}
function ensureSubject(subjectName:string):SubjectConfig{const map=SUBJECTS as unknown as Record<string,SubjectConfig>;if(map[subjectName])return map[subjectName];const[color,accent]=palette[hash(subjectName)%palette.length];map[subjectName]={icon:"book-open-page-variant",color,accent,topics:[]};return map[subjectName]}
function toTopic(row:CatalogTopic):TopicConfig{return{id:row.topicKey,title:row.titleEn,sinhala:row.titleSi??row.titleEn,unit:row.unitName??undefined,subtopics:[row.titleEn],subtopicsSinhala:[row.titleSi??row.titleEn]}}
function applyCatalog(rows:CatalogTopic[]){const grouped=new Map<string,CatalogTopic[]>();for(const row of rows.filter(x=>x.enabled)){const list=grouped.get(row.subjectName)??[];list.push(row);grouped.set(row.subjectName,list)}for(const[subjectName,list]of grouped){const subject=ensureSubject(subjectName);const ordered=[...list].sort((a,b)=>a.sortOrder-b.sortOrder||a.titleEn.localeCompare(b.titleEn));const remote=ordered.map(toTopic);const placeholderOnly=subject.topics.length===0||(subject.topics.length===1&&subject.topics[0]?.id.endsWith("-general"));if(placeholderOnly)subject.topics=remote;else{const existing=new Map(subject.topics.map(t=>[t.id,t]));for(const topic of remote)existing.set(topic.id,topic);subject.topics=[...existing.values()]}}}

export function AcademicCatalogProvider({children}:{children:React.ReactNode}){
 const{user,loading:authLoading}=useAuth();const{isOnline,syncTick}=useOffline();const[subjects,setSubjects]=useState<CatalogSubject[]>([]),[topics,setTopics]=useState<CatalogTopic[]>([]),[loading,setLoading]=useState(true);
 const loadCache=useCallback(async()=>{if(!user){setSubjects([]);setTopics([]);setLoading(false);return}const cached=await readJson<Cache>(cacheKey(user.id,"academic-catalog"),EMPTY);setSubjects(cached.subjects??[]);setTopics(cached.topics??[]);applyCatalog(cached.topics??[]);setLoading(false)},[user]);
 const refreshCatalog=useCallback(async()=>{if(!user)return;if(!isOnline){await loadCache();return}try{const[sr,tr]=await Promise.all([supabase.from("academic_subject_catalog").select("*").eq("enabled",true).order("subject_name"),supabase.from("academic_topic_catalog").select("*").eq("enabled",true).order("subject_name").order("sort_order")]);if(sr.error||tr.error)throw sr.error??tr.error;const nextSubjects:CatalogSubject[]=(sr.data??[]).map((r:any)=>({subjectName:r.subject_name,streams:r.streams??[],paperComponents:r.paper_components??["Paper I","Paper II"],enabled:Boolean(r.enabled),sourceLabel:r.source_label,sourceUrl:r.source_url,verificationStatus:r.verification_status,verifiedAt:r.verified_at}));const nextTopics:CatalogTopic[]=(tr.data??[]).map((r:any)=>({id:r.id,subjectName:r.subject_name,topicKey:r.topic_key,titleEn:r.title_en,titleSi:r.title_si,titleTa:r.title_ta,unitName:r.unit_name,sortOrder:Number(r.sort_order??0),enabled:Boolean(r.enabled),sourceLabel:r.source_label,sourceUrl:r.source_url,verificationStatus:r.verification_status,verifiedAt:r.verified_at}));setSubjects(nextSubjects);setTopics(nextTopics);applyCatalog(nextTopics);await writeJson(cacheKey(user.id,"academic-catalog"),{subjects:nextSubjects,topics:nextTopics})}catch{await loadCache()}finally{setLoading(false)}},[isOnline,loadCache,user]);
 useEffect(()=>{if(!authLoading)loadCache().then(()=>refreshCatalog())},[authLoading,loadCache,refreshCatalog]);useEffect(()=>{if(user&&isOnline)refreshCatalog()},[isOnline,refreshCatalog,syncTick,user]);
 const paperComponentsFor=useCallback((subjectName:string)=>subjects.find(x=>x.subjectName===subjectName)?.paperComponents??["Paper I","Paper II"],[subjects]);
 const value=useMemo<Value>(()=>({subjects,topics,loading,refreshCatalog,paperComponentsFor}),[loading,paperComponentsFor,refreshCatalog,subjects,topics]);
 return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>
}
export function useAcademicCatalog(){const value=useContext(CatalogContext);if(!value)throw new Error("useAcademicCatalog must be used inside AcademicCatalogProvider.");return value}
