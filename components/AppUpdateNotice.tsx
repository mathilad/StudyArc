import { Ionicons } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

type UpdateNotice = { id:string; version:string; title:string; message:string; download_url:string };

export default function AppUpdateNotice() {
  const { user } = useAuth();
  const [notice, setNotice] = useState<UpdateNotice | null>(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (!user) { setNotice(null); return; }
    supabase.from("app_update_notifications").select("id,version,title,message,download_url").order("created_at", { ascending:false }).limit(1).maybeSingle()
      .then(({ data }) => setNotice(data as UpdateNotice | null))
      .catch(() => undefined);
  }, [user]);

  if (!notice || hidden) return null;
  return <View style={s.card}>
    <View style={s.icon}><Ionicons name="cloud-download-outline" size={20} color="#DCC6F7" /></View>
    <View style={s.body}><Text style={s.eyebrow}>NEW VERSION · {notice.version}</Text><Text style={s.title}>{notice.title}</Text><Text style={s.message}>{notice.message}</Text>
      <Pressable style={s.download} onPress={() => Linking.openURL(notice.download_url).catch(() => undefined)}><Ionicons name="download-outline" size={16} color="#160B20" /><Text style={s.downloadText}>Download update</Text></Pressable>
    </View>
    <Pressable style={s.close} onPress={() => setHidden(true)}><Ionicons name="close" size={18} color="#9BA7B8" /></Pressable>
  </View>;
}
const s=StyleSheet.create({card:{marginHorizontal:14,marginTop:10,borderRadius:17,backgroundColor:"#1B1426",borderWidth:1,borderColor:"#725292",padding:12,flexDirection:"row",gap:10},icon:{width:37,height:37,borderRadius:12,backgroundColor:"#302042",alignItems:"center",justifyContent:"center"},body:{flex:1},eyebrow:{color:"#BC95E7",fontSize:8,fontWeight:"900",letterSpacing:1},title:{color:"#F4F1F8",fontSize:13,fontWeight:"900",marginTop:3},message:{color:"#A9B2C0",fontSize:10,lineHeight:15,marginTop:4},download:{alignSelf:"flex-start",marginTop:10,minHeight:34,borderRadius:10,backgroundColor:"#B784FF",paddingHorizontal:11,flexDirection:"row",gap:5,alignItems:"center",justifyContent:"center"},downloadText:{color:"#160B20",fontSize:9,fontWeight:"900"},close:{width:28,height:28,alignItems:"center",justifyContent:"center"}});
