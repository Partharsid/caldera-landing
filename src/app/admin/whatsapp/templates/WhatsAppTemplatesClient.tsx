"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageCircle, RotateCcw, Save, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

const TEMPLATE_META: Record<string, { label: string; desc: string; variables: string }> = {
  booking_confirmation: {
    label: "Booking Confirmation",
    desc: "Sent when a customer completes payment for a slot booking",
    variables: "{{customerName}}, {{serviceName}}, {{date}}, {{timeSlot}}, {{amount}}, {{bookingId}}",
  },
  booking_cancellation: {
    label: "Booking Cancellation",
    desc: "Sent when admin cancels a customer's booking",
    variables: "{{customerName}}, {{serviceName}}, {{date}}, {{timeSlot}}",
  },
  championship_registration: {
    label: "Championship Registration",
    desc: "Sent when a team registers for a championship (paid or free)",
    variables: "{{captainName}}, {{teamName}}, {{championshipName}}, {{fee}}",
  },
  match_schedule: {
    label: "Match Schedule",
    desc: "Sent when a match is scheduled in a championship bracket",
    variables: "{{teamName}}, {{championshipName}}, {{round}}, {{opponent}}, {{date}}, {{time}}",
  },
};

export default function WhatsAppTemplatesPage() {
  const [templates, setTemplates] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const { getTemplatesAction } = await import("@/app/admin/actions/whatsapp-templates");
      const data = await getTemplatesAction();
      setTemplates(data);
      setDirty({});
    } catch (e) {
      console.error("Failed to load templates", e);
    }
    setLoading(false);
  };

  useEffect(() => { loadTemplates(); }, []);

  const handleSave = async (key: string) => {
    if (!dirty[key]) return;
    setSaving(key);
    try {
      const { updateTemplateAction } = await import("@/app/admin/actions/whatsapp-templates");
      await updateTemplateAction(key as any, dirty[key]);
      setTemplates(prev => ({ ...prev, [key]: dirty[key] }));
      setDirty(prev => { const n = { ...prev }; delete n[key]; return n; });
      setSaved(key);
      setTimeout(() => setSaved(null), 2000);
    } catch (e) {
      console.error("Failed to save template", e);
    }
    setSaving(null);
  };

  const handleReset = async (key: string) => {
    try {
      const { resetTemplateAction } = await import("@/app/admin/actions/whatsapp-templates");
      await resetTemplateAction(key as any);
      await loadTemplates();
    } catch (e) {
      console.error("Failed to reset template", e);
    }
  };

  const templateKeys = Object.keys(TEMPLATE_META);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">WhatsApp Templates</h1>
        <p className="text-muted-foreground">Edit notification message templates sent to customers</p>
      </div>

      <Card className="bg-muted/50 border-dashed">
        <CardContent className="p-4 text-sm text-muted-foreground">
          <p><strong>How placeholders work:</strong> Use <code className="bg-muted px-1 rounded">{`{{variableName}}`}</code> in your template. They'll be replaced with real data when sending.</p>
        </CardContent>
      </Card>

      <Tabs defaultValue={templateKeys[0]}>
        <TabsList className="flex-wrap h-auto">
          {templateKeys.map((key) => (
            <TabsTrigger key={key} value={key} className="text-xs md:text-sm">
              {dirty[key] ? "• " : ""}{TEMPLATE_META[key].label}
            </TabsTrigger>
          ))}
        </TabsList>

        {templateKeys.map((key) => {
          const meta = TEMPLATE_META[key];
          const currentContent = dirty[key] ?? templates[key] ?? "";
          return (
            <TabsContent key={key} value={key} className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <MessageCircle className="h-5 w-5" />
                        {meta.label}
                      </CardTitle>
                      <CardDescription>{meta.desc}</CardDescription>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button variant="outline" size="sm" onClick={() => handleReset(key)}>
                        <RotateCcw className="h-3.5 w-3.5 mr-1" /> Reset
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleSave(key)}
                        disabled={!dirty[key] || saving === key}
                      >
                        {saving === key ? (
                          "Saving..."
                        ) : saved === key ? (
                          <><CheckCircle2 className="h-4 w-4 mr-1" /> Saved</>
                        ) : (
                          <><Save className="h-4 w-4 mr-1" /> Save</>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid gap-2">
                    <Label>Message Content</Label>
                    <Textarea
                      value={currentContent}
                      onChange={(e) => setDirty(prev => ({ ...prev, [key]: e.target.value }))}
                      rows={12}
                      className="font-mono text-sm"
                    />
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Available variables: <code className="bg-muted px-1 rounded">{meta.variables}</code>
                  </div>

                  {/* Preview */}
                  <Card className="bg-muted/30">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xs font-medium">Preview</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <pre className="text-xs whitespace-pre-wrap font-mono bg-card p-3 rounded border">
                        {currentContent
                          .replace(/{{customerName}}/g, "[Customer Name]")
                          .replace(/{{serviceName}}/g, "[Service]")
                          .replace(/{{date}}/g, "[Date]")
                          .replace(/{{timeSlot}}/g, "[Time]")
                          .replace(/{{amount}}/g, "[Amount]")
                          .replace(/{{bookingId}}/g, "[ID]")
                          .replace(/{{captainName}}/g, "[Captain]")
                          .replace(/{{teamName}}/g, "[Team Name]")
                          .replace(/{{championshipName}}/g, "[Championship]")
                          .replace(/{{fee}}/g, "[Fee]")
                          .replace(/{{round}}/g, "[Round]")
                          .replace(/{{opponent}}/g, "[Opponent]")
                          .replace(/{{time}}/g, "[Time]")}
                      </pre>
                    </CardContent>
                  </Card>
                </CardContent>
              </Card>
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}