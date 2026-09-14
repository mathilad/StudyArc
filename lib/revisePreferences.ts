import AsyncStorage from"@react-native-async-storage/async-storage";
const KEY="@study-arc/revise-excluded-subjects/v1";
let excluded=new Set<string>();
export async function loadReviseExcludedSubjects(){try{const raw=await AsyncStorage.getItem(KEY);excluded=new Set(raw?JSON.parse(raw):[])}catch{excluded=new Set()}return [...excluded]}
export async function saveReviseExcludedSubjects(subjects:string[]){excluded=new Set(subjects);await AsyncStorage.setItem(KEY,JSON.stringify([...excluded]));return [...excluded]}
export function setRuntimeReviseExcludedSubjects(subjects:string[]){excluded=new Set(subjects)}
export function isSubjectExcludedFromRevise(subject:string){return excluded.has(subject)}
export function getRuntimeReviseExcludedSubjects(){return [...excluded]}
