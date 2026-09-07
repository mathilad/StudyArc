import React from "react";
import { ActivityIndicator,StyleSheet,Text,View } from "react-native";
export default function InlineActionLoader({label="Saving…"}:{label?:string}){return <View style={s.pill} accessibilityRole="progressbar"><ActivityIndicator size="small" color="#C39AFF"/><Text style={s.label}>{label}</Text></View>}
const s=StyleSheet.create({pill:{flexDirection:"row",alignItems:"center",justifyContent:"center",gap:8,paddingHorizontal:12,paddingVertical:9,borderRadius:14,backgroundColor:"#121923",borderWidth:1,borderColor:"#293646"},label:{color:"#AAB5C4",fontSize:11,fontWeight:"700"}});
