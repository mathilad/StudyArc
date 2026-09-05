import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Redirect, useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useAppConfig } from "../context/AppConfigContext";
import { useAuth } from "../context/AuthContext";
import { useMonetization } from "../context/MonetizationContext";

const money = (value:number) => `LKR ${Math.round(value).toLocaleString()}`;

export default function AccessScreen() {
  const router = useRouter();
  const { session, signOut } = useAuth();
  const { settings } = useAppConfig();
  const { access, plans, paymentMethods, payments, loading, refreshMonetization, createPaymentRequest, uploadPaymentReceipt, redeemActivationCode } = useMonetization();
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(plans.find(p=>p.featured)?.id ?? plans[0]?.id ?? null);
  const [selectedMethodId, setSelectedMethodId] = useState<string | null>(paymentMethods[0]?.id ?? null);
  const [activationCode, setActivationCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const selectedPlan = plans.find(p=>p.id===selectedPlanId) ?? plans[0];
  const pending = useMemo(()=>payments.find(p=>p.status==="PENDING") ?? null,[payments]);
  if (!session) return <Redirect href="/login" />;
  if (!loading && access && !["BLOCKED","PAYMENT_REQUIRED","PAYMENT_PENDING"].includes(access.state)) return <Redirect href="/(tabs)" />;

  const startPayment = async () => {
    if (!selectedPlan) return;
    setBusy(true); setMessage(null);
    try {
      const result = await createPaymentRequest(selectedPlan.id, selectedMethodId);
      setMessage(`Payment reference created: ${result.reference}`);
    } catch(e) { setMessage(e instanceof Error ? e.message : "Could not create payment request."); }
    finally { setBusy(false); }
  };
  const upload = async () => {
    const target = pending ?? payments.find(p=>p.status==="PENDING");
    if (!target) return;
    setBusy(true); setMessage(null);
    try { const path = await uploadPaymentReceipt(target.id); if(path) setMessage("Receipt submitted. Your payment is waiting for admin verification."); }
    catch(e){ setMessage(e instanceof Error?e.message:"Could not upload receipt."); }
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

  if (access?.state === "BLOCKED") return <View style={s.root}><LinearGradient colors={["#241319","#090D13"]} style={StyleSheet.absoluteFill}/><View style={s.center}><View style={s.blockIcon}><Ionicons name="lock-closed-outline" size={34} color="#FFACB8"/></View><Text style={s.title}>Account access restricted</Text><Text style={s.subtitle}>{access.publicMessage || "Your Study Arc account currently cannot access the application."}</Text><Pressable onPress={()=>Linking.openURL(`mailto:${settings.contactEmail}`)} style={s.primary}><Ionicons name="mail-outline" size={18} color="#160B20"/><Text style={s.primaryText}>Contact support</Text></Pressable><Pressable onPress={logout} style={s.secondary}><Text style={s.secondaryText}>Sign out</Text></Pressable></View></View>;

  return <View style={s.root}><LinearGradient colors={["#201330","#080D14","#080D14"]} style={StyleSheet.absoluteFill}/><ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
    <View style={s.brandRow}><View><Text style={s.brand}>Study<Text style={s.brandAccent}> Arc</Text></Text><Text style={s.kicker}>PREMIUM ACCESS</Text></View><Pressable onPress={logout} style={s.iconButton}><Ionicons name="log-out-outline" size={18} color="#B8C1CD"/></Pressable></View>
    <Text style={s.title}>{access?.state === "PAYMENT_PENDING" ? "Payment awaiting verification" : "Choose your Study Arc plan"}</Text>
    <Text style={s.subtitle}>{access?.state === "PAYMENT_PENDING" ? "Your study data remains safe. Once your payment is approved, your account activates automatically." : "Choose the access period that fits your A/L journey. Plan prices are controlled by Study Arc administration."}</Text>
    {message?<View style={s.message}><Text style={s.messageText}>{message}</Text></View>:null}

    {access?.state !== "PAYMENT_PENDING" && <>
      <View style={s.planGrid}>{plans.filter(p=>p.enabled).map(plan=><Pressable key={plan.id} onPress={()=>setSelectedPlanId(plan.id)} style={[s.plan,selectedPlan?.id===plan.id&&s.planOn,plan.featured&&s.featured]}>{plan.featured?<Text style={s.featuredLabel}>RECOMMENDED</Text>:null}<Text style={[s.planName,selectedPlan?.id===plan.id&&s.planNameOn]}>{plan.name}</Text><Text style={s.price}>{money(plan.priceLkr)}</Text><Text style={s.planDesc}>{plan.description}</Text><View style={[s.radio,selectedPlan?.id===plan.id&&s.radioOn]}>{selectedPlan?.id===plan.id?<View style={s.radioDot}/>:null}</View></Pressable>)}</View>

      <Text style={s.section}>PAYMENT METHOD</Text>
      {paymentMethods.filter(m=>m.enabled).length ? <View style={s.stack}>{paymentMethods.filter(m=>m.enabled).map(method=><Pressable key={method.id} onPress={()=>setSelectedMethodId(method.id)} style={[s.method,selectedMethodId===method.id&&s.methodOn]}><Ionicons name={method.methodType==="bank_transfer"?"business-outline":"card-outline"} size={21} color="#C9AFF0"/><View style={{flex:1}}><Text style={s.methodName}>{method.name}</Text>{method.bankName?<Text style={s.methodText}>{method.bankName}{method.branchName?` · ${method.branchName}`:""}</Text>:null}{method.accountHolder?<Text style={s.methodText}>Account: {method.accountHolder}</Text>:null}{method.accountNumber?<Text style={s.accountNumber}>{method.accountNumber}</Text>:null}{method.instructions?<Text style={s.instructions}>{method.instructions}</Text>:null}</View><Ionicons name={selectedMethodId===method.id?"checkmark-circle":"ellipse-outline"} size={20} color={selectedMethodId===method.id?"#B784FF":"#566476"}/></Pressable>)}</View>:<View style={s.notice}><Ionicons name="information-circle-outline" size={19} color="#D3B8F5"/><Text style={s.noticeText}>No manual payment method is currently enabled. You can still use a user-specific activation code or contact support.</Text></View>}

      {selectedPlan && paymentMethods.filter(m=>m.enabled).length>0?<Pressable disabled={busy} onPress={startPayment} style={[s.primary,busy&&{opacity:.55}]}><Ionicons name="receipt-outline" size={18} color="#160B20"/><Text style={s.primaryText}>Create payment reference · {money(selectedPlan.priceLkr)}</Text></Pressable>:null}
    </>}

    {(pending || access?.state==="PAYMENT_PENDING") && <><Text style={s.section}>PAYMENT STATUS</Text><View style={s.pendingCard}><View style={s.pendingTop}><View style={s.pendingIcon}><Ionicons name="time-outline" size={22} color="#F2C46C"/></View><View style={{flex:1}}><Text style={s.pendingTitle}>Awaiting verification</Text><Text style={s.pendingSub}>{pending?.paymentReference || access?.paymentReference}</Text></View></View>{pending?<><View style={s.detailRow}><Text style={s.detailLabel}>Amount</Text><Text style={s.detailValue}>{money(pending.amountLkr)}</Text></View><View style={s.detailRow}><Text style={s.detailLabel}>Receipt</Text><Text style={s.detailValue}>{pending.receiptPath?"Submitted":"Not uploaded"}</Text></View></>:null}<Pressable disabled={busy || Boolean(pending?.receiptPath)} onPress={upload} style={[s.receiptButton,(busy||Boolean(pending?.receiptPath))&&{opacity:.55}]}><Ionicons name="cloud-upload-outline" size={18} color="#DCC6F7"/><Text style={s.receiptText}>{pending?.receiptPath?"Receipt submitted":"Upload payment receipt"}</Text></Pressable><Pressable onPress={()=>refreshMonetization()} style={s.refreshButton}><Ionicons name="refresh-outline" size={17} color="#8E9CAF"/><Text style={s.refreshText}>Check payment status</Text></Pressable></View></>}

    <Text style={s.section}>ACTIVATION CODE</Text><View style={s.activation}><Text style={s.activationTitle}>Already received a Study Arc activation code?</Text><Text style={s.activationSub}>Codes are bound to one account and are validated securely by the server.</Text><View style={s.codeRow}><TextInput value={activationCode} onChangeText={setActivationCode} placeholder="SA-XXXXXXXXXX" placeholderTextColor="#596678" autoCapitalize="characters" style={s.codeInput}/><Pressable disabled={busy||!activationCode.trim()} onPress={redeem} style={[s.codeButton,(busy||!activationCode.trim())&&{opacity:.5}]}><Text style={s.codeButtonText}>Activate</Text></Pressable></View></View>

    <View style={s.footerLinks}><Pressable onPress={()=>Linking.openURL(`mailto:${settings.contactEmail}`)}><Text style={s.link}>Contact support</Text></Pressable><Text style={s.dot}>•</Text><Pressable onPress={()=>Linking.openURL(settings.websiteUrl)}><Text style={s.link}>Study Arc website</Text></Pressable></View>
  </ScrollView></View>;
}

const s=StyleSheet.create({root:{flex:1,backgroundColor:"#080D14"},content:{width:"100%",maxWidth:820,alignSelf:"center",padding:22,paddingBottom:50},brandRow:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",marginBottom:28},brand:{color:"#F4F5F8",fontSize:25,fontWeight:"900"},brandAccent:{color:"#B784FF"},kicker:{color:"#8E78A9",fontSize:8,fontWeight:"900",letterSpacing:1.4,marginTop:3},iconButton:{width:42,height:42,borderRadius:14,backgroundColor:"#111923",alignItems:"center",justifyContent:"center"},title:{color:"#F7F6F8",fontSize:30,fontWeight:"900",lineHeight:36},subtitle:{color:"#8390A1",fontSize:12,lineHeight:19,marginTop:8,marginBottom:18},message:{borderRadius:14,backgroundColor:"#122019",borderWidth:1,borderColor:"#315843",padding:11,marginBottom:12},messageText:{color:"#8BD4A7",fontSize:10.5,fontWeight:"700"},planGrid:{flexDirection:"row",flexWrap:"wrap",gap:9},plan:{position:"relative",flexBasis:"47%",flexGrow:1,minHeight:150,borderRadius:19,backgroundColor:"#101720",borderWidth:1,borderColor:"#283545",padding:15},planOn:{backgroundColor:"#1B1525",borderColor:"#7554A0"},featured:{borderColor:"#8964B8"},featuredLabel:{alignSelf:"flex-start",color:"#1A0F22",backgroundColor:"#C193FF",fontSize:7,fontWeight:"900",paddingHorizontal:7,paddingVertical:4,borderRadius:7,marginBottom:8},planName:{color:"#DDE2E8",fontSize:13,fontWeight:"900"},planNameOn:{color:"#F2E9FC"},price:{color:"#C9A7F4",fontSize:22,fontWeight:"900",marginTop:6},planDesc:{color:"#718092",fontSize:9.5,lineHeight:14,marginTop:6,paddingRight:20},radio:{position:"absolute",right:12,top:12,width:20,height:20,borderRadius:10,borderWidth:2,borderColor:"#556274",alignItems:"center",justifyContent:"center"},radioOn:{borderColor:"#B784FF"},radioDot:{width:10,height:10,borderRadius:5,backgroundColor:"#B784FF"},section:{color:"#8391A4",fontSize:9,fontWeight:"900",letterSpacing:1.3,marginTop:24,marginBottom:9},stack:{gap:8},method:{minHeight:90,borderRadius:18,backgroundColor:"#101720",borderWidth:1,borderColor:"#283545",padding:13,flexDirection:"row",alignItems:"flex-start",gap:11},methodOn:{backgroundColor:"#191522",borderColor:"#67488A"},methodName:{color:"#E7EAF0",fontSize:12,fontWeight:"900"},methodText:{color:"#7B899A",fontSize:9.5,marginTop:3},accountNumber:{color:"#D8C4F2",fontSize:12,fontWeight:"900",marginTop:4,letterSpacing:.6},instructions:{color:"#7E718D",fontSize:9.5,lineHeight:14,marginTop:6},primary:{minHeight:52,borderRadius:16,backgroundColor:"#B784FF",flexDirection:"row",alignItems:"center",justifyContent:"center",gap:7,paddingHorizontal:14,marginTop:14},primaryText:{color:"#160B20",fontSize:11,fontWeight:"900",textAlign:"center"},secondary:{minHeight:48,borderRadius:15,backgroundColor:"#171F2A",borderWidth:1,borderColor:"#2C3949",alignItems:"center",justifyContent:"center",marginTop:8},secondaryText:{color:"#B8C2CF",fontSize:11,fontWeight:"900"},pendingCard:{borderRadius:20,backgroundColor:"#111923",borderWidth:1,borderColor:"#3A3A42",padding:15},pendingTop:{flexDirection:"row",alignItems:"center",gap:10,marginBottom:11},pendingIcon:{width:44,height:44,borderRadius:14,backgroundColor:"#2A2315",alignItems:"center",justifyContent:"center"},pendingTitle:{color:"#F0E7D2",fontSize:13,fontWeight:"900"},pendingSub:{color:"#B29868",fontSize:10,fontWeight:"900",marginTop:3,letterSpacing:.5},detailRow:{flexDirection:"row",justifyContent:"space-between",paddingVertical:7,borderTopWidth:1,borderTopColor:"#25303C"},detailLabel:{color:"#738093",fontSize:9.5},detailValue:{color:"#DDE2E8",fontSize:9.5,fontWeight:"900"},receiptButton:{minHeight:45,borderRadius:13,backgroundColor:"#21192C",borderWidth:1,borderColor:"#49375F",flexDirection:"row",gap:6,alignItems:"center",justifyContent:"center",marginTop:9},receiptText:{color:"#DCC6F7",fontSize:10,fontWeight:"900"},refreshButton:{minHeight:40,flexDirection:"row",alignItems:"center",justifyContent:"center",gap:6,marginTop:5},refreshText:{color:"#8E9CAF",fontSize:9.5,fontWeight:"800"},activation:{borderRadius:19,backgroundColor:"#101720",borderWidth:1,borderColor:"#283545",padding:15},activationTitle:{color:"#E8EBEF",fontSize:12,fontWeight:"900"},activationSub:{color:"#748194",fontSize:9.5,lineHeight:15,marginTop:4},codeRow:{flexDirection:"row",gap:8,marginTop:12},codeInput:{flex:1,minHeight:47,borderRadius:13,backgroundColor:"#0B1119",borderWidth:1,borderColor:"#293646",color:"#F0F2F6",paddingHorizontal:11,fontSize:11,fontWeight:"800"},codeButton:{minWidth:90,borderRadius:13,backgroundColor:"#B784FF",alignItems:"center",justifyContent:"center"},codeButtonText:{color:"#160B20",fontSize:10,fontWeight:"900"},notice:{borderRadius:16,backgroundColor:"#171522",borderWidth:1,borderColor:"#40344F",padding:13,flexDirection:"row",gap:9},noticeText:{flex:1,color:"#94869F",fontSize:10,lineHeight:16},footerLinks:{flexDirection:"row",alignItems:"center",justifyContent:"center",gap:8,marginTop:22},link:{color:"#AE8FD2",fontSize:9.5,fontWeight:"800"},dot:{color:"#4F5A68"},center:{flex:1,alignItems:"center",justifyContent:"center",padding:25,maxWidth:500,width:"100%",alignSelf:"center"},blockIcon:{width:72,height:72,borderRadius:23,backgroundColor:"#2D171D",borderWidth:1,borderColor:"#61303B",alignItems:"center",justifyContent:"center",marginBottom:18}});
