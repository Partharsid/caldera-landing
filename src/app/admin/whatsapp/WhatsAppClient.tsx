"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { MessageCircle, Smartphone, Send, RefreshCw, CheckCircle2, XCircle, Clock, AlertCircle, Download, Server, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

export default function WhatsAppPage() {
  const [status, setStatus] = useState<string>("checking");
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [workerUrl, setWorkerUrl] = useState("");
  const [broadcastMsg, setBroadcastMsg] = useState("");
  const [broadcastPhone, setBroadcastPhone] = useState("");
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<string | null>(null);

  const checkStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/whatsapp");
      const data = await res.json();
      setStatus(data.status);
      if (data.qr) setQrCode(data.qr);
    } catch {
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 5000);
    return () => clearInterval(interval);
  }, [checkStatus]);

  const handleSend = async () => {
    if (!broadcastPhone || !broadcastMsg) return;
    setSending(true);
    setSendResult(null);
    try {
      const res = await fetch("/api/whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: broadcastPhone, message: broadcastMsg }),
      });
      const data = await res.json();
      setSendResult(data.success ? "Sent successfully!" : "Failed: " + (data.error || "Unknown"));
    } catch (e: any) {
      setSendResult("Error: " + e.message);
    }
    setSending(false);
  };

  const statusBadge = () => {
    switch (status) {
      case "connected": return { label: "Connected", color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300", icon: CheckCircle2 };
      case "qr": return { label: "Scan QR", color: "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300", icon: Smartphone };
      case "connecting": return { label: "Connecting...", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300", icon: Clock };
      case "no_worker": return { label: "Not Configured", color: "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300", icon: Server };
      case "unreachable": return { label: "Worker Offline", color: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300", icon: XCircle };
      default: return { label: "Error", color: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300", icon: AlertCircle };
    }
  };

  const sb = statusBadge();
  const Icon = sb.icon;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">WhatsApp Integration</h1>
          <p className="text-muted-foreground">Send booking confirmations, alerts, and broadcasts</p>
        </div>
        <Badge className={cn("gap-2 px-3 py-1.5", sb.color)}>
          <Icon className="h-4 w-4" />
          {sb.label}
        </Badge>
      </div>

      {/* Setup Instructions */}
      {status === "no_worker" && (
        <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
              <Server className="h-5 w-5" />
              Setup Required
            </CardTitle>
            <CardDescription>WhatsApp needs a background worker to stay connected.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <h3 className="font-semibold text-sm">Option 1: Run on your computer (easiest)</h3>
              <ol className="text-sm space-y-2 text-muted-foreground list-decimal pl-5">
                <li>Download Node.js from nodejs.org</li>
                <li>Open terminal in your project folder</li>
                <li>Run: <code className="bg-muted px-2 py-0.5 rounded text-xs font-mono">node whatsapp-worker.js</code></li>
                <li>Scan the QR code that appears in terminal</li>
                <li>Keep the terminal window open</li>
                <li>Install <code className="bg-muted px-2 py-0.5 rounded text-xs font-mono">ngrok</code> and run: <code className="bg-muted px-2 py-0.5 rounded text-xs font-mono">ngrok http 3001</code></li>
                <li>Copy the ngrok URL and set it as <code className="bg-muted px-2 py-0.5 rounded text-xs font-mono">WHATSAPP_WORKER_URL</code> in Vercel</li>
              </ol>
            </div>

            <Separator />

            <div className="space-y-3">
              <h3 className="font-semibold text-sm">Option 2: Deploy to Railway (free, 24/7)</h3>
              <ol className="text-sm space-y-2 text-muted-foreground list-decimal pl-5">
                <li>Push code to GitHub</li>
                <li>Go to railway.app and deploy from GitHub</li>
                <li>Start command: <code className="bg-muted px-2 py-0.5 rounded text-xs font-mono">node whatsapp-worker.js</code></li>
                <li>Copy the Railway URL</li>
                <li>Set <code className="bg-muted px-2 py-0.5 rounded text-xs font-mono">WHATSAPP_WORKER_URL</code> in Vercel env vars</li>
              </ol>
            </div>

            <Separator />

            <div className="space-y-3">
              <h3 className="font-semibold text-sm">Option 3: Use Android phone with Termux</h3>
              <ol className="text-sm space-y-2 text-muted-foreground list-decimal pl-5">
                <li>Install Termux from F-Droid</li>
                <li>Install Node.js: <code className="bg-muted px-2 py-0.5 rounded text-xs font-mono">pkg install nodejs</code></li>
                <li>Clone repo and run: <code className="bg-muted px-2 py-0.5 rounded text-xs font-mono">node whatsapp-worker.js</code></li>
                <li>Keep Termux running in background</li>
              </ol>
            </div>

            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted text-sm">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>After setting up, refresh this page to check connection.</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Connected / QR Status */}
      {(status === "connected" || status === "qr" || status === "connecting" || status === "disconnected" || status === "unreachable") && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              Connection Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {status === "qr" && qrCode ? (
              <div className="text-center py-4">
                <p className="text-sm font-medium mb-3">Scan this QR code with your WhatsApp:</p>
                <div className="inline-block p-4 bg-white rounded-xl">
                  <img src={qrCode.startsWith("data:") ? qrCode : `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrCode)}`} alt="WhatsApp QR" className="w-48 h-48 mx-auto" />
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  Open WhatsApp → Menu → Linked Devices → Link a Device
                </p>
              </div>
            ) : status === "connected" ? (
              <div className="text-center py-8">
                <CheckCircle2 className="h-12 w-12 mx-auto text-emerald-500 mb-3" />
                <p className="font-medium">WhatsApp Connected ✓</p>
                <p className="text-sm text-muted-foreground mt-1">Messages will be sent automatically</p>
              </div>
            ) : status === "unreachable" ? (
              <div className="text-center py-8">
                <XCircle className="h-12 w-12 mx-auto text-red-500 mb-3" />
                <p className="font-medium">Worker Unreachable</p>
                <p className="text-sm text-muted-foreground mt-1">Make sure your WhatsApp worker is running</p>
              </div>
            ) : status === "disconnected" ? (
              <div className="text-center py-8">
                <XCircle className="h-12 w-12 mx-auto text-zinc-500 mb-3" />
                <p className="font-medium">Not Connected</p>
                <p className="text-sm text-muted-foreground mt-1">The worker is running but not connected to WhatsApp. Restart the Railway service to get a fresh QR.</p>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
                <p className="text-sm text-muted-foreground mt-3">Connecting to worker...</p>
              </div>
            )}
            <div className="flex justify-center mt-4">
              <Button variant="outline" size="sm" onClick={checkStatus}>
                <RefreshCw className="h-4 w-4 mr-1" /> Refresh
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Auto Notifications Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageCircle className="h-4 w-4" />
            Auto Notifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
              <p className="font-semibold text-sm text-emerald-600 dark:text-emerald-400">Booking Confirmed</p>
              <p className="text-xs text-muted-foreground mt-1">Auto-sent when customer pays</p>
            </div>
            <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/20">
              <p className="font-semibold text-sm text-red-600 dark:text-red-400">Booking Cancelled</p>
              <p className="text-xs text-muted-foreground mt-1">When admin cancels a booking</p>
            </div>
            <div className="p-3 rounded-lg bg-purple-500/5 border border-purple-500/20">
              <p className="font-semibold text-sm text-purple-600 dark:text-purple-400">Championship Updates</p>
              <p className="text-xs text-muted-foreground mt-1">Registration & match alerts</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Manual Send */}
      {(status === "connected" || status === "unreachable") && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Send className="h-4 w-4" />
              Manual Message
            </CardTitle>
            <CardDescription>Send a test message or notify a specific customer</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label>Customer Phone Number</Label>
              <Input
                value={broadcastPhone}
                onChange={(e) => setBroadcastPhone(e.target.value)}
                placeholder="+91 9876543210"
              />
            </div>
            <div className="grid gap-2">
              <Label>Message</Label>
              <Textarea
                value={broadcastMsg}
                onChange={(e) => setBroadcastMsg(e.target.value)}
                placeholder="Type your message..."
                rows={4}
              />
            </div>
            {sendResult && (
              <p className={cn("text-sm", sendResult.includes("Success") ? "text-emerald-500" : "text-red-500")}>
                {sendResult}
              </p>
            )}
            <Button onClick={handleSend} disabled={sending || status !== "connected"}>
              {sending ? "Sending..." : "Send Message"}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}