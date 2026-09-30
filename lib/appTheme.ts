export const APP_THEMES = [
 {id:"purple",name:"Arc Purple",accent:"#B784FF",background:"#080D14",surface:"#151B26"},
 {id:"blue",name:"Ocean Blue",accent:"#78B6FF",background:"#080E18",surface:"#142033"},
 {id:"teal",name:"Forest Teal",accent:"#64D8BC",background:"#081310",surface:"#142822"},
 {id:"amber",name:"Warm Amber",accent:"#F3C078",background:"#141009",surface:"#2B2217"},
 {id:"rose",name:"Soft Rose",accent:"#F09AB8",background:"#140C12",surface:"#2A1923"},
] as const;
export type AppThemeId = typeof APP_THEMES[number]["id"];
export type AppTheme = typeof APP_THEMES[number];
let currentTheme:AppTheme = APP_THEMES[0];
export function isAppThemeId(value:unknown):value is AppThemeId {return APP_THEMES.some(t=>t.id===value)}
export function setCurrentAppTheme(id:AppThemeId){currentTheme=APP_THEMES.find(t=>t.id===id)??APP_THEMES[0]}
export function getCurrentAppTheme(){return currentTheme}
function hsl(hex:string){
 const rgb=hex.slice(1,7).match(/../g)!.map(v=>parseInt(v,16)/255),[r,g,b]=rgb,max=Math.max(...rgb),min=Math.min(...rgb),d=max-min,l=(max+min)/2;
 let h=0,s=0;if(d){s=d/(1-Math.abs(2*l-1));h=max===r?((g-b)/d)%6:max===g?(b-r)/d+2:(r-g)/d+4;h=(h*60+360)%360}return {h,s,l};
}
export function isThemeableColor(value:string){
 if(!/^#[\da-f]{6}([\da-f]{2})?$/i.test(value))return false;
 const {h,s,l}=hsl(value);
 return (h>=250&&h<=305&&s>=.12)||(h>=180&&h<=250&&l<.2&&s>=.12);
}
function fromHsl(h:number,s:number,l:number){
 const c=(1-Math.abs(2*l-1))*s,x=c*(1-Math.abs((h/60)%2-1)),m=l-c/2;
 const rgb=h<60?[c,x,0]:h<120?[x,c,0]:h<180?[0,c,x]:h<240?[0,x,c]:h<300?[x,0,c]:[c,0,x];
 return "#"+rgb.map(v=>Math.round((v+m)*255).toString(16).padStart(2,"0")).join("");
}
// Recolour only the existing brand palette; success, warning and subject colours stay meaningful.
export function appColor(value:string):string{
 if(currentTheme.id==="purple"||!isThemeableColor(value))return value;
 const original=hsl(value),target=hsl(currentTheme.accent);
 return fromHsl(target.h,original.l<.2?Math.min(original.s,.4):Math.min(original.s,target.s),original.l)+value.slice(7);
}
