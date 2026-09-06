import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useStudent } from "../../context/StudentContext";
import StatisticsScreen from "../../screens/StatisticsScreen";

export default function StatisticsTab(){
  const { dailyReviews } = useStudent();
  const pageStats = useMemo(() => {
    const now = Date.now();
    const last7 = dailyReviews.filter(row => {
      const time = new Date(`${row.reviewDate}T12:00:00`).getTime();
      return Number.isFinite(time) && now - time < 7 * 86400000;
    });
    return {
      studied: dailyReviews.reduce((sum,row)=>sum+row.pagesStudied,0),
      revised: dailyReviews.reduce((sum,row)=>sum+row.pagesRevised,0),
      last7: last7.reduce((sum,row)=>sum+row.pagesStudied+row.pagesRevised,0),
      days: dailyReviews.length,
    };
  }, [dailyReviews]);

  return <View style={s.root}>
    <View style={s.pageBar}>
      <View style={s.pageMetric}><Text style={s.pageValue}>{pageStats.studied}</Text><Text style={s.pageLabel}>Pages studied</Text></View>
      <View style={s.divider}/>
      <View style={s.pageMetric}><Text style={s.pageValue}>{pageStats.revised}</Text><Text style={s.pageLabel}>Pages revised</Text></View>
      <View style={s.divider}/>
      <View style={s.pageMetric}><Text style={s.pageValue}>{pageStats.last7}</Text><Text style={s.pageLabel}>Pages · last 7 days</Text></View>
      <View style={s.divider}/>
      <View style={s.pageMetric}><Text style={s.pageValue}>{pageStats.days}</Text><Text style={s.pageLabel}>Reviewed days</Text></View>
    </View>
    <View style={s.analytics}><StatisticsScreen/></View>
  </View>;
}

const s=StyleSheet.create({root:{flex:1,backgroundColor:"#080D14"},pageBar:{minHeight:72,backgroundColor:"#0D141D",borderBottomWidth:1,borderBottomColor:"#263241",paddingHorizontal:16,paddingVertical:10,flexDirection:"row",alignItems:"center"},pageMetric:{flex:1,minWidth:0,alignItems:"center"},pageValue:{color:"#F2F4F7",fontSize:18,fontWeight:"900"},pageLabel:{color:"#748194",fontSize:8,fontWeight:"800",marginTop:3,textAlign:"center"},divider:{width:1,height:36,backgroundColor:"#263241"},analytics:{flex:1}});
