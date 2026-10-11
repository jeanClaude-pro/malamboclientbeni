import{c as _e,r as d,u as Be,j as e,S as q,R as he,P as qe,U as be,k as We,l as Y,M as Ve,b as z}from"./index-DCcOePDP.js";import{D as fe}from"./dollar-sign-DgIPlKDw.js";import{C as Je}from"./calendar-BCG7_CKu.js";import{S as He}from"./search-DMGI_xic.js";import{C as Xe}from"./calculator-C9I9HFr4.js";import{P as Ge}from"./plus-JV__HzvO.js";import{T as ve}from"./trash-2-B1UBGTcH.js";import{C as we}from"./credit-card-B5_DQhwT.js";import{P as Ke}from"./phone-DkbEZpxM.js";import{C as Ze}from"./clock-DAsjTkHt.js";const Ye=[["path",{d:"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2",key:"1yyitq"}],["circle",{cx:"9",cy:"7",r:"4",key:"nufk8"}],["line",{x1:"17",x2:"22",y1:"8",y2:"13",key:"3nzzx3"}],["line",{x1:"22",x2:"17",y1:"8",y2:"13",key:"1swrse"}]],et=_e("user-x",Ye),T="http://localhost:5000/api";function W(){const n=new Date,l=n.getFullYear(),g=String(n.getMonth()+1).padStart(2,"0"),c=String(n.getDate()).padStart(2,"0");return`${l}-${g}-${c}`}function ee(n){return Math.max(1,Math.floor(Number(n?.piecesPerCarton||1)))}function tt(n,l){const g=Math.max(1,Math.floor(Number(l||1))),c=Math.max(0,Math.floor(Number(n||0)));return{cartons:Math.floor(c/g),pieces:c%g}}function $(n,l){if(l<=1){const E=Math.max(0,Math.floor(Number(n||0)));return`${E} piece${E>1?"s":""}`}const{cartons:g,pieces:c}=tt(n,l),k=g>1?"cartons":"carton";return c===0?`${g} ${k}`:`${g} ${k} et ${c} pièce${c>1?"s":""}`}function V(n){const l=$(n.paidQuantity,n.piecesPerCarton);return n.bonusQuantity?`${l} (+${$(n.bonusQuantity,n.piecesPerCarton)} bonus)`:l}function st(n,l){return n/Math.max(1,l)}function ye(n,l,g){return st(n,l)*g}function rt(n){return new Intl.DateTimeFormat("fr-FR",{timeZone:"Africa/Johannesburg",day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"}).format(new Date(n))}function at(n){return new Intl.DateTimeFormat("fr-FR",{timeZone:"Africa/Johannesburg",day:"2-digit",month:"2-digit",year:"numeric"}).format(new Date(n))}function nt(n){return n==="cash"?"cash":n==="card"?"card":n==="mpesa"||n==="bank"?"transfer":"other"}async function te(n){return(n.headers.get("content-type")||"").includes("application/json")?n.json():{__nonJson:!0,text:await n.text()}}class je{static async printReceipt(l,g="sale"){try{const c=localStorage.getItem("token"),k=await fetch(`${T}/print/receipt`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${c||""}`},body:JSON.stringify({receiptData:l,type:g})});if(!k.ok)throw new Error("Failed to print receipt");return(await k.json()).success}catch(c){throw console.error("Print receipt error:",c),c}}static async printStub(l,g="sale"){try{const c=localStorage.getItem("token"),k=await fetch(`${T}/print/stub`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${c||""}`},body:JSON.stringify({receiptData:l,type:g})});if(!k.ok)throw new Error("Failed to print stub");return(await k.json()).success}catch(c){throw console.error("Print stub error:",c),c}}}function ht(){const[n,l]=d.useState([]),[g,c]=d.useState(!0),[k,E]=d.useState(!1),[y,L]=d.useState([]),[a,Ne]=d.useState(null),[m,ke]=d.useState(null),[Ce,se]=d.useState(!0),[M,O]=d.useState(""),[re,U]=d.useState(!1),Pe=d.useRef(null),J=d.useRef(null),{user:R}=Be(),[r,v]=d.useState({productId:"",quantity:"",cartonQuantity:"",looseQuantity:"",bonusCartons:"",bonusPieces:"",unitPrice:"",priceInFC:"",customerName:"",customerPhone:"",customerEmail:"",paymentMethod:"cash",currencyMode:"usd",paymentMode:"normal",creditAmountPaid:"",creditDueDate:"",saleDate:W(),isWalkIn:!1}),[ae,ne]=d.useState(null),[oe,j]=d.useState(null),ie=R?.role==="admin"||R?.role==="superadmin",le=R?.role==="superadmin";d.useEffect(()=>{const t=s=>{J.current&&!J.current.contains(s.target)&&U(!1)};return document.addEventListener("mousedown",t),()=>{document.removeEventListener("mousedown",t)}},[]);const Ee=async()=>{const t=z();try{const s=localStorage.getItem("token"),o=await fetch(`${T}/products`,{headers:{"Content-Type":"application/json",Authorization:`Bearer ${s||""}`}}),i=await te(o);if(!o.ok)throw new Error(i?.error||`Products fetch failed: ${o.status}`);const f=Array.isArray(i?.products)?i.products:Array.isArray(i)&&!i.__nonJson?i:[];if(z()!==t)return;l(f)}catch(s){j(s?.message||"Failed to refresh products")}};d.useEffect(()=>{const t=()=>{Ee()};return window.addEventListener("appDataChanged",t),()=>window.removeEventListener("appDataChanged",t)},[]);const Se=async()=>{const t=z();try{se(!0);const s=localStorage.getItem("token"),o=await fetch(`${T}/exchange-rates/current`,{headers:{Authorization:`Bearer ${s||""}`}});if(o.ok){const i=await o.json();z()===t&&ke(i)}else console.warn("Failed to load exchange rate")}catch(s){console.error("Error loading exchange rate:",s)}finally{se(!1)}};d.useEffect(()=>{let t=!1;async function s(){c(!0),j(null);try{await Promise.all([o(),Se()])}catch(i){t||j(i?.message||"Failed to load initial data")}finally{t||c(!1)}}async function o(){const i=z();try{const f=localStorage.getItem("token"),b=await fetch(`${T}/products`,{headers:{"Content-Type":"application/json",Authorization:`Bearer ${f||""}`}}),x=await te(b);if(!b.ok){const K=x?.error||x?.text||`Products fetch failed: ${b.status}`;throw new Error(K)}const F=Array.isArray(x?.products)?x.products:Array.isArray(x)&&!x.__nonJson?x:[];!t&&z()===i&&l(F)}catch(f){t||j(f?.message||"Failed to load products")}}return s(),()=>{t=!0}},[]);const h=d.useMemo(()=>n.find(t=>t._id===r.productId),[n,r.productId]),H=d.useMemo(()=>M.trim()?n.filter(t=>t.name.toLowerCase().includes(M.toLowerCase())||t.sku&&t.sku.toLowerCase().includes(M.toLowerCase())):n,[n,M]);d.useEffect(()=>{if(r.currencyMode==="fc"&&r.priceInFC&&m){const s=(parseFloat(r.priceInFC)||0)/m.rate;v(o=>({...o,unitPrice:s.toFixed(2)}))}},[r.priceInFC,r.currencyMode,m]),d.useEffect(()=>{if(r.currencyMode==="usd"&&r.unitPrice&&m){const s=(parseFloat(r.unitPrice)||0)*m.rate;v(o=>({...o,priceInFC:Math.round(s).toString()}))}},[r.unitPrice,r.currencyMode,m]);const w=ee(h),$e=parseInt(r.cartonQuantity)||0,de=parseInt(r.quantity||r.looseQuantity)||0,Ie=parseInt(r.bonusCartons)||0,ce=parseInt(r.bonusPieces)||0,I=$e*w+de,_=Ie*w+ce,S=I+_,D=parseFloat(r.unitPrice)||0,me=ye(I,w,D),p=y.reduce((t,s)=>t+s.total,0),A=parseFloat(r.creditAmountPaid)||0,N=r.paymentMode==="credit",X=y.length>0&&(!N||r.customerName.trim()!==""&&r.customerPhone.trim()!=="")&&(!N||A<=p);function P(t){v(s=>({...s,[t.target.name]:t.target.value}))}const Ae=t=>{v(s=>({...s,productId:t._id,unitPrice:t.price?t.price.toString():"",priceInFC:""})),O(t.name),U(!1)},De=t=>{O(t.target.value),U(!0),t.target.value||v(s=>({...s,productId:""}))},G=(t,s)=>{const o=n.find(b=>b._id===t);if(!o)return!1;const i=y.filter(b=>b.productId===t).reduce((b,x)=>b+x.quantity,0);return o.stock-i>=s},Te=()=>{v(t=>({...t,currencyMode:t.currencyMode==="usd"?"fc":"usd",unitPrice:"",priceInFC:""}))},Me=t=>{const s=ee(t);return ie?`(Stock: ${$(t.stock,s)})`:t.stock===0?"(En rupture)":t.stock<=5?"(Stock faible)":"(En stock)"},Fe=(t,s)=>{const o=t&&s>0&&G(t._id,s),i=ee(t);if(ie){const f=y.filter(x=>x.productId===t._id).reduce((x,F)=>x+F.quantity,0),b=t.stock-f;return e.jsxs("p",{className:"text-sm text-slate-500 mb-4 bg-slate-50 p-3 rounded-lg border border-slate-200",children:["Stock disponible:"," ",e.jsx("strong",{className:"text-slate-950",children:$(t.stock,i)}),f>0&&e.jsxs("span",{className:"ml-2 text-blue-600",children:["(Déjà dans panier: ",$(f,i),")"]}),s>0&&e.jsxs("span",{className:`ml-4 ${o?"text-emerald-600":"text-rose-600"}`,children:["Stock restant après vente:"," ",b-s>=0?$(b-s,i):"❌ pas assez de stock!"]})]})}else return t.stock===0?e.jsx("p",{className:"text-sm text-rose-600 mb-4 bg-rose-50 p-3 rounded-lg border border-rose-200",children:e.jsx("strong",{children:"❌ En rupture de stock"})}):t.stock<=5?e.jsx("p",{className:"text-sm text-orange-600 mb-4 bg-orange-50 p-3 rounded-lg border border-orange-200",children:e.jsx("strong",{children:"⚠️ Stock faible"})}):s>0&&!o?e.jsx("p",{className:"text-sm text-rose-600 mb-4 bg-rose-50 p-3 rounded-lg border border-rose-200",children:e.jsx("strong",{children:"❌ Quantité demandée non disponible"})}):s>0?e.jsx("p",{className:"text-sm text-emerald-600 mb-4 bg-emerald-50 p-3 rounded-lg border border-emerald-200",children:e.jsx("strong",{children:"✅ Stock suffisant"})}):e.jsx("p",{className:"text-sm text-emerald-600 mb-4 bg-emerald-50 p-3 rounded-lg border border-emerald-200",children:e.jsx("strong",{children:"✅ En stock"})})};function ze(){if(!h){j("Veuillez sélectionner un produit");return}if(S<=0){j("La quantite ou le bonus doit etre superieur a zero");return}if(de>=w||ce>=w){j(`Les pièces doivent être inférieures à ${w} par carton`);return}if(I>0&&D<=0){j("Le prix par boite doit etre superieur a zero");return}if(!G(h._id,S)){j("Stock insuffisant pour ajouter cette quantité au panier");return}j(null);const t=y.findIndex(s=>s.productId===h._id&&s.unitPrice===D);if(t>=0){const s=[...y];s[t]={...s[t],quantity:s[t].quantity+S,paidQuantity:s[t].paidQuantity+I,bonusQuantity:s[t].bonusQuantity+_,total:ye(s[t].paidQuantity+I,w,D)},L(s)}else L([...y,{productId:h._id,name:h.name,quantity:S,paidQuantity:I,bonusQuantity:_,piecesPerCarton:w,boxPrice:D,unitPrice:D,total:me}]);v(s=>({...s,quantity:"",cartonQuantity:"",looseQuantity:"",bonusCartons:"",bonusPieces:"",unitPrice:h.price?h.price.toString():"",priceInFC:""})),O("")}function ue(t){const s=[...y];s.splice(t,1),L(s)}const Re=()=>{const t=window.open("","_blank","width=320,height=600");t&&(t.document.write(`
<html>
  <head>
    <title>Sale Receipt</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      body { 
        font-family: 'Courier New', Courier, monospace; 
        margin: 0; 
        padding: 0; 
        font-size: 13px;
        font-weight: bold;
        line-height: 1.1;
        width: 72mm;
        background-color: white;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
        display: flex;
        justify-content: center;
      }
      .receipt-container { 
        width: 70mm;
        margin: 0 auto;
        padding: 0.5mm;
        border: none;
        text-align: center;
      }
      .header { 
        text-align: center; 
        margin-bottom: 1mm; 
        padding-bottom: 1mm;
        border-bottom: 2px double #000;
      }
      .shop-name {
        font-size: 15px;
        font-weight: bold;
        margin-bottom: 0.5mm;
        text-transform: uppercase;
      }
      .shop-details {
        font-size: 11px;
        margin-bottom: 0.3mm;
        line-height: 1;
        font-weight: bold;
      }
      .receipt-info {
        margin: 1mm 0;
        padding: 1mm;
        background-color: #f8f8f8;
        border-left: 3px solid #000;
      }
      .receipt-title {
        font-size: 13px;
        font-weight: bold;
        margin: 1mm 0;
        text-transform: uppercase;
        background-color: #000;
        color: white;
        padding: 1mm;
        border-radius: 2px;
      }
      .items-section {
        margin: 1mm 0;
        padding: 1mm;
        background-color: #fafafa;
        border: 1px solid #eee;
      }
      .item-row { 
        display: flex;
        justify-content: space-between;
        margin-bottom: 0.5mm;
        padding: 0 1mm;
        border-bottom: 1px dotted #ddd;
      }
      .item-name {
        text-align: left;
        font-weight: bold;
        font-size: 12px;
        flex: 1;
      }
      .item-details {
        text-align: right;
        font-weight: bold;
        font-size: 12px;
        flex: 1;
      }
      .total-section { 
        font-weight: bold; 
        margin-top: 1mm;
        padding: 1mm;
        background-color: #f0f0f0;
        border: 1px solid #ddd;
        border-radius: 3px;
      }
      .total-row {
        display: flex;
        justify-content: space-between;
        margin-bottom: 0.3mm;
        font-size: 13px;
        padding: 0 1mm;
      }
      .payment-method {
        text-transform: uppercase;
        font-weight: bold;
        font-size: 13px;
        color: #000;
      }
      .footer { 
        text-align: center; 
        margin-top: 1mm; 
        font-size: 11px;
        font-weight: bold;
        padding: 1mm;
        background-color: #f8f8f8;
        border-top: 1px dashed #000;
      }
      .sales-person {
        margin-top: 1mm;
        text-align: center;
        font-weight: bold;
        font-size: 12px;
        padding: 1mm;
        background-color: #e8e8e8;
        border: 1px solid #ccc;
        border-radius: 2px;
      }
      .customer-info {
        margin: 1mm 0;
        padding: 1mm;
        font-weight: bold;
        text-align: center;
        background-color: #f5f5f5;
        border: 1px solid #ddd;
        border-radius: 3px;
      }
      .customer-field {
        margin-bottom: 0.3mm;
        font-size: 12px;
      }
      .separator {
        border-top: 1px dashed #000;
        margin: 1mm 0;
      }
      .cut-line {
        text-align: center;
        margin: 1mm 0;
        font-weight: bold;
        font-size: 11px;
        color: #000;
        letter-spacing: 1px;
      }
      .thank-you {
        font-weight: bold;
        margin: 0.5mm 0;
        font-size: 12px;
      }
      .warning {
        font-size: 10px;
        color: #000;
        margin: 0.3mm 0;
        font-weight: bold;
      }
      .section-divider {
        height: 2px;
        background: linear-gradient(to right, transparent, #000, transparent);
        margin: 1mm 0;
      }
      @media print {
        @page {
          margin: 0 !important;
          size: 72mm auto !important;
        }
        body { 
          margin: 0 !important; 
          padding: 0 !important; 
          width: 72mm !important;
          font-size: 13px !important;
          background: white !important;
          font-weight: bold !important;
          height: auto !important;
          overflow: hidden !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          display: flex !important;
          justify-content: center !important;
        }
        .receipt-container { 
          border: none !important; 
          box-shadow: none !important; 
          margin: 0 auto !important;
          padding: 0.5mm !important;
          width: 70mm !important;
          page-break-after: avoid !important;
          page-break-inside: avoid !important;
        }
        .cut-line {
          page-break-after: always !important;
          margin-bottom: 0 !important;
        }
        body::after,
        body::before {
          display: none !important;
          content: none !important;
        }
      }
    </style>
  </head>
  <body>
    <div class="receipt-container">
      <div class="header">
        <div class="shop-name"><strong>${a.shopName}</strong></div>
        <div class="shop-details"><strong>${a.shopAddress}</strong></div>
        <div class="shop-details">TEL: <strong>${a.shopNumber}</strong></div>
        <div class="shop-details"><strong>${a.shopRegistration}</strong></div>
      </div>
      
      <div class="section-divider"></div>
      
      <div class="receipt-info">
        <div class="shop-details">DATE: <strong>${a.date}</strong></div>
        <div class="shop-details">RECU #: <strong>${a.receiptNumber}</strong></div>
      </div>
      
      <div class="customer-info">
        <div class="customer-field">CLIENT: <strong>${a.customerName.toUpperCase()}</strong></div>
        <div class="customer-field">TELEPHONE: <strong>${a.customerPhone}</strong></div>
        ${a.customerEmail?`<div class="customer-field">EMAIL: <strong>${a.customerEmail}</strong></div>`:""}
      </div>
      
      <div class="receipt-title">ARTICLES ACHETES</div>
      
      <div class="items-section">
      ${a.items.map(s=>`
        <div class="item-row">
          <div class="item-name"><strong>${s.name}</strong></div>
          <div class="item-details">
            <strong>${V(s)} X $${s.unitPrice.toFixed(2)}</strong>
          </div>
        </div>
      `).join("")}
      </div>
      
      <div class="total-section">
        <div class="total-row">
          <div><strong>TOTAL:</strong></div>
          <div><strong>$${a.total.toFixed(2)}</strong></div>
        </div>
        ${a.isCredit?`
        <div class="total-row" style="color:#d97706">
          <div><strong>VERSEMENT A CONFIRMER:</strong></div>
          <div><strong>$${a.creditAmountPaid.toFixed(2)}</strong></div>
        </div>
        <div class="total-row" style="color:#ef4444">
          <div><strong>SOLDE DU:</strong></div>
          <div><strong>$${a.creditAmountDue.toFixed(2)}</strong></div>
        </div>
        ${a.creditDueDate?`<div class="total-row" style="font-size:11px"><div><strong>ECHEANCE:</strong></div><div><strong>${a.creditDueDate}</strong></div></div>`:""}
        <div class="total-row" style="background:#7c2d12;padding:2mm;border-radius:2px;color:white">
          <div><strong>VENTE A CREDIT</strong></div>
          <div><strong>⚠</strong></div>
        </div>
        `:`
        <div class="total-row">
          <div><strong>PAIEMENT:</strong></div>
          <div class="payment-method"><strong>${a.paymentMethod.toUpperCase()}</strong></div>
        </div>
        `}
      </div>

      <div class="sales-person">
        Agent: <strong>${a.salesPerson.toUpperCase()}</strong>
      </div>

      <div class="footer">
        ${a.isCredit?`<div class="thank-you" style="color:#d97706"><strong>VENTE A CREDIT</strong></div>
             <div class="warning"><strong>Solde du: $${a.creditAmountDue.toFixed(2)}</strong></div>
             ${a.creditDueDate?`<div class="warning"><strong>A regler avant: ${a.creditDueDate}</strong></div>`:""}
             <div class="warning"><strong>Entre Nous Renove</strong></div>`:`<div class="thank-you"><strong>MERCI POUR VOTRE ACHAT !</strong></div>
             <div class="warning"><strong>Article non echangeable</strong></div>
             <div class="warning"><strong>Non remboursable</strong></div>
             <div class="thank-you"><strong>A BIENTOT !</strong></div>`}
      </div>
      
      <!-- PAPER CUT INDICATOR -->
      <div class="cut-line">
        ✄ ────────────────────────── ✄
      </div>
    </div>
    <script>
      window.onload = function() {
        try {
          window.print();
        } catch(e) {
          console.error('Print error:', e);
        }
        setTimeout(() => {
          window.close();
        }, 1000);
      };
    <\/script>
  </body>
</html>
`),t.document.close())},Qe=()=>{const t=window.open("","_blank","width=320,height=600");t&&(t.document.write(`
<html>
  <head>
    <title>Sale Stub</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      body { 
        font-family: 'Courier New', Courier, monospace; 
        margin: 0; 
        padding: 0; 
        font-size: 13px;
        font-weight: bold;
        line-height: 1.1;
        width: 72mm;
        background-color: white;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
        display: flex;
        justify-content: center;
      }
      .stub-container { 
        width: 70mm;
        margin: 0 auto;
        padding: 0.5mm;
        border: none;
        text-align: center;
      }
      .header { 
        text-align: center; 
        margin-bottom: 1mm; 
        padding-bottom: 1mm;
        border-bottom: 2px double #000;
      }
      .shop-name {
        font-size: 14px;
        font-weight: bold;
        margin-bottom: 0.5mm;
        text-transform: uppercase;
      }
      .shop-details {
        font-size: 11px;
        margin-bottom: 0.3mm;
        line-height: 1;
        font-weight: bold;
      }
      .receipt-info {
        margin: 1mm 0;
        padding: 1mm;
        background-color: #f8f8f8;
        border-left: 3px solid #000;
      }
      .receipt-title {
        font-size: 13px;
        font-weight: bold;
        margin: 1mm 0;
        text-transform: uppercase;
        background-color: #000;
        color: white;
        padding: 1mm;
        border-radius: 2px;
      }
      .stub-number {
        font-size: 13px;
        font-weight: bold;
        margin: 1mm 0;
        text-transform: uppercase;
        background-color: #333;
        color: white;
        padding: 1mm 2mm;
        border-radius: 3px;
      }
      .items-section {
        margin: 1mm 0;
        padding: 1mm;
        background-color: #fafafa;
        border: 1px solid #eee;
      }
      .item-row { 
        display: flex;
        justify-content: space-between;
        margin-bottom: 0.5mm;
        padding: 0 1mm;
        border-bottom: 1px dotted #ddd;
      }
      .item-name {
        text-align: left;
        font-weight: bold;
        font-size: 12px;
        flex: 1;
      }
      .item-details {
        text-align: right;
        font-weight: bold;
        font-size: 12px;
        flex: 1;
      }
      .total-section { 
        font-weight: bold; 
        margin-top: 1mm;
        padding: 1mm;
        background-color: #f0f0f0;
        border: 1px solid #ddd;
        border-radius: 3px;
      }
      .total-row {
        display: flex;
        justify-content: space-between;
        margin-bottom: 0.3mm;
        font-size: 13px;
        padding: 0 1mm;
      }
      .payment-method {
        text-transform: uppercase;
        font-weight: bold;
        font-size: 13px;
      }
      .stub-footer { 
        text-align: center; 
        margin-top: 1mm; 
        font-size: 11px;
        font-weight: bold;
        padding: 1mm;
        background-color: #e8e8e8;
        border: 1px solid #ccc;
        border-radius: 3px;
      }
      .sales-person {
        margin-top: 1mm;
        text-align: center;
        font-weight: bold;
        font-size: 12px;
        padding: 1mm;
        background-color: #f5f5f5;
        border: 1px solid #ddd;
        border-radius: 2px;
      }
      .customer-info {
        margin: 1mm 0;
        padding: 1mm;
        font-weight: bold;
        text-align: center;
        background-color: #f5f5f5;
        border: 1px solid #ddd;
        border-radius: 3px;
      }
      .customer-field {
        margin-bottom: 0.3mm;
        font-size: 12px;
      }
      .separator {
        border-top: 1px dashed #000;
        margin: 1mm 0;
      }
      .cut-line {
        text-align: center;
        margin: 1mm 0;
        font-weight: bold;
        font-size: 11px;
        color: #000;
        letter-spacing: 1px;
      }
      .thank-you {
        font-weight: bold;
        margin: 0.5mm 0;
        font-size: 12px;
      }
      .warning {
        font-size: 10px;
        color: #000;
        margin: 0.3mm 0;
        font-weight: bold;
      }
      .section-divider {
        height: 2px;
        background: linear-gradient(to right, transparent, #000, transparent);
        margin: 1mm 0;
      }
      @media print {
        @page {
          margin: 0 !important;
          size: 72mm auto !important;
        }
        body { 
          margin: 0 !important; 
          padding: 0 !important; 
          width: 72mm !important;
          font-size: 13px !important;
          background: white !important;
          font-weight: bold !important;
          height: auto !important;
          overflow: hidden !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          display: flex !important;
          justify-content: center !important;
        }
        .stub-container { 
          border: none !important; 
          box-shadow: none !important; 
          margin: 0 auto !important;
          padding: 0.5mm !important;
          width: 70mm !important;
          page-break-after: avoid !important;
          page-break-inside: avoid !important;
        }
        .cut-line {
          page-break-after: always !important;
          margin-bottom: 0 !important;
        }
        body::after,
        body::before {
          display: none !important;
          content: none !important;
        }
      }
    </style>
  </head>
  <body>
    <div class="stub-container">
      <div class="header">
        <div class="shop-name"><strong>${a.shopName}</strong></div>
        <div class="shop-details"><strong>${a.shopAddress}</strong></div>
        <div class="shop-details">TEL: <strong>${a.shopNumber}</strong></div>
      </div>
      
      <div class="section-divider"></div>
      
      <div class="receipt-info">
        <div class="shop-details">DATE: <strong>${a.date}</strong></div>
        <div class="shop-details">RECU #: <strong>${a.receiptNumber}</strong></div>
      </div>
      
      <div class="stub-number">
        SOUCHE N°<strong>${a.stubNumber}</strong>
      </div>
      
      <div class="customer-info">
        <div class="customer-field">CLIENT: <strong>${a.customerName.toUpperCase()}</strong></div>
        <div class="customer-field">TELEPHONE: <strong>${a.customerPhone}</strong></div>
      </div>
      
      <div class="receipt-title">ARTICLES VENDUS</div>
      
      <div class="items-section">
      ${a.items.map(s=>`
        <div class="item-row">
          <div class="item-name"><strong>${s.name}</strong></div>
          <div class="item-details">
            <strong>${V(s)} X $${s.unitPrice.toFixed(2)}</strong>
          </div>
        </div>
      `).join("")}
      </div>
      
      <div class="total-section">
        <div class="total-row">
          <div><strong>TOTAL VENTE:</strong></div>
          <div><strong>$${a.total.toFixed(2)}</strong></div>
        </div>
        ${a.isCredit?`
        <div class="total-row" style="color:#d97706">
          <div><strong>VERSEMENT A CONFIRMER:</strong></div>
          <div><strong>$${a.creditAmountPaid.toFixed(2)}</strong></div>
        </div>
        <div class="total-row" style="color:#ef4444">
          <div><strong>SOLDE DU:</strong></div>
          <div><strong>$${a.creditAmountDue.toFixed(2)}</strong></div>
        </div>
        <div class="total-row" style="background:#7c2d12;padding:2mm;border-radius:2px;color:white">
          <div><strong>CREDIT</strong></div>
          <div><strong>⚠</strong></div>
        </div>
        `:`
        <div class="total-row">
          <div><strong>PAIEMENT:</strong></div>
          <div class="payment-method"><strong>${a.paymentMethod.toUpperCase()}</strong></div>
        </div>
        `}
      </div>
      
      <div class="sales-person">
        Agent: <strong>${a.salesPerson.toUpperCase()}</strong>
      </div>
      
      <div class="stub-footer">
        <div class="thank-you"><strong>SOUCHE DE CAISSE</strong></div>
        <div class="warning"><strong>${a.shopName}</strong></div>
        <div class="warning"><strong>Conserver cette souche</strong></div>
        <div class="warning">Recu #: <strong>${a.receiptNumber}</strong></div>
        <div class="warning">Date: <strong>${a.date}</strong></div>
      </div>
      
      <!-- PAPER CUT INDICATOR -->
      <div class="cut-line">
        ✄ ────────────────────────── ✄
      </div>
    </div>
    <script>
      window.onload = function() {
        try {
          window.print();
        } catch(e) {
          console.error('Print error:', e);
        }
        setTimeout(() => {
          window.close();
        }, 1000);
      };
    <\/script>
  </body>
</html>
`),t.document.close())},pe=()=>{Re(),setTimeout(()=>{Qe()},2e3)},Le=async t=>{try{return console.log("Attempting ESC/POS printing..."),await je.printReceipt(t,"sale"),await je.printStub(t,"sale"),console.log("ESC/POS printing successful"),!0}catch(s){return console.error("ESC/POS printing failed, falling back to browser printing:",s),pe(),!1}};d.useEffect(()=>{if(a){const t=setTimeout(async()=>{try{await Le(a)}catch(s){console.error("Printing failed:",s),pe()}},500);return()=>clearTimeout(t)}},[a]);async function Oe(t){if(t.preventDefault(),!!X){E(!0),ne(null),j(null);try{const s=localStorage.getItem("token");if(!s){j("Session expirée. Veuillez vous reconnecter."),E(!1);return}const o=r.paymentMode==="credit",i=o&&parseFloat(r.creditAmountPaid)||0,f={customer:{name:r.isWalkIn?Y:r.customerName,phone:r.isWalkIn?"":r.customerPhone,email:r.isWalkIn?"":r.customerEmail||""},items:y.map(u=>({productId:u.productId,name:u.name,quantity:u.quantity,paidQuantity:u.paidQuantity,bonusQuantity:u.bonusQuantity,piecesPerCarton:u.piecesPerCarton,cartonQuantity:Math.floor(u.paidQuantity/u.piecesPerCarton),looseQuantity:u.paidQuantity%u.piecesPerCarton,bonusCartons:Math.floor(u.bonusQuantity/u.piecesPerCarton),bonusPieces:u.bonusQuantity%u.piecesPerCarton,price:u.unitPrice})),subtotal:p,total:p,paymentMethod:nt(r.paymentMethod),salesPerson:R?.username||"unknown",paymentType:o?"credit":"cash",...o&&{creditAmountPaid:i,creditDueDate:r.creditDueDate||void 0},...le&&r.saleDate&&r.saleDate!==W()&&{saleDate:r.saleDate}},b=await fetch(`${T}/sales`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${s}`},body:JSON.stringify(f)}),x=await te(b);if(!b.ok){if(b.status===401){j("Session expirée. Veuillez vous reconnecter."),E(!1);return}const u=x?.error||x?.text||`Sale failed (${b.status})`;throw new Error(u)}const F=x.saleId||x._id,K={shopName:"Entre Nous Renove",shopAddress:`Agence de ${localStorage.getItem("activeBranchId")==="beni"?"Beni":"Butembo"}`,shopNumber:"",shopRegistration:"",customerName:r.isWalkIn?Y:r.customerName,customerPhone:r.isWalkIn?"":r.customerPhone,customerEmail:r.isWalkIn?"":r.customerEmail,items:y,total:p,paymentMethod:r.paymentMethod,salesPerson:R?.username||"Agent",date:rt(new Date),receiptNumber:F,stubNumber:F,isCredit:o,creditAmountPaid:o?i:p,creditAmountDue:o?Math.max(0,p-i):0,creditDueDate:r.creditDueDate||null};Ne(K),l(u=>u.map(B=>{const ge=y.filter(Z=>Z.productId===B._id).reduce((Z,Ue)=>Z+Ue.quantity,0);return ge>0?{...B,stock:Math.max(0,B.stock-ge)}:B})),v({productId:"",quantity:"",cartonQuantity:"",looseQuantity:"",bonusCartons:"",bonusPieces:"",unitPrice:"",priceInFC:"",customerName:"",customerPhone:"",customerEmail:"",paymentMethod:r.paymentMethod,currencyMode:"usd",paymentMode:"normal",creditAmountPaid:"",creditDueDate:"",saleDate:r.saleDate,isWalkIn:!1}),L([]),O(""),ne("✅ Vente effectuée avec succès ! Impression du reçu et de la souche...")}catch(s){j(s?.message||"La vente n'a pas pu être effectuée")}finally{E(!1)}}}const C=t=>new Intl.NumberFormat("fr-FR",{style:"currency",currency:"USD"}).format(t),Q=t=>new Intl.NumberFormat("fr-FR",{minimumFractionDigits:0,maximumFractionDigits:0}).format(t)+" FC",xe=h&&S>0&&(I===0||D>0)&&G(h._id,S);return e.jsx("div",{className:"app-page bg-gradient-to-br from-slate-50 via-blue-50/50 to-indigo-50",children:e.jsxs("div",{className:"app-page-inner app-page-stack",children:[e.jsxs("header",{className:"space-y-3",children:[e.jsxs("div",{className:"flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4",children:[e.jsxs("div",{children:[e.jsxs("h2",{className:"text-2xl font-bold text-slate-950 flex items-center gap-2",children:[e.jsx(q,{className:"w-7 h-7 text-blue-600"}),"Nouvelle Vente"]}),e.jsx("p",{className:"text-slate-600 mt-1",children:"Créez une nouvelle vente avec gestion multi-devises"})]}),e.jsx("div",{className:"min-w-0 rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:min-w-[280px]",children:e.jsxs("div",{className:"flex items-center justify-between",children:[e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx(fe,{className:"w-5 h-5 text-blue-600"}),e.jsx("span",{className:"font-semibold text-slate-600",children:"Taux du jour:"})]}),Ce?e.jsx(he,{className:"w-4 h-4 animate-spin text-blue-600"}):m?e.jsxs("div",{className:"text-right",children:[e.jsxs("div",{className:"font-bold text-slate-950 text-lg",children:["1 USD = ",new Intl.NumberFormat("fr-FR").format(m.rate)," FC"]}),e.jsxs("div",{className:"text-xs text-slate-500",children:["Effectif depuis ",at(m.effectiveFrom)]})]}):e.jsx("span",{className:"text-rose-600 text-sm",children:"Taux non disponible"})]})})]}),le&&e.jsxs("div",{className:"mt-4 flex flex-col sm:flex-row sm:items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4",children:[e.jsx(Je,{className:"w-5 h-5 text-amber-600 flex-shrink-0"}),e.jsxs("div",{className:"flex-1",children:[e.jsx("label",{className:"block text-sm font-medium text-amber-700 mb-1",children:"Date de la vente (Super Admin)"}),e.jsx("input",{type:"date",value:r.saleDate,max:W(),onChange:t=>v(s=>({...s,saleDate:t.target.value||W()})),className:"w-full max-w-xs p-2 bg-white border border-amber-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"})]}),e.jsx("p",{className:"text-xs text-amber-700 sm:max-w-xs",children:"Cette vente sera enregistrée et comptabilisée à cette date dans l'historique et les rapports."})]})]}),ae&&e.jsx("div",{className:"mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl",children:ae}),oe&&e.jsx("div",{className:"mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl",children:oe}),e.jsxs("div",{className:"grid min-w-0 items-start gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(22rem,.65fr)]",children:[e.jsxs("div",{className:"app-surface app-surface-pad",children:[e.jsxs("h3",{className:"text-lg font-semibold mb-4 text-blue-600 flex items-center gap-2 border-b border-slate-200 pb-3",children:[e.jsx(qe,{className:"w-5 h-5"}),"Ajouter les articles"]}),e.jsxs("div",{className:"mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-4",children:[e.jsxs("div",{className:"relative",ref:J,children:[e.jsx("label",{className:"block mb-2 font-medium text-slate-600",children:"Articles"}),e.jsxs("div",{className:"relative",children:[e.jsx(He,{className:"absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-600 w-4 h-4"}),e.jsx("input",{type:"text",value:M,onChange:De,onFocus:()=>U(!0),placeholder:"Rechercher un article...",className:"w-full p-3 pl-10 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900 placeholder-slate-400",disabled:g||n.length===0})]}),re&&H.length>0&&e.jsx("div",{className:"absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-60 overflow-auto",children:H.map(t=>e.jsxs("div",{className:"px-4 py-3 cursor-pointer hover:bg-slate-50 border-b border-slate-200 last:border-b-0",onClick:()=>Ae(t),children:[e.jsx("div",{className:"font-medium text-slate-900",children:t.name}),e.jsxs("div",{className:"text-sm text-slate-500 flex justify-between",children:[e.jsx("span",{children:t.sku&&`SKU: ${t.sku}`}),e.jsx("span",{className:t.stock===0?"text-rose-600":t.stock<=5?"text-orange-600":"text-emerald-600",children:Me(t)})]})]},t._id))}),re&&M&&H.length===0&&e.jsx("div",{className:"absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl p-4 text-center text-slate-500",children:"Aucun article trouvé"})]}),e.jsxs("div",{children:[e.jsx("label",{className:"block mb-2 font-medium text-slate-600",children:"Boites vendues"}),e.jsx("input",{type:"number",name:"cartonQuantity",value:r.cartonQuantity,onChange:P,placeholder:"0",className:"w-full p-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900 placeholder-slate-400",min:0}),e.jsx("p",{className:"mt-1 text-xs text-slate-500",children:h?`1 boite = ${w} piece${w>1?"s":""}`:"Selectionnez un article."})]}),e.jsxs("div",{children:[e.jsx("label",{className:"block mb-2 font-medium text-slate-600",children:"Pieces hors boite"}),e.jsx("input",{type:"number",name:"quantity",value:r.quantity,onChange:P,placeholder:"0",className:"w-full p-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900 placeholder-slate-400",min:0,max:Math.max(0,w-1)}),h&&S>0&&e.jsxs("p",{className:"mt-1 text-xs text-emerald-600",children:["Total: ",$(S,w)]})]}),e.jsxs("div",{children:[e.jsxs("div",{className:"flex items-center justify-between mb-2",children:[e.jsx("label",{className:"block font-medium text-slate-600",children:"Prix par boite"}),e.jsxs("button",{type:"button",onClick:Te,className:"flex items-center gap-1 px-2 py-1 text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-md transition-colors border border-slate-200",children:[e.jsx(Xe,{className:"w-3 h-3"}),r.currencyMode==="usd"?"USD → FC":"FC → USD"]})]}),r.currencyMode==="usd"?e.jsx("input",{type:"number",step:"0.01",name:"unitPrice",value:r.unitPrice,onChange:t=>v({...r,unitPrice:t.target.value}),placeholder:h?.price?`ex: ${h.price}`:"Entrer le prix en USD",className:"w-full p-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900 placeholder-slate-400",min:.01}):e.jsx("input",{type:"number",name:"priceInFC",value:r.priceInFC,onChange:t=>v({...r,priceInFC:t.target.value}),placeholder:"Entrer le prix en FC",className:"w-full p-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900 placeholder-slate-400",min:1}),r.unitPrice&&r.currencyMode==="usd"&&m&&e.jsxs("p",{className:"text-xs text-emerald-600 mt-1",children:["≈ ",Q(parseFloat(r.unitPrice)*m.rate)]}),r.priceInFC&&r.currencyMode==="fc"&&m&&e.jsxs("p",{className:"text-xs text-emerald-600 mt-1",children:["≈ ",C(parseFloat(r.priceInFC)/m.rate)]})]})]}),h&&e.jsxs("div",{className:"mb-6 rounded-lg border border-slate-200 bg-slate-50 p-4",children:[e.jsx("h4",{className:"mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500",children:"Bonus offert"}),e.jsxs("div",{className:"grid grid-cols-1 gap-4 md:grid-cols-3",children:[e.jsxs("div",{children:[e.jsx("label",{className:"block mb-2 font-medium text-slate-600",children:"Boites bonus"}),e.jsx("input",{type:"number",name:"bonusCartons",value:r.bonusCartons,onChange:P,placeholder:"0",className:"w-full p-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900 placeholder-slate-400",min:0})]}),e.jsxs("div",{children:[e.jsx("label",{className:"block mb-2 font-medium text-slate-600",children:"Pieces bonus"}),e.jsx("input",{type:"number",name:"bonusPieces",value:r.bonusPieces,onChange:P,placeholder:"0",className:"w-full p-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900 placeholder-slate-400",min:0,max:Math.max(0,w-1)}),e.jsx("p",{className:"mt-1 text-xs text-slate-500",children:"Pour une demi-boite, entrez la moitie des pieces."})]}),e.jsxs("div",{className:"rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600",children:[e.jsxs("div",{className:"flex justify-between gap-3",children:[e.jsx("span",{children:"Vendu:"}),e.jsx("strong",{className:"text-slate-950",children:$(I,w)})]}),e.jsxs("div",{className:"mt-2 flex justify-between gap-3",children:[e.jsx("span",{children:"Bonus:"}),e.jsx("strong",{className:"text-slate-950",children:$(_,w)})]}),e.jsxs("div",{className:"mt-2 flex justify-between gap-3 border-t border-slate-200 pt-2",children:[e.jsx("span",{children:"Facture:"}),e.jsx("strong",{className:"text-emerald-600",children:C(me)})]})]})]})]}),h&&Fe(h,S),e.jsxs("button",{type:"button",onClick:ze,disabled:!xe,className:`px-6 py-3 rounded-lg font-medium flex items-center gap-2 transition-all duration-200 ${xe?"bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-700 hover:to-blue-900 text-white shadow-lg shadow-blue-900/50 border border-blue-400/30":"bg-slate-100 cursor-not-allowed text-slate-400 border border-slate-200"}`,children:[e.jsx(Ge,{className:"w-4 h-4"}),"Ajouter au panier"]}),y.length>0&&e.jsxs("div",{className:"mt-6",children:[e.jsxs("h3",{className:"text-lg font-semibold mb-4 text-blue-600 flex items-center gap-2",children:[e.jsx(q,{className:"w-5 h-5"}),"Articles du panier"]}),e.jsx("div",{className:"desktop-data-table overflow-x-auto rounded-lg border border-slate-200",children:e.jsxs("table",{className:"w-full",children:[e.jsx("thead",{className:"bg-slate-50",children:e.jsxs("tr",{children:[e.jsx("th",{className:"px-4 py-3 text-left text-sm font-semibold text-slate-500",children:"Articles"}),e.jsx("th",{className:"px-4 py-3 text-center text-sm font-semibold text-slate-500",children:"Pièces"}),e.jsx("th",{className:"px-4 py-3 text-right text-sm font-semibold text-slate-500",children:"Prix boite"}),e.jsx("th",{className:"px-4 py-3 text-right text-sm font-semibold text-slate-500",children:"Total"}),e.jsx("th",{className:"px-4 py-3 text-center text-sm font-semibold text-slate-500",children:"Actions"})]})}),e.jsx("tbody",{className:"divide-y divide-slate-100",children:y.map((t,s)=>e.jsxs("tr",{className:"hover:bg-slate-50",children:[e.jsx("td",{className:"px-4 py-3 text-sm text-slate-900",children:t.name}),e.jsx("td",{className:"px-4 py-3 text-sm text-center text-slate-500",children:V(t)}),e.jsxs("td",{className:"px-4 py-3 text-sm text-right text-slate-900",children:[C(t.unitPrice),m&&e.jsxs("div",{className:"text-xs text-slate-500",children:["≈ ",Q(t.unitPrice*m.rate)]})]}),e.jsxs("td",{className:"px-4 py-3 text-sm text-right text-slate-900 font-medium",children:[C(t.total),m&&e.jsxs("div",{className:"text-xs text-slate-500",children:["≈ ",Q(t.total*m.rate)]})]}),e.jsx("td",{className:"px-4 py-3 text-center",children:e.jsxs("button",{onClick:()=>ue(s),className:"text-rose-600 hover:text-rose-700 text-sm font-medium transition-colors flex items-center gap-1 justify-center mx-auto",children:[e.jsx(ve,{className:"w-4 h-4"}),"Enlever"]})})]},s))}),e.jsx("tfoot",{className:"bg-slate-50",children:e.jsxs("tr",{children:[e.jsx("td",{colSpan:3,className:"px-4 py-3 text-right text-sm font-semibold text-slate-500",children:"Total:"}),e.jsxs("td",{className:"px-4 py-3 text-right text-sm font-semibold text-slate-950",children:[C(p),m&&e.jsxs("div",{className:"text-xs text-slate-500",children:["≈ ",Q(p*m.rate)]})]}),e.jsx("td",{})]})})]})}),e.jsxs("div",{className:"mobile-record-list",children:[y.map((t,s)=>e.jsxs("article",{className:"mobile-record-card p-3",children:[e.jsxs("div",{className:"flex items-start justify-between gap-3",children:[e.jsxs("div",{className:"min-w-0",children:[e.jsx("h4",{className:"truncate text-sm font-bold text-slate-950",children:t.name}),e.jsx("p",{className:"mt-1 text-xs text-slate-500",children:V(t)})]}),e.jsx("p",{className:"shrink-0 text-sm font-black text-slate-950",children:C(t.total)})]}),e.jsxs("div",{className:"mt-2 flex items-center justify-between border-t border-slate-100 pt-2",children:[e.jsxs("span",{className:"text-xs text-slate-500",children:[C(t.unitPrice)," / boîte"]}),e.jsxs("button",{type:"button",onClick:()=>ue(s),className:"compact-control inline-flex min-h-9 items-center gap-1 rounded-lg px-2 text-sm font-bold text-rose-700 hover:bg-rose-50",children:[e.jsx(ve,{className:"h-4 w-4"})," Enlever"]})]})]},`${t.productId}-${s}`)),e.jsxs("div",{className:"flex items-center justify-between rounded-xl bg-slate-950 px-3 py-3 text-white",children:[e.jsx("span",{className:"text-sm font-semibold",children:"Total du panier"}),e.jsx("strong",{className:"text-base",children:C(p)})]})]})]})]}),e.jsxs("div",{className:"app-surface app-surface-pad lg:sticky lg:top-[calc(var(--app-header-h,7rem)+.75rem)] lg:max-h-[calc(100dvh-var(--app-header-h,7rem)-1.5rem)] lg:overflow-y-auto",children:[e.jsxs("h3",{className:"text-lg font-semibold mb-4 text-blue-600 flex items-center gap-2 border-b border-slate-200 pb-3",children:[e.jsx(be,{className:"w-5 h-5"}),"Informations du client"]}),e.jsxs("div",{className:"mb-6 flex gap-3",children:[e.jsxs("button",{type:"button",onClick:()=>v(t=>({...t,paymentMode:"normal",creditAmountPaid:"",creditDueDate:""})),className:`flex-1 py-3 px-4 rounded-lg font-medium flex items-center justify-center gap-2 border transition-all duration-200 ${N?"bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100":"bg-green-700 border-green-500 text-white shadow-lg shadow-green-900/40"}`,children:[e.jsx(q,{className:"w-4 h-4"}),"Vente normale (Payée)"]}),e.jsxs("button",{type:"button",onClick:()=>v(t=>({...t,paymentMode:"credit",isWalkIn:!1})),className:`flex-1 py-3 px-4 rounded-lg font-medium flex items-center justify-center gap-2 border transition-all duration-200 ${N?"bg-amber-700 border-amber-500 text-white shadow-lg shadow-amber-900/40":"bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"}`,children:[e.jsx(we,{className:"w-4 h-4"}),"Vente à crédit"]})]}),!N&&e.jsxs("label",{className:`mb-6 flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all duration-200 ${r.isWalkIn?"bg-purple-50 border-purple-300":"bg-slate-50 border-slate-200 hover:bg-slate-100"}`,children:[e.jsx("input",{type:"checkbox",checked:r.isWalkIn,onChange:t=>{const s=t.target.checked;v(o=>({...o,isWalkIn:s,customerName:s?"":o.customerName,customerPhone:s?"":o.customerPhone,customerEmail:s?"":o.customerEmail}))},className:"w-4 h-4 accent-purple-600"}),e.jsx(et,{className:"w-4 h-4 text-purple-600"}),e.jsx("span",{className:"text-sm font-medium text-slate-600",children:"Client de passage (aucune information à fournir)"})]}),N&&e.jsxs("div",{className:"mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3",children:[e.jsx(We,{className:"w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0"}),e.jsxs("div",{children:[e.jsx("p",{className:"text-amber-800 font-semibold text-sm",children:"Vente à crédit — les marchandises sont remises au client"}),e.jsx("p",{className:"text-amber-600 text-xs mt-1",children:"Le stock sera déduit immédiatement. Indiquez le montant versé à l'avance et la date d'échéance."})]})]}),e.jsxs("div",{className:"mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-1 2xl:grid-cols-2",children:[e.jsxs("div",{children:[e.jsxs("label",{className:"block mb-2 font-medium text-slate-600",children:[e.jsx(Ke,{className:"w-4 h-4 inline mr-1"}),"Téléphone du client ",N?e.jsx("span",{className:"text-rose-600 text-xs",children:"*"}):e.jsx("span",{className:"text-slate-400 text-xs",children:"(optionnel)"})]}),e.jsx("input",{type:"tel",name:"customerPhone",value:r.customerPhone,onChange:P,onBlur:async t=>{const s=t.target.value.trim();if(s)try{const o=await fetch(`${T}/customers/phone/${encodeURIComponent(s)}`,{headers:{Authorization:`Bearer ${localStorage.getItem("token")}`}});if(o.ok){const i=await o.json();v(f=>({...f,customerName:i.name||f.customerName,customerEmail:i.email||f.customerEmail}))}}catch{}},placeholder:"Ex: 0812345678",className:"w-full p-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900 placeholder-slate-400 disabled:opacity-50 disabled:cursor-not-allowed",required:N,disabled:r.isWalkIn})]}),e.jsxs("div",{children:[e.jsxs("label",{className:"block mb-2 font-medium text-slate-600",children:[e.jsx(be,{className:"w-4 h-4 inline mr-1"}),"Nom du client ",N?e.jsx("span",{className:"text-rose-600 text-xs",children:"*"}):e.jsx("span",{className:"text-slate-400 text-xs",children:"(optionnel)"})]}),e.jsx("input",{type:"text",name:"customerName",value:r.isWalkIn?Y:r.customerName,onChange:P,placeholder:"Entrer le nom du client",className:"w-full p-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900 placeholder-slate-400 disabled:opacity-50 disabled:cursor-not-allowed",required:N,disabled:r.isWalkIn})]}),e.jsxs("div",{children:[e.jsxs("label",{className:"block mb-2 font-medium text-slate-600",children:[e.jsx(Ve,{className:"w-4 h-4 inline mr-1"}),"Email du client (optionnel)"]}),e.jsx("input",{type:"email",name:"customerEmail",value:r.customerEmail,onChange:P,placeholder:"Entrer l'email du client",disabled:r.isWalkIn,className:"w-full p-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900 placeholder-slate-400 disabled:opacity-50 disabled:cursor-not-allowed"})]}),e.jsxs("div",{children:[e.jsxs("label",{className:"block mb-2 font-medium text-slate-600",children:["Méthode de paiement ",N&&e.jsx("span",{className:"text-amber-600 text-xs",children:"(versement initial)"})]}),e.jsxs("select",{name:"paymentMethod",value:r.paymentMethod,onChange:P,className:"w-full p-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900",required:!0,children:[e.jsx("option",{value:"cash",className:"bg-white",children:"Cash"}),e.jsx("option",{value:"mpesa",className:"bg-white",children:"M-Pesa ou Airtel Money (Transfert)"}),e.jsx("option",{value:"bank",className:"bg-white",children:"Transfert Bank"}),e.jsx("option",{value:"card",className:"bg-white",children:"Carte Visa"}),e.jsx("option",{value:"other",className:"bg-white",children:"Autres"})]})]})]}),N&&e.jsxs("div",{className:"mb-4 grid grid-cols-1 gap-4 rounded-lg border border-amber-200 bg-amber-50 p-4 2xl:grid-cols-2",children:[e.jsxs("div",{children:[e.jsxs("label",{className:"block mb-2 font-medium text-amber-700 flex items-center gap-2",children:[e.jsx(fe,{className:"w-4 h-4"}),"Montant versé à l'avance (USD)"]}),e.jsx("input",{type:"number",step:"0.01",min:"0",max:p,name:"creditAmountPaid",value:r.creditAmountPaid,onChange:P,placeholder:"0.00 (laisser vide si rien payé)",className:"w-full p-3 bg-white border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-slate-900 placeholder-amber-400"}),A>0&&e.jsx("p",{className:"mt-1 text-xs font-medium text-green-700",children:"Ce versement sera confirmé à l'enregistrement, ajouté aux recettes et déduit de la dette."}),A>0&&p>0&&e.jsxs("p",{className:"text-xs text-amber-700 mt-1",children:["Solde restant: ",e.jsx("strong",{className:"text-slate-950",children:C(Math.max(0,p-A))}),m&&e.jsxs("span",{className:"ml-1 text-amber-600",children:["≈ ",Q(Math.max(0,p-A)*m.rate)]})]}),A===0&&p>0&&e.jsxs("p",{className:"text-xs text-amber-600 mt-1",children:["Tout le montant (",C(p),") est dû à crédit"]})]}),e.jsxs("div",{children:[e.jsxs("label",{className:"block mb-2 font-medium text-amber-700 flex items-center gap-2",children:[e.jsx(Ze,{className:"w-4 h-4"}),"Date d'échéance de paiement"]}),e.jsx("input",{type:"date",name:"creditDueDate",value:r.creditDueDate,onChange:P,min:new Date().toISOString().split("T")[0],className:"w-full p-3 bg-white border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-slate-900"}),e.jsx("p",{className:"text-xs text-amber-600 mt-1",children:"Optionnel — date limite de règlement"})]})]}),e.jsx("button",{type:"submit",onClick:Oe,disabled:!X||k,className:`w-full px-6 py-3.5 rounded-xl font-medium text-base transition-all duration-200 lg:sticky lg:bottom-0 lg:z-10 ${X&&!k?N?"bg-gradient-to-r from-amber-600 to-amber-800 hover:from-amber-700 hover:to-amber-900 text-white shadow-lg shadow-amber-900/50 border border-amber-400/30":"bg-gradient-to-r from-green-600 to-green-800 hover:from-green-700 hover:to-green-900 text-white shadow-lg shadow-green-900/50 border border-green-400/30":"bg-slate-100 cursor-not-allowed text-slate-400 border border-slate-200"}`,children:k?e.jsxs("span",{className:"flex items-center justify-center gap-2",children:[e.jsx(he,{className:"w-5 h-5 animate-spin"}),"En cours d'enregistrement..."]}):N?e.jsxs("span",{className:"flex items-center justify-center gap-2",children:[e.jsx(we,{className:"w-5 h-5"}),"Enregistrer la vente à crédit",p>0&&A<p&&e.jsxs("span",{className:"text-sm opacity-80",children:["(",C(Math.max(0,p-A))," à récupérer)"]})]}):e.jsxs("span",{className:"flex items-center justify-center gap-2",children:[e.jsx(q,{className:"w-5 h-5"}),"Enregistrer la vente"]})})]})]}),e.jsx("div",{ref:Pe,style:{display:"none"}})]})})}export{ht as default};
