import * as THREE from 'three';
import {OrbitControls} from './vendor/OrbitControls.js';
import {createFlowView} from './flow-view.mjs';
import {FACILITIES} from './data.mjs';
import {G,BUILDINGS,PARK_A,PARK_B,PARK_CENTER,STATION_CENTER,EXITS,walkingRoute,inPolygon,center,project} from './map-data.mjs';

export function createCity(container,labelsContainer,onSelect){
  const scene=new THREE.Scene();
  const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));renderer.setClearColor(0x101d2a,0);
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;
  container.append(renderer.domElement);
  const camera=new THREE.PerspectiveCamera(38,1,2,6000);
  const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.075;controls.maxPolarAngle=Math.PI*.46;controls.minPolarAngle=.025;controls.minDistance=200;controls.maxDistance=3800;controls.autoRotateSpeed=.23;
  const ambient=new THREE.HemisphereLight(0xc7e6f4,0x365364,2.6);scene.add(ambient);
  const sun=new THREE.DirectionalLight(0xffd1a7,3);sun.position.set(-750,1100,500);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-1400,right:1400,top:1200,bottom:-1200,near:1,far:3300});sun.shadow.bias=-.0006;sun.shadow.normalBias=1;scene.add(sun);
  const fill=new THREE.DirectionalLight(0xa0d0f5,1.3);fill.position.set(900,450,-700);scene.add(fill);
  const city=new THREE.Group();scene.add(city);
  const materials={};
  function mat(color,options={}){const key=color+JSON.stringify(options);return materials[key]??=(new THREE.MeshStandardMaterial({color,roughness:.83,metalness:.06,...options}));}
  const groundMat=mat(0x2c424c),roadMat=mat(0x233641),pathMat=mat(0x7c999b),grassMat=mat(0x416f5c),roofMat=mat(0x9aafb2),parkingMat=mat(0x7e9396),contextMat=mat(0x637e89);
  const windowMat=mat(0x688b9c,{roughness:.38,metalness:.25,emissive:0xf1c38d,emissiveIntensity:.2}),darkWindow=mat(0x416775,{roughness:.4});
  const cube=new THREE.BoxGeometry(1,1,1),dummy=new THREE.Object3D();
  function box(group,x,y,z,w,h,d,material,rotation=0){const mesh=new THREE.Mesh(cube,material);mesh.position.set(x,y+h/2,z);mesh.scale.set(w,h,d);mesh.rotation.y=rotation;mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);return mesh;}
  function shape(p){return new THREE.Shape(p.map(v=>new THREE.Vector2(v[0],-v[1])));}
  function polygonGeo(p,h=0,y=.1){const g=h>0?new THREE.ExtrudeGeometry(shape(p),{depth:h,bevelEnabled:false}):new THREE.ShapeGeometry(shape(p));g.rotateX(-Math.PI/2);g.translate(0,y,0);return g;}
  function polygon(group,p,h,y,material){const o=new THREE.Mesh(polygonGeo(p,h,y),material);o.receiveShadow=true;o.castShadow=h>2;group.add(o);return o;}
  const batches=new Map();
  function batch(g,material){const geo=g.index?g.toNonIndexed():g;if(!batches.has(material))batches.set(material,[]);batches.get(material).push(geo);}
  function lineGeometry(points,width,y){const a=[];for(let i=1;i<points.length;i++){const p=points[i-1],q=points[i],len=Math.hypot(q[0]-p[0],q[1]-p[1]);if(!len)continue;const nx=-(q[1]-p[1])/len*width/2,nz=(q[0]-p[0])/len*width/2;const v=[[p[0]+nx,y,p[1]+nz],[p[0]-nx,y,p[1]-nz],[q[0]+nx,y,q[1]+nz],[q[0]-nx,y,q[1]-nz]];for(const id of [0,2,1,2,3,1])a.push(...v[id]);}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(a,3));g.computeVertexNormals();return g;}
  function line(group,p,y,color,opacity=1,closed=false){const pts=(closed?[...p,p[0]]:p).map(v=>new THREE.Vector3(v[0],y,v[1]));const mesh=new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),new THREE.LineBasicMaterial({color,transparent:opacity<1,opacity}));group.add(mesh);return mesh;}
  const [minX,minZ,maxX,maxZ]=G.bounds;
  box(city,(minX+maxX)/2,-10,(minZ+maxZ)/2,maxX-minX,10,maxZ-minZ,mat(0x203440));
  box(city,(minX+maxX)/2,0,(minZ+maxZ)/2,maxX-minX,.5,maxZ-minZ,groundMat);
  const exactIds=new Set(BUILDINGS.flatMap(b=>b.geometrySource.match(/way\/(\d+)/)?.[1]?[b.geometrySource.match(/way\/(\d+)/)[1]]:[]));
  // Suppress mapped background footprints where a newer official-plan outline exists.
  function overlapsNew(p){const c=center(p);return BUILDINGS.some(b=>inPolygon(c,b.p)||inPolygon(b.center,p));}
  const existingClosure=new THREE.Group();city.add(existingClosure);
  const trees=[];let seed=435;const rand=()=>{seed=(seed*16807)%2147483647;return(seed-1)/2147483646;};
  const greens=[];const vehicleWays=[];const railways=[];
  for(const f of G.features){
    const p=f.p,t=f.tags;
    if(f.kind==='green'){
      const isCentral=f.id==='387654538';batch(polygonGeo(p,0,.6),isCentral?mat(0x5d966b):t.leisure==='pitch'?mat(0x3f8068):grassMat);greens.push(f);
    }else if(f.kind==='water')batch(polygonGeo(p,0,.8),mat(0x366b80,{roughness:.24,metalness:.22}));
    else if(f.kind==='plot'&&t.landuse==='retail')batch(polygonGeo(p,0,.7),mat(0x435761));
    else if(f.kind==='parking')batch(polygonGeo(p,0,1),mat(0x415963));
    else if(f.kind==='road'){
      if(['motorway','motorway_link','trunk','trunk_link'].includes(t.highway))continue;
      const w=Number.parseFloat(t.width)||({primary:17,secondary:13,tertiary:10,residential:7,service:4,unclassified:7}[t.highway]||5);
      batch(lineGeometry(p,w+3.5,1),mat(0x536c76));batch(lineGeometry(p,w,1.15),roadMat);
      if(w>7)batch(lineGeometry(p,.4,1.2),mat(0x869997));
      if(t.access!=='private'&&t.highway!=='service'&&p.length>2)vehicleWays.push(p);
    }else if(f.kind==='path'){
      const q=center(p);const blocked=inPolygon(q,PARK_A);const geo=lineGeometry(p,t.highway==='pedestrian'?5:2.5,1.4);
      if(blocked){const o=new THREE.Mesh(geo,pathMat);existingClosure.add(o);}else batch(geo,pathMat);
    }else if(f.kind==='rail'){
      batch(lineGeometry(p,3.2,3.6),mat(0x425462));batch(lineGeometry(p,.5,4),mat(0xb8c9cc));
      if(!t.service)railways.push(p);
    }else if(f.kind==='building'&&!exactIds.has(f.id)&&!overlapsNew(p)){
      let h=Number.parseFloat(t.height)||Number.parseFloat(t['building:levels'])*3.2||9;
      h=Math.min(h,100);batch(polygonGeo(p,h,1.5),t.building==='train_station'?mat(0xb7cbc9):contextMat);
    }
  }
  // The A block is represented as a work/planning area, not an invented arena building.
  const closure=new THREE.Group();city.add(closure);
  polygon(closure,PARK_A,0,2,mat(0x8d765a,{transparent:true,opacity:.72}));
  line(closure,PARK_A,3,0xf2b575,.95,true);
  const fenceVertices=[];
  for(let i=0;i<PARK_A.length;i++){const a=PARK_A[i],b=PARK_A[(i+1)%PARK_A.length],d=Math.hypot(b[0]-a[0],b[1]-a[1]);for(let j=0;j<d;j+=10){const x=a[0]+(b[0]-a[0])*j/d,z=a[1]+(b[1]-a[1])*j/d;fenceVertices.push(x,2,z,x,6,z);}}
  const fenceGeo=new THREE.BufferGeometry();fenceGeo.setAttribute('position',new THREE.Float32BufferAttribute(fenceVertices,3));closure.add(new THREE.LineSegments(fenceGeo,new THREE.LineBasicMaterial({color:0xefbc86,transparent:true,opacity:.7})));
  const stripePoints=[];
  for(let x=-410;x<80;x+=19)for(let z=-545;z<-20;z+=5){const a=[x,z],b=[x+4,z+5];if(inPolygon(a,PARK_A)&&inPolygon(b,PARK_A))stripePoints.push(new THREE.Vector3(a[0],2.3,a[1]),new THREE.Vector3(b[0],2.3,b[1]));}
  closure.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(stripePoints),new THREE.LineBasicMaterial({color:0xe1ae6e,transparent:true,opacity:.24})));
  // Trees stay inside mapped green polygons. They are illustrative planting, not survey trees.
  for(const f of greens){if(f.id==='207878683')continue;const p=f.p;const xs=p.map(v=>v[0]),zs=p.map(v=>v[1]);const x0=Math.min(...xs),x1=Math.max(...xs),z0=Math.min(...zs),z1=Math.max(...zs);const count=f.tags.leisure==='pitch'?0:Math.min(220,Math.round((x1-x0)*(z1-z0)/550));let placed=0;for(let i=0;i<count*7&&placed<count;i++){const pos=[x0+rand()*(x1-x0),z0+rand()*(z1-z0)];if(inPolygon(pos,p)&&!BUILDINGS.some(b=>inPolygon(pos,b.p))){trees.push([pos[0],pos[1],2.7+rand()*2]);placed++;}}}
  const bp=G.features.find(f=>f.id==='207878683').p;
  for(let i=0;i<400;i++){const p=[-700+rand()*660,-530+rand()*930];if(inPolygon(p,bp)&&!inPolygon(p,PARK_A)&&rand()<.7)trees.push([p[0],p[1],3+rand()*2]);}
  for(const f of G.features.filter(f=>f.kind==='road'&&f.tags.highway==='residential')){for(let i=1;i<f.p.length;i++){const a=f.p[i-1],b=f.p[i],d=Math.hypot(b[0]-a[0],b[1]-a[1]);for(let t=10;t<d;t+=20){const x=a[0]+(b[0]-a[0])*t/d-(b[1]-a[1])/d*8,z=a[1]+(b[1]-a[1])*t/d+(b[0]-a[0])/d*8;if(!BUILDINGS.some(b=>inPolygon([x,z],b.p)))trees.push([x,z,3.2]);}}}
  const trunks=new THREE.InstancedMesh(new THREE.CylinderGeometry(.4,.6,3,5),mat(0x647465),trees.length),leaves=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1,1),mat(0x76a58a),trees.length);
  trees.forEach(([x,z,s],i)=>{dummy.position.set(x,2.5,z);dummy.scale.set(1,1,1);dummy.rotation.set(0,0,0);dummy.updateMatrix();trunks.setMatrixAt(i,dummy.matrix);dummy.position.y=4.5;dummy.scale.set(s*.8,s,s*.8);dummy.updateMatrix();leaves.setMatrixAt(i,dummy.matrix);leaves.setColorAt(i,new THREE.Color().setHSL(.36+rand()*.04,.2,.3+rand()*.15));});leaves.castShadow=true;city.add(trunks,leaves);
  const clickable=[],groups=[],labels=[];let state={year:2026,layer:'mobility',view:'district',time:'dusk',origin:'mid',exit:'park',persona:'family'},metrics={population:7056,traffic:52};
  function addLabel(f,y,kind=''){const el=document.createElement('div');el.className='city-label '+kind;el.innerHTML=`<span>${f.short||f.name}</span><span class="label-line"></span>`;labelsContainer.append(el);const obj={f,el,p:new THREE.Vector3(f.x,y,f.z)};labels.push(obj);return obj;}
  const flowView=createFlowView(city,lineGeometry,addLabel);
  const parked=[];
  const helperYears={cross:2019,sky:2021,mid:2024,senior:2024,rise:2026,bloom:2028,wakaba:2026,school:2026,hospital:2027};
  function parentId(id){return Object.keys(helperYears).find(p=>id.includes(p));}
  function windows(group,p,height,floors){const illuminated=[],dark=[];const bands=[];
    for(let e=0;e<p.length;e++){const a=p[e],b=p[(e+1)%p.length],dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz),angle=-Math.atan2(dz,dx);const n=Math.max(1,Math.floor(len/4.4));
      for(let floor=1;floor<floors;floor++){const y=height*floor/floors;bands.push(new THREE.Vector3(a[0],y,a[1]),new THREE.Vector3(b[0],y,b[1]));for(let col=0;col<n;col++){const t=(col+.5)/n;const item=[a[0]+dx*t,y+height/floors*.28,a[1]+dz*t,Math.min(2.9,len/n*.7),Math.min(2.1,height/floors*.62),angle];(rand()>.48?illuminated:dark).push(item);}}
    }
    group.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(bands),new THREE.LineBasicMaterial({color:0xbcd0d1,transparent:true,opacity:.65})));
    for(const [list,material] of [[illuminated,windowMat],[dark,darkWindow]]){const inst=new THREE.InstancedMesh(cube,material,list.length);list.forEach(([x,y,z,w,h,a],i)=>{dummy.position.set(x,y,z);dummy.rotation.set(0,a,0);dummy.scale.set(w,h,.42);dummy.updateMatrix();inst.setMatrixAt(i,dummy.matrix);});group.add(inst);}
  }
  for(const b of BUILDINGS){
    const g=new THREE.Group();g.position.y=1.6;city.add(g);const f=FACILITIES.find(f=>f.id===b.id);const par=parentId(b.id);const year=b.id.includes('hospital')?2026:(f?.year||helperYears[par]||b.openingYear||2026);const h=b.heightForRendering;
    const isTower=b.kind==='tower',isParking=b.kind.includes('parking');let material=mat(f?.color||0xc0cfce);
    if(isParking)material=parkingMat;if(b.kind==='ground')material=mat(0x9eaa83);if(b.kind==='pool')material=mat(0x62b9bd,{roughness:.23});
    const body=polygon(g,b.p,h,0,material);body.userData.id=f?.id||par;clickable.push(body);
    if(isTower){windows(g,b.p,h,b.floors);polygon(g,b.p,1,h,roofMat);
      const inset=b.p.map(v=>[b.center[0]+(v[0]-b.center[0])*.55,b.center[1]+(v[1]-b.center[1])*.55]);polygon(g,inset,3.2,h+1,mat(0xb9c7c6));
    }else if(isParking){
      for(let y=3;y<h;y+=3)line(g,b.p,y,0x3d5a65,.8,true);
      // Roof parking pattern, clipped to the published parking block footprint.
      const a=b.p[0],q=b.p[1],angle=Math.atan2(q[1]-a[1],q[0]-a[0]);const c=Math.cos(angle),s=Math.sin(angle);const pLocal=b.p.map(v=>[(v[0]-a[0])*c+(v[1]-a[1])*s,-(v[0]-a[0])*s+(v[1]-a[1])*c]);const minU=Math.min(...pLocal.map(p=>p[0])),maxU=Math.max(...pLocal.map(p=>p[0])),minV=Math.min(...pLocal.map(p=>p[1])),maxV=Math.max(...pLocal.map(p=>p[1]));
      for(let u=minU+4;u<maxU-3;u+=3.3)for(let v=minV+4;v<maxV-3;v+=13){const pos=[a[0]+u*c-v*s,a[1]+u*s+v*c];if(inPolygon(pos,b.p)){if(rand()>.35)parked.push([pos[0],h+2.5,pos[1],-angle,year]);const pts=[[pos[0]-2.5*s,pos[1]+2.5*c],[pos[0]+2.5*s,pos[1]-2.5*c]];line(g,pts,h+.2,0xb9c8c4,.7);}}
    }else if(b.kind!=='ground'&&b.kind!=='pool'&&h>7){windows(g,b.p,h,b.floors||Math.max(2,Math.round(h/3.7)));}
    const ghost=new THREE.LineSegments(new THREE.EdgesGeometry(polygonGeo(b.p,h,1.6)),new THREE.LineBasicMaterial({color:0xeeb981,transparent:true,opacity:.4}));city.add(ghost);ghost.visible=false;
    groups.push({g,ghost,b,year,goal:1});if(f&&!['parking','residence'].includes(f.type))addLabel(f,h+14,f.planned?'planned':'');
  }
  const parkedMesh=new THREE.InstancedMesh(cube,mat(0xb8cdce),parked.length);city.add(parkedMesh);
  for(const f of FACILITIES.filter(f=>['station','arena','park','shop'].includes(f.type))){
    addLabel(f,f.type==='station'?22:8,f.type==='arena'?'planned':f.type==='park'?'park':'');
    const pos=[f.x,f.z];const r=f.type==='arena'?40:18;const hit=polygon(city,[[pos[0]-r,pos[1]-r],[pos[0]+r,pos[1]-r],[pos[0]+r,pos[1]+r],[pos[0]-r,pos[1]+r]],1,1,mat(0x6ad6b7,{transparent:true,opacity:0,depthWrite:false}));hit.userData.id=f.id;clickable.push(hit);
  }
  // Combine static context so detailed geographic geometry stays interactive.
  for(const [material,geos]of batches){const total=geos.reduce((n,g)=>n+g.attributes.position.array.length,0),positions=new Float32Array(total),normals=new Float32Array(total);let o=0;for(const g of geos){positions.set(g.attributes.position.array,o);normals.set(g.attributes.normal.array,o);o+=g.attributes.position.array.length;g.dispose();}const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(positions,3));geo.setAttribute('normal',new THREE.BufferAttribute(normals,3));const mesh=new THREE.Mesh(geo,material);mesh.receiveShadow=true;mesh.castShadow=material===contextMat;city.add(mesh);}
  const selection=new THREE.Group();city.add(selection);
  const routeGroup=new THREE.Group();city.add(routeGroup);let routeData={points:[]},routeKey='';
  const walkerMesh=new THREE.InstancedMesh(new THREE.SphereGeometry(1.4,6,4),new THREE.MeshBasicMaterial({color:0xc6ffe8}),28);routeGroup.add(walkerMesh);let routeLines=[];
  function setRoute(s){const key=[s.origin,s.exit,s.year>=2026,s.year<2025].join();if(key===routeKey)return;routeKey=key;routeData=walkingRoute(s.origin,s.exit,s.year);for(const o of routeLines){routeGroup.remove(o);o.geometry.dispose();o.material.dispose();}routeLines=[];
    if(routeData.points.length){const glow=new THREE.Mesh(lineGeometry(routeData.points,18,5),new THREE.MeshBasicMaterial({color:0x60dfb9,transparent:true,opacity:.23,depthWrite:false,side:THREE.DoubleSide}));const core=new THREE.Mesh(lineGeometry(routeData.points,6,5.3),new THREE.MeshBasicMaterial({color:0x17f5b0,toneMapped:false,depthTest:false,depthWrite:false,transparent:true,opacity:1,side:THREE.DoubleSide}));core.renderOrder=20;routeGroup.add(glow,core);routeLines.push(glow,core);
      for(const p of [routeData.points[0],routeData.points.at(-1)]){const marker=new THREE.Mesh(new THREE.CylinderGeometry(8,8,3,24),new THREE.MeshBasicMaterial({color:0x17f5b0,toneMapped:false,depthTest:false}));marker.position.set(p[0],8,p[1]);marker.renderOrder=21;routeGroup.add(marker);routeLines.push(marker);}
    }
  }
  const access=new THREE.Group();city.add(access);for(const[r,alpha]of [[400,.055],[200,.08]]){const disc=new THREE.Mesh(new THREE.CircleGeometry(r,100),new THREE.MeshBasicMaterial({color:0x6be0b9,transparent:true,opacity:alpha,depthWrite:false,side:THREE.DoubleSide}));disc.rotation.x=-Math.PI/2;disc.position.y=3;access.add(disc);const ring=new THREE.Mesh(new THREE.RingGeometry(r-1.2,r,100),new THREE.MeshBasicMaterial({color:0x82e7c5,transparent:true,opacity:.65,side:THREE.DoubleSide}));ring.rotation.x=-Math.PI/2;ring.position.y=3.1;access.add(ring);}
  const carMat=mat(0xc6dcd5,{emissive:0x9dd7bd,emissiveIntensity:.2});const cars=new THREE.InstancedMesh(cube,carMat,95);city.add(cars);const busMat=mat(0x6edabd),buses=new THREE.InstancedMesh(cube,busMat,8);city.add(buses);
  function measure(p){let total=0;const lengths=[0];for(let i=1;i<p.length;i++){total+=Math.hypot(p[i][0]-p[i-1][0],p[i][1]-p[i-1][1]);lengths.push(total);}return{p,lengths,total};}
  function at(path,d){d=((d%path.total)+path.total)%path.total;let i=1;while(i<path.lengths.length-1&&path.lengths[i]<d)i++;const a=path.p[i-1],b=path.p[i],t=(d-path.lengths[i-1])/(path.lengths[i]-path.lengths[i-1]||1);return[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,-Math.atan2(b[1]-a[1],b[0]-a[0])];}
  const carPaths=vehicleWays.map(measure).filter(p=>p.total>80);const trainPath=railways.map(measure).sort((a,b)=>b.total-a.total)[0];
  const train=new THREE.InstancedMesh(cube,mat(0xc2d4d6,{emissive:0x608aa0,emissiveIntensity:.07}),6);city.add(train);
  let routeMeasured=null,lastView='';const desiredTarget=new THREE.Vector3(),desiredPosition=new THREE.Vector3();let transitioning=false;
  function frame(view,instant=false){const poses={area:{target:[-40,100,-30],offset:[1080,1550,1900]},district:{target:[390,160,100],offset:[530,720,820]},overhead:{target:[-40,0,-40],offset:[0,2200,1]}};const v=state.layer==='flow'?{target:[-355,70,-265],offset:view==='overhead'?[0,1100,1]:[390,710,760]}:(poses[view]||poses.area);desiredTarget.fromArray(v.target);desiredPosition.copy(desiredTarget).add(new THREE.Vector3(...v.offset));if(instant){controls.target.copy(desiredTarget);camera.position.copy(desiredPosition);controls.update();}else transitioning=true;}
  frame('area',true);controls.addEventListener('start',()=>transitioning=false);
  const palettes={day:{ambient:3,sun:3.1,exposure:1.35,windows:.04,sunColor:0xffedce},dusk:{ambient:2.6,sun:3,exposure:1.3,windows:.3,sunColor:0xffc394},night:{ambient:.95,sun:.65,exposure:1.12,windows:2.9,sunColor:0x9bbbea}};let palette='';
  function update(s,result){state={...s};metrics=result;if(s.layer==='flow')s={...s,year:2030};flowView.group.visible=s.layer==='flow';if(palette!==s.time){const p=palettes[s.time];ambient.intensity=p.ambient;sun.intensity=p.sun;sun.color.set(p.sunColor);windowMat.emissiveIntensity=p.windows;renderer.toneMappingExposure=p.exposure;palette=s.time;}
    for(const obj of groups){const built=s.year>=obj.year;const construction=s.year===obj.year-1;obj.goal=built?1:construction?.3:.015;obj.ghost.visible=!built;}
    labels.forEach(l=>{if(l.f.id==='station'){const p=s.layer==='mobility'?EXITS[s.exit].point:STATION_CENTER;l.p.set(p[0],22,p[1]);l.el.querySelector('span').textContent=s.layer==='mobility'?'海浜幕張駅 · '+EXITS[s.exit].name:'海浜幕張駅';}const planned=l.f.type==='arena'||l.f.year>s.year;l.el.classList.toggle('planned',planned);l.el.querySelector('b')?.remove();if(planned)l.el.insertAdjacentHTML('afterbegin',`<b>${l.f.type==='arena'?'2030年 開業目標':l.f.displayYear||l.f.year+'年予定'}</b>`);});
    closure.visible=s.year>=2026;existingClosure.visible=s.year<2026;routeGroup.visible=s.layer==='mobility';access.visible=s.layer==='access';
    const source=s.persona==='commuter'?EXITS[s.exit].point:s.persona==='senior'?BUILDINGS.find(b=>b.id==='hospital').center:BUILDINGS.find(b=>b.id===s.origin).center;access.position.set(source[0],0,source[1]);
    setRoute(s);routeMeasured=routeData.points.length>1?measure(routeData.points):null;walkerMesh.visible=!!routeMeasured;
    let count=0;for(const[x,y,z,a,year]of parked){if(s.year>=year){dummy.position.set(x,y,z);dummy.rotation.set(0,a,0);dummy.scale.set(2,1.3,4.2);dummy.updateMatrix();parkedMesh.setMatrixAt(count++,dummy.matrix);}}parkedMesh.count=count;parkedMesh.instanceMatrix.needsUpdate=true;
    cars.count=Math.min(95,Math.max(16,Math.round(result.population/120)));buses.count=Math.ceil(s.buses/2);carMat.color.set(result.traffic>72?0xe8b58d:0xd2e4da);
    const viewKey=s.view+':'+(s.layer==='flow');if(lastView!==viewKey){frame(s.view,lastView==='');lastView=viewKey;}
  }
  const ray=new THREE.Raycaster(),pointer=new THREE.Vector2();let down=null;
  container.addEventListener('pointerdown',e=>{down=[e.clientX,e.clientY];});container.addEventListener('pointerup',e=>{if(!down||Math.hypot(e.clientX-down[0],e.clientY-down[1])>5)return;const r=container.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(pointer,camera);const hits=ray.intersectObjects(clickable).filter(h=>h.object.userData.id&&h.object.parent.scale.y>.2);if(hits.length)onSelect(hits[0].object.userData.id);});
  function resize(){const w=container.clientWidth,h=container.clientHeight;renderer.setSize(w,h);camera.aspect=w/h;camera.fov=Math.min(76,38*Math.max(1,1.25/camera.aspect));camera.updateProjectionMatrix();}const ro=new ResizeObserver(resize);ro.observe(container);resize();
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;let last=0,elapsed=0,tick=0,animationId;
  const vector=new THREE.Vector3();function animate(now){animationId=requestAnimationFrame(animate);if(document.hidden){last=now;return;}const dt=Math.min(.05,(now-last)/1000||.016);last=now;elapsed+=reduced?0:dt;
    if(transitioning){const f=reduced?1:Math.min(1,dt*5);camera.position.lerp(desiredPosition,f);controls.target.lerp(desiredTarget,f);if(camera.position.distanceTo(desiredPosition)<.5)transitioning=false;}controls.update();
    for(const o of groups)o.g.scale.y+=(o.goal-o.g.scale.y)*Math.min(1,dt*6);
    for(let i=0;i<cars.count;i++){const path=carPaths[i%carPaths.length],[x,z,a]=at(path,elapsed*(14-metrics.traffic*.06)+i*53);dummy.position.set(x,2.5,z);dummy.rotation.set(0,a,0);dummy.scale.set(4.5,1.5,2);dummy.updateMatrix();cars.setMatrixAt(i,dummy.matrix);}cars.instanceMatrix.needsUpdate=true;
    for(let i=0;i<buses.count;i++){const path=carPaths[(i*7)%carPaths.length],[x,z,a]=at(path,elapsed*12+i*110);dummy.position.set(x,3,z);dummy.rotation.set(0,a,0);dummy.scale.set(10,2.8,2.8);dummy.updateMatrix();buses.setMatrixAt(i,dummy.matrix);}buses.instanceMatrix.needsUpdate=true;
    if(trainPath)for(let i=0;i<6;i++){const[x,z,a]=at(trainPath,elapsed*24+i*21);dummy.position.set(x,7,z);dummy.rotation.set(0,a,0);dummy.scale.set(19,4,3);dummy.updateMatrix();train.setMatrixAt(i,dummy.matrix);}train.instanceMatrix.needsUpdate=true;
    if(routeGroup.visible&&routeMeasured){for(let i=0;i<28;i++){const[x,z]=at(routeMeasured,elapsed*10+i*routeMeasured.total/28);dummy.position.set(x,7,z);dummy.rotation.set(0,0,0);dummy.scale.setScalar(1.3);dummy.updateMatrix();walkerMesh.setMatrixAt(i,dummy.matrix);}walkerMesh.instanceMatrix.needsUpdate=true;}
    flowView.draw();
    if(tick++%3===0){
      const bounds=container.getBoundingClientRect(),placed=[];
      for(const el of container.parentElement.querySelectorAll('.map-heading,.view-switch,.map-framing,.map-actions,.flow-hud:not([hidden])')){const r=el.getBoundingClientRect();placed.push({x:r.left-bounds.left-5,y:r.top-bounds.top-5,w:r.width+10,h:r.height+10});}
      const priority=id=>id===state.origin?0:id==='station'?1:id==='arena'?2:3;
      for(const l of [...labels].sort((a,b)=>priority(a.f.id)-priority(b.f.id))){
        const remote=['station','parkA','parkB','parkC','arena'].includes(l.f.id);
        const allowed=state.layer==='flow'?(l.f.type==='flow'||l.f.id==='arena'):l.f.type!=='flow'&&(state.view==='district'?!remote:[state.origin,'station','arena','parkB','parkC','park'].includes(l.f.id));
        vector.copy(l.p).project(camera);const x=(vector.x*.5+.5)*bounds.width,y=(-vector.y*.5+.5)*bounds.height;
        l.el.hidden=!(allowed&&vector.z<1&&vector.z>-1&&y>50&&y<bounds.height-65);
        if(l.el.hidden)continue;
        const w=l.el.offsetWidth,h=l.el.offsetHeight,box={x:x-w/2,y:y-h,w:w+8,h:h+5};
        const overlap=box.x<8||box.x+box.w>bounds.width-8||placed.some(p=>box.x+box.w>p.x&&box.x<p.x+p.w&&box.y+box.h>p.y&&box.y<p.y+p.h);
        l.el.hidden=overlap;if(overlap)continue;
        l.el.style.left=x+'px';l.el.style.top=y+'px';placed.push(box);
      }
      document.querySelector('.map-compass svg').style.transform=`rotate(${-controls.getAzimuthalAngle()*180/Math.PI}deg)`;
    }
    renderer.render(scene,camera);
  }requestAnimationFrame(animate);
  return{update,setFlow:flowView.set,select(id){for(const o of [...selection.children]){selection.remove(o);o.geometry.dispose();o.material.dispose();}const f=FACILITIES.find(f=>f.id===id);if(!f)return;const b=BUILDINGS.find(b=>b.id===id);if(b)line(selection,b.p,3,0xb3ffe4,1,true);},zoom(factor){transitioning=false;const offset=camera.position.clone().sub(controls.target);offset.setLength(THREE.MathUtils.clamp(offset.length()*factor,controls.minDistance,controls.maxDistance));camera.position.copy(controls.target).add(offset);controls.update();},reset(){frame(state.view);},orbit(value){controls.autoRotate=value;},dispose(){cancelAnimationFrame(animationId);ro.disconnect();renderer.dispose();controls.dispose();}};
}
