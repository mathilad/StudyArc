import{Ionicons}from"@expo/vector-icons";
import React,{useMemo,useRef,useState}from"react";
import{Animated,Modal,PanResponder,Pressable,ScrollView,StyleSheet,Text,View}from"react-native";
import{useAcademic,type Assignment}from"../context/AcademicContext";
import{useAssignmentEnhancements}from"../context/AssignmentEnhancementsContext";
import{subjectDisplayName}from"../lib/subjectDisplay";

type Props={visible:boolean;onClose:()=>void};
const ROW=88;
const clamp=(n:number,min:number,max:number)=>Math.max(min,Math.min(max,n));

export default function AssignmentPriorityModal({visible,onClose}:Props){
 const{assignments}=useAcademic();
 const{priorities,setPriorityOrder}=useAssignmentEnhancements();
 const[dragging,setDragging]=useState(false);
 const rows=useMemo(()=>assignments.filter(x=>!x.completed).sort((a,b)=>(priorities[a.id]??1000)-(priorities[b.id]??1000)||(a.dueAt??"9999").localeCompare(b.dueAt??"9999")),[assignments,priorities]);
 const reorder=async(from:number,to:number)=>{if(from===to)return;const ids=rows.map(x=>x.id),[id]=ids.splice(from,1);ids.splice(to,0,id);await setPriorityOrder(ids)};
 return <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}><View style={s.overlay}><Pressable style={StyleSheet.absoluteFill} onPress={onClose}/><View style={s.sheet}>
  <View style={s.head}><View style={s.headIcon}><Ionicons name="reorder-four-outline" size={23} color="#D9C0F5"/></View><View style={{flex:1}}><Text style={s.kicker}>ASSIGNMENT PRIORITY</Text><Text style={s.title}>Drag assignments into priority order</Text><Text style={s.sub}>The top card is scheduled first when StudyArc has a choice. Deadlines can still override unsafe ordering.</Text></View><Pressable onPress={onClose} style={s.close}><Ionicons name="close" size={21} color="#FFF"/></Pressable></View>
  <ScrollView scrollEnabled={!dragging} style={s.scroll} contentContainerStyle={s.list} showsVerticalScrollIndicator={false}>{rows.length?rows.map((item,index)=><DragRow key={item.id} item={item} index={index} total={rows.length} onDrop={reorder} onDragStateChange={setDragging}/>):<View style={s.empty}><Ionicons name="checkmark-done-outline" size={28} color="#667486"/><Text style={s.emptyTitle}>No open assignments</Text><Text style={s.emptySub}>Priority order appears here when you have work to do.</Text></View>}</ScrollView>
  <View style={s.note}><Ionicons name="information-circle-outline" size={18} color="#9FC6F4"/><Text style={s.noteText}>Priority is persisted to your account and also cached offline. Your weekly workload and planner both use this order.</Text></View>
 </View></View></Modal>
}

function DragRow({item,index,total,onDrop,onDragStateChange}:{item:Assignment;index:number;total:number;onDrop:(from:number,to:number)=>void;onDragStateChange:(active:boolean)=>void}){
 const y=useRef(new Animated.Value(0)).current;
 const[active,setActive]=useState(false);
 const indexRef=useRef(index),totalRef=useRef(total),dropRef=useRef(onDrop),dragRef=useRef(onDragStateChange);
 indexRef.current=index;totalRef.current=total;dropRef.current=onDrop;dragRef.current=onDragStateChange;
 const pan=useRef(PanResponder.create({
  onStartShouldSetPanResponder:()=>true,
  onMoveShouldSetPanResponder:(_,g)=>Math.abs(g.dy)>3,
  onPanResponderGrant:()=>{setActive(true);dragRef.current(true)},
  onPanResponderMove:(_,g)=>y.setValue(g.dy),
  onPanResponderRelease:(_,g)=>{
   const from=indexRef.current,to=clamp(from+Math.round(g.dy/ROW),0,totalRef.current-1);
   Animated.spring(y,{toValue:0,useNativeDriver:true,speed:24,bounciness:2}).start();
   setActive(false);dragRef.current(false);void dropRef.current(from,to);
  },
  onPanResponderTerminate:()=>{Animated.spring(y,{toValue:0,useNativeDriver:true}).start();setActive(false);dragRef.current(false)}
 })).current;
 return <Animated.View style={[s.row,active&&s.rowActive,{transform:[{translateY:y}],zIndex:active?20:1}]}>
  <View style={s.rank}><Text style={s.rankLabel}>PRIORITY</Text><Text style={s.rankText}>#{index+1}</Text></View>
  <View style={{flex:1}}><Text style={s.rowTitle}>{item.title}</Text><Text style={s.rowSub}>{subjectDisplayName(item.subjectName)}{` · ${item.estimatedMinutes} min`}{item.dueAt?` · due ${new Date(item.dueAt).toLocaleDateString(undefined,{month:"short",day:"numeric"})}`:" · no deadline"}</Text></View>
  <View style={[s.handle,active&&s.handleActive]} {...pan.panHandlers}><Ionicons name="menu" size={24} color={active?"#F0E5FC":"#BDA6D8"}/></View>
 </Animated.View>
}

const s=StyleSheet.create({overlay:{flex:1,backgroundColor:"rgba(3,6,10,.82)",alignItems:"center",justifyContent:"center",padding:18},sheet:{width:"100%",maxWidth:600,maxHeight:"86%",borderRadius:26,backgroundColor:"#0F161F",borderWidth:1,borderColor:"#463654",overflow:"hidden"},head:{padding:16,flexDirection:"row",gap:11,alignItems:"center",borderBottomWidth:1,borderBottomColor:"#25303D"},headIcon:{width:46,height:46,borderRadius:15,backgroundColor:"#251A32",alignItems:"center",justifyContent:"center"},kicker:{color:"#A889C8",fontSize:9,fontWeight:"900",letterSpacing:1.1},title:{color:"#F1EDF5",fontSize:17,fontWeight:"900",marginTop:2},sub:{color:"#7D8999",fontSize:11,lineHeight:16,marginTop:4},close:{width:40,height:40,borderRadius:13,backgroundColor:"#18212B",alignItems:"center",justifyContent:"center"},scroll:{maxHeight:500},list:{padding:12,gap:8},row:{height:80,borderRadius:18,backgroundColor:"#151D27",borderWidth:1,borderColor:"#2C3948",paddingHorizontal:10,flexDirection:"row",alignItems:"center",gap:10,shadowColor:"#000",shadowOpacity:.12,shadowRadius:6,shadowOffset:{width:0,height:3},elevation:2},rowActive:{backgroundColor:"#241B31",borderColor:"#76579A",shadowOpacity:.34,elevation:10},rank:{minWidth:54,height:50,borderRadius:13,backgroundColor:"#2A2035",alignItems:"center",justifyContent:"center",paddingHorizontal:6},rankLabel:{color:"#8F7A9F",fontSize:6.5,fontWeight:"900",letterSpacing:.7},rankText:{color:"#D9C2F3",fontSize:14,fontWeight:"900",marginTop:2},rowTitle:{color:"#E8ECF1",fontSize:13,fontWeight:"900"},rowSub:{color:"#748193",fontSize:10,lineHeight:15,marginTop:4},handle:{width:44,height:52,borderRadius:13,backgroundColor:"#21182D",alignItems:"center",justifyContent:"center"},handleActive:{backgroundColor:"#5B3D7D"},note:{margin:12,marginTop:0,borderRadius:15,backgroundColor:"#101B27",borderWidth:1,borderColor:"#29465F",padding:11,flexDirection:"row",gap:8},noteText:{flex:1,color:"#829BB0",fontSize:10.5,lineHeight:16},empty:{padding:28,alignItems:"center"},emptyTitle:{color:"#DDE2E8",fontSize:14,fontWeight:"900",marginTop:8},emptySub:{color:"#758293",fontSize:10.5,marginTop:4,textAlign:"center"}});
