"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Trophy, Users, Calendar, IndianRupee, ArrowLeft, RefreshCw, Trash2, Swords, CheckCircle2, Clock, User } from "lucide-react";
import { useChampionship, useChampionshipParticipants, useChampionshipMatches, useGenerateBracket, useUpdateChampionship, useDeleteChampionshipMatches, useUpdateMatchResult } from "@/hooks/useChampionships";
import { formatPrice } from "@/lib/pricing";
import { cn } from "@/lib/utils";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300",
  open: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300",
  in_progress: "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300",
  completed: "bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300",
};

const FORMAT_LABELS: Record<string, string> = {
  single_elimination: "Single Elimination",
  double_elimination: "Double Elimination",
  round_robin: "Round Robin",
  league: "League",
};

export default function ChampionshipDetailClient() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { data: championship, isLoading, refetch } = useChampionship(id);
  const { data: participants = [] } = useChampionshipParticipants(id);
  const { data: matches = [], refetch: refetchMatches } = useChampionshipMatches(id);
  const generateBracket = useGenerateBracket();
  const deleteMatches = useDeleteChampionshipMatches();
  const updateChampionship = useUpdateChampionship();
  const updateMatchResult = useUpdateMatchResult();

  const [scoreDialog, setScoreDialog] = useState<{ matchId: string; p1Name: string; p2Name: string; p1Id?: string; p2Id?: string } | null>(null);
  const [winnerId, setWinnerId] = useState("");
  const [scoreP1, setScoreP1] = useState("");
  const [scoreP2, setScoreP2] = useState("");

  const paidParticipants = participants.filter((p) => p.payment_status === "paid");
  const pendingParticipants = participants.filter((p) => p.payment_status === "pending");
  const matchesByRound = matches.reduce<Record<number, typeof matches>>((acc, m) => {
    (acc[m.round] ??= []).push(m);
    return acc;
  }, {});

  const totalRounds = Math.max(...matches.map((m) => m.round), 0);

  const handleGenerateBracket = async () => {
    if (!confirm("Generate bracket? This will create match pairings from paid participants.")) return;
    await generateBracket.mutateAsync(id);
    refetchMatches();
    refetch();
  };

  const handleDeleteMatches = async () => {
    if (!confirm("Delete all matches? This cannot be undone.")) return;
    await deleteMatches.mutateAsync(id);
    refetchMatches();
    refetch();
  };

  const handleStatusChange = (status: string) => {
    updateChampionship.mutate({ id, status }, {
      onSuccess: () => refetch(),
    });
  };

  const handleSubmitScore = async () => {
    if (!scoreDialog || !winnerId) return;
    await updateMatchResult.mutateAsync({
      matchId: scoreDialog.matchId,
      winner_id: winnerId,
      score_p1: scoreP1 || undefined,
      score_p2: scoreP2 || undefined,
    });
    setScoreDialog(null);
    setWinnerId("");
    setScoreP1("");
    setScoreP2("");
    refetchMatches();
    refetch();
  };

  const getParticipantName = (pid?: string) => {
    if (!pid) return "TBD";
    const p = participants.find((p) => p.id === pid);
    return p ? p.team_name : "TBD";
  };

  const formatDate = (d?: string) => {
    if (!d) return "";
    return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!championship) {
    return <div className="text-center py-16 text-muted-foreground">Championship not found</div>;
  }

  const registrationProgress = championship.max_participants > 0
    ? Math.round((championship.current_participants / championship.max_participants) * 100)
    : 0;

  const hasBracket = matches.length > 0;
  const completedMatches = matches.filter((m) => m.status === "completed").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.push("/admin/championships")}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{championship.name}</h1>
            <p className="text-sm text-muted-foreground capitalize">{championship.sport_type} · {FORMAT_LABELS[championship.format]}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={championship.status} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-44">
              <Badge className={cn("mr-2", STATUS_COLORS[championship.status])}>
                {championship.status.replace("_", " ")}
              </Badge>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="open">Open Registration</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => { refetch(); refetchMatches(); }}>
            <RefreshCw className="h-4 w-4 mr-1" /> Refresh
          </Button>
        </div>
      </div>

      {/* Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <IndianRupee className="h-4 w-4" />
              Registration Fee
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {championship.registration_fee > 0 ? formatPrice(championship.registration_fee) : "FREE"}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              Participants
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {paidParticipants.length} / {championship.max_participants}
            </div>
            <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${registrationProgress}%` }} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Trophy className="h-4 w-4" />
              Prize Pool
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {championship.prize_pool > 0 ? formatPrice(championship.prize_pool) : "—"}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {hasBracket ? "Matches" : "Start Date"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {hasBracket ? (
              <div className="text-2xl font-bold">{completedMatches}/{matches.length}</div>
            ) : (
              <div className="text-2xl font-bold">{formatDate(championship.start_date)}</div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left + Center: Bracket */}
        <div className="lg:col-span-2 space-y-6">
          {/* Bracket Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Swords className="h-5 w-5" />
                    Tournament Bracket
                  </CardTitle>
                  <CardDescription>
                    {hasBracket
                      ? `${totalRounds} rounds · ${matches.length} matches · ${completedMatches} completed`
                      : "Generate bracket from paid participants"}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {hasBracket ? (
                    <Button variant="destructive" size="sm" onClick={handleDeleteMatches}>
                      <Trash2 className="h-4 w-4 mr-1" /> Clear
                    </Button>
                  ) : (
                    <Button onClick={handleGenerateBracket} disabled={paidParticipants.length < 2 || generateBracket.isPending}>
                      <Swords className="h-4 w-4 mr-1" />
                      {generateBracket.isPending ? "Generating..." : "Generate Bracket"}
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {!hasBracket ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Swords className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p className="font-medium">No bracket generated yet</p>
                  <p className="text-sm mt-1">
                    {paidParticipants.length < 2
                      ? `Need at least 2 paid participants (${paidParticipants.length} paid)`
                      : "Click 'Generate Bracket' to create match pairings"}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {Object.entries(matchesByRound).map(([round, roundMatches]) => {
                    const roundNum = parseInt(round);
                    const roundName = roundNum === totalRounds ? "Final" : roundNum === totalRounds - 1 ? "Semi Finals" : roundNum === totalRounds - 2 ? "Quarter Finals" : `Round ${roundNum}`;
                    return (
                      <div key={round}>
                        <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                          {roundName}
                          <Badge variant="outline" className="text-xs">
                            {roundMatches.filter((m) => m.status === "completed").length}/{roundMatches.length}
                          </Badge>
                        </h4>
                        <div className="grid gap-2">
                          {roundMatches.map((match) => {
                            const p1Name = getParticipantName(match.participant1_id);
                            const p2Name = getParticipantName(match.participant2_id);
                            const isP1Winner = match.winner_id === match.participant1_id;
                            const isP2Winner = match.winner_id === match.participant2_id;
                            return (
                              <div
                                key={match.id}
                                className={cn(
                                  "flex items-center justify-between p-3 rounded-lg border text-sm transition-all",
                                  match.status === "completed"
                                    ? "bg-emerald-500/5 border-emerald-500/30"
                                    : match.status === "in_progress"
                                    ? "bg-blue-500/5 border-blue-500/30"
                                    : "bg-card border-border"
                                )}
                              >
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className={cn("font-medium", isP1Winner && "text-emerald-400")}>
                                      {match.participant1_id ? p1Name : <span className="text-muted-foreground italic">Bye</span>}
                                    </span>
                                    <span className="text-muted-foreground text-xs">vs</span>
                                    <span className={cn("font-medium", isP2Winner && "text-emerald-400")}>
                                      {match.participant2_id ? p2Name : <span className="text-muted-foreground italic">Bye</span>}
                                    </span>
                                  </div>
                                  {match.score_p1 && (
                                    <div className="text-xs text-muted-foreground mt-0.5">
                                      Score: {match.score_p1} - {match.score_p2}
                                    </div>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 shrink-0 ml-3">
                                  {match.status === "completed" ? (
                                    <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300 text-xs">
                                      <CheckCircle2 className="h-3 w-3 mr-1" /> Done
                                    </Badge>
                                  ) : match.participant1_id && match.participant2_id ? (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-7 text-xs"
                                      onClick={() => setScoreDialog({ matchId: match.id, p1Name, p2Name, p1Id: match.participant1_id, p2Id: match.participant2_id })}
                                    >
                                      Set Result
                                    </Button>
                                  ) : (
                                    <Badge variant="secondary" className="text-xs">
                                      <Clock className="h-3 w-3 mr-1" /> Waiting
                                    </Badge>
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
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: Participants */}
        <div className="space-y-6">
          {/* Description */}
          {championship.description && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">About</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{championship.description}</p>
              </CardContent>
            </Card>
          )}

          {/* Prizes */}
          {championship.prize_pool > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-amber-500" />
                  Prizes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">🥇 First</span>
                    <span className="font-semibold">{formatPrice(championship.first_prize)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">🥈 Second</span>
                    <span className="font-semibold">{formatPrice(championship.second_prize)}</span>
                  </div>
                  {championship.third_prize && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">🥉 Third</span>
                      <span className="font-semibold">{formatPrice(championship.third_prize)}</span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between font-bold">
                    <span>Total Pool</span>
                    <span className="text-primary">{formatPrice(championship.prize_pool)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Participants List */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Users className="h-4 w-4" />
                Participants ({paidParticipants.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {participants.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No registrations yet</p>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {paidParticipants.map((p, i) => (
                    <div key={p.id} className="flex items-center gap-2 p-2 rounded-md bg-muted/50">
                      <span className="text-xs font-bold text-muted-foreground w-5 shrink-0">#{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{p.team_name}</p>
                        <p className="text-xs text-muted-foreground">{p.captain_phone}</p>
                      </div>
                      <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300 text-xs">Paid</Badge>
                    </div>
                  ))}
                  {pendingParticipants.length > 0 && (
                    <>
                      <Separator />
                      <p className="text-xs text-muted-foreground font-medium">Pending ({pendingParticipants.length})</p>
                      {pendingParticipants.map((p) => (
                        <div key={p.id} className="flex items-center gap-2 p-2 rounded-md bg-muted/30">
                          <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm truncate">{p.team_name}</p>
                          </div>
                          <Badge variant="outline" className="text-xs text-amber-500">Pending</Badge>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Score Dialog */}
      <Dialog open={!!scoreDialog} onOpenChange={(o) => { if (!o) setScoreDialog(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Match Result</DialogTitle>
            <DialogDescription>{scoreDialog?.p1Name} vs {scoreDialog?.p2Name}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Winner</Label>
              <Select value={winnerId} onValueChange={setWinnerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select winner" />
                </SelectTrigger>
                <SelectContent>
                  {scoreDialog && (
                    <>
                      <SelectItem value={scoreDialog.p1Id || ""}>
                        {scoreDialog.p1Name}
                      </SelectItem>
                      <SelectItem value={scoreDialog.p2Id || ""}>
                        {scoreDialog.p2Name}
                      </SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Score (Player 1)</Label>
                <Input value={scoreP1} onChange={(e) => setScoreP1(e.target.value)} placeholder="e.g. 21" />
              </div>
              <div className="grid gap-2">
                <Label>Score (Player 2)</Label>
                <Input value={scoreP2} onChange={(e) => setScoreP2(e.target.value)} placeholder="e.g. 18" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setScoreDialog(null)}>Cancel</Button>
            <Button onClick={handleSubmitScore} disabled={!winnerId}>Confirm Result</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}