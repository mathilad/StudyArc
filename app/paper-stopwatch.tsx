import React,{useEffect,useState}from"react";
import{Redirect}from"expo-router";
import{View}from"react-native";
import PhoneTimerShell from"../components/PhoneTimerShell";
import{useAuth}from"../context/AuthContext";
import StopwatchClassic from"../screens/StopwatchClassic";
import StopwatchMinimal from"../screens/StopwatchMinimal";
import ModernStopwatch from"../screens/ModernStopwatch";
import{readTimerStylePreferences,type TimerScreenStyle}from"../lib/timerStylePreferences";

export default function PaperStopwatchRoute(){
 const{session,loading}=useAuth();
 const[style,setStyle]=useState<TimerScreenStyle>("classic");
 useEffect(()=>{let live=true;readTimerStylePreferences().then(p=>{if(live)setStyle(p.paper)});return()=>{live=false}},[]);
 if(!loading&&!session)return<Redirect href="/login"/>;
 const Timer=style==="minimal"?StopwatchMinimal:style==="modern"?ModernStopwatch:StopwatchClassic;
 return <View style={{flex:1}}><PhoneTimerShell><Timer/></PhoneTimerShell></View>
}
