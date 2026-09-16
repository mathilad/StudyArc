/** Clockwise from twelve o'clock, rounded to the nearest hour/minute. */
export function clockDialValue(x:number,y:number,mode:"hour"|"minute",size=240){
 const dx=x-size/2,dy=y-size/2;
 if(Math.hypot(dx,dy)<20)return null;
 const turns=(Math.atan2(dy,dx)+Math.PI/2+Math.PI*2)%(Math.PI*2)/(Math.PI*2);
 const steps=mode==="hour"?12:60;
 const value=Math.round(turns*steps)%steps;
 return mode==="hour"?(value||12):value;
}
