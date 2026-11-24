export const STEP = 0.5;
const EPS = 1e-7;
export const add = (a,b) => a.map((v,i)=>v+b[i]);
export const sub = (a,b) => a.map((v,i)=>v-b[i]);
export const mul = (a,s) => a.map(v=>v*s);
export const dot = (a,b) => a.reduce((s,v,i)=>s+v*b[i],0);
export const cross = (a,b) => [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
export const len = a=>Math.sqrt(dot(a,a));
export const unit = a=>mul(a,1/(len(a)||1));
export const dist = (a,b)=>len(sub(a,b));
export const lerp=(a,b,t)=>add(a,mul(sub(b,a),t));
export const radial = (x,z)=>Math.hypot(x,z);

function patch(vertices, hint, id, building=null) {
  let n=[0,0,0], area=0;
  for(let i=1;i<vertices.length-1;i++){
    const c=cross(sub(vertices[i],vertices[0]),sub(vertices[i+1],vertices[0]));
    area+=len(c)/2; n=add(n,c);
  }
  if(area<EPS)return null;
  if(dot(n,hint)<0){vertices=[...vertices].reverse();n=mul(n,-1);}
  return {id,building,vertices,normal:unit(n),center:mul(vertices.reduce(add,[0,0,0]),1/vertices.length),area,owner:null,density:0,traps:[]};
}
export function ground(radius){
  const out=[], boundary=Array.from({length:128},(_,i)=>[radius*Math.cos(i*Math.PI/64),radius*Math.sin(i*Math.PI/64)]);
  const n=Math.ceil(radius/STEP);
  for(let i=-n;i<n;i++)for(let j=-n;j<n;j++){
    let poly=[[i*STEP,j*STEP],[(i+1)*STEP,j*STEP],[(i+1)*STEP,(j+1)*STEP],[i*STEP,(j+1)*STEP]];
    if(poly.every(p=>radial(...p)>radius)&&radial((i+.5)*STEP,(j+.5)*STEP)>radius+STEP)continue;
    if(poly.some(p=>radial(...p)>radius*Math.cos(Math.PI/128))){
      for(let k=0;k<boundary.length&&poly.length;k++){
        const a=boundary[k],b=boundary[(k+1)%boundary.length];
        const side=p=>(b[0]-a[0])*(p[1]-a[1])-(b[1]-a[1])*(p[0]-a[0]);
        const next=[];
        for(let l=0;l<poly.length;l++){
          const u=poly[l],v=poly[(l+1)%poly.length],su=side(u),sv=side(v);
          if(su>=-EPS)next.push(u);
          if((su>=-EPS)!==(sv>=-EPS)){const t=su/(su-sv);next.push([u[0]+(v[0]-u[0])*t,u[1]+(v[1]-u[1])*t]);}
        }
        poly=next;
      }
    }
    if(poly.length>=3){const p=patch(poly.map(([x,z])=>[x,0,z]),[0,1,0],'g:'+i+':'+j);if(p)out.push(p);}
  }
  return out;
}
export const BUILDINGS = {
  dome:{label:'돔',detail:'반지름 1.25 · 곡면',radius:1.25,scale:[1.25,1.25,1.25]},
  tower:{label:'타워',detail:'반지름 0.65 · 높이 2.5',radius:.65,scale:[1.3,2.5/3,1.3]},
  wall:{label:'장벽',detail:'길이 3 · 높이 2.4 · 두께 0.5',radius:Math.hypot(1.5,.25),scale:[1,1.2,1]},
  arch:{label:'아치',detail:'너비 3 · 높이 3 · 깊이 1',radius:Math.hypot(1.5,.5),scale:[1,1,1]},
  ramp:{label:'경사로',detail:'길이 3 · 폭 1.5 · 높이 1.5',radius:Math.hypot(1.5,.75),scale:[1,1,1]},
  canopy:{label:'캐노피',detail:'지붕 3 × 2.6 · 높이 2 · 기둥 0.6',radius:Math.hypot(1.5,1.3),scale:[1,1,1]},
  basin:{label:'그릇',detail:'반지름 1.45 · 높이 1.25 · 오목한 내부',radius:1.45,scale:[1,1,1]},
  tunnel:{label:'터널',detail:'길이 3 · 폭 2.6 · 높이 1.8',radius:Math.hypot(1.3,1.5),scale:[1,1,1]}
};
export function local(b,p){const c=Math.cos(b.rotation),s=Math.sin(b.rotation),x=p[0]-b.x,z=p[2]-b.z;return [c*x+s*z,p[1],-s*x+c*z];}
export function footprint(b,p,solid=true){
  const pos=local(b,p),scale=BUILDINGS[b.kind].scale;const [x,,z]=pos.map((v,i)=>v/scale[i]);
  if(b.kind==='dome')return radial(x,z)<=1+EPS;
  if(b.kind==='tower')return radial(x,z)<=.5+EPS;
  if(b.kind==='wall')return Math.abs(x)<=1.5+EPS&&Math.abs(z)<=.25+EPS;
  if(b.kind==='ramp')return Math.abs(x)<=1.5+EPS&&Math.abs(z)<=.75+EPS;
  if(b.kind==='canopy')return solid?Math.abs(x)<=.3+EPS&&Math.abs(z)<=.3+EPS:Math.abs(x)<=1.5+EPS&&Math.abs(z)<=1.3+EPS;
  if(b.kind==='basin')return radial(x,z)<=1.45+EPS;
  if(b.kind==='tunnel')return Math.abs(x)<=1.3+EPS&&Math.abs(z)<=1.5+EPS&&(!solid||Math.abs(x)>=.85-EPS);
  return Math.abs(x)<=1.5+EPS&&Math.abs(z)<=.5+EPS&&(!solid||Math.abs(x)>=.95-EPS);
}
export function buildingSurfaces(b){
  const out=[],c=Math.cos(b.rotation),s=Math.sin(b.rotation);
  const rotate=([x,y,z])=>[c*x-s*z,y,s*x+c*z];
  const scale=BUILDINGS[b.kind].scale;
  const world=p=>add(rotate(p.map((v,i)=>v*scale[i])),[b.x,0,b.z]);
  const push=(vs,normal)=>{const p=patch(vs.map(world),rotate(normal.map((v,i)=>v/scale[i])),'b:'+b.id+':'+out.length,b.id);if(p)out.push(p);};
  const grid=(o,u,v,n)=>{const nu=Math.max(1,Math.ceil(len(u)/STEP)),nv=Math.max(1,Math.ceil(len(v)/STEP));for(let i=0;i<nu;i++)for(let j=0;j<nv;j++){const f=(a,d)=>add(o,add(mul(u,a/nu),mul(v,d/nv)));push([f(i,j),f(i+1,j),f(i+1,j+1),f(i,j+1)],n);}};
  const circle=(r,y,a)=>[r*Math.cos(a),y,r*Math.sin(a)];
  const disc=(r,y)=>{const nr=Math.ceil(r/STEP),nt=16;for(let j=0;j<nr;j++)for(let i=0;i<nt;i++){const a=i*2*Math.PI/nt,d=(i+1)*2*Math.PI/nt;push([circle(r*j/nr,y,a),circle(r*(j+1)/nr,y,a),circle(r*(j+1)/nr,y,d),circle(r*j/nr,y,d)],[0,1,0]);}};
  if(b.kind==='dome'){
    const pt=(t,a)=>[Math.sin(t)*Math.cos(a),Math.cos(t),Math.sin(t)*Math.sin(a)];
    for(let j=0;j<4;j++)for(let i=0;i<16;i++){const t=j*Math.PI/8,u=(j+1)*Math.PI/8,a=i*Math.PI/8,d=(i+1)*Math.PI/8;push([pt(t,a),pt(u,a),pt(u,d),pt(t,d)],pt((t+u)/2,(a+d)/2));}
  } else if(b.kind==='tower'){
    for(let j=0;j<6;j++)for(let i=0;i<12;i++){const a=i*Math.PI/6,d=(i+1)*Math.PI/6;push([circle(.5,j*.5,a),circle(.5,(j+1)*.5,a),circle(.5,(j+1)*.5,d),circle(.5,j*.5,d)],circle(1,0,(a+d)/2));}
    disc(.5,3);
  } else if(b.kind==='wall'){
    grid([-1.5,0,-.25],[3,0,0],[0,2,0],[0,0,-1]);grid([-1.5,0,.25],[3,0,0],[0,2,0],[0,0,1]);
    grid([-1.5,0,-.25],[0,0,.5],[0,2,0],[-1,0,0]);grid([1.5,0,-.25],[0,0,.5],[0,2,0],[1,0,0]);
    grid([-1.5,2,-.25],[3,0,0],[0,0,.5],[0,1,0]);
  } else if(b.kind==='ramp'){
    grid([-1.5,0,-.75],[3,1.5,0],[0,0,1.5],[-.5,1,0]);
    grid([1.5,0,-.75],[0,1.5,0],[0,0,1.5],[1,0,0]);
    for(const z of [-.75,.75])for(let i=0;i<6;i++)for(let j=0;j<3;j++){
      const x0=-1.5+i*.5,x1=x0+.5,y0=(x0+1.5)*.5,y1=(x1+1.5)*.5;
      push([[x0,y0*j/3,z],[x1,y1*j/3,z],[x1,y1*(j+1)/3,z],[x0,y0*(j+1)/3,z]],[0,0,Math.sign(z)]);
    }
  } else if(b.kind==='canopy'){
    const h=1.75,top=2;
    for(const sign of [-1,1]){
      grid([sign*.3,0,-.3],[0,h,0],[0,0,.6],[sign,0,0]);
      grid([-.3,0,sign*.3],[.6,0,0],[0,h,0],[0,0,sign]);
      grid([sign*1.5,h,-1.3],[0,.25,0],[0,0,2.6],[sign,0,0]);
      grid([-1.5,h,sign*1.3],[3,0,0],[0,.25,0],[0,0,sign]);
    }
    grid([-1.5,top,-1.3],[3,0,0],[0,0,2.6],[0,1,0]);
    grid([-1.5,h,-1.3],[1.2,0,0],[0,0,2.6],[0,-1,0]);
    grid([.3,h,-1.3],[1.2,0,0],[0,0,2.6],[0,-1,0]);
    grid([-.3,h,-1.3],[.6,0,0],[0,0,1],[0,-1,0]);
    grid([-.3,h,.3],[.6,0,0],[0,0,1],[0,-1,0]);
  } else if(b.kind==='basin'){
    const inner=[[0,.18],[.32,.20],[.63,.38],[.91,.70],[1.12,1.02],[1.24,1.25]];
    const outer=[[1.45,0],[1.45,.5],[1.45,1],[1.45,1.25]];
    const ring=(r,y,a)=>[r*Math.cos(a),y,r*Math.sin(a)];
    for(let i=0;i<24;i++){
      const a=i*Math.PI/12,d=(i+1)*Math.PI/12,m=(a+d)/2;
      for(let j=0;j<inner.length-1;j++){
        const [r0,y0]=inner[j],[r1,y1]=inner[j+1];
        push([ring(r0,y0,a),ring(r1,y1,a),ring(r1,y1,d),ring(r0,y0,d)],[-Math.cos(m)*(y1-y0),r1-r0,-Math.sin(m)*(y1-y0)]);
      }
      for(let j=0;j<outer.length-1;j++){
        const [r0,y0]=outer[j],[r1,y1]=outer[j+1];
        push([ring(r0,y0,a),ring(r1,y1,a),ring(r1,y1,d),ring(r0,y0,d)],[Math.cos(m),0,Math.sin(m)]);
      }
      push([ring(1.24,1.25,a),ring(1.45,1.25,a),ring(1.45,1.25,d),ring(1.24,1.25,d)],[0,1,0]);
    }
  } else if(b.kind==='tunnel'){
    for(const sign of [-1,1]){
      grid([sign*1.3,0,-1.5],[0,1.8,0],[0,0,3],[sign,0,0]);
      grid([sign*.85,0,-1.5],[0,1.45,0],[0,0,3],[-sign,0,0]);
      const x=sign<0?-1.3:.85;
      for(const z of [-1.5,1.5])grid([x,0,z],[.45,0,0],[0,1.45,0],[0,0,Math.sign(z)]);
    }
    for(const z of [-1.5,1.5])grid([-1.3,1.45,z],[2.6,0,0],[0,.35,0],[0,0,Math.sign(z)]);
    grid([-1.3,1.8,-1.5],[2.6,0,0],[0,0,3],[0,1,0]);
    grid([-.85,1.45,-1.5],[1.7,0,0],[0,0,3],[0,-1,0]);
  } else {
    for(const sign of [-1,1]){
      const x=sign===1?.95:-1.5;
      for(const z of [-.5,.5])grid([x,0,z],[.55,0,0],[0,1.5,0],[0,0,Math.sign(z)]);
      grid([sign*1.5,0,-.5],[0,0,1],[0,1.5,0],[sign,0,0]);
      grid([sign*.95,0,-.5],[0,0,1],[0,1.5,0],[-sign,0,0]);
    }
    const ap=(r,a,z)=>[r*Math.cos(a),1.5+r*Math.sin(a),z];
    for(let i=0;i<12;i++){
      const a=i*Math.PI/12,d=(i+1)*Math.PI/12,m=(a+d)/2;
      for(const z of [-.5,.5])push([ap(.95,a,z),ap(1.5,a,z),ap(1.5,d,z),ap(.95,d,z)],[0,0,Math.sign(z)]);
      for(const r of [.95,1.5])for(let j=0;j<2;j++){const z=-.5+j*.5,sg=r===.95?-1:1;push([ap(r,a,z),ap(r,d,z),ap(r,d,z+.5),ap(r,a,z+.5)],[sg*Math.cos(m),sg*Math.sin(m),0]);}
    }
  }
  return out;
}

function triangleHit(origin,d,a,b,c){
  const e1=sub(b,a),e2=sub(c,a),h=cross(d,e2),det=dot(e1,h);
  if(Math.abs(det)<EPS)return null;
  const inv=1/det,s=sub(origin,a),u=inv*dot(s,h);if(u<-EPS||u>1+EPS)return null;
  const q=cross(s,e1),v=inv*dot(d,q);if(v<-EPS||u+v>1+EPS)return null;
  const t=inv*dot(e2,q);return t>EPS&&t<=1+EPS?t:null;
}
export function geometryIndex(state){
  const grounds=state.surfaces.filter(p=>p.building===null), solids=state.surfaces.filter(p=>p.building!==null);
  const groundBins=new Map();
  grounds.forEach((p,order)=>{
    const k=Math.floor(p.center[0]/STEP)+':'+Math.floor(p.center[2]/STEP);
    if(!groundBins.has(k))groundBins.set(k,[]);
    groundBins.get(k).push({p,order});
  });
  const solidBounds=solids.map(p=>({p,min:[0,1,2].map(i=>Math.min(...p.vertices.map(v=>v[i]))),max:[0,1,2].map(i=>Math.max(...p.vertices.map(v=>v[i])))}));
  const grouped=new Map();
  for(const item of solidBounds){
    let group=grouped.get(item.p.building);
    if(!group){group={min:[Infinity,Infinity,Infinity],max:[-Infinity,-Infinity,-Infinity],items:[]};grouped.set(item.p.building,group);}
    for(let i=0;i<3;i++){group.min[i]=Math.min(group.min[i],item.min[i]);group.max[i]=Math.max(group.max[i],item.max[i]);}
    group.items.push(item);
  }
  return {grounds,solids,groundBins,solidBounds,solidGroups:[...grouped.values()],byId:new Map(state.surfaces.map(p=>[p.id,p]))};
}
export function raycast(idx,origin,end){
  const d=sub(end,origin);let best=1+EPS,found=null;
  if(d[1]<-EPS&&origin[1]>=0){
    const t=-origin[1]/d[1];
    if(t>EPS&&t<=1+EPS){
      const point=add(origin,mul(d,t));
      let p=null,order=Infinity;
      const x=Math.floor(point[0]/STEP),z=Math.floor(point[2]/STEP);
      for(let i=x-1;i<=x+1;i++)for(let j=z-1;j<=z+1;j++)for(const g of idx.groundBins.get(i+':'+j)||[]){
        if(g.order>=order)continue;
        let inside=true;
        const vs=g.p.vertices;
        for(let k=0;k<vs.length;k++){
          const a=vs[k],b=vs[(k+1)%vs.length];
          if(((b[2]-a[2])*(point[0]-a[0])-(b[0]-a[0])*(point[2]-a[2])) < -EPS){inside=false;break;}
        }
        if(inside){p=g.p;order=g.order;}
      }
      if(p){best=t;found=p;}
    }
  }
  const lo=origin.map((v,i)=>Math.min(v,end[i])-EPS),hi=origin.map((v,i)=>Math.max(v,end[i])+EPS);
  const overlap=(min,max)=>!(min[0]>hi[0]||max[0]<lo[0]||min[1]>hi[1]||max[1]<lo[1]||min[2]>hi[2]||max[2]<lo[2]);
  for(const group of idx.solidGroups){
    if(!overlap(group.min,group.max))continue;
    for(const {p,min,max} of group.items){
      if(!overlap(min,max))continue;
      for(let i=1;i<p.vertices.length-1;i++){
        const t=triangleHit(origin,d,p.vertices[0],p.vertices[i],p.vertices[i+1]);
        if(t!==null&&t<best){best=t;found=p;}
      }
    }
  }
  return found?{patch:found,point:add(origin,mul(d,best)),t:best}:null;
}
export function visible(idx,origin,p){
  const hit=raycast(idx,origin,p.center);
  return !hit||hit.patch.id===p.id||dist(hit.point,p.center)<.025;
}
export function surfacePath(surfaces,start,end,max){
  const size=.8,buckets=new Map(),key=(x,y,z)=>x+','+y+','+z;
  const coord=p=>p.center.map(v=>Math.floor(v/size));
  for(const p of surfaces){const k=key(...coord(p));if(!buckets.has(k))buckets.set(k,[]);buckets.get(k).push(p);}
  const near=p=>{
    const [x,y,z]=coord(p),out=[];
    for(let i=-1;i<=1;i++)for(let j=-1;j<=1;j++)for(let k=-1;k<=1;k++)for(const q of buckets.get(key(x+i,y+j,z+k))||[]){
      if(p.id===q.id||dot(p.normal,q.normal)<-.1)continue;
      if(p.building!==q.building&&(p.building!==null&&q.building!==null||Math.max(p.center[1],q.center[1])>.42))continue;
      const d=dist(p.center,q.center);if(d<=.78)out.push([q,d]);
    }return out;
  };
  const costs=new Map([[start.id,0]]),parent=new Map(),queue=[start],visited=new Set();
  while(queue.length){
    queue.sort((a,b)=>costs.get(b.id)-costs.get(a.id));const p=queue.pop();
    if(visited.has(p.id))continue;visited.add(p.id);
    if(p.id===end.id)break;
    for(const [q,d] of near(p)){const n=costs.get(p.id)+d;if(n<=max&&n<(costs.get(q.id)??Infinity)){costs.set(q.id,n);parent.set(q.id,p);queue.push(q);}}
  }
  if(!costs.has(end.id))return null;
  const path=[end];while(path[0].id!==start.id){const p=parent.get(path[0].id);if(!p)return null;path.unshift(p);}
  const affected=new Map();
  for(const p of path){affected.set(p.id,p);for(const [q,d] of near(p))if(d<=.55)affected.set(q.id,q);}
  return {path,affected:[...affected.values()],length:costs.get(end.id)};
}
