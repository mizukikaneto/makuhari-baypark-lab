import {GEOGRAPHY as G} from './geography.mjs';
import {LAYOUT} from './layout.mjs';
import {CLOSURE} from './closure.mjs';
export {G,LAYOUT};
export function project(lat,lon){return [(lon-G.origin.lon)*G.origin.metresPerLongitudeDegree,(G.origin.lat-lat)*G.origin.metresPerLatitudeDegree];}
export function center(p){return p.reduce((a,v)=>[a[0]+v[0]/p.length,a[1]+v[1]/p.length],[0,0]);}
export function inPolygon(point,poly){let hit=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a[1]>point[1])!==(b[1]>point[1])&&point[0]<(b[0]-a[0])*(point[1]-a[1])/(b[1]-a[1])+a[0])hit=!hit;}return hit;}
export const BUILDINGS=LAYOUT.features.map(f=>({...f,p:f.polygon.map(c=>project(...c)),center:project(...f.center)}));
export const EXITS={park:{name:'公園改札',point:project(35.647648,140.0431974),note:'2025年3月開業 · 4:45〜22:00'},south:{name:'南口（中央改札）',point:project(35.648451,140.04137),note:'駅南側の広場へ'}};
export const PARK_CENTER=center(G.features.find(f=>f.id==='387654538').p);
export const STATION_CENTER=center(G.features.find(f=>f.id==='195121369').p);

// A/B were mapped as one polygon. The rail corridor separates the two blocks.
// Retain the actual park perimeter and split along the northern rail-side edge.
const combined=G.features.find(f=>f.id==='207878683').p;
const cutA=project(...CLOSURE.clipLineLatLon[0]),cutB=project(...CLOSURE.clipLineLatLon[1]);
const side=p=>(cutB[0]-cutA[0])*(p[1]-cutA[1])-(cutB[1]-cutA[1])*(p[0]-cutA[0]);
function split(positive){let out=[];for(let i=0;i<combined.length;i++){const a=combined[(i+combined.length-1)%combined.length],b=combined[i],sa=side(a),sb=side(b);const ia=positive?sa>=0:sa<=0,ib=positive?sb>=0:sb<=0;if(ia!==ib){const t=sa/(sa-sb);out.push([a[0]+t*(b[0]-a[0]),a[1]+t*(b[1]-a[1])]);}if(ib)out.push(b);}return out;}
const sides=[split(false),split(true)];
export const PARK_A=CLOSURE.coordinates.map(p=>project(...p));
export const PARK_B=sides.find(p=>!inPolygon(project(35.649,140.0457),p));

// Route only through mapped, publicly accessible ways. No arbitrary links are
// added across roads, buildings, railway tracks or the closed A block.
const graph=new Map();
for(const [a,b,pa,pb,kind]of G.routes){if(!graph.has(a))graph.set(a,{p:pa,edges:[]});if(!graph.has(b))graph.set(b,{p:pb,edges:[]});const d=Math.hypot(pb[0]-pa[0],pb[1]-pa[1]);graph.get(a).edges.push({to:b,d,kind});graph.get(b).edges.push({to:a,d,kind});}
function closedEdge(a,b,closed){return closed&&[.1,.25,.5,.75,.9].some(t=>inPolygon([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t],PARK_A));}
function nearest(point,closed,connected){let best=null,d=Infinity;for(const [id,n]of graph){if(connected&&!connected.has(id)||closed&&inPolygon(n.p,PARK_A))continue;const gap=Math.hypot(n.p[0]-point[0],n.p[1]-point[1]);if(gap<d&&n.edges.some(e=>['footway','pedestrian','path','steps'].includes(e.kind))){best=id;d=gap;}}return best;}
function push(heap,item){heap.push(item);let i=heap.length-1;while(i){let p=(i-1)>>1;if(heap[p][0]<=item[0])break;heap[i]=heap[p];i=p;}heap[i]=item;}
function pop(heap){const first=heap[0],end=heap.pop();if(heap.length){let i=0;while(2*i+1<heap.length){let c=2*i+1;if(c+1<heap.length&&heap[c+1][0]<heap[c][0])c++;if(heap[c][0]>=end[0])break;heap[i]=heap[c];i=c;}heap[i]=end;}return first;}
const cache=new Map();
export function walkingRoute(origin,exit='park',year=2026){
  if(exit==='park'&&year<2025)return {error:'公園改札は2025年3月開業です。南口を選択してください。',points:[]};
  const closed=year>=2026;const from=BUILDINGS.find(b=>b.id===origin);if(!from)return {error:'出発地を選択してください。',points:[]};
  const key=[origin,exit,closed].join(':');if(cache.has(key))return cache.get(key);
  const end=nearest(EXITS[exit].point,closed);
  // Pick the nearest public path in the exit's connected component, never a
  // dangling private/incomplete path inside a newly developed plot.
  const connected=new Set([end]),pending=[end];while(pending.length){const id=pending.pop(),n=graph.get(id);for(const e of n.edges){if(!connected.has(e.to)&&!closedEdge(n.p,graph.get(e.to).p,closed)){connected.add(e.to);pending.push(e.to);}}}
  const start=nearest(from.center,closed,connected);const dist=new Map([[start,0]]),prev=new Map(),queue=[[0,start]];let reached=false;
  while(queue.length){const[cost,id]=pop(queue);if(cost!==dist.get(id))continue;if(id===end){reached=true;break;}const n=graph.get(id);for(const e of n.edges){const other=graph.get(e.to);if(closedEdge(n.p,other.p,closed))continue;const weight=e.d*(['footway','pedestrian','path'].includes(e.kind)?1:1.15);const next=cost+weight;if(next<(dist.get(e.to)??Infinity)){dist.set(e.to,next);prev.set(e.to,id);push(queue,[next,e.to]);}}}
  if(!reached){const result={error:'この条件で連続した歩道経路を確認できませんでした。現地の案内をご確認ください。',points:[]};cache.set(key,result);return result;}
  let id=end;const points=[];while(id){points.push(graph.get(id).p);if(id===start)break;id=prev.get(id);}points.reverse();
  const length=points.reduce((n,p,i)=>n+(i?Math.hypot(p[0]-points[i-1][0],p[1]-points[i-1][1]):0),0);
  const result={points,metres:Math.round(length/10)*10,minutes:Math.ceil(length/80),closed,exit:EXITS[exit].name,origin:from.name,warning:'街区沿道からの参考経路。公式の指定迂回路ではありません。敷地内・駅構内・信号待ちは含みません。'};
  cache.set(key,result);return result;
}

// Scenario endpoint on the mapped west-side path outside the A block.
// This is an explicit modelling assumption, not a confirmed arena entrance.
export function arenaRoutes(){
  const endpoint=[-295,-325];
  const results={};
  for(const exit of ['park','south']){
    const start=nearest(EXITS[exit].point,true),connected=new Set([start]),pending=[start];
    while(pending.length){const id=pending.pop(),n=graph.get(id);for(const e of n.edges)if(!connected.has(e.to)&&!closedEdge(n.p,graph.get(e.to).p,true)){connected.add(e.to);pending.push(e.to);}}
    const end=nearest(endpoint,true,connected),dist=new Map([[start,0]]),prev=new Map(),queue=[[0,start]];
    while(queue.length){const[cost,id]=pop(queue);if(cost!==dist.get(id))continue;if(id===end)break;const n=graph.get(id);for(const e of n.edges){if(closedEdge(n.p,graph.get(e.to).p,true))continue;const next=cost+e.d*(['footway','pedestrian','path'].includes(e.kind)?1:1.15);if(next<(dist.get(e.to)??Infinity)){dist.set(e.to,next);prev.set(e.to,id);push(queue,[next,e.to]);}}}
    if(!dist.has(end))throw new Error('アリーナ外周への参考経路を確認できません。');
    const ids=[];let id=end;while(id){ids.push(id);if(id===start)break;id=prev.get(id);}ids.reverse();
    const points=ids.map(id=>graph.get(id).p),segments=[];
    for(let i=1;i<ids.length;i++){const a=points[i-1],b=points[i];segments.push({key:[ids[i-1],ids[i]].sort().join(':'),a,b,length:Math.hypot(b[0]-a[0],b[1]-a[1])});}
    results[exit]={points,segments,metres:Math.round(segments.reduce((n,e)=>n+e.length,0)),endpoint:points.at(-1)};
  }
  return results;
}
