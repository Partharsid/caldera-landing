import { formatPrice } from "./pricing";

export interface PrintData {
  items: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
  subtotal: number;
  total: number;
  discount?: {
    code: string;
    amount: number;
  };
  transactionId?: string;
  paymentMethod?: string;
  customerPhone?: string;
}

export function printThermalReceipt(data: PrintData) {
  const printContent = `
    <html>
      <head>
        <style>
          @media print {
            @page { margin: 0; }
            body { font-family: monospace; font-size: 12px; margin: 0; padding: 10px; width: 58mm; color: #000; }
          }
          body { font-family: monospace; font-size: 12px; margin: 0; padding: 10px; width: 58mm; color: #000; }
          h1 { font-size: 16px; text-align: center; margin: 0 0 5px 0; }
          .center { text-align: center; }
          .item { display: flex; justify-content: space-between; margin-bottom: 5px; }
          .bold { font-weight: bold; }
          .divider { border-top: 1px dashed #000; margin: 8px 0; }
          .text-sm { font-size: 10px; }
        </style>
      </head>
      <body>
        <h1>RR Downtown Arcade</h1>
        <div class="center text-sm">Receipt</div>
        <div class="divider"></div>
        <div class="item text-sm">
          <span>Date:</span>
          <span>${new Date().toLocaleString()}</span>
        </div>
        ${data.transactionId ? `
        <div class="item text-sm">
          <span>TXN:</span>
          <span>${data.transactionId.slice(0, 8)}</span>
        </div>
        ` : ''}
        ${data.customerPhone ? `
        <div class="item text-sm">
          <span>Phone:</span>
          <span>${data.customerPhone}</span>
        </div>
        ` : ''}
        <div class="divider"></div>
        ${data.items.map(i => `
          <div class="item">
            <span>${i.name} (x${i.quantity})</span>
            <span>Rs ${i.price * i.quantity}</span>
          </div>
        `).join('')}
        <div class="divider"></div>
        <div class="item bold">
          <span>Subtotal</span>
          <span>Rs ${data.subtotal}</span>
        </div>
        ${data.discount ? `
        <div class="item">
          <span>Discount (${data.discount.code})</span>
          <span>-Rs ${data.discount.amount}</span>
        </div>
        ` : ''}
        <div class="divider"></div>
        <div class="item bold" style="font-size: 14px;">
          <span>TOTAL</span>
          <span>Rs ${data.total}</span>
        </div>
        ${data.paymentMethod ? `
        <div class="item text-sm">
          <span>Method</span>
          <span>${data.paymentMethod}</span>
        </div>
        ` : ''}
        <div class="divider"></div>
        <div class="center text-sm">Thank you for visiting!</div>
        <script>
          window.onload = function() { 
            window.print(); 
            setTimeout(function() { window.close(); }, 500); 
          }
        </script>
      </body>
    </html>
  `;

  const printWindow = window.open('', '_blank', 'width=300,height=600');
  if (printWindow) {
    printWindow.document.write(printContent);
    printWindow.document.close();
  }
}
