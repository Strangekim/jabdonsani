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
  dome:{label:'돔',detail:'반지름 1 · 곡면',radius:1},
  tower:{label:'타워',detail:'반지름 0.5 · 높이 3',radius:.5},
  wall:{label:'장벽',detail:'길이 3 · 높이 2 · 두께 0.5',radius:Math.hypot(1.5,.25)},
  arch:{label:'아치',detail:'너비 3 · 높이 3 · 깊이 1',radius:Math.hypot(1.5,.5)}
};
export function local(b,p){const c=Math.cos(b.rotation),s=Math.sin(b.rotation),x=p[0]-b.x,z=p[2]-b.z;return [c*x+s*z,p[1],-s*x+c*z];}
export function footprint(b,p,solid=true){
  const [x,,z]=local(b,p);
  if(b.kind==='dome')return radial(x,z)<=1+EPS;
  if(b.kind==='tower')return radial(x,z)<=.5+EPS;
  if(b.kind==='wall')return Math.abs(x)<=1.5+EPS&&Math.abs(z)<=.25+EPS;
  return Math.abs(x)<=1.5+EPS&&Math.abs(z)<=.5+EPS&&(!solid||Math.abs(x)>=.95-EPS);
}
export function buildingSurfaces(b){
  const out=[],c=Math.cos(b.rotation),s=Math.sin(b.rotation);
  const rotate=([x,y,z])=>[c*x-s*z,y,s*x+c*z];
  const world=p=>add(rotate(p),[b.x,0,b.z]);
  const push=(vs,normal)=>{const p=patch(vs.map(world),rotate(normal),'b:'+b.id+':'+out.length,b.id);if(p)out.push(p);};
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
  return {grounds,solids,byId:new Map(state.surfaces.map(p=>[p.id,p]))};
}
export function raycast(idx,origin,end){
  const d=sub(end,origin);let best=1+EPS,found=null;
  if(d[1]<-EPS&&origin[1]>=0){
    const t=-origin[1]/d[1];
    if(t>EPS&&t<=1+EPS){
      const point=add(origin,mul(d,t));
      let p=null,delta=Infinity;
      for(const g of idx.grounds){const k=dist(g.center,point);if(k<delta){delta=k;p=g;}}
      if(p&&delta<=STEP*.78){best=t;found=p;}
    }
  }
  for(const p of idx.solids){
    for(let i=1;i<p.vertices.length-1;i++){
      const t=triangleHit(origin,d,p.vertices[0],p.vertices[i],p.vertices[i+1]);
      if(t!==null&&t<best){best=t;found=p;}
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
  return {path,affected:[...affected.values()]};
}
