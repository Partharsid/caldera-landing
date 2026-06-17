import Razorpay from "razorpay";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "",
  key_secret: process.env.RAZORPAY_SECRET || "",
});

console.log(Object.keys(razorpay));
console.log(razorpay.qrCode ? Object.keys(razorpay.qrCode) : "No qrCode");
