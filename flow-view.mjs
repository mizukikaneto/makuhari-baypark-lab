import * as THREE from 'three';
export function createFlowView(root,lineGeometry,addLabel){
  const group=new THREE.Group();root.add(group);group.visible=false;
  const dotMaterial=new THREE.MeshBasicMaterial({color:0xffffff,toneMapped:false,depthTest:false,transparent:true,opacity:.96});
  const dots=new THREE.InstancedMesh(new THREE.SphereGeometry(2.2,6,4),dotMaterial,2000);dots.renderOrder=35;dots.frustumCulled=false;group.add(dots);
  const dummy=new THREE.Object3D(),color=new THREE.Color();let model=null,meshes=[],labels=[],lastTime=-1;
  function set(next){
    model=next;lastTime=-1;
    for(const m of meshes){group.remove(m);m.geometry.dispose();m.material.dispose();}meshes=[];
    for(const e of model.links.values()){
      const material=new THREE.MeshBasicMaterial({color:0x5ed4b6,toneMapped:false,transparent:true,opacity:.8,depthTest:false,depthWrite:false,side:THREE.DoubleSide});
      const m=new THREE.Mesh(lineGeometry([e.a,e.b],7,6),material);m.renderOrder=30;m.userData.key=e.key;group.add(m);meshes.push(m);
    }
    const points=[['park','公園改札',model.routes.park],['south','南口',model.routes.south]];
    for(const[id,name,r]of points){const p=model.config.direction==='depart'?r.points.at(-1):r.points[0];marker(p,id==='park'?0x85f7cf:0x8dbaff);putLabel('flow-'+id,name,p);}
    const p=model.routes.park.endpoint;marker(p,0xf5bf89);putLabel('flow-gate','仮の接続点 · 西側沿道',p);
  }
  function marker(p,c){const m=new THREE.Mesh(new THREE.CylinderGeometry(9,9,4,24),new THREE.MeshBasicMaterial({color:c,toneMapped:false,depthTest:false}));m.position.set(p[0],9,p[1]);m.renderOrder=36;group.add(m);meshes.push(m);}
  function putLabel(id,name,p){let l=labels.find(l=>l.f.id===id);if(!l){l=addLabel({id,short:name,x:p[0],z:p[1],year:1986,type:'flow'},24,'flow-point');labels.push(l);}else l.p.set(p[0],24,p[1]);}
  function draw(){
    if(!model||!group.visible)return;const s=model.snapshot();if(lastTime===s.time)return;lastTime=s.time;
    for(const mesh of meshes){const e=model.links.get(mesh.userData.key);if(!e)continue;const ratio=e.count/e.capacity;mesh.material.color.set(ratio>.7?0xf58f77:ratio>.38?0xf2bf78:0x5ed4b6);mesh.material.opacity=e.count?.95:.42;}
    const people=model.positions();dots.count=people.length;
    people.forEach((p,i)=>{const offset=((p.id%5)-2)*.75;dummy.position.set(p.x-Math.sin(p.angle)*offset,10,p.z+Math.cos(p.angle)*offset);dummy.scale.setScalar(p.blocked?1.35:1);dummy.updateMatrix();dots.setMatrixAt(i,dummy.matrix);color.set(p.blocked?0xffb28e:p.routeId==='park'?0xc4ffe7:0xa9cfff);dots.setColorAt(i,color);});
    dots.instanceMatrix.needsUpdate=true;if(dots.instanceColor)dots.instanceColor.needsUpdate=true;
  }
  return{group,set,draw};
}
