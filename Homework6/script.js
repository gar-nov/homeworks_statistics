'use strict';
const $=id=>document.getElementById(id),PI=Math.PI,fmt=x=>Number.isFinite(x)?x.toFixed(8):'—';
const functions={
 sin:{a:0,b:PI,exact:2,fn:x=>Math.sin(x),max:1,note:'Continuous on a compact interval: both methods approach 2.'},
 square:{a:0,b:1,exact:1/3,fn:x=>x*x,max:1,note:'A smooth function: midpoint Riemann sums converge rapidly.'},
 step:{a:0,b:1,exact:2,fn:x=>x<.5?1:3,max:3,note:'A jump at x = 0.5 does not prevent Riemann integrability.'},
 abs:{a:0,b:1,exact:.25,fn:x=>Math.abs(x-.5),max:.5,note:'The corner at 0.5 is harmless for either integral.'},
 root:{a:0,b:1,exact:2,fn:x=>1/Math.sqrt(x),max:20,note:'Unbounded near zero: midpoint sums approximate an improper integral. Range bins are truncated at a finite ceiling and therefore have additional truncation error.'},
 indicator:{a:0,b:1,exact:.5,fn:x=>x<.5?1:0,max:1,note:'One jump discontinuity: both integral definitions give 0.5.'},
 sinc:{a:0,b:PI,exact:1.851937051982466,fn:x=>x===0?1:Math.sin(x)/x,max:1,note:'The apparent singularity at zero is removable: define sinc(0) = 1.'},
 dirichlet:{a:0,b:1,exact:0,fn:x=>1,max:1,note:'Every computer-generated midpoint is rational. The displayed sample-based values are 1, but the true Lebesgue integral is 0 and the Riemann integral does not exist. This is a deliberate failure of point sampling.'},
 thomae:{a:0,b:1,exact:0,fn:x=>{let best=0;for(let q=1;q<=500;q++){let p=Math.round(x*q);if(Math.abs(x-p/q)<1e-11){best=1/q;break}}return best},max:1,note:'Thomae is zero at irrationals and 1/q at reduced rational p/q. This finite-denominator detection is only a floating-point illustration, not an exact test. Its true Riemann and Lebesgue integrals are both 0.'}
};
function sample(f,N){const d=(f.b-f.a)/N;let s=0;for(let i=0;i<N;i++)s+=f.fn(f.a+(i+.5)*d);return s*d}
function rangeEstimate(f,K,M){let max=f.max,counts=new Float64Array(K),delta=(f.b-f.a)/M,overflow=0;for(let i=0;i<M;i++){let v=f.fn(f.a+(i+.5)*delta);if(v>max)overflow++;let j=Math.max(0,Math.min(K-1,Math.floor(v/max*K)));counts[j]++}let sum=0;for(let j=0;j<K;j++)sum+=(j+.5)*max/K*counts[j]*delta;return {value:sum,counts,overflow,max,delta}}
function plot(id,lines,yMin,yMax,xMin,xMax){const c=$(id),w=Math.max(260,c.getBoundingClientRect().width||450),h=250,d=window.devicePixelRatio||1;c.width=Math.round(w*d);c.height=Math.round(h*d);const g=c.getContext('2d');g.scale(d,d);const L=44,R=12,T=14,B=28,W=w-L-R,H=h-T-B;g.clearRect(0,0,w,h);g.strokeStyle='#ddd';g.lineWidth=1;g.font='11px Arial';g.fillStyle='#666';for(let j=0;j<=4;j++){let y=T+j*H/4;g.beginPath();g.moveTo(L,y);g.lineTo(L+W,y);g.stroke();g.fillText((yMax-(yMax-yMin)*j/4).toPrecision(3),3,y+3)}for(let j=0;j<=4;j++){let x=L+j*W/4;g.fillText((xMin+(xMax-xMin)*j/4).toPrecision(3),x-10,h-8)}let X=x=>L+(x-xMin)/(xMax-xMin||1)*W,Y=y=>T+H-(y-yMin)/(yMax-yMin||1)*H;for(let line of lines){g.strokeStyle=line.color;g.lineWidth=line.width||2;g.beginPath();line.pts.forEach(([x,y],i)=>{if(!Number.isFinite(y))return;i?g.lineTo(X(x),Y(Math.max(yMin,Math.min(yMax,y)))):g.moveTo(X(x),Y(Math.max(yMin,Math.min(yMax,y))))});g.stroke()}return {g,X,Y,L,T,W,H}}
function drawFunction(f){let pts=[];for(let i=0;i<=300;i++){let x=f.a+(f.b-f.a)*(i+.5)/302;pts.push([x,Math.min(f.max,f.fn(x))])}plot('functionChart',[{pts,color:'#2563eb'}],0,f.max,f.a,f.b)}
function drawBins(r,f){let pts=r.counts.map((v,i)=>[(i+.5)*r.max/r.counts.length,v*r.delta]);let top=Math.max(.01,...pts.map(p=>p[1]))*1.1;const p=plot('rangeChart',[],0,top,0,r.max);p.g.fillStyle='#0d9488';for(let i=0;i<pts.length;i++){let x0=p.X(i*r.max/r.counts.length),x1=p.X((i+1)*r.max/r.counts.length),y=p.Y(pts[i][1]);p.g.fillRect(x0+1,y,Math.max(1,x1-x0-2),p.T+p.H-y)}}
function showPathological(f){
 const isD=f===functions.dirichlet;
 $('exact').textContent='0 (exact)';
 $('riemann').textContent=isD?'Does not exist':'0 (exact)';
 $('lebesgue').textContent='0 (exact)';
 $('integrationNote').textContent=isD
  ?'Dirichlet is not Riemann-integrable: lower sums are 0 and upper sums are 1. Its Lebesgue integral is 0 because the rationals have measure zero. Finite floating-point samples cannot establish these facts.'
  :'Thomae is Riemann- and Lebesgue-integrable, with integral 0. Floating-point tests cannot identify rationality exactly; the result shown is the mathematical value, not a sampled estimate.';
 for(const id of ['functionChart','rangeChart']){const c=$(id),g=c.getContext('2d');g.clearRect(0,0,c.width,c.height);g.fillStyle='#64748b';g.font='14px Arial';g.fillText('Exact measure-theoretic result (no sample plot)',15,35);}
}
function runIntegration(){const f=functions[$('func').value];if(f===functions.dirichlet||f===functions.thomae){showPathological(f);return;}
 const N=+$('parts').value,K=+$('bins').value,M=+$('probes').value,r=sample(f,N),l=rangeEstimate(f,K,M);
 $('exact').textContent=fmt(f.exact);$('riemann').textContent=fmt(r);$('lebesgue').textContent=fmt(l.value);
 $('integrationNote').textContent=f.note+(f===functions.root?` ${l.overflow} of ${M} probes exceeded the value ceiling ${f.max}; values were placed in the top bin.`:'')+` Numerical errors relative to the benchmark: Riemann ${fmt(Math.abs(r-f.exact))}; range bins ${fmt(Math.abs(l.value-f.exact))}.`;
 drawFunction(f);drawBins(l,f)
}
function compareIntegration(){const f=functions[$('func').value];if(f===functions.dirichlet||f===functions.thomae){$('convergenceRows').innerHTML='<tr><td colspan="10">Numerical convergence is not inferred from floating-point rationality tests. See the mathematical explanation above.</td></tr>';const c=$('errorChart');c.getContext('2d').clearRect(0,0,c.width,c.height);$('convergence').scrollIntoView({behavior:'smooth',block:'start'});return;}
 const sizes=[20,50,100,250,500,1000],rows=[],rErr=[],lErr=[];
 for(let i=0;i<sizes.length;i++){
  let N=sizes[i],K=[10,20,40,60,100,150][i],M=[200,500,1000,3000,8000,20000][i];
  let t=performance.now(),r=sample(f,N),rt=performance.now()-t;
  t=performance.now();let l=rangeEstimate(f,K,M).value,lt=performance.now()-t;
  let er=Math.abs(r-f.exact),el=Math.abs(l-f.exact);
  rows.push(`<tr><td>${N}</td><td>${K}</td><td>${M}</td><td>${fmt(r)}</td><td>${fmt(er)}</td><td>${fmt(l)}</td><td>${fmt(el)}</td><td>${N} / ${M}</td><td>${rt.toFixed(3)}</td><td>${lt.toFixed(3)}</td></tr>`);
  rErr.push([i+1,Math.log10(Math.max(er,1e-10))]);lErr.push([i+1,Math.log10(Math.max(el,1e-10))]);
 }
 $('convergenceRows').innerHTML=rows.join('');
 plot('errorChart',[{pts:rErr,color:'#2563eb',width:2.6},{pts:lErr,color:'#e87928',width:2.6}],-10,1,1,6);
 $('convergence').scrollIntoView({behavior:'smooth',block:'start'});
}
const normalPDF=x=>Math.exp(-x*x/2)/Math.sqrt(2*PI);
function simpson(z,n){let a=Math.abs(z),h=a/n,sum=normalPDF(0)+normalPDF(a);for(let i=1;i<n;i++)sum+=(i%2?4:2)*normalPDF(i*h);let area=h*sum/3;return z>=0?.5+area:.5-area}
function series(z,terms){let x=Math.abs(z),term=x,sum=x;for(let k=1;k<terms;k++){term*=(-x*x)/(2*k);sum+=term/(2*k+1)}let v=.5+sum/Math.sqrt(2*PI);return z<0?1-v:v}
// Reference values computed independently from the high-precision Gaussian CDF (not from the methods above).
const refs={'-4':0.00003167124183311998,'-3':0.0013498980316300957,'-2':0.02275013194817921,'-1':0.15865525393145707,'-0.5':0.3085375387259869,'0':0.5,'0.5':0.6914624612740131,'1':0.8413447460685429,'2':0.9772498680518208,'3':0.9986501019683699,'4':0.9999683287581669};
// For arbitrary z, a high-resolution Simpson computation is an independent numerical benchmark, not a tabulated reference.
function ref(z){let key=String(z);return Object.hasOwn(refs,key)?{value:refs[key],tabulated:true}:{value:simpson(z,20000),tabulated:false}}
function drawNormal(z){const p=plot('normalChart',[{pts:Array.from({length:241},(_,i)=>{let x=-4+i/30;return [x,normalPDF(x)]}),color:'#7c3aed',width:2.8}],0,.45,-4,4);p.g.fillStyle='rgba(124,58,237,.20)';p.g.beginPath();p.g.moveTo(p.X(-4),p.Y(0));for(let i=0;i<=240;i++){let x=-4+i/30;if(x>z)break;p.g.lineTo(p.X(x),p.Y(normalPDF(x)))}p.g.lineTo(p.X(Math.max(-4,Math.min(4,z))),p.Y(0));p.g.closePath();p.g.fill()}
function runCDF(){let z=Number($('z').value);if(!Number.isFinite(z)||z < -4||z>4){$('cdfNote').textContent='Please choose z between −4 and 4.';return}let n=+$('simpsonN').value,t=+$('terms').value,s=simpson(z,n),v=series(z,t),r=ref(z);$('cdfSimpson').textContent=fmt(s);$('cdfSeries').textContent=fmt(v);$('cdfReference').textContent=fmt(r.value);$('cdfNote').textContent=`Simpson absolute error: ${Math.abs(s-r.value).toExponential(3)}; series absolute error: ${Math.abs(v-r.value).toExponential(3)}. Simpson evaluates the density ${n+1} times; the series uses ${t} terms. ${r.tabulated?'Reference is a precomputed high-precision CDF value (NIST table agrees to its published rounding).':'This z is not in the stored reference list: the benchmark is a separate high-resolution Simpson calculation, not a web table entry.'}`;drawNormal(z)}
function compareCDF(){const n=+$('simpsonN').value,t=+$('terms').value,zs=[-3,-2,-1,-.5,0,.5,1,2,3];$('cdfRows').innerHTML=zs.map(z=>{let a=simpson(z,n),b=series(z,t),r=ref(z).value;return `<tr><td>${z}</td><td>${fmt(a)}</td><td>${fmt(b)}</td><td>${fmt(r)}</td><td>${Math.abs(a-r).toExponential(2)}</td><td>${Math.abs(b-r).toExponential(2)}</td></tr>`}).join('')}
$('run').onclick=runIntegration;$('compare').onclick=compareIntegration;$('reset').onclick=()=>{$('func').value='sin';$('parts').value='100';$('bins').value='50';$('probes').value='2000';$('convergenceRows').innerHTML='<tr><td colspan="8">Click “Compare convergence” to calculate the table.</td></tr>';runIntegration()};$('cdfRun').onclick=runCDF;$('cdfCompare').onclick=compareCDF;$('func').onchange=runIntegration;let resizeTimer;window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{runIntegration();runCDF()},180)});runIntegration();runCDF();
