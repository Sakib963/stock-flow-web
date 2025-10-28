import{Ta as c,la as a}from"./chunk-A724KJ3H.js";var d={name:"StockFlow Inc.",address:"123 Stock Management St., Stock City",phone:"+1 (555) 123-4567",email:"info@stockflow.com",website:"www.stockflow.com"};var h=(()=>{class s{constructor(){this.isPrinting=c(!1),this.companyInfo=d}formatLocalTime(e){if(e)return e.substring(0,16).replace("T"," ");{let i=new Date,n=String(i.getDate()).padStart(2,"0"),t=String(i.getMonth()+1).padStart(2,"0"),o=i.getFullYear(),r=i.getHours(),l=String(i.getMinutes()).padStart(2,"0");return r=r%12||12,`${n}/${t}/${o} ${r}:${l}`}}printReceipt(e){return this.isPrinting()?Promise.resolve():(this.isPrinting.set(!0),new Promise(i=>{let n=this.generateReceiptHTML(e,this.companyInfo),t=window.open("","_blank");if(!t){console.error("Failed to open print window"),this.isPrinting.set(!1),i();return}t.document.open(),t.document.write(n),t.document.close();let o=()=>{t.close(),this.isPrinting.set(!1),i()};t.onload=()=>{setTimeout(()=>{try{t.focus(),t.print(),t.onafterprint=o,setTimeout(()=>o(),3e3)}catch(r){console.error("Printing failed",r),o()}},100)}}))}generateReceiptHTML(e,i){return`
    <html>
      <head>
        <style>
          @page {
            size: 58mm auto;
            margin: 0 0 5mm 0;
          }

          body {
            font-family: monospace;
            width: 58mm;
            padding: 5mm;
            font-size: 10px;
            margin: 0;
          }

          .center { text-align: center; }
          .bold { font-weight: bold; }
          .line { border-top: 1px dashed #000; margin: 10px 0; }
          .flex {
            display: flex;
            justify-content: space-between;
          }
        </style>
      </head>
      <body>
        <div class="center bold">${i.name}</div>
        <div class="center">Invoice No: ${e.invoice_no}</div>
        <div class="center">
          Date: ${this.formatLocalTime(e.created_on)}
        </div>
        <div class="line"></div>

        ${e.products.map(n=>`
          <div class="flex">
            <div>${n.product_name} x${n.quantity}</div>
            <div>${n.total.toFixed(2)}</div>
          </div>
        `).join("")}

        <div class="line"></div>
        <div class="flex bold">
          <div>Total</div>
          <div>${e.total_amount.toFixed(2)} BDT</div>
        </div>

        <div style="height: 15mm;"></div>
        <div class="center">Thank you!</div>
        <div class="center">Powered by ${i.name}</div>
        <div class="center">${i.website}</div>
        </body>
    </html>
  `}printBarcodes(e){return this.isPrinting()?Promise.resolve():(this.isPrinting.set(!0),new Promise(i=>{let n=this.generateBarcodeHTML(e),t=window.open("","_blank");if(!t){console.error("Failed to open print window"),this.isPrinting.set(!1),i();return}t.document.open(),t.document.write(n),t.document.close();let o=()=>{t.close(),this.isPrinting.set(!1),i()};t.onload=()=>{setTimeout(()=>{try{t.focus(),t.print(),t.onafterprint=o,setTimeout(()=>o(),3e3)}catch(r){console.error("Printing failed",r),o()}},100)}}))}generateBarcodeHTML(e){return`
    <html>
      <head>
        <style>
          @page {
            size: 58mm auto;
            margin: 0;
          }

          body {
            margin: 0;
            padding: 0;
            font-family: Arial, Helvetica, sans-serif;
            width: 58mm;
            text-align: center;
            text-transform: uppercase;
            font-size: 9px;
          }

          .label {
            width: 50mm;
            margin: 0 auto;
            padding-left: 4mm;
          }

          .company, .product, .price {
            margin: 1px 0;
            line-height: 1.3;
            text-align: center;
          }

          .company {
            font-weight: bold;
            font-size: 8px;
          }

          .product {
            font-size: 10px;
            font-weight: bold;
          }

          .price {
            font-weight: bold;
            font-size: 10px;
          }

          svg {
            display: block;
            margin: 0 auto;
            padding: 0;
          }
        </style>
        <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"><\/script>
      </head>
      <body>
        <div class="label">
          <div class="company">${e.companyName}</div>
          <div class="product">${e.productName}</div>
          <svg id="barcode"></svg>
          <div class="price">\u09F3 ${e.price?.toFixed(2)}</div>
        </div>

        <script>
          JsBarcode("#barcode", "${e.batchCode}", {
            format: "CODE128",
            width: 0.9,
            height: 25,
            displayValue: true,
            fontSize: 10,
            margin: 0,
            textMargin: 0,
            fontOptions: "bold"
          });
        <\/script>
      </body>
    </html>
  `}static{this.\u0275fac=function(i){return new(i||s)}}static{this.\u0275prov=a({token:s,factory:s.\u0275fac,providedIn:"root"})}}return s})();export{d as a,h as b};
