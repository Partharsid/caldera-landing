import Razorpay from "razorpay";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "",
  key_secret: process.env.RAZORPAY_SECRET || "",
});

async function run() {
  try {
    const qr = await razorpay.qrCode.create({
      type: "upi_qr",
      name: "Store Front POS",
      usage: "single_use",
      fixed_amount: true,
      payment_amount: 50000, // 500 INR
      description: "POS Order",
      close_by: Math.round(Date.now() / 1000) + 15 * 60,
    });
    console.log(qr);
  } catch (err) {
    console.error("Error creating QR:", err);
  }
}

run();
