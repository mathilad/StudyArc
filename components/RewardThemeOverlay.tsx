import { LinearGradient } from "expo-linear-gradient";
import { usePathname } from "expo-router";
import React from "react";
import { StyleSheet,View } from "react-native";
import { useRewards } from "../context/RewardsContext";

const matchesPage=(name:string,path:string)=>{
 const n=name.toLowerCase(),p=path.toLowerCase();
 if(n.includes("timer"))return p.includes("timer")||p.includes("stopwatch");
 if(n.includes("planner"))return p.includes("plan");
 if(n.includes("subjects"))return p.includes("subject");
 if(n.includes("paper"))return p.includes("paper");
 if(n.includes("journey"))return p.includes("journey");
 if(n.includes("revise"))return p.includes("revision");
 if(n.includes("assignments"))return p.includes("assignment");
 if(n.includes("statistics"))return p.includes("statistics")||p.includes("reports");
 if(n.includes("study hub"))return p.includes("study");
 if(n.includes("exam"))return p.includes("exam");
 return false;
};

export default function RewardThemeOverlay(){
 const path=usePathname();
 const{equippedItem}=useRewards();
 const theme=equippedItem("themes"),page=equippedItem("page-themes");
 const active=page&&matchesPage(page.name,path)?page:theme;
 if(!active)return null;
 const opacity=page&&active.id===page.id ? .13 : .08;
 return <View pointerEvents="none" style={StyleSheet.absoluteFillObject}><LinearGradient colors={[active.colors[0]+"00",active.colors[0]+"55",active.colors[1]+"22"]} start={{x:0,y:0}} end={{x:1,y:1}} style={[StyleSheet.absoluteFill,{opacity}]}/><View style={[s.glow,{backgroundColor:active.colors[1],opacity:opacity*.55}]}/></View>
}
const s=StyleSheet.create({glow:{position:"absolute",width:220,height:220,borderRadius:120,right:-90,bottom:-90}});
