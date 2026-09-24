import {FACILITIES} from './data.mjs?v=access2';
import {G,BUILDINGS,PARK_A,EXITS} from './map-data.mjs?v=access2';
const NS='http://www.w3.org/2000/svg';
const el=(tag,attrs={},text)=>{const n=document.createElementNS(NS,tag);for(const[k,v]of Object.entries(attrs))n.setAttribute(k,v);if(text)n.textContent=text;return n;};
const points=p=>p.map(v=>v.join(',')).join(' ');
export function createMapView(host,onInspect){
 const svg=el('svg',{viewBox:'-740 -620 1180 960',role:'group','aria-label':'北が上の実座標地図。駅の屋外接続と仮のアリーナ接続点。'});host.append(svg);
 const base=el('g'),routes=el('g'),dots=el('g'),markers=el('g');svg.append(base,routes,dots,markers);
 for(const f of [...G.features].sort((a,b)=>Number(['road','path','rail'].includes(a.kind))-Number(['road','path','rail'].includes(b.kind)))){const kind=f.kind;
  if(!['green','building','road','path','rail','water'].includes(kind))continue;
  const line=['road','path','rail'].includes(kind);
  base.append(el(line?'polyline':'polygon',{points:points(f.p),fill:line?'none':kind==='green'?'#203d3b':kind==='water'?'#20455b':'#263b4b',stroke:kind==='path'?'#647775':kind==='road'?'#3e5365':kind==='rail'?'#8092a2':'#47605d','stroke-width':kind==='road'?7:kind==='path'?2:1.5}));
 }
 for(const f of BUILDINGS)base.append(el('polygon',{points:points(f.p),fill:'#35576a',stroke:'#668696','stroke-width':1}));
 base.append(el('polygon',{points:points(PARK_A),fill:'#ad845025',stroke:'#e4ae74','stroke-width':2,'stroke-dasharray':'8 5'}));
 base.append(el('text',{x:-212,y:-365,class:'map-place','text-anchor':'middle'},'アリーナ計画区域'));
 base.append(el('text',{x:-212,y:-343,class:'map-subplace','text-anchor':'middle'},'内部動線は未確定'));
 base.append(el('text',{x:-535,y:-232,class:'map-place'},'海浜幕張駅'));
 base.append(el('text',{x:130,y:-20,class:'map-place','text-anchor':'middle'},'幕張ベイパーク'));
 for(const f of FACILITIES.filter(f=>f.type==='park'&&f.id!=='parkA'))base.append(el('text',{x:f.x,y:f.z,class:'map-subplace','text-anchor':'middle'},f.short));
 let model,view=[-740,-620,1180,960],drag=null;
 const resizeLabels=()=>{const box=svg.getBoundingClientRect(),scale=Math.min(box.width/view[2],box.height/view[3]);if(!scale)return;for(const t of svg.querySelectorAll('text')){t.style.fontSize=((t.classList.contains('map-place')?13:11)/scale)+'px';if(t.textContent==='海浜幕張駅')t.style.display=scale<.7?'none':'';}for(const g of markers.children){const c=g.querySelector('circle'),t=g.querySelector('text');c.setAttribute('r',5/scale);t.textContent=scale<.5?g.dataset.marker.replace('口・','').replace('側',''):g.dataset.marker;t.setAttribute('x',+c.getAttribute('cx')+9/scale);t.setAttribute('y',+c.getAttribute('cy')+(g.dataset.marker.includes('北側')?-9:15)/scale);}};const apply=()=>{svg.setAttribute('viewBox',view.join(' '));resizeLabels();};new ResizeObserver(resizeLabels).observe(host);
 function focus(mode){view=mode==='station'?[-645,-385,350,290]:[-740,-620,1180,960];apply();}
 function zoom(factor){const[x,y,w,h]=view;view=[x+w*(1-factor)/2,y+h*(1-factor)/2,w*factor,h*factor];apply();}
 svg.addEventListener('pointerdown',e=>{if(e.target.closest('[data-marker]'))return;drag={x:e.clientX,y:e.clientY,view:[...view]};svg.setPointerCapture(e.pointerId);});
 svg.addEventListener('pointermove',e=>{if(!drag)return;const box=svg.getBoundingClientRect(),scale=Math.min(box.width/drag.view[2],box.height/drag.view[3]);view=[drag.view[0]-(e.clientX-drag.x)/scale,drag.view[1]-(e.clientY-drag.y)/scale,...drag.view.slice(2)];apply();});
 svg.addEventListener('pointerup',()=>drag=null);svg.addEventListener('pointercancel',()=>drag=null);
 function marker(p,label,color,description,dashed=false){const g=el('g',{'data-marker':label,tabindex:0,role:'button','aria-label':label});g.append(el('circle',{cx:p[0],cy:p[1],r:8,fill:color,stroke:'#142430','stroke-width':2,...(dashed?{'stroke-dasharray':'3 2'}:{})}));g.append(el('text',{x:p[0]+12,y:p[1]+5,class:'map-marker-label'},label));g.append(el('title',{},description));const inspect=()=>onInspect(label,description);g.addEventListener('click',inspect);g.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();inspect();}});markers.append(g);}
 function set(next){model=next;routes.replaceChildren();markers.replaceChildren();
  for(const e of model.links.values())routes.append(el('polyline',{points:points([e.a,e.b]),fill:'none',stroke:'#69dfbf','stroke-width':4,'data-link':e.key}));
  for(const [id,e]of Object.entries(EXITS))marker(e.point,e.name+(e.unconnected?' ※':''),e.unconnected?'#aebbc8':e.group==='park'?'#8bf3cf':'#94bcff',e.unconnected?e.note:'JR公式構内図で出入口の存在を確認。屋外接続点の位置は公開地図からの概略です。'+e.note,e.unconnected);
  const seen=new Set();for(const r of Object.values(model.routes)){if(seen.has(r.gateId))continue;seen.add(r.gateId);marker(r.endpoint,r.gateName,'#f4b97d','仮定の外周接続点。実際のゲート位置・数ではありません。現在の区域外の道へ接続し、各改札グループから均等に人数を割り当てます。',true);}
  resizeLabels();draw();
 }
 function draw(){if(!model)return;for(const path of routes.children){const link=model.links.get(path.dataset.link),ratio=link.count/link.capacity;path.setAttribute('stroke',ratio>.7?'#f58f77':ratio>.38?'#f2bf78':'#69dfbf');}dots.replaceChildren(...model.positions().map(p=>el('circle',{cx:p.x,cy:p.z,r:2.5,fill:p.blocked?'#ffb38e':'#ecfff7'})));}
 return{set,draw,focus,zoom};
}
