import{c as W,r as i,u as Z,j as e,R as k,U as R,M as Q,b as T}from"./index-DCcOePDP.js";import{D as f}from"./dollar-sign-DgIPlKDw.js";import{C as Y}from"./calculator-C9I9HFr4.js";import{P as K}from"./phone-DkbEZpxM.js";import{C as X}from"./calendar-BCG7_CKu.js";const ee=[["path",{d:"M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z",key:"1oefj6"}],["path",{d:"M14 2v5a1 1 0 0 0 1 1h5",key:"wfsgrz"}],["path",{d:"m9 15 2 2 4-4",key:"1grp1n"}]],te=W("file-check",ee);function x(){const n=new Date;return`${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,"0")}-${String(n.getDate()).padStart(2,"0")}`}const $="http://localhost:5000/api";function re(n){return n==="cash"?"cash":n==="card"?"card":n==="mpesa"||n==="bank"?"transfer":"other"}async function oe(n){return(n.headers.get("content-type")||"").includes("application/json")?n.json():{__nonJson:!0,text:await n.text()}}function le(){const[n,u]=i.useState(!1),[r,S]=i.useState(null),[s,A]=i.useState(null),[I,v]=i.useState(!0),M=i.useRef(null),{user:b}=Z(),[t,l]=i.useState({amount:"",amountInFC:"",source:"",category:"",paymentMethod:"cash",description:"",receivedFromName:"",receivedFromPhone:"",receivedFromEmail:"",currencyMode:"usd"}),[g,D]=i.useState(x()),w=b?.role==="admin"||b?.role==="superadmin",[y,N]=i.useState(null),[j,E]=i.useState(null),z=["Paiement Client","Dépôt Bancaire","Reçu d'Espèces","Remboursement Prêt","Investissement","Revenue Divers","Transfert Mobile","Autre Source"],P=["Revenue Ventes","Dépôt Espèces","Remboursement","Prêt","Investissement","Revenue Divers","Autre Catégorie"],F=async()=>{const o=T();try{v(!0);const a=await fetch(`${$}/exchange-rates/current`,{headers:{Authorization:`Bearer ${localStorage.getItem("token")||""}`}});if(a.ok){const d=await a.json();T()===o&&A(d)}else console.warn("Failed to load exchange rate")}catch(a){console.error("Error loading exchange rate:",a)}finally{v(!1)}};i.useEffect(()=>{F()},[]),i.useEffect(()=>{const o=()=>{F()};return window.addEventListener("appDataChanged",o),()=>window.removeEventListener("appDataChanged",o)},[]),i.useEffect(()=>{if(t.currencyMode==="fc"&&t.amountInFC&&s){const a=(parseFloat(t.amountInFC)||0)/s.rate;l(d=>({...d,amount:a.toFixed(2)}))}},[t.amountInFC,t.currencyMode,s]),i.useEffect(()=>{if(t.currencyMode==="usd"&&t.amount&&s){const a=(parseFloat(t.amount)||0)*s.rate;l(d=>({...d,amountInFC:Math.round(a).toString()}))}},[t.amount,t.currencyMode,s]);const p=parseFloat(t.amount)>0&&t.source.trim()!==""&&t.category.trim()!==""&&t.receivedFromName.trim()!==""&&t.receivedFromPhone.trim()!=="";function c(o){l(a=>({...a,[o.target.name]:o.target.value}))}const U=()=>{l(o=>({...o,currencyMode:o.currencyMode==="usd"?"fc":"usd",amount:"",amountInFC:""}))};function O(){const o=localStorage.getItem("token")||"";return o?{Authorization:`Bearer ${o}`}:{}}const L=o=>new Intl.NumberFormat("fr-FR",{minimumFractionDigits:0,maximumFractionDigits:0}).format(o)+" FC",B=o=>new Intl.NumberFormat("fr-FR",{style:"currency",currency:"USD"}).format(o),q=()=>{const o=window.open("","_blank","width=320,height=600");o&&r&&(o.document.write(`
<html>
  <head>
    <title>Reçu d'Entrée d'Argent</title>
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
      .entry-badge {
        background-color: #000;
        color: white;
        padding: 2mm;
        font-weight: bold;
        text-align: center;
        margin: 1mm 0;
        font-size: 14px;
        border-radius: 3px;
      }
      .details-section {
        margin: 1mm 0;
        padding: 1mm;
        background-color: #fafafa;
        border: 1px solid #eee;
      }
      .detail-row { 
        display: flex;
        justify-content: space-between;
        margin-bottom: 0.5mm;
        padding: 0 1mm;
        border-bottom: 1px dotted #ddd;
      }
      .detail-label {
        text-align: left;
        font-weight: bold;
        font-size: 12px;
        flex: 1;
      }
      .detail-value {
        text-align: right;
        font-weight: bold;
        font-size: 12px;
        flex: 1;
      }
      .amount-section { 
        font-weight: bold; 
        margin-top: 1mm;
        padding: 1mm;
        background-color: #f0f0f0;
        border: 1px solid #ddd;
        border-radius: 3px;
      }
      .amount-row {
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
      .agent-info {
        margin-top: 1mm;
        text-align: center;
        font-weight: bold;
        font-size: 12px;
        padding: 1mm;
        background-color: #e8e8e8;
        border: 1px solid #ccc;
        border-radius: 2px;
      }
      .sender-info {
        margin: 1mm 0;
        padding: 1mm;
        font-weight: bold;
        text-align: center;
        background-color: #f5f5f5;
        border: 1px solid #ddd;
        border-radius: 3px;
      }
      .sender-field {
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
      .description {
        margin: 1mm 0;
        padding: 1mm;
        background-color: #f5f5f5;
        border-left: 3px solid #ccc;
        font-size: 11px;
        font-weight: bold;
        border-radius: 2px;
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
        <div class="shop-name"><strong>${r.shopName}</strong></div>
        <div class="shop-details"><strong>${r.shopAddress}</strong></div>
        <div class="shop-details">TEL: <strong>${r.shopNumber}</strong></div>
        <div class="shop-details"><strong>${r.shopRegistration}</strong></div>
      </div>
      
      <div class="section-divider"></div>
      
      <div class="receipt-info">
        <div class="shop-details">DATE: <strong>${r.date}</strong></div>
        <div class="shop-details">REÇU #: <strong>${r.receiptNumber}</strong></div>
      </div>
      
      <div class="entry-badge">
        <strong>💰 ENTRÉE D'ARGENT CONFIRMÉE 💰</strong>
      </div>
      
      <div class="sender-info">
        <div class="sender-field">REÇU DE: <strong>${r.receivedFrom.name.toUpperCase()}</strong></div>
        <div class="sender-field">TÉLÉPHONE: <strong>${r.receivedFrom.phone}</strong></div>
        ${r.receivedFrom.email?`<div class="sender-field">EMAIL: <strong>${r.receivedFrom.email}</strong></div>`:""}
      </div>
      
      ${r.description?`
        <div class="description">
          <strong>DESCRIPTION:</strong> <strong>${r.description}</strong>
        </div>
      `:""}
      
      <div class="receipt-title">DÉTAILS DE L'ENTRÉE</div>
      
      <div class="details-section">
        <div class="detail-row">
          <div class="detail-label"><strong>SOURCE:</strong></div>
          <div class="detail-value"><strong>${r.source}</strong></div>
        </div>
        <div class="detail-row">
          <div class="detail-label"><strong>CATÉGORIE:</strong></div>
          <div class="detail-value"><strong>${r.category}</strong></div>
        </div>
        <div class="detail-row">
          <div class="detail-label"><strong>MÉTHODE PAIEMENT:</strong></div>
          <div class="detail-value"><strong>${r.paymentMethod.toUpperCase()}</strong></div>
        </div>
      </div>
      
      <div class="amount-section">
        <div class="amount-row">
          <div><strong>MONTANT REÇU:</strong></div>
          <div><strong>$${r.amount.toFixed(2)}</strong></div>
        </div>
        ${r.exchangeRate?`<div class="amount-row">
                 <div><strong>ÉQUIVALENT FC:</strong></div>
                 <div><strong>${new Intl.NumberFormat("fr-FR").format(r.amount*r.exchangeRate)} FC</strong></div>
               </div>`:""}
      </div>
      
      <div class="agent-info">
        Enregistré par: <strong>${r.agent.toUpperCase()}</strong>
      </div>
      
      <div class="footer">
        <div class="thank-you"><strong>ENTRÉE ENREGISTRÉE AVEC SUCCÈS !</strong></div>
        <div class="warning"><strong>Conserver ce reçu comme preuve</strong></div>
        <div class="warning"><strong>Merci pour votre confiance</strong></div>
        <div class="thank-you"><strong>À BIENTÔT !</strong></div>
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
`),o.document.close())},_=()=>{const o=window.open("","_blank","width=320,height=600");o&&r&&(o.document.write(`
<html>
  <head>
    <title>Souche Entrée d'Argent</title>
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
      .details-section {
        margin: 1mm 0;
        padding: 1mm;
        background-color: #fafafa;
        border: 1px solid #eee;
      }
      .detail-row { 
        display: flex;
        justify-content: space-between;
        margin-bottom: 0.5mm;
        padding: 0 1mm;
        border-bottom: 1px dotted #ddd;
      }
      .detail-label {
        text-align: left;
        font-weight: bold;
        font-size: 12px;
        flex: 1;
      }
      .detail-value {
        text-align: right;
        font-weight: bold;
        font-size: 12px;
        flex: 1;
      }
      .amount-section { 
        font-weight: bold; 
        margin-top: 1mm;
        padding: 1mm;
        background-color: #f0f0f0;
        border: 1px solid #ddd;
        border-radius: 3px;
      }
      .amount-row {
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
      .agent-info {
        margin-top: 1mm;
        text-align: center;
        font-weight: bold;
        font-size: 12px;
        padding: 1mm;
        background-color: #f5f5f5;
        border: 1px solid #ddd;
        border-radius: 2px;
      }
      .sender-info {
        margin: 1mm 0;
        padding: 1mm;
        font-weight: bold;
        text-align: center;
        background-color: #f5f5f5;
        border: 1px solid #ddd;
        border-radius: 3px;
      }
      .sender-field {
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
      .description {
        margin: 1mm 0;
        padding: 1mm;
        background-color: #f5f5f5;
        border-left: 3px solid #ccc;
        font-size: 11px;
        font-weight: bold;
        border-radius: 2px;
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
        <div class="shop-name"><strong>${r.shopName}</strong></div>
        <div class="shop-details"><strong>${r.shopAddress}</strong></div>
        <div class="shop-details">TEL: <strong>${r.shopNumber}</strong></div>
      </div>
      
      <div class="section-divider"></div>
      
      <div class="receipt-info">
        <div class="shop-details">DATE: <strong>${r.date}</strong></div>
        <div class="shop-details">REÇU #: <strong>${r.receiptNumber}</strong></div>
      </div>
      
      <div class="stub-number">
        <strong>SOUCHE ENTRÉE N°${r.stubNumber}</strong>
      </div>
      
      <div class="sender-info">
        <div class="sender-field">REÇU DE: <strong>${r.receivedFrom.name.toUpperCase()}</strong></div>
        <div class="sender-field">TÉLÉPHONE: <strong>${r.receivedFrom.phone}</strong></div>
      </div>
      
      ${r.description?`
        <div class="description">
          <strong>DESCRIPTION:</strong> <strong>${r.description}</strong>
        </div>
      `:""}
      
      <div class="receipt-title">DÉTAILS ENTRÉE</div>
      
      <div class="details-section">
        <div class="detail-row">
          <div class="detail-label"><strong>SOURCE:</strong></div>
          <div class="detail-value"><strong>${r.source}</strong></div>
        </div>
        <div class="detail-row">
          <div class="detail-label"><strong>CATÉGORIE:</strong></div>
          <div class="detail-value"><strong>${r.category}</strong></div>
        </div>
        <div class="detail-row">
          <div class="detail-label"><strong>MÉTHODE PAIEMENT:</strong></div>
          <div class="detail-value"><strong>${r.paymentMethod.toUpperCase()}</strong></div>
        </div>
      </div>
      
      <div class="amount-section">
        <div class="amount-row">
          <div><strong>MONTANT REÇU:</strong></div>
          <div><strong>$${r.amount.toFixed(2)}</strong></div>
        </div>
      </div>
      
      <div class="agent-info">
        Enregistré par: <strong>${r.agent.toUpperCase()}</strong>
      </div>
      
      <div class="stub-footer">
        <div class="thank-you"><strong>SOUCHE ENTRÉE D'ARGENT</strong></div>
        <div class="warning"><strong>${r.shopName}</strong></div>
        <div class="warning"><strong>Conserver cette souche</strong></div>
        <div class="warning">Reçu #: <strong>${r.receiptNumber}</strong></div>
        <div class="warning">Date: <strong>${r.date}</strong></div>
        <div class="warning">Source: <strong>${r.source}</strong></div>
        <div class="warning">Montant: <strong>$${r.amount.toFixed(2)}</strong></div>
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
`),o.document.close())},H=()=>{q(),setTimeout(()=>{_()},2e3)};i.useEffect(()=>{if(r){const o=setTimeout(()=>{H()},500);return()=>clearTimeout(o)}},[r]);async function V(o){if(o.preventDefault(),!!p){u(!0),N(null),E(null);try{const a=re(t.paymentMethod),d={amount:parseFloat(t.amount),source:t.source,category:t.category,paymentMethod:a,description:t.description,receivedFrom:{name:t.receivedFromName,phone:t.receivedFromPhone,email:t.receivedFromEmail||""},...w&&g&&g!==x()&&{operationDate:g}};console.log("Sending entry data:",d);const h=await fetch(`${$}/entries`,{method:"POST",headers:{"Content-Type":"application/json",...O()},body:JSON.stringify(d)}),m=await oe(h);if(!h.ok){const J=m?.error||m?.text||`Échec de l'enregistrement (${h.status})`;throw new Error(J)}console.log("Entry created successfully:",m);const C=m.entryId||m._id,G={shopName:"Entre Nous Renove",shopAddress:`Agence de ${localStorage.getItem("activeBranchId")==="beni"?"Beni":"Butembo"}`,shopNumber:"",shopRegistration:"",amount:parseFloat(t.amount),source:t.source,category:t.category,paymentMethod:t.paymentMethod,description:t.description,receivedFrom:{name:t.receivedFromName,phone:t.receivedFromPhone,email:t.receivedFromEmail},agent:b?.username||"Agent",date:new Date().toLocaleString("fr-FR",{timeZone:"Africa/Johannesburg",day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"}),receiptNumber:C,stubNumber:C,exchangeRate:s?.rate};S(G),l({amount:"",amountInFC:"",source:"",category:"",paymentMethod:"cash",description:"",receivedFromName:"",receivedFromPhone:"",receivedFromEmail:"",currencyMode:"usd"}),N("✅ Entrée d'argent enregistrée avec succès ! Impression du reçu et de la souche...")}catch(a){console.error("Error creating entry:",a),E(a?.message||"L'entrée d'argent n'a pas pu être enregistrée")}finally{u(!1)}}}return e.jsx("div",{className:"app-page bg-gradient-to-br from-slate-50 via-blue-50/50 to-indigo-50",children:e.jsxs("div",{className:"app-page-inner max-w-5xl",children:[e.jsx("div",{className:"mb-6",children:e.jsxs("div",{className:"flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4",children:[e.jsxs("div",{children:[e.jsxs("h2",{className:"text-2xl font-bold text-slate-950 flex items-center gap-2",children:[e.jsx(f,{className:"w-7 h-7 text-blue-600"}),"Nouvelle Entrée d'Argent"]}),e.jsx("p",{className:"text-slate-600 mt-1",children:"Enregistrez une nouvelle entrée d'argent dans le système"})]}),e.jsx("div",{className:"bg-slate-50 border border-slate-200 rounded-xl p-4 min-w-[280px] shadow-lg",children:e.jsxs("div",{className:"flex items-center justify-between",children:[e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx(f,{className:"w-5 h-5 text-blue-600"}),e.jsx("span",{className:"font-semibold text-slate-600",children:"Taux du jour:"})]}),I?e.jsx(k,{className:"w-4 h-4 animate-spin text-blue-600"}):s?e.jsxs("div",{className:"text-right",children:[e.jsxs("div",{className:"font-bold text-slate-950 text-lg",children:["1 USD = ",new Intl.NumberFormat("fr-FR").format(s.rate)," FC"]}),e.jsxs("div",{className:"text-xs text-slate-500",children:["Effectif depuis ",new Date(s.effectiveFrom).toLocaleDateString("fr-FR",{timeZone:"Africa/Johannesburg"})]})]}):e.jsx("span",{className:"text-rose-600 text-sm",children:"Taux non disponible"})]})})]})}),y&&e.jsx("div",{className:"mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl",children:y}),j&&e.jsx("div",{className:"mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl",children:j}),e.jsxs("form",{onSubmit:V,className:"space-y-6",children:[e.jsxs("div",{className:"bg-white border border-slate-200 shadow-xl rounded-xl p-6",children:[e.jsxs("h3",{className:"text-lg font-semibold mb-4 text-blue-600 flex items-center gap-2 border-b border-slate-200 pb-3",children:[e.jsx(f,{className:"w-5 h-5 text-blue-600"}),"Informations de l'Entrée"]}),e.jsxs("div",{className:"grid grid-cols-1 md:grid-cols-2 gap-6",children:[e.jsxs("div",{children:[e.jsxs("div",{className:"flex items-center justify-between mb-2",children:[e.jsx("label",{className:"block font-medium text-slate-600",children:"Montant *"}),e.jsxs("button",{type:"button",onClick:U,className:"flex items-center gap-1 px-2 py-1 text-xs bg-slate-50 hover:bg-slate-100 text-slate-500 rounded-md transition-colors border border-slate-200",children:[e.jsx(Y,{className:"w-3 h-3"}),t.currencyMode==="usd"?"USD → FC":"FC → USD"]})]}),t.currencyMode==="usd"?e.jsx("input",{type:"number",step:"0.01",name:"amount",value:t.amount,onChange:o=>l({...t,amount:o.target.value}),placeholder:"Entrer le montant en USD",className:"w-full p-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900 placeholder-slate-400",min:"0.01",required:!0}):e.jsx("input",{type:"number",name:"amountInFC",value:t.amountInFC,onChange:o=>l({...t,amountInFC:o.target.value}),placeholder:"Entrer le montant en FC",className:"w-full p-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900 placeholder-slate-400",min:"1",required:!0}),t.amount&&t.currencyMode==="usd"&&s&&e.jsxs("p",{className:"text-xs text-emerald-600 mt-1",children:["≈ ",L(parseFloat(t.amount)*s.rate)]}),t.amountInFC&&t.currencyMode==="fc"&&s&&e.jsxs("p",{className:"text-xs text-emerald-600 mt-1",children:["≈ ",B(parseFloat(t.amountInFC)/s.rate)]})]}),e.jsxs("div",{children:[e.jsx("label",{className:"block mb-2 font-medium text-slate-600",children:"Source *"}),e.jsxs("select",{name:"source",value:t.source,onChange:c,className:"w-full p-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900",required:!0,children:[e.jsx("option",{value:"",className:"bg-white",children:"Sélectionner la source"}),z.map(o=>e.jsx("option",{value:o,className:"bg-white",children:o},o))]})]}),e.jsxs("div",{children:[e.jsx("label",{className:"block mb-2 font-medium text-slate-600",children:"Catégorie *"}),e.jsxs("select",{name:"category",value:t.category,onChange:c,className:"w-full p-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900",required:!0,children:[e.jsx("option",{value:"",className:"bg-white",children:"Sélectionner la catégorie"}),P.map(o=>e.jsx("option",{value:o,className:"bg-white",children:o},o))]})]}),e.jsxs("div",{children:[e.jsx("label",{className:"block mb-2 font-medium text-slate-600",children:"Méthode de Paiement *"}),e.jsxs("select",{name:"paymentMethod",value:t.paymentMethod,onChange:c,className:"w-full p-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900",required:!0,children:[e.jsx("option",{value:"cash",className:"bg-white",children:"Espèces"}),e.jsx("option",{value:"mpesa",className:"bg-white",children:"M-Pesa ou Airtel Money (Transfert)"}),e.jsx("option",{value:"bank",className:"bg-white",children:"Transfert Bancaire"}),e.jsx("option",{value:"card",className:"bg-white",children:"Carte Visa"}),e.jsx("option",{value:"other",className:"bg-white",children:"Autre"})]})]})]}),e.jsxs("div",{className:"mt-4",children:[e.jsx("label",{className:"block mb-2 font-medium text-slate-600",children:"Description (Optionnel)"}),e.jsx("textarea",{name:"description",value:t.description,onChange:c,placeholder:"Description de l'entrée d'argent...",className:"w-full p-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900 placeholder-slate-400",rows:3})]})]}),e.jsxs("div",{className:"bg-white border border-slate-200 shadow-xl rounded-xl p-6",children:[e.jsxs("h3",{className:"text-lg font-semibold mb-4 text-blue-600 flex items-center gap-2 border-b border-slate-200 pb-3",children:[e.jsx(R,{className:"w-5 h-5 text-blue-600"}),"Informations de l'Expéditeur"]}),e.jsxs("div",{className:"grid grid-cols-1 md:grid-cols-2 gap-6",children:[e.jsxs("div",{children:[e.jsxs("label",{className:"block mb-2 font-medium text-slate-600",children:[e.jsx(R,{className:"w-4 h-4 inline mr-1"}),"Nom de l'Expéditeur *"]}),e.jsx("input",{type:"text",name:"receivedFromName",value:t.receivedFromName,onChange:c,placeholder:"Entrer le nom de la personne",className:"w-full p-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900 placeholder-slate-400",required:!0})]}),e.jsxs("div",{children:[e.jsxs("label",{className:"block mb-2 font-medium text-slate-600",children:[e.jsx(K,{className:"w-4 h-4 inline mr-1"}),"Téléphone de l'Expéditeur *"]}),e.jsx("input",{type:"tel",name:"receivedFromPhone",value:t.receivedFromPhone,onChange:c,placeholder:"Entrer le numéro de téléphone",className:"w-full p-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900 placeholder-slate-400",required:!0})]}),e.jsxs("div",{className:"md:col-span-2",children:[e.jsxs("label",{className:"block mb-2 font-medium text-slate-600",children:[e.jsx(Q,{className:"w-4 h-4 inline mr-1"}),"Email de l'Expéditeur (Optionnel)"]}),e.jsx("input",{type:"email",name:"receivedFromEmail",value:t.receivedFromEmail,onChange:c,placeholder:"Entrer l'email de l'expéditeur",className:"w-full p-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900 placeholder-slate-400"})]})]})]}),w&&e.jsxs("div",{className:"bg-amber-50 border border-amber-200 shadow-xl rounded-xl p-5",children:[e.jsxs("div",{className:"flex items-center gap-2 mb-3",children:[e.jsx(X,{className:"w-5 h-5 text-amber-600"}),e.jsx("h3",{className:"font-semibold text-amber-700",children:"Date de l'opération (Admin)"})]}),e.jsx("input",{type:"date",value:g,max:x(),onChange:o=>D(o.target.value),className:"w-full p-3 bg-white border border-amber-200 rounded-lg text-slate-900 focus:ring-2 focus:ring-amber-500 focus:border-transparent"}),e.jsx("p",{className:"mt-2 text-xs text-amber-700/80",children:"Cette entrée sera enregistrée et comptabilisée à cette date dans l'historique et les rapports."})]}),e.jsxs("div",{className:"bg-white border border-slate-200 shadow-xl rounded-xl p-6",children:[e.jsx("button",{type:"submit",disabled:!p||n,className:`w-full px-8 py-4 rounded-xl font-medium text-lg flex items-center justify-center gap-2 transition-all duration-200 ${p&&!n?"bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-700 hover:to-blue-900 text-white shadow-lg shadow-blue-900/50 border border-blue-400/30":"bg-slate-200 cursor-not-allowed text-slate-400 border border-slate-300"}`,children:n?e.jsxs("span",{className:"flex items-center gap-2",children:[e.jsx(k,{className:"w-5 h-5 animate-spin"}),"Enregistrement en cours..."]}):e.jsxs("span",{className:"flex items-center gap-2",children:[e.jsx(te,{className:"w-5 h-5"}),"Enregistrer l'Entrée d'Argent"]})}),!p&&e.jsx("p",{className:"text-sm text-amber-600 mt-2 text-center bg-amber-50 p-2 rounded-lg border border-amber-200",children:"* Veuillez remplir tous les champs obligatoires (Montant, Source, Catégorie, Nom et Téléphone)"})]})]}),e.jsx("div",{ref:M,style:{display:"none"}})]})})}export{le as default};
