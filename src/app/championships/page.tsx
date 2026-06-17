import Link from "next/link";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trophy, Calendar, Users, IndianRupee, ArrowRight, Gamepad2 } from "lucide-react";
import { supabaseAdmin } from "@/lib/supabase-server";
import { formatPrice } from "@/lib/pricing";
import { cn } from "@/lib/utils";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Championships & Tournaments | RR Downtown Arcade",
  description: "Participate in exciting championships and tournaments at RR Downtown Arcade. Register online and compete for prizes!",
};

export const revalidate = 30;

async function getChampionships() {
  const { data, error } = await supabaseAdmin
    .from("championships")
    .select("*, service:services(name, type)")
    .in("status", ["open", "in_progress"])
    .order("start_date", { ascending: true });
  if (error) return [];
  return data;
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}

export default async function ChampionshipsPage() {
  const championships = await getChampionships();

  return (
    <main className="min-h-screen bg-transparent text-white flex flex-col">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Gamepad2 className="w-6 h-6 text-primary" />
            <span className="text-xl font-bold tracking-tight">RR Downtown Arcade</span>
          </Link>
          <Link href="/">
            <Button variant="ghost" size="sm">← Back to Home</Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="py-12 md:py-16 px-4 text-center">
        <div className="container mx-auto max-w-4xl">
          <div className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-full mb-4">
            <Trophy className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
            Championships & <span className="text-primary">Tournaments</span>
          </h1>
          <p className="text-lg text-zinc-300 max-w-2xl mx-auto">
            Compete, win prizes, and become a champion. Register for upcoming tournaments online.
          </p>
        </div>
      </section>

      {/* Championship Grid */}
      <section className="pb-16 px-4">
        <div className="container mx-auto">
          {championships.length === 0 ? (
            <div className="text-center py-16">
              <Trophy className="h-16 w-16 mx-auto text-zinc-600 mb-4" />
              <h2 className="text-2xl font-bold mb-2">No Active Championships</h2>
              <p className="text-zinc-400">Check back soon for upcoming tournaments and competitions.</p>
              <Link href="/">
                <Button variant="outline" className="mt-6">Back to Home</Button>
              </Link>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {championships.map((champ) => (
                <Card key={champ.id} className="bg-card border-border hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 overflow-hidden group">
                  {champ.banner_image_url && (
                    <div className="w-full h-40 relative overflow-hidden">
                      <Image src={champ.banner_image_url} alt={champ.name} fill className="object-cover transition-transform duration-300 group-hover:scale-105" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                    </div>
                  )}
                  <CardHeader className={cn("pb-2", champ.banner_image_url ? "pt-3" : "")}>
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-lg font-bold">{champ.name}</CardTitle>
                      <Badge className={cn(
                        "shrink-0",
                        champ.status === "open" ? "bg-emerald-500/20 text-emerald-300" : "bg-blue-500/20 text-blue-300"
                      )}>
                        {champ.status === "open" ? "Open" : "In Progress"}
                      </Badge>
                    </div>
                    <p className="text-xs text-zinc-400 capitalize">{champ.sport_type} · {(champ as any).service?.name || "Arcade"}</p>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-4 text-sm text-zinc-300 flex-wrap">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="h-4 w-4 text-zinc-400" />
                        {formatDate(champ.start_date)}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Users className="h-4 w-4 text-zinc-400" />
                        {champ.current_participants}/{champ.max_participants}
                      </span>
                    </div>

                    {champ.prize_pool > 0 && (
                      <div className="flex items-center gap-3 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
                        <Trophy className="h-5 w-5 text-amber-400 shrink-0" />
                        <div>
                          <p className="text-xs text-zinc-400">Prize Pool</p>
                          <p className="font-bold text-amber-400">{formatPrice(champ.prize_pool)}</p>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t border-border">
                      <div>
                        <p className="text-xs text-zinc-400">Entry Fee</p>
                        <p className="font-bold text-lg">
                          {champ.registration_fee > 0 ? formatPrice(champ.registration_fee) : <span className="text-emerald-400">FREE</span>}
                        </p>
                      </div>
                      <Link href={`/championships/${champ.id}`}>
                        <Button className="neon-glow">
                          View Details
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-border py-6 px-4">
        <div className="container mx-auto text-center text-sm text-zinc-500">
          <p>© {new Date().getFullYear()} RR Downtown Arcade. All rights reserved.</p>
        </div>
      </footer>
    </main>
  );
}