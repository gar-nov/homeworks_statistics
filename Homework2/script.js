const $=id=>document.getElementById(id);
const enc=new TextEncoder();
async function digest(text){const data=await crypto.subtle.digest('SHA-256',enc.encode(text));return new Uint8Array(data)}
function hex(bytes){return Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('')}
function countOnes(bytes){let total=0;for(const byte of bytes){let n=byte;while(n){total+=n&1;n>>=1}}return total}

// Self-contained Keccak-256: Keccak-f[1600], legacy Ethereum domain suffix 0x01.
const MASK=(1n<<64n)-1n;
const ROT=[0,1,62,28,27,36,44,6,55,20,3,10,43,25,39,41,45,15,21,8,18,2,61,56,14];
const RC=['0000000000000001','0000000000008082','800000000000808a','8000000080008000','000000000000808b','0000000080000001','8000000080008081','8000000000008009','000000000000008a','0000000000000088','0000000080008009','000000008000000a','000000008000808b','800000000000008b','8000000000008089','8000000000008003','8000000000008002','8000000000000080','000000000000800a','800000008000000a','8000000080008081','8000000000008080','0000000080000001','8000000080008008'].map(x=>BigInt('0x'+x));
function rot64(x,n){return n===0?x:((x<<BigInt(n))|(x>>BigInt(64-n)))&MASK}
function permute(A){for(const rc of RC){const C=Array(5).fill(0n),D=Array(5).fill(0n),B=Array(25).fill(0n);for(let x=0;x<5;x++)for(let y=0;y<5;y++)C[x]^=A[x+5*y];for(let x=0;x<5;x++)D[x]=C[(x+4)%5]^rot64(C[(x+1)%5],1);for(let x=0;x<5;x++)for(let y=0;y<5;y++){let i=x+5*y;A[i]^=D[x];B[y+5*((2*x+3*y)%5)]=rot64(A[i],ROT[i])}for(let x=0;x<5;x++)for(let y=0;y<5;y++)A[x+5*y]=B[x+5*y]^((~B[(x+1)%5+5*y])&B[(x+2)%5+5*y]);A[0]^=rc}}
function keccak256(bytes){const rate=136, padded=Array.from(bytes);padded.push(1);while(padded.length%rate!==rate-1)padded.push(0);padded.push(128);const A=Array(25).fill(0n);for(let off=0;off<padded.length;off+=rate){for(let i=0;i<rate;i++)A[i>>3]^=BigInt(padded[off+i])<<BigInt(8*(i%8));permute(A)}const out=new Uint8Array(32);for(let i=0;i<32;i++)out[i]=Number((A[i>>3]>>BigInt(8*(i%8)))&255n);return out}
function unhex(h){return Uint8Array.from(h.match(/../g).map(v=>parseInt(v,16)))}
function concat(...arr){const r=new Uint8Array(arr.reduce((n,a)=>n+a.length,0));let j=0;for(const a of arr){r.set(a,j);j+=a.length}return r}
function be32(i){return Uint8Array.of((i>>>24)&255,(i>>>16)&255,(i>>>8)&255,i&255)}
function bigint(bytes){return BigInt('0x'+hex(bytes))}
function bytes32(n){return unhex(n.toString(16).padStart(64,'0'))}
const P=(1n<<256n)-(1n<<32n)-977n, N=BigInt('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141'),G={x:BigInt('0x79BE667EF9DCBBAC55A06295CE870B07029BFCDB2DCE28D959F2815B16F81798'),y:BigInt('0x483ADA7726A3C4655DA4FBFC0E1108A8FD17B448A68554199C47D08FFB10D4B8')};
function mod(a){let r=a%P;return r<0n?r+P:r}
function inv(a){let e=P-2n,b=mod(a),r=1n;while(e){if(e&1n)r=mod(r*b);b=mod(b*b);e>>=1n}return r}
function addPoint(a,b){if(!a)return b;if(!b)return a;if(a.x===b.x&&mod(a.y+b.y)===0n)return null;const slope=a.x===b.x?mod(3n*a.x*a.x*inv(2n*a.y)):mod((b.y-a.y)*inv(b.x-a.x));const x=mod(slope*slope-a.x-b.x);return{x,y:mod(slope*(a.x-x)-a.y)}}
function pubkey(k){let q=null,p=G;while(k){if(k&1n)q=addPoint(q,p);p=addPoint(p,p);k>>=1n}return concat(bytes32(q.x),bytes32(q.y))}
async function hmac(key,data){const k=await crypto.subtle.importKey('raw',key,{name:'HMAC',hash:'SHA-512'},false,['sign']);return new Uint8Array(await crypto.subtle.sign('HMAC',k,data))}
function checksum(addr){const lower=addr.toLowerCase();const h=hex(keccak256(enc.encode(lower)));return '0x'+Array.from(lower,(c,i)=>/[a-f]/.test(c)&&parseInt(h[i],16)>=8?c.toUpperCase():c).join('')}
$('deriveBtn').addEventListener('click',async()=>{const b=$('deriveBtn');b.disabled=true;$('deriveStatus').textContent='Calculating PBKDF2, BIP-32 and secp256k1…';try{const mnemonic='abandon '.repeat(11)+'about';const pass='';const k=await crypto.subtle.importKey('raw',enc.encode(mnemonic.normalize('NFKD')),'PBKDF2',false,['deriveBits']);const seed=new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2',salt:enc.encode(('mnemonic'+pass).normalize('NFKD')),iterations:2048,hash:'SHA-512'},k,512));$('demoSeed').textContent=hex(seed);let I=await hmac(enc.encode('Bitcoin seed'),seed),d=bigint(I.slice(0,32)),chain=I.slice(32);if(d===0n||d>=N)throw Error('Invalid master scalar');const masterPub=pubkey(d),fingerprint=hex(keccak256(masterPub).slice(0,4));$('demoMaster').textContent='Master key short identifier (Keccak, not BIP-32 fingerprint): '+fingerprint+'\nPath: m/44\'/60\'/0\'/0/0';for(const index of [0x8000002c,0x8000003c,0x80000000,0,0]){const hardened=index>=0x80000000;const input=concat(hardened?concat(Uint8Array.of(0),bytes32(d)):concat(Uint8Array.of(2+(Number(pubkey(d)[63]&1))),pubkey(d).slice(0,32)),be32(index));I=await hmac(chain,input);const left=bigint(I.slice(0,32));if(left>=N)throw Error('Invalid BIP-32 child');d=(d+left)%N;if(d===0n)throw Error('Invalid BIP-32 child scalar');chain=I.slice(32)}const publicBytes=pubkey(d),digest=keccak256(publicBytes),addr=hex(digest.slice(12));$('demoPrivate').textContent=hex(bytes32(d));$('demoPublic').textContent=hex(publicBytes);$('demoHash').textContent=hex(digest);$('demoAddress').textContent='0x'+addr+'\n'+checksum(addr);$('deriveStatus').textContent='Calculated locally. Check against the well-known BIP-39 test wallet address: 0x9858EfFD232B4033E47d90003D41EC34EcaEda94.';if(checksum(addr).toLowerCase()!=='0x9858effd232b4033e47d90003d41ec34ecaeda94')$('deriveStatus').textContent='Calculated; warning: result differs from expected reference address. Please do not treat this as verified.';}catch(e){$('deriveStatus').textContent='Calculation failed: '+e.message}finally{b.disabled=false}});
$('krun').addEventListener('click',()=>{const a=keccak256(enc.encode($('kmsg').value)),b=keccak256(enc.encode($('kmsg').value+'!'));let distance=0;for(let i=0;i<32;i++)distance+=countOnes(Uint8Array.of(a[i]^b[i]));$('kh1').textContent=hex(a);$('kh2').textContent=hex(b);$('kdist').textContent=distance;$('kpct').textContent=(100*distance/256).toFixed(1)+'%';$('kones').textContent=countOnes(a)});
$('kfreqBtn').addEventListener('click',()=>{const counts=Array(32).fill(0);for(let i=0;i<128;i++){const d=keccak256(enc.encode('keccak-demo-sample-'+i));for(let j=0;j<32;j++)counts[j]+=(d[j>>3]>>(7-(j%8)))&1}const freqs=counts.map(c=>c/128);$('kmean').textContent=(freqs.reduce((a,b)=>a+b,0)/32).toFixed(3);$('kmin').textContent=Math.min(...freqs).toFixed(3);$('kmax').textContent=Math.max(...freqs).toFixed(3);$('kbars').innerHTML='';for(const f of freqs){const bar=document.createElement('div');bar.className='bar';bar.style.height=(f*100)+'%';bar.title=(100*f).toFixed(1)+'%';$('kbars').appendChild(bar)}});

// Independent checks on public, synthetic data only.
(function(){
const ka=unhex('c5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470');
const kb=unhex('a7ffc6f8bf1ed76651c14756a061d662f580ff4de43b49fa82d80a4b80f8434a');
let different=0;for(let i=0;i<32;i++)different+=countOnes(Uint8Array.of(ka[i]^kb[i]));
$('emptydiff').textContent=different;
const original='52908400098527886E0F7030069857D2E4169EE7';
$('eipRun').addEventListener('click',()=>{
 const n=Number($('eipTrials').value);let caught=0;
 const symbols='0123456789abcdef';
 for(let t=0;t<n;t++){
  const i=Math.floor(Math.random()*40),old=original[i].toLowerCase();
  let replacement;do{replacement=symbols[Math.floor(Math.random()*16)]}while(replacement===old);
  const mutated=original.slice(0,i)+replacement+original.slice(i+1);
  const expected=checksum(mutated).slice(2);
  if(mutated!==expected)caught++;
 }
 $('eipCaught').textContent=caught+' / '+n;
 $('eipMissed').textContent=n-caught;
 $('eipRate').textContent=(100*caught/n).toFixed(1)+'%';
 $('eipComment').textContent='Observed on '+n+' synthetic single-character substitutions. This sample does not establish a general detection probability.';
});
})();
