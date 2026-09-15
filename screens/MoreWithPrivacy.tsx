import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Pressable,StyleSheet,Text,View } from "react-native";
import { useAppConfig } from "../context/AppConfigContext";
import MoreScreen from "./more";
export default function MoreWithPrivacy(){const router=useRouter(),{settings}=useAppConfig();return <View style={{flex:1}}><MoreScreen/>{settings.featureFlags.syncManager!==false?<Pressable accessibilityRole="button" accessibilityLabel="Open sync manager" onPress={()=>router.push("/sync-manager")} style={s.sync}><Ionicons name="cloud-outline" size={18} color="#E6D5FA"/><View><Text style={s.title}>Sync data</Text><Text style={s.sub}>Device ↔ database</Text></View></Pressable>:null}</View>}
const s=StyleSheet.create({sync:{position:"absolute",right:14,bottom:82,minHeight:50,borderRadius:16,paddingHorizontal:13,flexDirection:"row",alignItems:"center",gap:8,backgroundColor:"#241832",borderWidth:1,borderColor:"#543A70",shadowColor:"#000",shadowOpacity:.28,shadowRadius:8,elevation:8},title:{fontSize:10,fontWeight:"900",color:"#F1EAF8"},sub:{fontSize:8,color:"#9F8CB4",marginTop:1}});