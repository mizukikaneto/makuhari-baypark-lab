import {arenaRoutes} from './map-data.mjs';
export const FLOW_DEFAULTS={direction:'depart',people:8000,releaseMinutes:15,parkShare:70,width:4};
export const FLOW_FIELDS={direction:{type:'string',enum:['arrive','depart']},people:{type:'integer',minimum:1000,maximum:20000,multipleOf:1000},releaseMinutes:{type:'integer',minimum:5,maximum:60,multipleOf:5},parkShare:{type:'integer',minimum:0,maximum:100,multipleOf:10},width:{type:'integer',minimum:2,maximum:8}};
export function validateFlow(input){
  if(!input||typeof input!=='object'||Array.isArray(input))throw new Error('人流条件はオブジェクトで指定してください。');
  for(const [k,v]of Object.entries(input)){const f=FLOW_FIELDS[k];if(!f||f.enum&&!f.enum.includes(v)||f.type==='integer'&&(!Number.isInteger(v)||v<f.minimum||v>f.maximum||f.multipleOf&&v%f.multipleOf))throw new Error('人流条件の値が正しくありません: '+k);}
  return input;
}
export function createFlowModel(options={}){
  validateFlow(options);const config={...FLOW_DEFAULTS,...options},base=arenaRoutes();
  const routes=Object.fromEntries(Object.entries(base).map(([id,r])=>{const points=config.direction==='depart'?[...r.points].reverse():r.points;const segments=config.direction==='depart'?[...r.segments].reverse().map(e=>({...e,a:e.b,b:e.a})):r.segments;return[id,{...r,points,segments}];}));
  // Ten-person cohorts make the deterministic queue model affordable in-browser.
  // All widths, capacities and slowdown coefficients are assumptions, not observations.
  const weight=10,links=new Map();
  for(const r of Object.values(routes))for(const e of r.segments)if(!links.has(e.key))links.set(e.key,{...e,count:0,tokens:weight,area:Math.max(e.length,10)*config.width,capacity:Math.max(weight*2,Math.floor(Math.max(e.length,10)*config.width*1.5/weight)*weight)});
  const packets=Array.from({length:config.people/weight},(_,i)=>{
    const routeId=Math.floor((i+1)*config.parkShare/100)>Math.floor(i*config.parkShare/100)?'park':'south';
    return {id:i,weight,routeId,scheduled:1+i/(config.people/weight)*config.releaseMinutes*60,index:-1,distance:0,done:false,blocked:false,finishedAt:null};
  });
  let time=0,arrived=0,journeyTotal=0,peakQueue=0,accumulator=0;const history=[];
  function enter(packet,index){const seg=routes[packet.routeId].segments[index],link=links.get(seg.key);if(link.tokens+1e-8<weight||link.count+weight>link.capacity)return false;link.tokens-=weight;link.count+=weight;packet.index=index;packet.distance=0;return true;}
  function step(){
    time++;
    for(const e of links.values())e.tokens=Math.min(weight,e.tokens+config.width*.9);
    // Older scheduled cohorts have priority; admission cannot create or lose people.
    for(let i=0;i<packets.length;i++){
      const p=packets[i];if(p.done||p.scheduled>time)continue;p.blocked=false;
      if(p.index<0){p.blocked=!enter(p,0);continue;}
      const route=routes[p.routeId],seg=route.segments[p.index],link=links.get(seg.key),density=link.count/link.area;
      const speed=(80/60)*Math.max(.2,1/(1+Math.max(0,density-.35)*1.5));
      p.distance=Math.min(seg.length,p.distance+speed);
      if(p.distance<seg.length)continue;
      if(p.index===route.segments.length-1){link.count-=weight;p.done=true;p.finishedAt=time;arrived+=weight;journeyTotal+=(time-p.scheduled)*weight;}
      else if(enter(p,p.index+1))link.count-=weight;
      else p.blocked=true;
    }
    const queue=packets.reduce((n,p)=>n+(p.scheduled<=time&&!p.done&&p.blocked?p.weight:0),0);peakQueue=Math.max(peakQueue,queue);
    if(time%15===0||arrived===config.people)history.push({time,arrived,queue});
  }
  function snapshot(){
    let waiting=0,walking=0,pending=0,queue=0;
    for(const p of packets){if(p.done)continue;if(p.scheduled>time)pending+=weight;else if(p.index<0)waiting+=weight;else walking+=weight;if(p.scheduled<=time&&p.blocked)queue+=weight;}
    const busy=[...links.values()].sort((a,b)=>b.count/b.area-a.count/a.area)[0];
    return {time,total:config.people,arrived,walking,waiting,pending,queue,peakQueue,averageMinutes:arrived?journeyTotal/arrived/60:null,complete:arrived===config.people,busiest:busy?{key:busy.key,people:busy.count,density:busy.count/busy.area}:null};
  }
  function positions(){return packets.filter(p=>!p.done&&p.index>=0).map(p=>{const e=routes[p.routeId].segments[p.index],t=p.distance/Math.max(.01,e.length);return{id:p.id,x:e.a[0]+(e.b[0]-e.a[0])*t,z:e.a[1]+(e.b[1]-e.a[1])*t,angle:Math.atan2(e.b[1]-e.a[1],e.b[0]-e.a[0]),routeId:p.routeId,blocked:p.blocked,weight:p.weight};});}
  return {config,routes,links,history,snapshot,positions,advance(seconds){if(!Number.isFinite(seconds)||seconds<0||seconds>36000)throw new Error('進行時間が範囲外です。');accumulator+=seconds;while(accumulator>=1&&arrived<config.people){step();accumulator--;}return snapshot();}};
}
