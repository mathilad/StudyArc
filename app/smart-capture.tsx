import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useAppConfig } from "../context/AppConfigContext";
import SmartCaptureScreen from "../screens/SmartCaptureScreen";

export default function SmartCaptureRoute(){
  const router=useRouter();
  const{settings}=useAppConfig();
  if(settings.featureFlags.imageScanning===true)return <SmartCaptureScreen/>;
  return <View style={s.root}><LinearGradient colors={["#171020","#080D14"]} style={StyleSheet.absoluteFill}/><View style={s.card}><Ionicons name="scan-outline" size={34} color="#806F92"/><Text style={s.title}>Image scanning is off</Text><Text style={s.text}>Smart Capture and image recognition are disabled by the StudyArc administrator. You can still add assignments, tests and paper details manually.</Text><Pressable onPress={()=>router.replace("/assignment")} style={s.button}><Text style={s.buttonText}>ADD MANUALLY</Text></Pressable></View></View>
}
const s=StyleSheet.create({root:{flex:1,backgroundColor:"#080D14",alignItems:"center",justifyContent:"center",padding:22},card:{width:"100%",maxWidth:440,borderRadius:24,backgroundColor:"#101720",borderWidth:1,borderColor:"#2B3848",padding:26,alignItems:"center"},title:{color:"#EEF1F5",fontSize:20,fontWeight:"900",marginTop:13},text:{color:"#788697",fontSize:11,lineHeight:18,textAlign:"center",marginTop:8},button:{height:46,borderRadius:14,backgroundColor:"#B784FF",paddingHorizontal:18,alignItems:"center",justifyContent:"center",marginTop:20},buttonText:{color:"#160B20",fontSize:9,fontWeight:"900",letterSpacing:1}})