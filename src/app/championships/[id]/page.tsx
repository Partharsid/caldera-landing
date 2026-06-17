import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Trophy, Calendar, Users, IndianRupee, ArrowLeft, Gamepad2, Swords } from "lucide-react";
import { supabaseAdmin } from "@/lib/supabase-server";
import { formatPrice } from "@/lib/pricing";
import { cn } from "@/lib/utils";
import { Metadata } from "next";

export const revalidate = 30;

async function getChampionship(id: string) {
  const { data, error } = await supabaseAdmin
    .from("championships")
    .select("*, service:services(name, type)")
    .eq("id", id)
    .single();
  if (error) return null;
  return data;
}

async function getPaidParticipants(championshipId: string) {
  const { data, error } = await supabaseAdmin
    .from("championship_participants")
    .select("*")
    .eq("championship_id", championshipId)
    .eq("payment_status", "paid")
    .order("created_at", { ascending: true });
  if (error) return [];
  return data;
}

async function getMatches(championshipId: string) {
  const { data, error } = await supabaseAdmin
    .from("championship_matches")
    .select("*")
    .eq("championship_id", championshipId)
    .order("round", { ascending: true })
    .order("match_number", { ascending: true });
  if (error) return [];
  return data;
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const champ = await getChampionship(id);
  if (!champ) return { title: "Championship Not Found | RR Downtown Arcade" };
  return { title: `${champ.name} | RR Downtown Arcade`, description: champ.description || `Register for ${champ.name} at RR Downtown Arcade` };
}

export default async function ChampionshipDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const championship = await getChampionship(id);
  if (!championship) notFound();

  const participants = await getPaidParticipants(id);
  const matches = await getMatches(id);

  const formatLabel: Record<string, string> = {
    single_elimination: "Single Elimination",
    double_elimination: "Double Elimination",
    round_robin: "Round Robin",
    league: "League",
  };

  const matchesByRound = matches.reduce<Record<number, typeof matches>>((acc, m) => {
    (acc[m.round] ??= []).push(m);
    return acc;
  }, {});

  const totalRounds = Math.max(...matches.map((m) => m.round), 0);
  const registrationProgress = championship.max_participants > 0
    ? Math.round((championship.current_participants / championship.max_participants) * 100)
    : 0;

  return (
    <main className="min-h-screen bg-transparent text-white flex flex-col">
      <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/championships" className="flex items-center gap-2">
            <Gamepad2 className="w-5 h-5 text-primary" />
            <span className="text-sm font-bold">Championships</span>
          </Link>
          <Link href="/">
            <Button variant="ghost" size="sm" className="text-sm">← Home</Button>
          </Link>
        </div>
      </header>

      <section className="py-8 md:py-12 px-4">
        <div className="container mx-auto max-w-5xl">
          <Link href="/championships">
            <Button variant="ghost" className="mb-4 -ml-2">
              <ArrowLeft className="h-4 w-4 mr-1" /> All Championships
            </Button>
          </Link>

          {/* Hero */}
          <Card className="glass-card border-white/10 overflow-hidden mb-6">
            <CardHeader>
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-2xl md:text-4xl font-extrabold">{championship.name}</h1>
                    <Badge className={cn(
                      championship.status === "open" ? "bg-emerald-500/20 text-emerald-300" : "bg-blue-500/20 text-blue-300"
                    )}>
                      {championship.status === "open" ? "Open Registration" : "In Progress"}
                    </Badge>
                  </div>
                  <p className="text-zinc-400 capitalize">{championship.sport_type} · {formatLabel[championship.format]}</p>
                </div>
                {championship.status === "open" && (
                  <Link href={`/championships/${championship.id}/register`}>
                    <Button size="lg" className="neon-glow">
                      Register Now
                      {championship.registration_fee > 0 && ` - ${formatPrice(championship.registration_fee)}`}
                    </Button>
                  </Link>
                )}
              </div>
            </CardHeader>
          </Card>

          <div className="grid gap-6 md:grid-cols-3 mb-6">
            <Card className="glass-card border-white/10">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-zinc-400 text-sm mb-1">
                  <Calendar className="h-4 w-4" /> Start Date
                </div>
                <p className="text-xl font-bold">{formatDate(championship.start_date)}</p>
              </CardContent>
            </Card>
            <Card className="glass-card border-white/10">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-zinc-400 text-sm mb-1">
                  <Users className="h-4 w-4" /> Participants
                </div>
                <p className="text-xl font-bold">{championship.current_participants} / {championship.max_participants}</p>
                <div className="mt-2 h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: `${registrationProgress}%` }} />
                </div>
              </CardContent>
            </Card>
            <Card className="glass-card border-white/10">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-zinc-400 text-sm mb-1">
                  <IndianRupee className="h-4 w-4" /> Entry Fee
                </div>
                <p className="text-xl font-bold">
                  {championship.registration_fee > 0 ? formatPrice(championship.registration_fee) : <span className="text-emerald-400">FREE</span>}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Description + Prizes */}
          <div className="grid gap-6 md:grid-cols-2 mb-6">
            {championship.description && (
              <Card className="glass-card border-white/10">
                <CardHeader><CardTitle className="text-white">About</CardTitle></CardHeader>
                <CardContent><p className="text-zinc-300">{championship.description}</p></CardContent>
              </Card>
            )}
            {championship.prize_pool > 0 && (
              <Card className="glass-card border-white/10">
                <CardHeader><CardTitle className="text-white flex items-center gap-2"><Trophy className="h-5 w-5 text-amber-400" /> Prizes</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between text-sm"><span className="text-zinc-400">🥇 First</span><span className="font-bold text-white">{formatPrice(championship.first_prize)}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-zinc-400">🥈 Second</span><span className="font-bold text-white">{formatPrice(championship.second_prize)}</span></div>
                  {championship.third_prize && <div className="flex justify-between text-sm"><span className="text-zinc-400">🥉 Third</span><span className="font-bold text-white">{formatPrice(championship.third_prize)}</span></div>}
                  <Separator className="bg-white/10" />
                  <div className="flex justify-between font-bold text-sm"><span className="text-zinc-400">Total</span><span className="text-primary">{formatPrice(championship.prize_pool)}</span></div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Bracket */}
          {matches.length > 0 && (
            <Card className="glass-card border-white/10 mb-6">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Swords className="h-5 w-5" /> Tournament Bracket
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(matchesByRound).map(([round, roundMatches]) => {
                    const rn = parseInt(round);
                    const rnName = rn === totalRounds ? "Final" : rn === totalRounds - 1 ? "Semi Finals" : rn === totalRounds - 2 ? "Quarter Finals" : `Round ${rn}`;
                    return (
                      <div key={round}>
                        <h4 className="text-sm font-semibold text-zinc-300 mb-2">{rnName}</h4>
                        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                          {roundMatches.map((m) => {
                            const getPName = (pid?: string) => {
                              if (!pid) return "TBD";
                              const p = participants.find(p => p.id === pid);
                              return p ? p.team_name : "TBD";
                            };
                            const p1 = getPName(m.participant1_id);
                            const p2 = getPName(m.participant2_id);
                            const isP1Winner = m.winner_id === m.participant1_id;
                            const isP2Winner = m.winner_id === m.participant2_id;
                            return (
                              <div key={m.id} className="p-3 rounded-lg border border-white/10 bg-white/5">
                                <div className="text-sm">
                                  <p className={cn(isP1Winner && "text-emerald-400 font-semibold")}>{p1}</p>
                                  <p className="text-zinc-500 text-xs my-1">vs</p>
                                  <p className={cn(isP2Winner && "text-emerald-400 font-semibold")}>{p2}</p>
                                </div>
                                {m.score_p1 && (
                                  <p className="text-xs text-zinc-500 mt-1">{m.score_p1} - {m.score_p2}</p>
                                )}
                                <div className="mt-1">
                                  {m.status === "completed" ? (
                                    <span className="text-[10px] text-emerald-400">● Completed</span>
                                  ) : (
                                    <span className="text-[10px] text-zinc-500">○ Scheduled</span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Participants */}
          <Card className="glass-card border-white/10">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Users className="h-5 w-5" /> Participants ({participants.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {participants.length === 0 ? (
                <p className="text-center py-8 text-zinc-500">No registered participants yet. Be the first!</p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {participants.map((p, i) => (
                    <div key={p.id} className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10">
                      <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary">
                        {i + 1}
                      </div>
                      <div>
                        <p className="font-medium text-sm text-white">{p.team_name}</p>
                        <p className="text-xs text-zinc-500">{p.captain_name}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* CTA */}
          {championship.status === "open" && (
            <div className="text-center mt-8">
              <Link href={`/championships/${championship.id}/register`}>
                <Button size="lg" className="neon-glow text-lg px-8 py-6">
                  Register Now - {championship.registration_fee > 0 ? formatPrice(championship.registration_fee) : "FREE"}
                </Button>
              </Link>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}