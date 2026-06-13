import { useState } from "react";
import {
  useListJobs,
  useListResumes,
  useRankCandidates,
  useListRankingRuns,
  useGetRankingRun,
} from "@workspace/api-client-react";
import type { RankedCandidate, RankingRun } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Trophy, User, Download, History, ChevronRight, ArrowLeft } from "lucide-react";
import { exportRankingPDF } from "@/lib/export-pdf";

// ── Candidate row (reused for live + historical views) ────────────────────────

function CandidateRow({ candidate, index }: { candidate: RankedCandidate; index: number }) {
  const rankColor =
    index === 0 ? "text-primary" : index === 1 ? "text-zinc-400" : index === 2 ? "text-amber-600/70" : "text-muted-foreground";

  return (
    <div className={`p-4 flex gap-4 ${index === 0 ? "bg-primary/5" : ""}`}>
      <div className="flex flex-col items-center justify-center min-w-[40px]">
        <span className={`text-2xl font-black font-serif ${rankColor}`}>#{candidate.rank}</span>
      </div>

      <div className="flex-1 space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-lg font-bold flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            {candidate.candidate_name}
          </h4>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Skill Match</div>
              <div className="font-mono text-sm">{candidate.skill_match.toFixed(1)}%</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">ATS Score</div>
              <div className="font-mono text-xl font-bold text-primary">{candidate.ats_score}</div>
            </div>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4 mt-3 pt-3 border-t border-border/50">
          <div>
            <div className="text-xs font-semibold text-muted-foreground mb-1.5 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Matched Skills ({candidate.matched_skills.length})
            </div>
            <div className="flex flex-wrap gap-1">
              {candidate.matched_skills.slice(0, 5).map((s: string, i: number) => (
                <Badge key={i} variant="outline" className="text-[10px] py-0 border-emerald-500/30 bg-emerald-500/5">{s}</Badge>
              ))}
              {candidate.matched_skills.length > 5 && (
                <span className="text-xs text-muted-foreground ml-1">+{candidate.matched_skills.length - 5}</span>
              )}
              {candidate.matched_skills.length === 0 && <span className="text-xs text-muted-foreground italic">None</span>}
            </div>
          </div>
          <div>
            <div className="text-xs font-semibold text-muted-foreground mb-1.5 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-destructive/80" />
              Missing Skills ({candidate.missing_skills.length})
            </div>
            <div className="flex flex-wrap gap-1">
              {candidate.missing_skills.slice(0, 5).map((s: string, i: number) => (
                <Badge key={i} variant="outline" className="text-[10px] py-0 border-destructive/30 text-destructive">{s}</Badge>
              ))}
              {candidate.missing_skills.length > 5 && (
                <span className="text-xs text-muted-foreground ml-1">+{candidate.missing_skills.length - 5}</span>
              )}
              {candidate.missing_skills.length === 0 && <span className="text-xs text-muted-foreground italic">None</span>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Past ranking run row ──────────────────────────────────────────────────────

function HistoryRow({ run, isActive, onClick }: { run: RankingRun; isActive: boolean; onClick: () => void }) {
  const date = new Date(run.created_at).toLocaleDateString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
  });
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-2.5 hover:bg-muted/60 transition-colors flex items-center gap-3 ${isActive ? "bg-primary/10 border-l-2 border-primary" : ""}`}
    >
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm truncate">{run.job_title}</div>
        <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
          <span>{date}</span>
          <span>·</span>
          <span>{run.candidate_count} candidates</span>
          {run.top_score != null && (
            <>
              <span>·</span>
              <span className="text-primary font-mono font-medium">top {run.top_score.toFixed(1)}</span>
            </>
          )}
        </div>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
    </button>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function RankPage() {
  const { toast } = useToast();
  const { data: jobs, isLoading: isLoadingJobs } = useListJobs();
  const { data: resumes, isLoading: isLoadingResumes } = useListResumes();
  const { data: history, isLoading: isLoadingHistory } = useListRankingRuns();

  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [selectedResumeIds, setSelectedResumeIds] = useState<number[]>([]);
  const [exporting, setExporting] = useState(false);
  const [viewingRunId, setViewingRunId] = useState<number | null>(null);

  const rankCandidates = useRankCandidates();

  const { data: historicalRun, isLoading: isLoadingRun } = useGetRankingRun(viewingRunId!, {
    query: { enabled: viewingRunId !== null, queryKey: ["rankingRun", viewingRunId] },
  });

  const selectedJobTitle = jobs?.find(j => j.id.toString() === selectedJobId)?.title ?? "Unknown Role";

  const handleToggleResume = (id: number) => {
    setSelectedResumeIds(prev =>
      prev.includes(id) ? prev.filter(rId => rId !== id) : [...prev, id]
    );
  };

  const handleToggleAll = () => {
    if (!resumes) return;
    setSelectedResumeIds(
      selectedResumeIds.length === resumes.length ? [] : resumes.map(r => r.id)
    );
  };

  const handleRank = () => {
    if (!selectedJobId || selectedResumeIds.length === 0) return;
    setViewingRunId(null);
    rankCandidates.mutate(
      { data: { job_id: parseInt(selectedJobId), resume_ids: selectedResumeIds } },
      {
        onSuccess: () => {
          // history list will auto-refetch via invalidation
        },
        onError: (err: unknown) => {
          const msg = err instanceof Error ? err.message : "Failed to generate rankings.";
          toast({ title: "Ranking failed", description: msg, variant: "destructive" });
        },
      }
    );
  };

  const handleExport = () => {
    const candidates = viewingRunId
      ? (historicalRun?.candidates as RankedCandidate[] | undefined)
      : (rankCandidates.data as RankedCandidate[] | undefined);
    const jobTitle = viewingRunId ? (historicalRun?.job_title ?? "Unknown Role") : selectedJobTitle;
    if (!candidates || candidates.length === 0) return;
    setExporting(true);
    try {
      exportRankingPDF(candidates, jobTitle);
    } finally {
      setExporting(false);
    }
  };

  // What to show in the leaderboard panel
  const isViewingHistory = viewingRunId !== null;
  const displayCandidates: RankedCandidate[] | undefined = isViewingHistory
    ? (historicalRun?.candidates as RankedCandidate[] | undefined)
    : (rankCandidates.data as RankedCandidate[] | undefined);
  const displayJobTitle = isViewingHistory
    ? (historicalRun?.job_title ?? "…")
    : selectedJobTitle;
  const displayDate = isViewingHistory && historicalRun
    ? new Date(historicalRun.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
    : null;

  const hasResults = Boolean(displayCandidates && displayCandidates.length > 0);
  const isPending = isViewingHistory ? isLoadingRun : rankCandidates.isPending;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Candidate Ranking</h1>
        <p className="text-muted-foreground mt-1">Select a job and a pool of candidates to generate a ranked leaderboard.</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">

        {/* ── Left panel ── */}
        <div className="lg:col-span-1 space-y-6">

          {/* New ranking controls */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Target Role</CardTitle>
              <CardDescription>The job profile to evaluate against.</CardDescription>
            </CardHeader>
            <CardContent>
              <Select value={selectedJobId} onValueChange={setSelectedJobId} disabled={isLoadingJobs}>
                <SelectTrigger>
                  <SelectValue placeholder={isLoadingJobs ? "Loading..." : "Select Job"} />
                </SelectTrigger>
                <SelectContent>
                  {jobs?.map(job => (
                    <SelectItem key={job.id} value={job.id.toString()}>
                      {job.title} {job.company ? `(${job.company})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Candidate Pool</CardTitle>
                <CardDescription>Select resumes to rank.</CardDescription>
              </div>
              {resumes && resumes.length > 0 && (
                <Button variant="ghost" size="sm" onClick={handleToggleAll} className="h-8 text-xs">
                  {selectedResumeIds.length === resumes.length ? "Deselect All" : "Select All"}
                </Button>
              )}
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[220px] border-t border-border">
                <div className="divide-y divide-border">
                  {isLoadingResumes ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">Loading resumes...</div>
                  ) : resumes?.length === 0 ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">No resumes available.</div>
                  ) : (
                    resumes?.map(resume => (
                      <label key={resume.id} className="flex items-center gap-3 p-3 hover:bg-muted/50 cursor-pointer">
                        <Checkbox
                          checked={selectedResumeIds.includes(resume.id)}
                          onCheckedChange={() => handleToggleResume(resume.id)}
                        />
                        <div className="flex flex-col">
                          <span className="font-medium text-sm">{resume.candidate_name}</span>
                          <span className="text-xs text-muted-foreground font-mono truncate max-w-[200px]">{resume.filename}</span>
                        </div>
                      </label>
                    ))
                  )}
                </div>
              </ScrollArea>
              <div className="p-4 bg-muted/20 border-t border-border flex items-center justify-between">
                <span className="text-sm font-medium">{selectedResumeIds.length} selected</span>
                <Button
                  onClick={handleRank}
                  disabled={!selectedJobId || selectedResumeIds.length < 2 || rankCandidates.isPending}
                  size="sm"
                >
                  {rankCandidates.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Rank Candidates
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Rankings history */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <History className="h-4 w-4 text-muted-foreground" />
                Past Rankings
              </CardTitle>
              <CardDescription className="text-xs">
                {history?.length
                  ? `${history.length} saved run${history.length !== 1 ? "s" : ""}`
                  : "No runs yet"}
              </CardDescription>
            </CardHeader>
            <Separator />
            <CardContent className="p-0">
              {isLoadingHistory ? (
                <div className="p-3 space-y-2">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : !history || history.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-5 px-4">
                  Rankings appear here after you run a comparison.
                </p>
              ) : (
                <ScrollArea className="max-h-[280px]">
                  <div className="divide-y divide-border/50">
                    {history.map(run => (
                      <HistoryRow
                        key={run.id}
                        run={run}
                        isActive={viewingRunId === run.id}
                        onClick={() => setViewingRunId(viewingRunId === run.id ? null : run.id)}
                      />
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Right panel — Leaderboard ── */}
        <div className="lg:col-span-2">
          <Card className="h-full flex flex-col">
            <CardHeader className="bg-card border-b border-border flex flex-row items-start justify-between gap-2 flex-wrap">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-primary" />
                  {isViewingHistory ? (
                    <span className="flex items-center gap-2 text-base">
                      <span className="text-muted-foreground font-normal">History:</span>
                      {displayJobTitle}
                    </span>
                  ) : "Leaderboard"}
                </CardTitle>
                {isViewingHistory && displayDate && (
                  <p className="text-xs text-muted-foreground mt-1 ml-7">Saved on {displayDate}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {isViewingHistory && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setViewingRunId(null)}
                    className="gap-1.5 text-xs"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" /> Live view
                  </Button>
                )}
                {hasResults && (
                  <Button
                    onClick={handleExport}
                    disabled={exporting}
                    variant="outline"
                    size="sm"
                    className="gap-2 shrink-0"
                  >
                    {exporting ? (
                      <><Loader2 className="h-4 w-4 animate-spin" /> Generating…</>
                    ) : (
                      <><Download className="h-4 w-4" /> Export PDF</>
                    )}
                  </Button>
                )}
              </div>
            </CardHeader>

            <CardContent className="flex-1 p-0 flex flex-col">
              {/* Empty states */}
              {!hasResults && !isPending && !isViewingHistory && (
                <div className="flex-1 flex flex-col items-center justify-center p-12 text-muted-foreground">
                  <Trophy className="h-16 w-16 mb-4 opacity-10" />
                  <p className="text-lg font-medium">No results yet</p>
                  <p className="text-sm">Select a job and at least 2 candidates to generate a ranking.</p>
                </div>
              )}

              {/* Loading state */}
              {isPending && (
                <div className="flex-1 flex flex-col items-center justify-center p-12 text-primary">
                  <Loader2 className="h-12 w-12 mb-4 animate-spin" />
                  <p className="text-lg font-medium animate-pulse">
                    {isViewingHistory ? "Loading saved ranking…" : "Running Comparative Analysis..."}
                  </p>
                </div>
              )}

              {/* Results */}
              {hasResults && displayCandidates && (
                <>
                  {isViewingHistory && (
                    <div className="px-4 py-2 bg-amber-500/5 border-b border-amber-500/20 flex items-center gap-2">
                      <History className="h-3.5 w-3.5 text-amber-500" />
                      <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                        Viewing saved run from {displayDate} · {displayCandidates.length} candidates
                      </span>
                    </div>
                  )}
                  <div className="divide-y divide-border">
                    {displayCandidates.map((candidate, index) => (
                      <CandidateRow key={candidate.resume_id} candidate={candidate} index={index} />
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
