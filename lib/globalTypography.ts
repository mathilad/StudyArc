import{StyleSheet}from"react-native";
const g=globalThis as any;
if(!g.__studyArcTypographyScaled){
 const set=(StyleSheet as any).setStyleAttributePreprocessor;
 if(typeof set==="function")set("fontSize",(value:any)=>typeof value==="number"?Math.round(value*1.1*10)/10:value);
 g.__studyArcTypographyScaled=true;
}
