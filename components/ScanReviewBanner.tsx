import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

export default function ScanReviewBanner({ items = [] }: { items?: string[] }) {
  return <View style={s.card}>
    <View style={s.head}>
      <View style={s.icon}><Ionicons name="create-outline" size={18} color="#D9C1F6"/></View>
      <View style={{ flex: 1 }}>
        <Text style={s.title}>Review what StudyArc found</Text>
        <Text style={s.sub}>Analysis is only a draft. Check and edit the detected details below before anything is added to your study data.</Text>
      </View>
    </View>
    {items.length ? <View style={s.list}>{items.map((item, index) => <View key={`${item}-${index}`} style={s.row}><Ionicons name="checkmark-circle-outline" size={15} color="#83CFA2"/><Text style={s.item}>{item}</Text></View>)}</View> : null}
    <View style={s.lock}><Ionicons name="lock-closed-outline" size={15} color="#E2BE7F"/><Text style={s.lockText}>Nothing is committed until you press the final confirm/save button.</Text></View>
  </View>;
}

const s = StyleSheet.create({
  card:{borderRadius:18,backgroundColor:"#171321",borderWidth:1,borderColor:"#443454",padding:13,marginTop:10,marginBottom:4},
  head:{flexDirection:"row",alignItems:"center",gap:9},icon:{width:36,height:36,borderRadius:11,backgroundColor:"#241A31",alignItems:"center",justifyContent:"center"},title:{color:"#EEE7F5",fontSize:11,fontWeight:"900"},sub:{color:"#8A7B96",fontSize:8.5,lineHeight:13,marginTop:3},
  list:{marginTop:10,gap:6},row:{flexDirection:"row",alignItems:"flex-start",gap:7},item:{flex:1,color:"#B7C0CB",fontSize:8.7,lineHeight:13},
  lock:{marginTop:10,borderRadius:12,backgroundColor:"#211C14",borderWidth:1,borderColor:"#4E4027",padding:9,flexDirection:"row",alignItems:"center",gap:7},lockText:{flex:1,color:"#C7B58F",fontSize:8.2,lineHeight:12,fontWeight:"700"},
});