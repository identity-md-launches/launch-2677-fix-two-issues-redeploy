import{ethers as e}from"https://esm.sh/ethers@6.13.5";var t=`0x74665dAecA35A2303e767E76a2FF1FB6F93e119f`,n=[`function totalMinted() view returns (uint256)`],r=[`function state() view returns (uint64,uint64,uint96,uint64,uint96,uint32,uint256,bool)`];async function i(){try{let i=new e.JsonRpcProvider(`https://ethereum-sepolia-rpc.publicnode.com`),a=new e.Contract(t,r,i),o=new e.Contract(`0x531497ddc70d634342020b1111C8b1A92873e669`,n,i),[s,c]=await Promise.all([a.state(),o.totalMinted()]);document.getElementById(`statHeight`).textContent=Number(s[3]).toLocaleString(),document.getElementById(`statMinted`).textContent=Number(c).toLocaleString()}catch{}}i(),c();function a(e){return e<=10?`Legendary`:e<=100?`Epic`:e<=1e3?`Rare`:e%1e3==0?`Milestone`:e%100==0?`Notable`:`Common`}function o(e){return e===`Legendary`?`#f5a623`:e===`Epic`?`#a855f7`:e===`Rare`?`#4a90d9`:e===`Milestone`||e===`Notable`?`#16c79a`:`#888`}function s(e,t,n,r){return`<text x="80" y="${t}" fill="#888" font-size="13" font-family="monospace">${e}</text><text x="320" y="${t}" text-anchor="end" fill="${r}" font-size="15" font-family="monospace" font-weight="bold">${n}</text>`}function c(){let e=[{b:1,r:1,w:11},{b:100,r:3,w:1086},{b:1e3,r:141,w:10941},{b:6969,r:894,w:79134}],t=document.getElementById(`sampleCards`);t.innerHTML=e.map(e=>{let t=a(e.b),n=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" shape-rendering="crispEdges">
<rect width="400" height="300" fill="#0a0a14"/>
<text x="200" y="38" text-anchor="middle" fill="#f5a623" font-size="16" font-family="monospace" font-weight="bold">🐹 SQUEKKCHAIN</text>
<line x1="40" y1="48" x2="360" y2="48" stroke="#f5a623" stroke-width="1" opacity="0.3"/>
<text x="200" y="105" text-anchor="middle" fill="#ffffff" font-size="64" font-family="monospace" font-weight="bold">#${e.b}</text>
<text x="200" y="135" text-anchor="middle" fill="#888" font-size="13" font-family="monospace">Block ${e.b}</text>
<rect x="145" y="150" width="110" height="26" rx="13" fill="#16c79a" opacity="0.15"/>
<text x="200" y="168" text-anchor="middle" fill="#16c79a" font-size="13" font-family="monospace" font-weight="bold">✓ SETTLED</text>
<rect x="60" y="185" width="280" height="95" rx="10" fill="#111122" stroke="#222244" stroke-width="1"/>
${s(`Round`,210,String(e.r),`#c0c0f0`)}
${s(`Work`,238,String(e.w),`#c0c0f0`)}
${s(`Rarity`,266,t,`#e94560`)}
</svg>`;return`<div class="term-box p-2 text-center hover:opacity-80" style="cursor:pointer" onclick="location.href='/mint'">
        <img src="data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(n)))}" style="width:100%;aspect-ratio:4/3;object-fit:contain;border-radius:4px" />
        <div class="text-xs mt-1"><span class="text-text">#${e.b}</span> <span style="color:${o(t)}">· ${t}</span></div>
      </div>`}).join(``)}