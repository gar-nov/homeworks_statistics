(() => {
"use strict";
const $ = id => document.getElementById(id);
const P = BigInt("0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2F");
const N = BigInt("0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141");
const G = [
 BigInt("0x79BE667EF9DCBBAC55A06295CE870B07029BFCDB2DCE28D959F2815B16F81798"),
 BigInt("0x483ADA7726A3C4655DA4FBFC0E1108A8FD17B448A68554199C47D08FFB10D4B8")
];
const mod = x => ((x % P) + P) % P;
function powMod(a, e) { let z=1n; a=mod(a); while(e>0n){if(e&1n) z=mod(z*a);a=mod(a*a);e>>=1n;} return z; }
function inv(a) {if(mod(a)===0n) throw Error("Point division by zero");return powMod(a,P-2n);}
function neg(A) {return A===null?null:[A[0],mod(-A[1])];}
function add(A,B) {
 if(A===null) return B;
 if(B===null) return A;
 const [x,y]=A,[u,v]=B;
 if(x===u && mod(y+v)===0n) return null;
 let s;
 if(x===u && y===v) s=mod(3n*x*x*inv(2n*y));
 else s=mod((v-y)*inv(u-x));
 const xx=mod(s*s-x-u), yy=mod(s*(x-xx)-y);
 return [xx,yy];
}
function mul(k,A=G) {
 let R=null,B=A;
 k=BigInt(k);
 while(k>0n){if(k&1n)R=add(R,B);B=add(B,B);k>>=1n;}
 return R;
}
const equal=(A,B)=>A===null?B===null:B!==null&&A[0]===B[0]&&A[1]===B[1];
const short=A=>A===null?"O":`(${A[0].toString(16).slice(0,18)}…, ${A[1].toString(16).slice(0,18)}…)`;
const full=A=>A===null?"O":`(0x${A[0].toString(16).padStart(64,"0")}, 0x${A[1].toString(16).padStart(64,"0")})`;
const encoder=new TextEncoder(),decoder=new TextDecoder("utf-8",{fatal:true});
const bytePoints = Array.from({length:256},(_,i)=>mul(BigInt(i+1)));
const byteMap = new Map(bytePoints.map((pt,i)=>[pt[0].toString(16)+":"+pt[1].toString(16),i]));
function decodePoint(pt) {
 if(pt===null)throw Error("Unexpected infinity point");
 const byte=byteMap.get(pt[0].toString(16)+":"+pt[1].toString(16));
 if(byte===undefined)throw Error("Cannot decode point with this message mapping");
 return byte;
}
const randomScalar=()=>{const v=new Uint32Array(1);crypto.getRandomValues(v);return BigInt(v[0]%128+1);};
function encryptECC(bytes,Q) {
 return [...bytes].map(byte=>{
  const r=randomScalar();
  const C1=mul(r);
  const C2=add(bytePoints[byte],mul(r,Q));
  return [C1,C2];
 });
}
function decryptECC(cipher,k) {
 return Uint8Array.from(cipher.map(([C1,C2])=>decodePoint(add(C2,neg(mul(k,C1))))));
}
const caesar=(s,shift)=>{
 const n=((shift%26)+26)%26;
 return s.replace(/[A-Za-z]/g,ch=>{
  const start=ch>="a"&&ch<="z"?97:65;
  return String.fromCharCode(start+(ch.charCodeAt(0)-start+n)%26);
 });
};
let session=null;
function setText(id,value){$(id).textContent=String(value);}
$("encryptBtn").addEventListener("click",()=>{
 try{
  const k=Number($("privateKey").value),shift=Number($("shift").value),message=$("message").value;
  if(!Number.isInteger(k)||k<1||k>128)throw Error("ECC private key must be an integer between 1 and 128.");
  if(!Number.isInteger(shift)||shift<0||shift>25)throw Error("Caesar shift must be an integer between 0 and 25.");
  const bytes=encoder.encode(message);
  if(bytes.length===0||bytes.length>60)throw Error("Enter a message of 1–60 UTF-8 bytes.");
  if(!globalThis.crypto?.getRandomValues)throw Error("Secure browser randomness is unavailable. Open the site using HTTPS.");
  setText("operationStatus","Calculating the elliptic-curve ciphertext…");
  // Allow the status to render before a moderately expensive calculation.
  setTimeout(()=>{
   try {
    const Q=mul(BigInt(k)),cipher=encryptECC(bytes,Q);
    const recovered=decoder.decode(decryptECC(cipher,BigInt(k)));
    const ct=caesar(message,shift);
    session={k,shift,message,Q,cipher,ct};
    setText("publicPoint",short(Q));
    setText("byteCount",bytes.length);
    setText("cipherPair",`C₁ = ${short(cipher[0][0])}\nC₂ = ${short(cipher[0][1])}`);
    setText("eccRecovered",recovered);
    setText("caesarCipher",ct);
    setText("caesarRecovered",caesar(ct,-shift));
    setText("caesarKey",shift);
    $("attackText").value=ct;
    setText("operationStatus",`Encryption and decryption completed. ${bytes.length} message bytes processed; both schemes recovered the original message.`);
    setText("eccAttackResult","The ciphertext is ready. Select “Recover ECC private key” to test all 128 candidates.");
   } catch(err){setText("operationStatus","Error: "+err.message);}
  },20);
 }catch(err){setText("operationStatus","Error: "+err.message);}
});
const english=[8.167,1.492,2.782,4.253,12.702,2.228,2.015,6.094,6.966,0.153,0.772,4.025,2.406,6.749,7.507,1.929,0.095,5.987,6.327,9.056,2.758,0.978,2.360,0.150,1.974,0.074];
function frequencies(s) {
 const counts=Array(26).fill(0);let n=0;
 for(const c of s.toUpperCase()){const i=c.charCodeAt(0)-65;if(i>=0&&i<26){counts[i]++;n++;}}
 return {counts,n};
}
function chiSquare(s) {
 const {counts,n}=frequencies(s);
 if(!n)return Infinity;
 return counts.reduce((sum,obs,i)=>{const exp=n*english[i]/100;return sum+(obs-exp)**2/exp;},0);
}
function rankKeys(cipher) {
 return Array.from({length:26},(_,key)=>({key,plain:caesar(cipher,-key),score:chiSquare(caesar(cipher,-key))})).sort((a,b)=>a.score-b.score);
}
function drawLetters(plain) {
 const {counts,n}=frequencies(plain),max=Math.max(...counts,1);
 $("letterChart").innerHTML=counts.map((count,i)=>`<div class="barbox"><div>${n?(100*count/n).toFixed(0):0}%</div><div class="bar" style="height:${Math.max(2,Math.round(110*count/max))}px"></div><span>${String.fromCharCode(65+i)}</span></div>`).join("");
}
$("useCaesarCipher").addEventListener("click",()=>{
 const ciphertext=$("caesarCipher").textContent;
 if(!ciphertext || ciphertext==="—"){setText("caesarAttackResult","First encrypt a message in Section 02, then try again.");return;}
 $("attackText").value=ciphertext;
 setText("caesarAttackResult","Ciphertext copied from Section 02. Click Analyze ciphertext and recover key.");
});
$("recoverCaesar").addEventListener("click",()=>{
 const cipher=$("attackText").value,{n}=frequencies(cipher);
 if(n<1){setText("caesarAttackResult","Enter ciphertext containing at least one letter.");return;}
 const ranks=rankKeys(cipher),best=ranks[0];
 setText("caesarAttackResult",`Best shift: ${best.key} | χ² = ${best.score.toFixed(2)} | Letters analyzed: ${n}\nRecovered text: ${best.plain}`);
 $("candidateRows").innerHTML=ranks.slice(0,5).map((v,i)=>`<tr><td>${i+1}</td><td>${v.key}</td><td>${v.score.toFixed(2)}</td></tr>`).join("");
 drawLetters(best.plain);
});
const corpus=`The study of statistics is concerned with understanding variation in observations. A sample provides evidence about a larger population, but conclusions always depend on how the sample was selected. When researchers collect measurements, they often begin by examining patterns, distributions, and unusual values. They compare averages and proportions while also considering the uncertainty that remains in every estimate. In language, some letters are used more frequently than others, and this pattern can be measured by counting occurrences across many sentences. The letter distribution is not identical in every paragraph because topic, vocabulary, and writing style can change the observed proportions. Nevertheless, longer passages usually give a more stable picture of common language patterns than very short passages. This is why frequency analysis can be helpful in studying a simple substitution cipher. A Caesar cipher changes the labels of letters but does not change how many times each letter appears. A statistical attack can compare the shifted distribution against an expected distribution and select the closest match. The method is imperfect because real texts are not independent random samples of letters. Names, repeated words, and technical vocabulary may produce unusual frequencies. The accuracy of the method depends on the amount of text and on how closely the text resembles the reference language. A careful analysis reports both successes and failures rather than assuming every short message can be decoded reliably.`;
$("lengthExperiment").addEventListener("click",()=>{
 const shift=Number($("shift").value);
 if(!Number.isInteger(shift)||shift<0||shift>25){$("lengthRows").innerHTML='<tr><td colspan="5">Select a valid Caesar shift.</td></tr>';return;}
 const letters=corpus.toUpperCase().replace(/[^A-Z]/g,"");
 $("lengthRows").innerHTML=[10,20,40,80,160,320,640,1000].map(n=>{
  const actual=Math.min(n,letters.length),cipher=caesar(letters.slice(0,actual),shift),best=rankKeys(cipher)[0];
  return `<tr><td>${actual}</td><td>${shift}</td><td>${best.key}</td><td>${best.score.toFixed(2)}</td><td>${best.key===shift?"Recovered":"Incorrect"}</td></tr>`;
 }).join("");
});
$("attackECC").addEventListener("click",()=>{
 if(!session){setText("eccAttackResult","Encrypt a message first to create the public key and ciphertext.");return;}
 const {Q,cipher,k}=session;
 const start=performance.now();
 let found=null,tries=0,R=null;
 for(let guess=1;guess<=128;guess++){R=add(R,G);tries++;if(equal(R,Q)){found=guess;break;}}
 const ms=performance.now()-start;
 if(found===null){setText("eccAttackResult","No key found in the restricted range.");return;}
 try{
  const recovered=decoder.decode(decryptECC(cipher,BigInt(found)));
  setText("eccAttackResult",`Recovered private key: k = ${found} | Candidates tested: ${tries} | Search time: ${ms.toFixed(2)} ms | Message: ${recovered}`);
  $("eccAttackRows").innerHTML=[
   ["Permitted key range","1–128 (128 candidates)"],
   ["Actual private key",k],
   ["Recovered private key",found],
   ["Public-key comparisons",tries],
   ["Search duration",ms.toFixed(2)+" ms (browser dependent)"],
   ["Decrypted message",recovered]
  ].map(([a,b])=>`<tr><td>${a}</td><td>${String(b).replaceAll("&","&amp;").replaceAll("<","&lt;")}</td></tr>`).join("");
 }catch(err){setText("eccAttackResult","Key recovered, but decryption failed: "+err.message);}
});
})();