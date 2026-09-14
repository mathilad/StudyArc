import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useAppConfig } from "../context/AppConfigContext";
import { clearActivePaperClassLink, setActivePaperClassLink } from "../lib/paperClassLink";
import AnswerSheetAnalysisScreen from "../screens/AnswerSheetAnalysisScreen";

const first = (value?: string | string[]) => Array.isArray(value) ? value[0] : value;

export default function AnswerSheetAnalysisRoute() {
  const router = useRouter();
  const { settings } = useAppConfig();
  const params = useLocalSearchParams<{
    sourceClassId?: string | string[];
    classId?: string | string[];
    occurrenceDate?: string | string[];
    subjectName?: string | string[];
  }>();
  const sourceClassId = first(params.sourceClassId) ?? first(params.classId) ?? null;
  const occurrenceDate = first(params.occurrenceDate) ?? null;
  const subjectName = first(params.subjectName) ?? null;

  useEffect(() => {
    if (settings.featureFlags.imageScanning !== true) return;
    setActivePaperClassLink({ sourceClassId, occurrenceDate, subjectName });
    return () => clearActivePaperClassLink(sourceClassId);
  }, [occurrenceDate, settings.featureFlags.imageScanning, sourceClassId, subjectName]);

  if (settings.featureFlags.imageScanning !== true) {
    return <View style={s.root}><LinearGradient colors={["#171020","#080D14"]} style={StyleSheet.absoluteFill}/><View style={s.card}><Ionicons name="scan-outline" size={34} color="#806F92"/><Text style={s.title}>Image Scanning Under Maintenance</Text><Text style={s.text}>Answer-sheet recognition is temporarily unavailable while we perform maintenance. Please try again later. You can still enter paper marks and weak topics manually.</Text><Pressable onPress={()=>router.replace("/test-mark")} style={s.button}><Text style={s.buttonText}>ENTER MARKS MANUALLY</Text></Pressable></View></View>;
  }

  return <AnswerSheetAnalysisScreen />;
}

const s=StyleSheet.create({root:{flex:1,backgroundColor:"#080D14",alignItems:"center",justifyContent:"center",padding:22},card:{width:"100%",maxWidth:440,borderRadius:24,backgroundColor:"#101720",borderWidth:1,borderColor:"#2B3848",padding:26,alignItems:"center"},title:{color:"#EEF1F5",fontSize:20,fontWeight:"900",marginTop:13},text:{color:"#788697",fontSize:11,lineHeight:18,textAlign:"center",marginTop:8},button:{height:46,borderRadius:14,backgroundColor:"#B784FF",paddingHorizontal:18,alignItems:"center",justifyContent:"center",marginTop:20},buttonText:{color:"#160B20",fontSize:9,fontWeight:"900",letterSpacing:1}})
