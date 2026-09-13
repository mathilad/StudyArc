import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useAuth } from "../context/AuthContext";
import { listRecognizedPaperDrafts, removeRecognizedPaperDraft, type RecognizedPaperDraft } from "../lib/recognizedPaperStore";

export default function RecognizedPaperTextScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [items, setItems] = useState<RecognizedPaperDraft[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) { setItems([]); setLoading(false); return; }
    setLoading(true);
    setItems(await listRecognizedPaperDrafts(user.id));
    setLoading(false);
  }, [user]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const remove = (item: RecognizedPaperDraft) => {
    if (!user) return;
    Alert.alert("Remove recognized text?", "This removes the locally stored transcription. It does not delete saved marks or paper analysis.", [
      { text: "Keep", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: async () => { await removeRecognizedPaperDraft(user.id, item.id); if (expanded === item.id) setExpanded(null); await load(); } },
    ]);
  };

  return <View style={s.root}>
    <LinearGradient colors={["#181022", "#080D14"]} style={StyleSheet.absoluteFill} />
    <View style={s.head}>
      <Pressable onPress={() => router.back()} style={s.back}><Ionicons name="arrow-back" size={21} color="#FFF" /></Pressable>
      <View style={{ flex: 1 }}><Text style={s.title}>Recognized paper text</Text><Text style={s.sub}>Text StudyArc recognized from analyzed paper pages is kept on this device for review.</Text></View>
      <Pressable onPress={() => void load()} style={s.refresh}><Ionicons name="refresh" size={18} color="#D2B6EE" /></Pressable>
    </View>
    <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
      <View style={s.info}><Ionicons name="scan-outline" size={20} color="#8FD0AA" /><Text style={s.infoText}>Recognized text is a transcription aid. Handwriting, equations, diagrams and unclear Sinhala/English text can still be misread, so the original paper remains the source of truth.</Text></View>
      {loading ? <View style={s.empty}><Text style={s.emptyTitle}>Loading recognized text…</Text></View> : items.length === 0 ? <View style={s.empty}><Ionicons name="document-text-outline" size={34} color="#667587" /><Text style={s.emptyTitle}>No recognized paper text yet</Text><Text style={s.emptyText}>Analyze a marked paper. StudyArc will automatically keep the readable page text here.</Text></View> : items.map(item => {
        const open = expanded === item.id;
        return <View key={item.id} style={s.card}>
          <Pressable onPress={() => setExpanded(open ? null : item.id)} style={s.cardHead}>
            <View style={s.docIcon}><Ionicons name="document-text-outline" size={20} color="#CDAFED" /></View>
            <View style={{ flex: 1 }}><Text style={s.cardTitle}>{item.title}</Text><Text style={s.cardMeta}>{item.subjectName || "Unconfirmed subject"}{item.paperDate ? ` · ${item.paperDate}` : ""} · {item.recognizedPages.length} page{item.recognizedPages.length === 1 ? "" : "s"}</Text></View>
            <Ionicons name={open ? "chevron-up" : "chevron-down"} size={18} color="#728196" />
          </Pressable>
          {open ? <View style={s.body}>
            {item.recognizedPages.map(page => <View key={page.pageIndex} style={s.page}>
              <View style={s.pageHead}><Text style={s.pageTitle}>PAGE {page.pageIndex}</Text><Text style={s.confidence}>{page.confidence == null ? "confidence —" : `${Math.round(page.confidence * 100)}% text confidence`}</Text></View>
              <Text selectable style={s.pageText}>{page.text || "No readable text was recognized on this page."}</Text>
            </View>)}
            <Pressable onPress={() => remove(item)} style={s.remove}><Ionicons name="trash-outline" size={16} color="#D995A0" /><Text style={s.removeText}>Remove local transcription</Text></Pressable>
          </View> : null}
        </View>;
      })}
    </ScrollView>
  </View>;
}

const s = StyleSheet.create({
  root:{flex:1,backgroundColor:"#080D14"},head:{padding:18,paddingTop:22,flexDirection:"row",alignItems:"center",gap:11},back:{width:43,height:43,borderRadius:14,backgroundColor:"#151B25",alignItems:"center",justifyContent:"center"},refresh:{width:43,height:43,borderRadius:14,backgroundColor:"#21182D",alignItems:"center",justifyContent:"center"},title:{color:"#F5F6F8",fontSize:21,fontWeight:"900"},sub:{color:"#748194",fontSize:9,lineHeight:14,marginTop:3},content:{padding:18,paddingBottom:55,maxWidth:840,width:"100%",alignSelf:"center"},
  info:{borderRadius:17,backgroundColor:"#102019",borderWidth:1,borderColor:"#315843",padding:13,flexDirection:"row",gap:9,marginBottom:12},infoText:{flex:1,color:"#86A493",fontSize:9,lineHeight:14},empty:{minHeight:150,borderRadius:20,backgroundColor:"#101720",borderWidth:1,borderColor:"#293646",alignItems:"center",justifyContent:"center",padding:22},emptyTitle:{color:"#E5E9EE",fontSize:14,fontWeight:"900",marginTop:8},emptyText:{color:"#718093",fontSize:9,lineHeight:14,textAlign:"center",marginTop:6,maxWidth:360},
  card:{borderRadius:19,backgroundColor:"#101720",borderWidth:1,borderColor:"#293646",marginBottom:9,overflow:"hidden"},cardHead:{minHeight:74,padding:12,flexDirection:"row",alignItems:"center",gap:10},docIcon:{width:42,height:42,borderRadius:13,backgroundColor:"#21182D",alignItems:"center",justifyContent:"center"},cardTitle:{color:"#E9EDF1",fontSize:11.5,fontWeight:"900"},cardMeta:{color:"#718093",fontSize:8.2,marginTop:4},body:{borderTopWidth:1,borderTopColor:"#263342",padding:12},page:{borderRadius:14,backgroundColor:"#0B1119",borderWidth:1,borderColor:"#243140",padding:11,marginBottom:8},pageHead:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",gap:8},pageTitle:{color:"#A78BC1",fontSize:7.5,fontWeight:"900",letterSpacing:1},confidence:{color:"#647286",fontSize:7.2,fontWeight:"800"},pageText:{color:"#BCC5D0",fontSize:10,lineHeight:16,marginTop:8},remove:{height:42,borderRadius:12,backgroundColor:"#24171C",borderWidth:1,borderColor:"#4E2D36",flexDirection:"row",alignItems:"center",justifyContent:"center",gap:7},removeText:{color:"#D99AA5",fontSize:8.5,fontWeight:"900"},
});
