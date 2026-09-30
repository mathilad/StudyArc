import AsyncStorage from "@react-native-async-storage/async-storage";
import React,{createContext,useContext,useEffect,useMemo,useRef,useState} from "react";
import {APP_THEMES,isAppThemeId,setCurrentAppTheme,type AppTheme,type AppThemeId} from "../lib/appTheme";
const KEY="studyarc:main-colour-theme:v1";
type Value={theme:AppTheme;saving:boolean;setTheme:(id:AppThemeId)=>Promise<void>};
const Context=createContext<Value|null>(null);
export function AppThemeProvider({children}:{children:React.ReactNode}){
 const [id,setId]=useState<AppThemeId>("purple"),[loading,setLoading]=useState(true),[saving,setSaving]=useState(false);const lock=useRef(false);
 useEffect(()=>{let live=true;AsyncStorage.getItem(KEY).then(raw=>{if(live){const next=isAppThemeId(raw)?raw:"purple";setCurrentAppTheme(next);setId(next)}}).catch(()=>undefined).finally(()=>{if(live)setLoading(false)});return()=>{live=false}},[]);
 const setTheme=async(next:AppThemeId)=>{if(lock.current||next===id)return;lock.current=true;setSaving(true);try{await AsyncStorage.setItem(KEY,next);setCurrentAppTheme(next);setId(next)}finally{lock.current=false;setSaving(false)}};
 const value=useMemo(()=>({theme:APP_THEMES.find(t=>t.id===id)??APP_THEMES[0],saving,setTheme}),[id,saving]);
 if(loading)return null;
 return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useAppTheme(){const value=useContext(Context);if(!value)throw new Error("useAppTheme must be inside AppThemeProvider");return value}

export function useThemeRefresh(){useContext(Context)}
