import AsyncStorage from "@react-native-async-storage/async-storage";
export type SessionIntent={goalText:string|null;targetCount:number|null;energyBefore:number|null;interruptionCount:number;distractionNotes:string[];createdAt:string};
const KEY="@study-arc/session-intent/v1";
export async function readSessionIntent():Promise<SessionIntent|null>{const raw=await AsyncStorage.getItem(KEY);if(!raw)return null;try{const value=JSON.parse(raw) as SessionIntent;if(Date.now()-new Date(value.createdAt).getTime()>18*3600000){await AsyncStorage.removeItem(KEY);return null}return value}catch{return null}}
export async function writeSessionIntent(value:SessionIntent){await AsyncStorage.setItem(KEY,JSON.stringify(value))}
export async function mergeSessionIntent(updates:Partial<SessionIntent>){const current=await readSessionIntent();const next:SessionIntent={goalText:null,targetCount:null,energyBefore:null,interruptionCount:0,distractionNotes:[],createdAt:new Date().toISOString(),...current,...updates};await writeSessionIntent(next);return next}
export async function clearSessionIntent(){await AsyncStorage.removeItem(KEY)}
