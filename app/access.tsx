import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Redirect, useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useAppConfig } from "../context/AppConfigContext";
import { useAuth } from "../context/AuthContext";
import { useMonetization } from "../context/MonetizationContext";
import InlineActionLoader from "../components/InlineActionLoader";
import { supabase } from "../lib/supabase";

const money = (value:number) => `LKR ${Math.round(value).toLocaleString()}`;

export default function AccessScreen() {
  const router = useRouter();
  const { session, signOut } = useAuth();
  const { settings, isAdmin, refreshing: adminLoading } = useAppConfig();
  const { access, plans, paymentMethods, payments, loading, refreshMonetization, createPaymentRequest, uploadPaymentReceipt, redeemActivationCode } = useMonetization();
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(plans.find(p=>p.featured)?.id ?? plans[0]?.id ?? null);
  const [selectedMethodId, setSelectedMethodId] = useState<string | null>(paymentMethods[0]?.id ?? null);
  const [activationCode, setActivationCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [showPaymentOptions, setShowPaymentOptions] = useState(false);
  const [approvalChecked,setApprovalChecked]=useState(false);
  const [activationStage,setActivationStage]=useState<"accepted"|"generating"|null>(null);
  const [acceptedPaymentId,setAcceptedPaymentId]=useState<string|null>(null);
  const [progressPercent,setProgressPercent]=useState(0);
  const progress=useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const enabledPlan = plans.find((plan) => plan.enabled && plan.id === selectedPlanId);
    if (!enabledPlan) setSelectedPlanId(plans.find((plan) => plan.enabled && plan.featured)?.id ?? plans.find((plan) => plan.enabled)?.id ?? null);
  }, [plans, selectedPlanId]);

  useEffect(() => {
    const enabledMethod = paymentMethods.find((method) => method.enabled && method.id === selectedMethodId);
    if (!enabledMethod) setSelectedMethodId(paymentMethods.find((method) => method.enabled)?.id ?? null);
  }, [paymentMethods, selectedMethodId]);

  const selectedPlan = plans.find(p=>p.id===selectedPlanId) ?? plans[0];
  const pending = useMemo(()=>payments.find(p=>p.status==="PENDING") ?? null,[payments]);
  const approved = useMemo(()=>payments.find(p=>p.status==="APPROVED") ?? null,[payments]);

  useEffect(()=>{
    if(loading||!session?.user?.id)return;
    let active=true;
    if(!approved){setApprovalChecked(true);return;}
    const key=`studyarc:payment-approved-seen:${session.user.id}:${approved.id}`;
    AsyncStorage.getItem(key).then(seen=>{if(!active)return;if(!seen){setAcceptedPaymentId(approved.id);setActivationStage("accepted");}setApprovalChecked(true)});
    return()=>{active=false};
  },[approved,loading,session?.user?.id]);

  useEffect(()=>{
    if(!session?.user?.id)return;
    const channel=supabase.channel(`payment-status-${session.user.id}`).on("postgres_changes",{event:"UPDATE",schema:"public",table:"payments",filter:`user_id=eq.${session.user.id}`},payload=>{
      const row=payload.new as {id?:string;status?:string};
      if(row.status==="APPROVED"&&row.id){setAcceptedPaymentId(row.id);setActivationStage("accepted");setApprovalChecked(true);refreshMonetization().catch(()=>undefined);}
    }).subscribe();
    return()=>{supabase.removeChannel(channel)};
  },[refreshMonetization,session?.user?.id]);

  useEffect(()=>{
    if(activationStage!=="accepted")return;
    const timer=setTimeout(()=>setActivationStage("generating"),1500);
    return()=>clearTimeout(timer);
  },[activationStage]);

  useEffect(()=>{
    if(activationStage!=="generating"||!acceptedPaymentId||!session?.user?.id)return;
    progress.setValue(0);setProgressPercent(0);
    const listener=progress.addListener(({value})=>setProgressPercent(Math.round(value*100)));
    Animated.timing(progress,{toValue:1,duration:4400,easing:Easing.inOut(Easing.cubic),useNativeDriver:false}).start(async({finished})=>{
      if(!finished)return;
      await AsyncStorage.setItem(`studyarc:payment-approved-seen:${session.user.id}:${acceptedPaymentId}`,"1");
      router.replace("/(tabs)");
    });
    return()=>{progress.removeListener(listener);progress.stopAnimation()};
  },[acceptedPaymentId,activationStage,progress,router,session?.user?.id]);
  if (!session) return <Redirect href="/login" />;
  if (adminLoading) return null;
  if (isAdmin) return <Redirect href="/admin" />;
  if (!loading && approvalChecked && !activationStage && access && !["BLOCKED","PAYMENT_REQUIRED","PAYMENT_PENDING"].includes(access.state)) return <Redirect href="/(tabs)" />;

  const startPayment = async () => {
    if (!selectedPlan || !selectedMethodId) { setMessage("Select an active payment method first."); return; }
    setBusy(true); setMessage(null);
    try {
      const result = await createPaymentRequest(selectedPlan.id, selectedMethodId);
      setMessage(`Payment reference created: ${result.reference}`);
    } catch(e: any) { setMessage(e?.message ?? e?.details ?? "Could not create payment request."); }
    finally { setBusy(false); }
  };
  const upload = async () => {
    const target = pending ?? payments.find(p=>p.status==="PENDING");
    if (!target) return;
    setBusy(true); setMessage(null);
    try { const path = await uploadPaymentReceipt(target.id); if(path) setMessage("Receipt submitted. Your payment is waiting for admin verification."); }
    catch(e: any){ setMessage(e?.message ?? e?.details ?? "Could not upload receipt."); }
    finally{ setBusy(false); }
  };
  const redeem = async () => {
    if(!activationCode.trim()) return;
    setBusy(true); setMessage(null);
    try { await redeemActivationCode(activationCode); router.replace("/(tabs)"); }
    catch(e){ setMessage(e instanceof Error?e.message:"Activation failed."); }
    finally{ setBusy(false); }
  };
  const logout = async()=>{await signOut();router.replace("/login")};

  if(activationStage){const generating=activationStage==="generating";return <View style={s.successRoot}><LinearGradient colors={["#25143A","#0B1119","#080D14"]} style={StyleSheet.absoluteFill}/><View style={s.successCard}><View style={[s.successIcon,generating&&s.successIconGenerating]}><Ionicons name={generating?"sparkles":"checkmark"} size={34} color={generating?"#E5D2FF":"#0D2216"}/></View><Text style={s.successKicker}>{generating?"SETTING UP YOUR STUDY ARC":"PAYMENT APPROVED"}</Text><Text style={s.successTitle}>{generating?"Generating your plan…":"Admin accepted your payment"}</Text><Text style={s.successText}>{generating?"We’re applying your plan, priorities and current syllabus progress so your dashboard opens ready to use.":"Your receipt was verified successfully. Premium access is now active on this account."}</Text>{generating?<><View style={s.progressTrack}><Animated.View style={[s.progressFill,{width:progress.interpolate({inputRange:[0,1],outputRange:["4%","100%"]})}]}/></View><Text style={s.progressValue}>{progressPercent}%</Text><View style={s.generateSteps}><Text style={[s.generateStep,progressPercent>=15&&s.generateStepOn]}>✓ Activating plan</Text><Text style={[s.generateStep,progressPercent>=45&&s.generateStepOn]}>✓ Reading study priorities</Text><Text style={[s.generateStep,progressPercent>=78&&s.generateStepOn]}>✓ Preparing your dashboard</Text></View></>:<View style={s.acceptedBadge}><Ionicons name="shield-checkmark-outline" size={17} color="#83D7A4"/><Text style={s.acceptedBadgeText}>Verified securely</Text></View>}</View></View>}

  if (access?.state === "BLOCKED") return <View style={s.root}><LinearGradient colors={["#241319","#090D13"]} style={StyleSheet.absoluteFill}/><View style={s.center}><View style={s.blockIcon}><Ionicons name="lock-closed-outline" size={34} color="#FFACB8"/></View><Text style={s.title}>Account access restricted</Text><Text style={s.subtitle}>{access.publicMessage || "Your Study Arc account currently cannot access the application."}</Text><Pressable onPress={()=>Linking.openURL(`mailto:${settings.contactEmail}`)} style={s.primary}><Ionicons name="mail-outline" size={18} color="#160B20"/><Text style={s.primaryText}>Contact support</Text></Pressable><Pressable onPress={logout} style={s.secondary}><Text style={s.secondaryText}>Sign out</Text></Pressable></View></View>;

  return <View style={s.root}><LinearGradient colors={["#201330","#080D14","#080D14"]} style={StyleSheet.absoluteFill}/><ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
    <View style={s.brandRow}><View><Text style={s.brand}>Study<Text style={s.brandAccent}> Arc</Text></Text><Text style={s.kicker}>PREMIUM ACCESS</Text></View><Pressable onPress={logout} style={s.iconButton}><Ionicons name="log-out-outline" size={18} color="#B8C1CD"/></Pressable></View>
    <Text style={s.title}>{access?.state === "PAYMENT_PENDING" ? "Payment awaiting verification" : "Choose your Study Arc plan"}</Text>
    <Text style={s.subtitle}>{access?.state === "PAYMENT_PENDING" ? "Your study data remains safe. Once your payment is approved, your account activates automatically." : "Choose the access period that fits your A/L journey. Plan prices are controlled by Study Arc administration."}</Text>
    <View style={s.steps}><View style={s.stepItem}><View style={[s.stepDot,s.stepDotOn]}><Text style={s.stepNumber}>1</Text></View><Text style={s.stepLabel}>Plan</Text></View><View style={s.stepLine}/><View style={s.stepItem}><View style={[s.stepDot,(pending||access?.state==="PAYMENT_PENDING")&&s.stepDotOn]}><Text style={s.stepNumber}>2</Text></View><Text style={s.stepLabel}>Payment</Text></View><View style={s.stepLine}/><View style={s.stepItem}><View style={s.stepDot}><Text style={s.stepNumber}>3</Text></View><Text style={s.stepLabel}>Approval</Text></View></View>
    {message?<View style={s.message}><Text style={s.messageText}>{message}</Text></View>:null}
    {busy?<InlineActionLoader label="Processing…"/>:null}

    {(access?.state !== "PAYMENT_PENDING" || showPaymentOptions) && <>
      <View style={s.planGrid}>{plans.filter(p=>p.enabled).map(plan=><Pressable key={plan.id} onPress={()=>setSelectedPlanId(plan.id)} style={[s.plan,selectedPlan?.id===plan.id&&s.planOn,plan.featured&&s.featured]}>{plan.featured?<Text style={s.featuredLabel}>RECOMMENDED</Text>:null}<Text style={[s.planName,selectedPlan?.id===plan.id&&s.planNameOn]}>{plan.name}</Text><Text style={s.price}>{money(plan.priceLkr)}</Text><Text style={s.planDesc}>{plan.description}</Text><View style={[s.radio,selectedPlan?.id===plan.id&&s.radioOn]}>{selectedPlan?.id===plan.id?<View style={s.radioDot}/>:null}</View></Pressable>)}</View>

      {selectedPlan?<View style={s.orderSummary}><View><Text style={s.summaryLabel}>SELECTED PLAN</Text><Text style={s.summaryName}>{selectedPlan.name}</Text></View><View style={s.summaryAmount}><Text style={s.summaryLabel}>AMOUNT TO PAY</Text><Text style={s.summaryPrice}>{money(selectedPlan.priceLkr)}</Text></View></View>:null}

      <Text style={s.section}>PAYMENT METHOD</Text>
      {paymentMethods.filter(m=>m.enabled).length ? <View style={s.stack}>{paymentMethods.filter(m=>m.enabled).map(method=><Pressable key={method.id} onPress={()=>setSelectedMethodId(method.id)} style={[s.method,selectedMethodId===method.id&&s.methodOn]}><View style={s.methodHead}><View style={s.methodIcon}><Ionicons name="business-outline" size={20} color="#C9AFF0"/></View><View style={{flex:1}}><Text style={s.methodName}>{method.name}</Text><Text style={s.methodText}>Manual bank transfer</Text></View><Ionicons name={selectedMethodId===method.id?"checkmark-circle":"ellipse-outline"} size={21} color={selectedMethodId===method.id?"#B784FF":"#566476"}/></View>{selectedMethodId===method.id?<View style={s.bankDetails}>{method.bankName?<Detail label="BANK" value={`${method.bankName}${method.branchName?` · ${method.branchName}`:""}`}/>:null}{method.accountHolder?<Detail label="ACCOUNT HOLDER" value={method.accountHolder}/>:null}{method.accountNumber?<Detail label="ACCOUNT NUMBER" value={method.accountNumber} strong/>:null}{method.instructions?<View style={s.instructionBox}><Ionicons name="information-circle-outline" size={17} color="#C9AFF0"/><Text style={s.instructions}>{method.instructions}</Text></View>:null}</View>:null}</Pressable>)}</View>:<View style={s.notice}><Ionicons name="information-circle-outline" size={19} color="#D3B8F5"/><Text style={s.noticeText}>No manual payment method is currently enabled. You can still use a user-specific activation code or contact support.</Text></View>}

      {access?.state !== "PAYMENT_PENDING" && selectedPlan && paymentMethods.filter(m=>m.enabled).length>0?<Pressable disabled={busy} onPress={startPayment} style={[s.primary,busy&&{opacity:.55}]}><Ionicons name="receipt-outline" size={18} color="#160B20"/><Text style={s.primaryText}>Create payment reference · {money(selectedPlan.priceLkr)}</Text></Pressable>:null}
    </>}

    {(pending || access?.state==="PAYMENT_PENDING") && <><Text style={s.section}>PAYMENT STATUS</Text><View style={s.pendingCard}><View style={s.pendingTop}><View style={s.pendingIcon}><Ionicons name="time-outline" size={22} color="#F2C46C"/></View><View style={{flex:1}}><Text style={s.pendingTitle}>Awaiting verification</Text><Text style={s.pendingSub}>{pending?.paymentReference || access?.paymentReference}</Text></View></View>{pending?<><View style={s.detailRow}><Text style={s.detailLabel}>Amount</Text><Text style={s.detailValue}>{money(pending.amountLkr)}</Text></View><View style={s.detailRow}><Text style={s.detailLabel}>Receipt</Text><Text style={s.detailValue}>{pending.receiptPath?"Submitted":"Not uploaded"}</Text></View></>:null}<Pressable disabled={busy || Boolean(pending?.receiptPath)} onPress={upload} style={[s.receiptButton,(busy||Boolean(pending?.receiptPath))&&{opacity:.55}]}><Ionicons name="cloud-upload-outline" size={18} color="#DCC6F7"/><Text style={s.receiptText}>{pending?.receiptPath?"Receipt submitted":"Upload payment receipt"}</Text></Pressable>{access?.state==="PAYMENT_PENDING"&&!showPaymentOptions?<Pressable onPress={()=>setShowPaymentOptions(true)} style={s.refreshButton}><Ionicons name="arrow-back-outline" size={17} color="#8E9CAF"/><Text style={s.refreshText}>Back to payment options</Text></Pressable>:null}<Pressable onPress={()=>refreshMonetization()} style={s.refreshButton}><Ionicons name="refresh-outline" size={17} color="#8E9CAF"/><Text style={s.refreshText}>Check payment status</Text></Pressable></View></>}

    <Text style={s.section}>ACTIVATION CODE</Text><View style={s.activation}><Text style={s.activationTitle}>Already received a Study Arc activation code?</Text><Text style={s.activationSub}>Codes are bound to one account and are validated securely by the server.</Text><View style={s.codeRow}><TextInput value={activationCode} onChangeText={setActivationCode} placeholder="SA-XXXXXXXXXX" placeholderTextColor="#596678" autoCapitalize="characters" style={s.codeInput}/><Pressable disabled={busy||!activationCode.trim()} onPress={redeem} style={[s.codeButton,(busy||!activationCode.trim())&&{opacity:.5}]}><Text style={s.codeButtonText}>Activate</Text></Pressable></View></View>

    <View style={s.footerLinks}><Pressable onPress={()=>Linking.openURL(`mailto:${settings.contactEmail}`)}><Text style={s.link}>Contact support</Text></Pressable><Text style={s.dot}>•</Text><Pressable onPress={()=>Linking.openURL(settings.websiteUrl)}><Text style={s.link}>Study Arc website</Text></Pressable></View>
  </ScrollView></View>;
}

function Detail({label,value,strong=false}:{label:string;value:string;strong?:boolean}) {
  return <View style={s.bankDetailRow}><Text style={s.bankDetailLabel}>{label}</Text><Text selectable style={[s.bankDetailValue,strong&&s.bankDetailStrong]}>{value}</Text></View>;
}

const s=StyleSheet.create({root:{flex:1,backgroundColor:"#080D14"},content:{width:"100%",maxWidth:820,alignSelf:"center",padding:22,paddingBottom:50},brandRow:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",marginBottom:28},brand:{color:"#F4F5F8",fontSize:25,fontWeight:"900"},brandAccent:{color:"#B784FF"},kicker:{color:"#8E78A9",fontSize:8,fontWeight:"900",letterSpacing:1.4,marginTop:3},iconButton:{width:42,height:42,borderRadius:14,backgroundColor:"#111923",alignItems:"center",justifyContent:"center"},title:{color:"#F7F6F8",fontSize:30,fontWeight:"900",lineHeight:36},subtitle:{color:"#8390A1",fontSize:12,lineHeight:19,marginTop:8,marginBottom:18},message:{borderRadius:14,backgroundColor:"#122019",borderWidth:1,borderColor:"#315843",padding:11,marginBottom:12},messageText:{color:"#8BD4A7",fontSize:10.5,fontWeight:"700"},steps:{flexDirection:"row",alignItems:"flex-start",marginBottom:20},stepItem:{alignItems:"center",width:58},stepDot:{width:27,height:27,borderRadius:14,backgroundColor:"#131C27",borderWidth:1,borderColor:"#334052",alignItems:"center",justifyContent:"center"},stepDotOn:{backgroundColor:"#B784FF",borderColor:"#B784FF"},stepNumber:{color:"#E8D9FA",fontSize:9,fontWeight:"900"},stepLabel:{color:"#778496",fontSize:8,fontWeight:"800",marginTop:5},stepLine:{height:1,flex:1,backgroundColor:"#303B49",marginTop:13},planGrid:{flexDirection:"row",flexWrap:"wrap",gap:9},plan:{position:"relative",flexBasis:"47%",flexGrow:1,minHeight:150,borderRadius:19,backgroundColor:"#101720",borderWidth:1,borderColor:"#283545",padding:15},planOn:{backgroundColor:"#1B1525",borderColor:"#7554A0"},featured:{borderColor:"#8964B8"},featuredLabel:{alignSelf:"flex-start",color:"#1A0F22",backgroundColor:"#C193FF",fontSize:7,fontWeight:"900",paddingHorizontal:7,paddingVertical:4,borderRadius:7,marginBottom:8},planName:{color:"#DDE2E8",fontSize:13,fontWeight:"900"},planNameOn:{color:"#F2E9FC"},price:{color:"#C9A7F4",fontSize:22,fontWeight:"900",marginTop:6},planDesc:{color:"#718092",fontSize:9.5,lineHeight:14,marginTop:6,paddingRight:20},radio:{position:"absolute",right:12,top:12,width:20,height:20,borderRadius:10,borderWidth:2,borderColor:"#556274",alignItems:"center",justifyContent:"center"},radioOn:{borderColor:"#B784FF"},radioDot:{width:10,height:10,borderRadius:5,backgroundColor:"#B784FF"},orderSummary:{flexDirection:"row",justifyContent:"space-between",alignItems:"center",borderRadius:16,backgroundColor:"#0D141D",borderWidth:1,borderColor:"#253141",padding:13,marginTop:10},summaryLabel:{color:"#6E7B8C",fontSize:7.5,fontWeight:"900",letterSpacing:1},summaryName:{color:"#DDE3EB",fontSize:11,fontWeight:"900",marginTop:3},summaryAmount:{alignItems:"flex-end"},summaryPrice:{color:"#C8A2F7",fontSize:15,fontWeight:"900",marginTop:2},section:{color:"#8391A4",fontSize:9,fontWeight:"900",letterSpacing:1.3,marginTop:24,marginBottom:9},stack:{gap:8},method:{minHeight:74,borderRadius:18,backgroundColor:"#101720",borderWidth:1,borderColor:"#283545",padding:13},methodOn:{backgroundColor:"#191522",borderColor:"#67488A"},methodHead:{flexDirection:"row",alignItems:"center",gap:11},methodIcon:{width:39,height:39,borderRadius:12,backgroundColor:"#211A2B",alignItems:"center",justifyContent:"center"},methodName:{color:"#E7EAF0",fontSize:12,fontWeight:"900"},methodText:{color:"#7B899A",fontSize:9.5,marginTop:3},bankDetails:{marginTop:13,borderTopWidth:1,borderTopColor:"#352C42",paddingTop:6},bankDetailRow:{flexDirection:"row",justifyContent:"space-between",alignItems:"center",gap:18,paddingVertical:8},bankDetailLabel:{color:"#746A82",fontSize:7.5,fontWeight:"900",letterSpacing:.8},bankDetailValue:{flex:1,color:"#DADCE4",fontSize:10,textAlign:"right"},bankDetailStrong:{color:"#D9B9FF",fontSize:13,fontWeight:"900",letterSpacing:.7},instructionBox:{flexDirection:"row",alignItems:"flex-start",gap:8,backgroundColor:"#12101A",borderRadius:11,padding:10,marginTop:5},instructions:{flex:1,color:"#9688A5",fontSize:9.5,lineHeight:14},primary:{minHeight:52,borderRadius:16,backgroundColor:"#B784FF",flexDirection:"row",alignItems:"center",justifyContent:"center",gap:7,paddingHorizontal:14,marginTop:14},primaryText:{color:"#160B20",fontSize:11,fontWeight:"900",textAlign:"center"},secondary:{minHeight:48,borderRadius:15,backgroundColor:"#171F2A",borderWidth:1,borderColor:"#2C3949",alignItems:"center",justifyContent:"center",marginTop:8},secondaryText:{color:"#B8C2CF",fontSize:11,fontWeight:"900"},pendingCard:{borderRadius:20,backgroundColor:"#111923",borderWidth:1,borderColor:"#3A3A42",padding:15},pendingTop:{flexDirection:"row",alignItems:"center",gap:10,marginBottom:11},pendingIcon:{width:44,height:44,borderRadius:14,backgroundColor:"#2A2315",alignItems:"center",justifyContent:"center"},pendingTitle:{color:"#F0E7D2",fontSize:13,fontWeight:"900"},pendingSub:{color:"#B29868",fontSize:10,fontWeight:"900",marginTop:3,letterSpacing:.5},detailRow:{flexDirection:"row",justifyContent:"space-between",paddingVertical:7,borderTopWidth:1,borderTopColor:"#25303C"},detailLabel:{color:"#738093",fontSize:9.5},detailValue:{color:"#DDE2E8",fontSize:9.5,fontWeight:"900"},receiptButton:{minHeight:45,borderRadius:13,backgroundColor:"#21192C",borderWidth:1,borderColor:"#49375F",flexDirection:"row",gap:6,alignItems:"center",justifyContent:"center",marginTop:9},receiptText:{color:"#DCC6F7",fontSize:10,fontWeight:"900"},refreshButton:{minHeight:40,flexDirection:"row",alignItems:"center",justifyContent:"center",gap:6,marginTop:5},refreshText:{color:"#8E9CAF",fontSize:9.5,fontWeight:"800"},activation:{borderRadius:19,backgroundColor:"#101720",borderWidth:1,borderColor:"#283545",padding:15},activationTitle:{color:"#E8EBEF",fontSize:12,fontWeight:"900"},activationSub:{color:"#748194",fontSize:9.5,lineHeight:15,marginTop:4},codeRow:{flexDirection:"row",gap:8,marginTop:12},codeInput:{flex:1,minHeight:47,borderRadius:13,backgroundColor:"#0B1119",borderWidth:1,borderColor:"#293646",color:"#F0F2F6",paddingHorizontal:11,fontSize:11,fontWeight:"800"},codeButton:{minWidth:90,borderRadius:13,backgroundColor:"#B784FF",alignItems:"center",justifyContent:"center"},codeButtonText:{color:"#160B20",fontSize:10,fontWeight:"900"},notice:{borderRadius:16,backgroundColor:"#171522",borderWidth:1,borderColor:"#40344F",padding:13,flexDirection:"row",gap:9},noticeText:{flex:1,color:"#94869F",fontSize:10,lineHeight:16},footerLinks:{flexDirection:"row",alignItems:"center",justifyContent:"center",gap:8,marginTop:22},link:{color:"#AE8FD2",fontSize:9.5,fontWeight:"800"},dot:{color:"#4F5A68"},center:{flex:1,alignItems:"center",justifyContent:"center",padding:25,maxWidth:500,width:"100%",alignSelf:"center"},blockIcon:{width:72,height:72,borderRadius:23,backgroundColor:"#2D171D",borderWidth:1,borderColor:"#61303B",alignItems:"center",justifyContent:"center",marginBottom:18},successRoot:{flex:1,backgroundColor:"#080D14",alignItems:"center",justifyContent:"center",padding:24},successCard:{width:"100%",maxWidth:480,alignItems:"center",borderRadius:28,backgroundColor:"rgba(16,23,32,0.94)",borderWidth:1,borderColor:"#3B3150",paddingHorizontal:25,paddingVertical:36},successIcon:{width:72,height:72,borderRadius:24,backgroundColor:"#91D9AC",alignItems:"center",justifyContent:"center",marginBottom:22},successIconGenerating:{backgroundColor:"#352449"},successKicker:{color:"#A783D0",fontSize:8,fontWeight:"900",letterSpacing:1.5},successTitle:{color:"#F6F2FA",fontSize:24,fontWeight:"900",textAlign:"center",lineHeight:30,marginTop:8},successText:{color:"#8995A5",fontSize:11,lineHeight:18,textAlign:"center",marginTop:10,maxWidth:360},acceptedBadge:{flexDirection:"row",alignItems:"center",gap:6,backgroundColor:"#15251C",borderRadius:20,paddingHorizontal:13,paddingVertical:8,marginTop:20},acceptedBadgeText:{color:"#83D7A4",fontSize:9,fontWeight:"900"},progressTrack:{width:"100%",height:8,borderRadius:8,backgroundColor:"#232B36",overflow:"hidden",marginTop:26},progressFill:{height:"100%",borderRadius:8,backgroundColor:"#B784FF"},progressValue:{alignSelf:"flex-end",color:"#CBB1EA",fontSize:9,fontWeight:"900",marginTop:6},generateSteps:{alignSelf:"stretch",gap:9,marginTop:18},generateStep:{color:"#596575",fontSize:10,fontWeight:"800"},generateStepOn:{color:"#BFC7D2"}});
