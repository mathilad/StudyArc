import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import ClassFormModal from "../components/ClassFormModal";
import ClassWeekOverrideModal from "../components/ClassWeekOverrideModal";
import ProtectedTimeModal from "../components/ProtectedTimeModal";
import { useScheduleAdjustments } from "../context/ScheduleAdjustmentsContext";
import { useStudent, type ClassSchedule } from "../context/StudentContext";
import { currentWeekDates, weekStartKey } from "../lib/scheduleAdjustments";
import { format12Hour } from "../lib/time";
import { expandSubjectChoices, topicDisplayName } from "../data/subjects";

const DAYS=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
type PendingDelete={kind:"class"|"protected";id:string;title:string;subject?:string};
const labelDate=(iso:string|null)=>iso?new Date(`${iso}T00:00:00`).toLocaleDateString(undefined,{weekday:"short",day:"numeric",month:"short"}):"";

export default function Classes(){
  const router=useRouter();
  const{profile,classes,addClass,deleteClass}=useStudent();
  const{protectedTimes,classWeekOverrides,addProtectedTime,deleteProtectedTime,saveClassWeekOverride,clearClassWeekOverride}=useScheduleAdjustments();
  const[open,setOpen]=useState(false);
  const[protectedOpen,setProtectedOpen]=useState(false);
  const[overrideClass,setOverrideClass]=useState<ClassSchedule|null>(null);
  const[pendingDelete,setPendingDelete]=useState<PendingDelete|null>(null);
  const[deleting,setDeleting]=useState(false);
  const subjects=useMemo(()=>expandSubjectChoices(profile.subjectChoices),[profile.subjectChoices]);
  const currentWeek=weekStartKey();
  const week=currentWeekDates();
  const visibleProtected=protectedTimes.filter(x=>x.recurrence==="Weekly"||(x.date&&weekStartKey(new Date(`${x.date}T00:00:00`))===currentWeek));
  const overrideFor=(classId:string)=>classWeekOverrides.find(x=>x.classId===classId&&x.weekStart===currentWeek);

  const confirmDelete=async()=>{
    if(!pendingDelete||deleting)return;
    setDeleting(true);
    const target=pendingDelete;
    try{
      if(target.kind==="class")await deleteClass(target.id);else await deleteProtectedTime(target.id);
      setPendingDelete(null);
    }catch(e){Alert.alert("Could not delete",e instanceof Error?e.message:"Try again.")}finally{setDeleting(false)}
  };

  return <View style={s.root}>
    <LinearGradient colors={["#151022","#080D14"]} style={StyleSheet.absoluteFill}/>
    <View style={s.head}>
      <Pressable onPress={()=>router.back()} style={s.back}><Ionicons name="arrow-back" size={22} color="#FFF"/></Pressable>
      <View style={{flex:1}}><Text style={s.title}>Classes & protected time</Text><Text style={s.sub}>Make the generated plan fit the week you actually have</Text></View>
      <Pressable onPress={()=>setOpen(true)} style={s.add}><Ionicons name="add" size={20} color="#150B1E"/></Pressable>
    </View>
    <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
      <View style={s.weekBanner}><Ionicons name="calendar-outline" size={20} color="#C9A8F3"/><View style={{flex:1}}><Text style={s.weekTitle}>This week · {week[0].toLocaleDateString(undefined,{day:"numeric",month:"short"})} – {week[6].toLocaleDateString(undefined,{day:"numeric",month:"short"})}</Text><Text style={s.weekText}>Set the lesson each class is covering. Missed and make-up changes affect this week only; your recurring class remains unchanged.</Text></View></View>

      <View style={s.sectionHead}><View style={{flex:1}}><Text style={s.sectionTitle}>Weekly classes</Text><Text style={s.sectionSub}>Class lessons get extra study priority, especially as the next class approaches.</Text></View><Pressable onPress={()=>setOpen(true)} style={s.smallAdd}><Ionicons name="add" size={16} color="#190E21"/><Text style={s.smallAddText}>Class</Text></Pressable></View>
      {classes.length===0?<View style={s.empty}><Ionicons name="calendar-outline" size={40} color="#637183"/><Text style={s.emptyTitle}>No classes yet</Text><Text style={s.emptyText}>Add Theory, Revision, Paper or Extra Class sessions. Physical classes reserve 90 minutes travel each way.</Text><Pressable onPress={()=>setOpen(true)} style={s.primary}><Text style={s.primaryText}>Add first class</Text></Pressable></View>:classes.map(c=>{
        const override=overrideFor(c.id);
        const topic=override?.topicName?topicDisplayName(c.subjectName,override.topicName,profile.medium):null;
        const paperPrep=Math.max(c.preReviewMinutes,c.classType==="Paper"?90:0);
        return <View key={c.id} style={s.card}>
          <View style={s.day}><Text style={s.dayText}>{DAYS[c.dayOfWeek].slice(0,3).toUpperCase()}</Text></View>
          <View style={{flex:1,minWidth:0}}>
            <View style={s.titleLine}><Text style={s.cardTitle}>{c.subjectName} · {c.classType}</Text>
              {override?.status==="Missed"&&<Pill text="MISSED" type="missed"/>}
              {override?.status==="Rescheduled"&&<Pill text="MOVED" type="moved"/>}
              {override?.status==="Scheduled"&&override.topicName&&<Pill text="FOCUS SET" type="focus"/>}
            </View>
            <Text style={s.meta}>{DAYS[c.dayOfWeek]} · {format12Hour(c.startTime)}–{format12Hour(c.endTime)}</Text>
            <Text style={s.meta}>{c.deliveryMode} · {paperPrep} min {c.classType==="Paper"?"paper preparation":"pre-class review"}{c.deliveryMode==="Physical"?" · 90 min travel each way":""}</Text>
            {topic&&<View style={s.focusBox}><Ionicons name="book-outline" size={15} color="#CCAFF2"/><View style={{flex:1}}><Text style={s.focusLabel}>THIS WEEK'S LESSON</Text><Text style={s.focusText}>{topic}</Text></View></View>}
            {override?.status==="Missed"&&<Text style={s.overrideMissed}>Removed from this week's plan. Open “This week” to arrange a make-up.</Text>}
            {override?.status==="Rescheduled"&&<Text style={s.overrideMoved}>Make-up: {labelDate(override.rescheduledDate)} · {format12Hour(override.startTime||c.startTime)}–{format12Hour(override.endTime||c.endTime)}</Text>}
            <View style={s.actions}>
              <Pressable onPress={()=>setOverrideClass(c)} style={s.weekAction}><Ionicons name="calendar-number-outline" size={15} color="#CEB0F2"/><Text style={s.weekActionText}>This week</Text></Pressable>
              {override?.status!=="Missed"&&<Pressable onPress={()=>router.push({pathname:"/class-complete",params:{subjectName:c.subjectName}})} style={s.covered}><Ionicons name="checkmark-done-outline" size={16} color="#73DDA4"/><Text style={s.coveredText}>Log coverage</Text></Pressable>}
            </View>
          </View>
          <Pressable hitSlop={8} onPress={()=>setPendingDelete({kind:"class",id:c.id,title:c.title||`${c.classType} class`,subject:c.subjectName})} style={s.delete}><Ionicons name="trash-outline" size={18} color="#A27680"/></Pressable>
        </View>
      })}

      <View style={s.sectionHead}><View style={{flex:1}}><Text style={s.sectionTitle}>Protected time</Text><Text style={s.sectionSub}>Reserve anything you must attend or any short interval that should not become study.</Text></View><Pressable onPress={()=>setProtectedOpen(true)} style={s.smallAdd}><Ionicons name="add" size={16} color="#190E21"/><Text style={s.smallAddText}>Time</Text></Pressable></View>
      <View style={s.protectedInfo}><Ionicons name="shield-checkmark-outline" size={20} color="#C5A2F1"/><Text style={s.protectedInfoText}>Add appointments, clubs, chores, family events, meals, extra commitments or even a 20-minute unavailable interval. Study Arc keeps it clear.</Text></View>
      {visibleProtected.length===0?<Pressable onPress={()=>setProtectedOpen(true)} style={s.protectedEmpty}><Ionicons name="time-outline" size={27} color="#677587"/><Text style={s.protectedEmptyTitle}>No protected time yet</Text><Text style={s.protectedEmptyText}>Use this when you are free from studying but not actually available.</Text></Pressable>:visibleProtected.map(item=><View key={item.id} style={s.protectedCard}><View style={s.protectedIcon}><Ionicons name="shield-outline" size={20} color="#C7A6EF"/></View><View style={{flex:1}}><Text style={s.protectedTitle}>{item.title}</Text><Text style={s.meta}>{item.recurrence==="Weekly"?`Every ${DAYS[item.dayOfWeek]}`:labelDate(item.date)} · {format12Hour(item.startTime)}–{format12Hour(item.endTime)}</Text><Text style={s.protectedTag}>NOT AVAILABLE FOR STUDY</Text></View><Pressable onPress={()=>setPendingDelete({kind:"protected",id:item.id,title:item.title})} style={s.delete}><Ionicons name="trash-outline" size={18} color="#A27680"/></Pressable></View>)}
    </ScrollView>

    <ClassFormModal visible={open} subjects={subjects} onClose={()=>setOpen(false)} onSave={addClass}/>
    <ProtectedTimeModal visible={protectedOpen} onClose={()=>setProtectedOpen(false)} onSave={addProtectedTime}/>
    <ClassWeekOverrideModal visible={!!overrideClass} classSchedule={overrideClass} existing={overrideClass?overrideFor(overrideClass.id):null} onClose={()=>setOverrideClass(null)} onSave={saveClassWeekOverride} onClear={()=>overrideClass?clearClassWeekOverride(overrideClass.id,currentWeek):Promise.resolve()}/>

    <Modal visible={!!pendingDelete} transparent animationType="fade" onRequestClose={()=>!deleting&&setPendingDelete(null)}>
      <View style={s.overlay}><Pressable style={StyleSheet.absoluteFill} disabled={deleting} onPress={()=>setPendingDelete(null)}/><View style={s.modal}><View style={s.modalIcon}><Ionicons name="trash-outline" size={23} color="#F2A1AE"/></View><Text style={s.modalTitle}>Delete {pendingDelete?.kind==="class"?"class":"protected time"}?</Text><Text style={s.modalSubject}>{pendingDelete?.subject?`${pendingDelete.subject} · `:""}{pendingDelete?.title}</Text><Text style={s.modalText}>{pendingDelete?.kind==="class"?"This class will be removed from the recurring schedule and future plans.":"This interval becomes available to the planner again."}</Text><View style={s.modalActions}><Pressable disabled={deleting} onPress={()=>setPendingDelete(null)} style={s.cancel}><Text style={s.cancelText}>Keep it</Text></Pressable><Pressable disabled={deleting} onPress={confirmDelete} style={[s.confirm,deleting&&{opacity:.55}]}><Ionicons name={deleting?"hourglass-outline":"trash-outline"} size={17} color="#FFF4F6"/><Text style={s.confirmText}>{deleting?"Deleting…":"Delete"}</Text></Pressable></View></View></View>
    </Modal>
  </View>;
}

function Pill({text,type}:{text:string;type:"missed"|"moved"|"focus"}){return <View style={[s.status,type==="missed"?s.statusMissed:type==="moved"?s.statusMoved:s.statusFocus]}><Text style={[s.statusText,type==="missed"?s.statusTextMissed:type==="moved"?s.statusTextMoved:s.statusTextFocus]}>{text}</Text></View>}

const s=StyleSheet.create({
  root:{flex:1,backgroundColor:"#080D14"},head:{padding:18,paddingTop:22,flexDirection:"row",alignItems:"center",gap:12},back:{width:43,height:43,borderRadius:14,backgroundColor:"#151C27",alignItems:"center",justifyContent:"center"},title:{color:"#F5F6F8",fontSize:22,fontWeight:"900"},sub:{color:"#738093",fontSize:10,marginTop:3},add:{width:43,height:43,borderRadius:14,backgroundColor:"#B784FF",alignItems:"center",justifyContent:"center"},content:{padding:20,paddingBottom:45,maxWidth:880,width:"100%",alignSelf:"center"},
  weekBanner:{borderRadius:18,backgroundColor:"#171321",borderWidth:1,borderColor:"#47355D",padding:14,flexDirection:"row",gap:10,alignItems:"flex-start",marginBottom:20},weekTitle:{color:"#E9DDF7",fontSize:12,fontWeight:"900"},weekText:{color:"#877994",fontSize:9.5,lineHeight:15,marginTop:3},
  sectionHead:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",gap:12,marginTop:8,marginBottom:10},sectionTitle:{color:"#EEF1F5",fontSize:18,fontWeight:"900"},sectionSub:{color:"#758293",fontSize:10,lineHeight:15,marginTop:3,maxWidth:590},smallAdd:{height:38,borderRadius:12,backgroundColor:"#B784FF",paddingHorizontal:11,flexDirection:"row",alignItems:"center",justifyContent:"center",gap:4},smallAddText:{color:"#190E21",fontSize:10,fontWeight:"900"},
  card:{minHeight:112,borderRadius:19,backgroundColor:"#111923",borderWidth:1,borderColor:"#273445",padding:14,flexDirection:"row",alignItems:"flex-start",gap:12,marginBottom:10},day:{width:48,height:48,borderRadius:15,backgroundColor:"#243149",alignItems:"center",justifyContent:"center"},dayText:{color:"#AFC9F0",fontSize:10,fontWeight:"900"},titleLine:{flexDirection:"row",alignItems:"center",gap:7,flexWrap:"wrap"},cardTitle:{color:"#EEF1F5",fontSize:14,fontWeight:"900"},meta:{color:"#7D899A",fontSize:10.5,marginTop:4,lineHeight:15},
  status:{borderRadius:8,paddingVertical:3,paddingHorizontal:6,borderWidth:1},statusMissed:{backgroundColor:"#29171C",borderColor:"#633842"},statusMoved:{backgroundColor:"#241A32",borderColor:"#604680"},statusFocus:{backgroundColor:"#112019",borderColor:"#38644B"},statusText:{fontSize:7.5,fontWeight:"900",letterSpacing:.7},statusTextMissed:{color:"#EFA7B3"},statusTextMoved:{color:"#D5B5F5"},statusTextFocus:{color:"#83D8A4"},
  focusBox:{borderRadius:12,backgroundColor:"#171322",borderWidth:1,borderColor:"#40324F",padding:9,flexDirection:"row",gap:8,alignItems:"center",marginTop:8},focusLabel:{color:"#806B99",fontSize:7.5,fontWeight:"900",letterSpacing:.8},focusText:{color:"#D7C4ED",fontSize:10,fontWeight:"800",marginTop:2},overrideMissed:{color:"#C48A94",fontSize:9.5,fontWeight:"800",marginTop:7},overrideMoved:{color:"#C6A9EB",fontSize:9.5,fontWeight:"800",marginTop:7},actions:{flexDirection:"row",flexWrap:"wrap",gap:7,marginTop:10},weekAction:{minHeight:34,borderRadius:11,backgroundColor:"#21192C",borderWidth:1,borderColor:"#49375F",paddingHorizontal:10,flexDirection:"row",gap:6,alignItems:"center"},weekActionText:{color:"#CDB3ED",fontSize:9.5,fontWeight:"900"},covered:{minHeight:34,borderRadius:11,backgroundColor:"#102019",borderWidth:1,borderColor:"#315843",paddingHorizontal:10,flexDirection:"row",gap:6,alignItems:"center"},coveredText:{color:"#8BD4A7",fontSize:9.5,fontWeight:"900"},delete:{width:34,height:34,borderRadius:11,backgroundColor:"#23161B",alignItems:"center",justifyContent:"center"},
  empty:{padding:35,alignItems:"center",backgroundColor:"#101720",borderRadius:22,borderWidth:1,borderColor:"#263241",marginBottom:22},emptyTitle:{color:"#EEF1F5",fontSize:19,fontWeight:"900",marginTop:12},emptyText:{color:"#778496",textAlign:"center",lineHeight:19,fontSize:12,marginTop:7,maxWidth:430},primary:{height:47,borderRadius:15,backgroundColor:"#B784FF",paddingHorizontal:20,alignItems:"center",justifyContent:"center",marginTop:18},primaryText:{color:"#150C1D",fontWeight:"900"},
  protectedInfo:{borderRadius:16,backgroundColor:"#171321",borderWidth:1,borderColor:"#40344F",padding:12,flexDirection:"row",gap:9,alignItems:"center",marginBottom:9},protectedInfoText:{flex:1,color:"#94869F",fontSize:10.5,lineHeight:16},protectedEmpty:{borderRadius:19,backgroundColor:"#0F161F",borderWidth:1,borderColor:"#283545",padding:24,alignItems:"center",marginBottom:12},protectedEmptyTitle:{color:"#DDE2E8",fontSize:14,fontWeight:"900",marginTop:8},protectedEmptyText:{color:"#718092",fontSize:10,lineHeight:16,textAlign:"center",marginTop:4,maxWidth:430},protectedCard:{minHeight:78,borderRadius:18,backgroundColor:"#101720",borderWidth:1,borderColor:"#2A3646",padding:12,flexDirection:"row",alignItems:"center",gap:11,marginBottom:8},protectedIcon:{width:43,height:43,borderRadius:14,backgroundColor:"#20182A",alignItems:"center",justifyContent:"center"},protectedTitle:{color:"#E8EBEF",fontSize:12.5,fontWeight:"900"},protectedTag:{color:"#9C82BC",fontSize:7.5,fontWeight:"900",letterSpacing:1,marginTop:5},
  overlay:{flex:1,backgroundColor:"rgba(3,6,10,.82)",alignItems:"center",justifyContent:"center",padding:22},modal:{width:"100%",maxWidth:410,borderRadius:24,backgroundColor:"#101720",borderWidth:1,borderColor:"#3B2C37",padding:22,alignItems:"center"},modalIcon:{width:52,height:52,borderRadius:17,backgroundColor:"#2B171E",borderWidth:1,borderColor:"#5A303B",alignItems:"center",justifyContent:"center",marginBottom:15},modalTitle:{color:"#F4F5F7",fontSize:20,fontWeight:"900",textAlign:"center"},modalSubject:{color:"#D1B8F0",fontSize:13,fontWeight:"800",textAlign:"center",marginTop:7},modalText:{color:"#7F8B9A",fontSize:11,lineHeight:17,textAlign:"center",marginTop:10},modalActions:{width:"100%",flexDirection:"row",gap:10,marginTop:20},cancel:{flex:1,height:48,borderRadius:15,backgroundColor:"#18212D",borderWidth:1,borderColor:"#2B3746",alignItems:"center",justifyContent:"center"},cancelText:{color:"#C8D0DA",fontSize:12,fontWeight:"900"},confirm:{flex:1,height:48,borderRadius:15,backgroundColor:"#8F4050",flexDirection:"row",gap:7,alignItems:"center",justifyContent:"center"},confirmText:{color:"#FFF4F6",fontSize:12,fontWeight:"900"}
});
