import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Switch, Text, View } from "react-native";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";

export default function LeaderboardSettingsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [visible, setVisible] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("social_profiles").select("show_on_leaderboard").eq("user_id", user.id).maybeSingle().then(({ data }) => {
      setVisible(data?.show_on_leaderboard !== false);
      setLoading(false);
    });
  }, [user]);

  const change = async (value: boolean) => {
    if (!user || saving) return;
    setVisible(value);
    setSaving(true);
    const { error } = await supabase.from("social_profiles").update({ show_on_leaderboard: value, updated_at: new Date().toISOString() }).eq("user_id", user.id);
    setSaving(false);
    if (error) {
      setVisible(!value);
      Alert.alert("Could not update setting", error.message);
    }
  };

  return <View style={s.root}>
    <LinearGradient colors={["#171023", "#080D14"]} style={StyleSheet.absoluteFill} />
    <View style={s.header}><Pressable onPress={() => router.back()} style={s.back}><Ionicons name="arrow-back" size={21} color="#FFF" /></Pressable><View><Text style={s.title}>Leaderboard privacy</Text><Text style={s.sub}>Control whether your study time appears publicly in Study Arc rankings.</Text></View></View>
    <View style={s.content}>
      <View style={s.card}><View style={s.icon}><Ionicons name="trophy-outline" size={25} color="#E6C56E" /></View><View style={{ flex: 1 }}><Text style={s.cardTitle}>Appear on daily leaderboard</Text><Text style={s.cardText}>When off, your ranking rows are removed and new ranking updates are blocked. Your study sessions, analytics and friends still work normally.</Text></View><Switch disabled={loading || saving} value={visible} onValueChange={change} /></View>
      <View style={s.note}><Ionicons name="shield-checkmark-outline" size={19} color="#87CDA4" /><Text style={s.noteText}>{loading ? "Loading your preference…" : visible ? "You currently appear in the leaderboard when you record study time." : "You are hidden from the leaderboard. You can turn this back on at any time."}</Text></View>
    </View>
  </View>;
}

const s = StyleSheet.create({root:{flex:1,backgroundColor:"#080D14"},header:{padding:18,paddingTop:22,flexDirection:"row",alignItems:"center",gap:11},back:{width:43,height:43,borderRadius:14,backgroundColor:"#151B25",alignItems:"center",justifyContent:"center"},title:{color:"#F5F6F8",fontSize:21,fontWeight:"900"},sub:{color:"#748194",fontSize:9.5,marginTop:3,maxWidth:300},content:{padding:20,maxWidth:720,width:"100%",alignSelf:"center"},card:{borderRadius:20,backgroundColor:"#111923",borderWidth:1,borderColor:"#2B3848",padding:15,flexDirection:"row",alignItems:"center",gap:12},icon:{width:47,height:47,borderRadius:15,backgroundColor:"#F0C96C14",alignItems:"center",justifyContent:"center"},cardTitle:{color:"#EBEEF2",fontSize:13,fontWeight:"900"},cardText:{color:"#788697",fontSize:9.5,lineHeight:15,marginTop:4},note:{marginTop:10,borderRadius:16,backgroundColor:"#102019",borderWidth:1,borderColor:"#315843",padding:12,flexDirection:"row",alignItems:"flex-start",gap:9},noteText:{flex:1,color:"#86B999",fontSize:9.5,lineHeight:15}});