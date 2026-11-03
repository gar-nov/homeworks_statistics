'use strict';
const $=id=>document.getElementById(id);
const fmt=x=>Number(x).toFixed(3);
function oneHacker(n,keep=false){
 let mean=0,M2=0;const scores=[];
 for(let count=1;count<=n;count++){
  const x=Math.floor(Math.random()*11);
  const delta=x-mean;
  mean+=delta/count;
  M2+=delta*(x-mean);
  if(keep&&scores.length<20)scores.push(x);
 }
 return {mean,variance:M2/(n-1),scores};
}
function stats(m,n,withRows=false){
 let sumMean=0,sumVariance=0,sumMeanSq=0,sumVarianceSq=0;
 const means=[],rows=[];
 for(let i=0;i<m;i++){
  const r=oneHacker(n,withRows&&i<12);
  sumMean+=r.mean;sumVariance+=r.variance;sumMeanSq+=r.mean*r.mean;sumVarianceSq+=r.variance*r.variance;
  means.push(r.mean);if(withRows&&i<12)rows.push(r);
 }
 const avgMean=sumMean/m,avgVariance=sumVariance/m;
 return {avgMean,avgVariance,sdMean:Math.sqrt(Math.max(0,(sumMeanSq-m*avgMean*avgMean)/(m-1))),sdVariance:Math.sqrt(Math.max(0,(sumVarianceSq-m*avgVariance*avgVariance)/(m-1))),means,rows};
}
function params(){const m=Number($('hackers').value),n=Number($('systems').value);if(!Number.isInteger(m)||m<2||m>5000||!Number.isInteger(n)||n<2||n>2000)throw Error('Choose 2–5000 hackers and 2–2000 systems.');return {m,n};}
function cell(value){const td=document.createElement('td');td.textContent=value;return td;}
function histogram(means){const bins=Array(11).fill(0);for(const x of means)bins[Math.max(0,Math.min(10,Math.floor(x+0.5)))]++;const max=Math.max(1,...bins);const root=$('histogram');root.replaceChildren();bins.forEach((count,i)=>{const row=document.createElement('div');row.className='barrow';const label=document.createElement('span');label.textContent=String(i);const track=document.createElement('div');track.className='track';const fill=document.createElement('div');fill.className='fill';fill.style.width=(count/max*100)+'%';track.append(fill);const value=document.createElement('span');value.textContent=String(count);row.append(label,track,value);root.append(row);});}
function run(){try{const {m,n}=params();const r=stats(m,n,true);$('mean-result').textContent=fmt(r.avgMean);$('variance-result').textContent=fmt(r.avgVariance);$('sd-result').textContent=fmt(r.sdMean);$('status').textContent=`Simulated ${m} independent hackers × ${n} systems = ${(m*n).toLocaleString()} scores. Theoretical SD of sample means: ${fmt(Math.sqrt(10/n))}.`;$('trajectories').replaceChildren(...r.rows.map((v,i)=>{const tr=document.createElement('tr');[i+1,v.scores.join(', ')+(n>20?' …':''),fmt(v.mean),fmt(v.variance)].forEach(x=>tr.append(cell(x)));return tr;}));histogram(r.means);}catch(e){$('status').textContent=e.message;}}
function drawLine(rows){const root=$('comparison-chart');root.replaceChildren();const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 0 700 285');svg.setAttribute('class','line-chart');const create=(tag,attrs,text)=>{const el=document.createElementNS(ns,tag);Object.entries(attrs).forEach(([k,v])=>el.setAttribute(k,String(v)));if(text!==undefined)el.textContent=text;svg.append(el);return el;};const left=55,right=670,top=18,bottom=245,maxY=Math.max(1,...rows.flatMap(r=>[r.sdMean,r.sdVariance]))*1.08;for(let i=0;i<=4;i++){const y=bottom-i*(bottom-top)/4;create('line',{x1:left,x2:right,y1:y,y2:y,stroke:'#e1e6ea'});create('text',{x:46,y:y+4,'text-anchor':'end',fill:'#61707b','font-size':12},fmt(maxY*i/4));}const X=i=>left+(right-left)*i/(rows.length-1),Y=v=>bottom-(bottom-top)*v/maxY;[['sdMean','#45667e'],['sdVariance','#a36e43']].forEach(([key,color])=>{create('polyline',{points:rows.map((r,i)=>`${X(i)},${Y(r[key])}`).join(' '),fill:'none',stroke:color,'stroke-width':3});rows.forEach((r,i)=>create('circle',{cx:X(i),cy:Y(r[key]),r:4,fill:color}));});rows.forEach((r,i)=>create('text',{x:X(i),y:265,'text-anchor':'middle',fill:'#61707b','font-size':12},r.n));create('text',{x:350,y:282,'text-anchor':'middle',fill:'#61707b','font-size':11},'Systems per hacker (n)');root.append(svg);const legend=document.createElement('p');legend.className='note';legend.textContent='Blue: SD of sample means · Brown: SD of sample variances';root.append(legend);}
let comparisonRuns=0;
function compare(){try{const {m}=params();const rows=[2,5,10,20,50,100,200].map(n=>({n,...stats(m,n)}));$('comparison').replaceChildren(...rows.map(r=>{const tr=document.createElement('tr');[r.n,fmt(r.avgMean),fmt(r.avgVariance),fmt(r.sdMean),fmt(r.sdVariance),fmt(Math.sqrt(10/r.n))].forEach(x=>tr.append(cell(x)));return tr;}));drawLine(rows);comparisonRuns++;$('comparison-status').textContent=`Comparison #${comparisonRuns} complete: ${m} hackers simulated for each of 7 sample sizes (n = 2, 5, 10, 20, 50, 100, 200). Graph and table updated.`;$('comparison-section').scrollIntoView({behavior:'smooth',block:'start'});}catch(e){$('status').textContent=e.message;}}
$('run').addEventListener('click',run);$('compare').addEventListener('click',compare);run();
