"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useSettings, useUpdateSetting } from "@/hooks/useSettings";
import { type Setting } from "@/lib/supabase";
import { Settings, Zap, WifiOff, Wrench, UserX, RefreshCw, AlertTriangle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

const SETTING_META: Record<string, { icon: React.ComponentType<{ className?: string }>; color: string; warnIfOn?: boolean }> = {
  force_peak_pricing:      { icon: Zap,     color: "text-amber-500",  warnIfOn: true },
  disable_online_bookings: { icon: WifiOff, color: "text-red-500",    warnIfOn: true },
  maintenance_mode:        { icon: Wrench,  color: "text-orange-500", warnIfOn: true },
  allow_walk_in_only:      { icon: UserX,   color: "text-red-500",    warnIfOn: true },
};

function SettingCard({ setting, onToggle, isSaving }: { setting: Setting; onToggle: (value: boolean) => void; isSaving: boolean }) {
  const meta = SETTING_META[setting.key] ?? { icon: Settings, color: "text-primary", warnIfOn: false };
  const Icon = meta.icon;
  const lastUpdated = new Date(setting.updated_at).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

  return (
    <Card className={cn("transition-all duration-200", setting.value && meta.warnIfOn ? "border-orange-300 dark:border-orange-700 bg-orange-50/30 dark:bg-orange-950/20" : "")}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4 flex-1 min-w-0">
            <div className={cn("mt-0.5 p-2 rounded-md bg-muted shrink-0", setting.value && meta.warnIfOn ? "bg-orange-100 dark:bg-orange-900/40" : "")}>
              <Icon className={cn("h-5 w-5", setting.value ? meta.color : "text-muted-foreground")} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-sm leading-tight">{setting.label}</h3>
                {setting.value ? (
                  <Badge className={cn("text-xs", meta.warnIfOn ? "bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300 border-orange-200" : "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300")}>
                    {meta.warnIfOn ? <><AlertTriangle className="h-3 w-3 mr-1" />ACTIVE</> : <><CheckCircle2 className="h-3 w-3 mr-1" />ON</>}
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-xs">OFF</Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{setting.description}</p>
              <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                <RefreshCw className="h-3 w-3" />Last updated: {lastUpdated}
              </p>
            </div>
          </div>
          <div className="shrink-0">
            <Switch
              id={`setting-${setting.key}`}
              checked={setting.value}
              onCheckedChange={onToggle}
              disabled={isSaving}
              className={cn(setting.value && meta.warnIfOn ? "data-[state=checked]:bg-orange-500" : "")}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function SettingsPage() {
  const { data: settings = [], isLoading, error } = useSettings();
  const updateSetting = useUpdateSetting();

  const handleToggle = (key: string, value: boolean) => {
    updateSetting.mutate({ key, value });
  };

  const activeCount = settings.filter((s) => s.value).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">Global configuration and operational overrides</p>
        </div>
        <div className="flex items-center gap-2">
          {activeCount > 0 && (
            <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300 gap-1">
              <AlertTriangle className="h-3.5 w-3.5" />{activeCount} override{activeCount > 1 ? "s" : ""} active
            </Badge>
          )}
        </div>
      </div>

      {activeCount > 0 && (
        <div className="rounded-lg border border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/30 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-orange-500 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-orange-800 dark:text-orange-300 text-sm">Operational Overrides Active</p>
              <p className="text-sm text-orange-700 dark:text-orange-400 mt-0.5">
                {activeCount} setting{activeCount > 1 ? "s are" : " is"} currently overriding normal system behaviour. Review and disable when no longer needed.
              </p>
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
            <p className="mt-2 text-sm text-muted-foreground">Loading settings…</p>
          </div>
        </div>
      ) : error ? (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
              <div>
                <p className="font-medium text-destructive">Failed to load settings</p>
                <p className="text-sm text-muted-foreground mt-1">{(error as Error).message}</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Have you run the <code className="font-mono bg-muted px-1 rounded">002_add_settings_table.sql</code> migration in your Supabase Dashboard?
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : settings.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Settings className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg">No settings found</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              Run the <code className="font-mono bg-muted px-1 rounded text-xs">002_add_settings_table.sql</code> migration in Supabase to seed the default settings.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Pricing & Booking */}
          <div>
            <h2 className="text-lg font-semibold mb-3">Pricing &amp; Bookings</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {settings
                .filter((s) => ["force_peak_pricing", "disable_online_bookings"].includes(s.key))
                .map((setting) => (
                  <SettingCard
                    key={setting.key}
                    setting={setting}
                    onToggle={(v) => handleToggle(setting.key, v)}
                    isSaving={updateSetting.isPending}
                  />
                ))}
            </div>
          </div>

          <Separator />

          {/* Operations */}
          <div>
            <h2 className="text-lg font-semibold mb-3">Operations</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {settings
                .filter((s) => ["maintenance_mode", "allow_walk_in_only"].includes(s.key))
                .map((setting) => (
                  <SettingCard
                    key={setting.key}
                    setting={setting}
                    onToggle={(v) => handleToggle(setting.key, v)}
                    isSaving={updateSetting.isPending}
                  />
                ))}
            </div>
          </div>

          {/* Catch-all for any other settings not in the above groups */}
          {settings.filter((s) => !["force_peak_pricing", "disable_online_bookings", "maintenance_mode", "allow_walk_in_only"].includes(s.key)).length > 0 && (
            <>
              <Separator />
              <div>
                <h2 className="text-lg font-semibold mb-3">Other Settings</h2>
                <div className="grid gap-4 md:grid-cols-2">
                  {settings
                    .filter((s) => !["force_peak_pricing", "disable_online_bookings", "maintenance_mode", "allow_walk_in_only"].includes(s.key))
                    .map((setting) => (
                      <SettingCard
                        key={setting.key}
                        setting={setting}
                        onToggle={(v) => handleToggle(setting.key, v)}
                        isSaving={updateSetting.isPending}
                      />
                    ))}
                </div>
              </div>
            </>
          )}

          <Separator />

          {/* Info footer */}
          <Card className="bg-muted/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">How Settings Work</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-1">
              <p>• Settings are stored in the Supabase <code className="font-mono bg-muted px-1 rounded text-xs">settings</code> table and persist across server restarts.</p>
              <p>• Changes take effect immediately — your API routes and pricing logic should read these values from Supabase on each request.</p>
              <p>• Orange-highlighted settings are operational overrides. Disable them when normal operations resume.</p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
