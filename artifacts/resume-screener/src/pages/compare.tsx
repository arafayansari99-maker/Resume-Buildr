import { useState } from "react";
import {
  useListResumes,
  useListJobs,
  useAnalyzeResume,
} from "@workspace/api-client-react";
import type { AnalysisResult } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";
import {
  GitCompare,
  Trophy,
  Loader2,
  CheckCircle2,
  XCircle,
  Sparkles,
  Minus,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useNotifications } from "@/hooks/use-notifications";

// ── Types ───────────────────────────────────────────────────────────────────

interface SlotState {
  resumeId: string;
  result: AnalysisResult | null;
  loading: boolean;
  error: string | null;
}

const emptySlot = (): SlotState => ({ resumeId: "", result: null, loading: false, error: null });

// ── Helpers ──────────────────────────────────────────────────────────────────

function scoreColor(score: number) {
  if (score >= 75) return "text-emerald-400";
  if (score >= 50) return "text-amber-400";
  return "text-destructive";
}

function scoreBarColor(score: number) {
  if (score >= 75) return "bg-emerald-500";
  if (score >= 50) return "bg-amber-400";
  return "bg-destructive";
}

function pct(n: number | undefined) {
  return typeof n === "number" ? Math.round(n) : 0;
}

function buildRadarData(a: AnalysisResult | null, b: AnalysisResult | null) {
  const axes = [
    { label: "Skill Match",   keyA: "skill_match",          keyB: "skill_match" },
    { label: "Semantic",      keyA: "semantic_similarity",   keyB: "semantic_similarity" },
    { label: "Experience",    keyA: "experience_match",      keyB: "experience_match" },
    { label: "Education",     keyA: "education_match",       keyB: "education_match" },
    { label: "Keywords",      keyA: "keyword_coverage",      keyB: "keyword_coverage" },
  ] as const;

  return axes.map(({ label, keyA }) => ({
    axis: label,
    A: pct(a?.score_breakdown?.[keyA]),
    B: pct(b?.score_breakdown?.[keyA]),
  }));
}

// ── Score breakdown bar row ──────────────────────────────────────────────────

function BreakdownRow({ label, value, compare }: { label: string; value: number; compare?: number }) {
  const delta = compare !== undefined ? value - compare : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground font-medium">{label}</span>
        <div className="flex items-center gap-2">
          {compare !== undefined && (
            <span className={cn("font-mono text-[10px]", delta > 0 ? "text-emerald-400" : delta < 0 ? "text-destructive" : "text-muted-foreground")}>
              {delta > 0 ? `+${delta.toFixed(0)}` : delta < 0 ? delta.toFixed(0) : "="}{"%"}
            </span>
          )}
          <span className={cn("font-mono font-bold", scoreColor(value))}>{value.toFixed(0)}%</span>
        </div>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all", scoreBarColor(value))}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

// ── Candidate slot card ──────────────────────────────────────────────────────

function SlotCard({
  slot,
  label,
  color,
  compareResult,
  resumes,
  jobId,
  onResumeChange,
  onAnalyze,
}: {
  slot: SlotState;
  label: string;
  color: "blue" | "violet";
  compareResult: AnalysisResult | null;
  resumes: ReturnType<typeof useListResumes>["data"];
  jobId: string;
  onResumeChange: (id: string) => void;
  onAnalyze: () => void;
}) {
  const accentClass = color === "blue" ? "text-blue-400 border-blue-400/30 bg-blue-400/5" : "text-violet-400 border-violet-400/30 bg-violet-400/5";
  const radarColor = color === "blue" ? "#60a5fa" : "#a78bfa";
  const result = slot.result;

  return (
    <div className="space-y-4">
      {/* Selector */}
      <div className={cn("rounded-lg border p-4 space-y-3", accentClass)}>
        <div className="flex items-center gap-2">
          <span className={cn("text-xs font-bold uppercase tracking-widest", color === "blue" ? "text-blue-400" : "text-violet-400")}>
            Candidate {label}
          </span>
        </div>
        <Select value={slot.resumeId} onValueChange={onResumeChange}>
          <SelectTrigger className="bg-background/60">
            <SelectValue placeholder="Select a resume…" />
          </SelectTrigger>
          <SelectContent>
            {resumes?.map(r => (
              <SelectItem key={r.id} value={r.id.toString()}>{r.candidate_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          size="sm"
          className="w-full gap-2"
          disabled={!slot.resumeId || !jobId || slot.loading}
          onClick={onAnalyze}
          style={{ background: radarColor, color: "#0d1117" }}
        >
          {slot.loading
            ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Analyzing…</>
            : <><Sparkles className="h-3.5 w-3.5" /> Run Analysis</>
          }
        </Button>
        {slot.error && (
          <p className="text-xs text-destructive">{slot.error}</p>
        )}
      </div>

      {/* Results */}
      {slot.loading && (
        <div className="space-y-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-40" />
          <Skeleton className="h-32" />
        </div>
      )}

      {result && !slot.loading && (
        <div className="space-y-4">
          {/* ATS Score hero */}
          <div className="rounded-lg border border-border bg-card p-4 text-center">
            <div className="text-xs uppercase tracking-widest text-muted-foreground font-semibold mb-1">ATS Score</div>
            <div className={cn("text-6xl font-black font-mono tabular-nums", scoreColor(result.ats_score ?? 0))}>
              {(result.ats_score ?? 0).toFixed(1)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">/ 100</div>
          </div>

          {/* Score breakdown */}
          <Card>
            <CardHeader className="pb-3 pt-4 px-4">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Score Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-3">
              <BreakdownRow
                label="Skill Match"
                value={pct(result.score_breakdown?.skill_match)}
                compare={pct(compareResult?.score_breakdown?.skill_match)}
              />
              <BreakdownRow
                label="Semantic Similarity"
                value={pct(result.score_breakdown?.semantic_similarity)}
                compare={pct(compareResult?.score_breakdown?.semantic_similarity)}
              />
              <BreakdownRow
                label="Experience Match"
                value={pct(result.score_breakdown?.experience_match)}
                compare={pct(compareResult?.score_breakdown?.experience_match)}
              />
              <BreakdownRow
                label="Education Match"
                value={pct(result.score_breakdown?.education_match)}
                compare={pct(compareResult?.score_breakdown?.education_match)}
              />
              <BreakdownRow
                label="Keyword Coverage"
                value={pct(result.score_breakdown?.keyword_coverage)}
                compare={pct(compareResult?.score_breakdown?.keyword_coverage)}
              />
            </CardContent>
          </Card>

          {/* Skills */}
          <Card>
            <CardHeader className="pb-3 pt-4 px-4">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Skill Profile</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-4">
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  <span className="text-xs font-semibold text-emerald-500">Matched ({result.skill_gap?.matched_skills?.length ?? 0})</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {result.skill_gap?.matched_skills?.length === 0
                    ? <span className="text-xs text-muted-foreground italic">None</span>
                    : result.skill_gap?.matched_skills?.map((s, i) => (
                      <Badge key={i} variant="outline" className="text-[10px] font-mono border-emerald-500/30 bg-emerald-500/5 text-emerald-400">{s}</Badge>
                    ))
                  }
                </div>
              </div>
              <Separator />
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <XCircle className="h-3.5 w-3.5 text-destructive/80" />
                  <span className="text-xs font-semibold text-destructive/80">Missing ({result.skill_gap?.missing_skills?.length ?? 0})</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {result.skill_gap?.missing_skills?.length === 0
                    ? <span className="text-xs text-muted-foreground italic">None</span>
                    : result.skill_gap?.missing_skills?.map((s, i) => (
                      <Badge key={i} variant="outline" className="text-[10px] font-mono border-destructive/30 bg-destructive/5 text-destructive">{s}</Badge>
                    ))
                  }
                </div>
              </div>
              {(result.skill_gap?.extra_skills?.length ?? 0) > 0 && (
                <>
                  <Separator />
                  <div>
                    <div className="flex items-center gap-1.5 mb-2">
                      <Sparkles className="h-3.5 w-3.5 text-blue-400" />
                      <span className="text-xs font-semibold text-blue-400">Bonus Skills ({result.skill_gap?.extra_skills?.length})</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {result.skill_gap?.extra_skills?.map((s, i) => (
                        <Badge key={i} variant="outline" className="text-[10px] font-mono border-blue-400/30 bg-blue-400/5 text-blue-400">{s}</Badge>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function ComparePage() {
  const { data: resumes } = useListResumes();
  const { data: jobs } = useListJobs();
  const { addNotification } = useNotifications();
  const analyzeResume = useAnalyzeResume();

  const [jobId, setJobId] = useState("");
  const [slotA, setSlotA] = useState<SlotState>(emptySlot());
  const [slotB, setSlotB] = useState<SlotState>(emptySlot());

  const runAnalysis = (
    slot: SlotState,
    setSlot: React.Dispatch<React.SetStateAction<SlotState>>
  ) => {
    if (!slot.resumeId || !jobId) return;
    setSlot(s => ({ ...s, loading: true, error: null, result: null }));

    analyzeResume.mutate(
      { data: { resume_id: parseInt(slot.resumeId), job_id: parseInt(jobId) } },
      {
        onSuccess: (result) => {
          setSlot(s => ({ ...s, loading: false, result }));
          addNotification({
            type: "success",
            title: "Analysis complete",
            message: `${result.candidate_name} scored ${result.ats_score?.toFixed(1)} for ${result.job_title}.`,
          });
        },
        onError: (err: unknown) => {
          const msg = err instanceof Error ? err.message : "Analysis failed";
          setSlot(s => ({ ...s, loading: false, error: msg }));
          addNotification({ type: "error", title: "Analysis failed", message: msg });
        },
      }
    );
  };

  const bothReady = slotA.result && slotB.result;
  const radarData = buildRadarData(slotA.result, slotB.result);

  // Winner logic
  const scoreA = slotA.result?.ats_score ?? 0;
  const scoreB = slotB.result?.ats_score ?? 0;
  const winner = !bothReady ? null : scoreA > scoreB ? "A" : scoreB > scoreA ? "B" : "tie";
  const winnerName = winner === "A"
    ? slotA.result?.candidate_name
    : winner === "B"
    ? slotB.result?.candidate_name
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <GitCompare className="h-7 w-7 text-primary" /> Candidate Comparison
        </h1>
        <p className="text-muted-foreground mt-1">
          Select two candidates and a job to compare their profiles side-by-side with a radar chart.
        </p>
      </div>

      {/* Job selector */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <Label className="text-sm font-semibold shrink-0">Job to compare against</Label>
            <Select value={jobId} onValueChange={setJobId}>
              <SelectTrigger className="max-w-xs bg-background">
                <SelectValue placeholder="Select a job…" />
              </SelectTrigger>
              <SelectContent>
                {jobs?.map(j => (
                  <SelectItem key={j.id} value={j.id.toString()}>{j.title}{j.company ? ` — ${j.company}` : ""}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!jobId && (
              <p className="text-xs text-muted-foreground italic">Choose a job first, then pick candidates below.</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Winner banner */}
      {bothReady && (
        <div className={cn(
          "rounded-lg border px-5 py-4 flex items-center gap-4 text-sm font-semibold",
          winner === "tie"
            ? "bg-muted/30 border-border text-muted-foreground"
            : "bg-primary/10 border-primary/30 text-primary"
        )}>
          {winner === "tie" ? (
            <><Minus className="h-5 w-5 shrink-0" /> It's a tie — both candidates scored equally.</>
          ) : (
            <>
              <Trophy className="h-5 w-5 shrink-0 text-primary" />
              <span>
                <span className="text-foreground">{winnerName}</span>
                {" "}is the stronger match — scored{" "}
                <span className="font-mono text-primary">
                  {(winner === "A" ? scoreA : scoreB).toFixed(1)}
                </span>
                {" "}vs{" "}
                <span className="font-mono text-muted-foreground">
                  {(winner === "A" ? scoreB : scoreA).toFixed(1)}
                </span>
                {" "}(+{Math.abs(scoreA - scoreB).toFixed(1)} pts ahead)
              </span>
            </>
          )}
        </div>
      )}

      {/* Radar chart — only when both have results */}
      {bothReady && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <GitCompare className="h-4 w-4 text-primary" /> Radar Comparison
            </CardTitle>
            <CardDescription>Each axis is 0–100%. Larger area = stronger profile.</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={340}>
              <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
                <PolarGrid stroke="#334155" strokeOpacity={0.5} />
                <PolarAngleAxis
                  dataKey="axis"
                  tick={{ fill: "#94a3b8", fontSize: 12, fontWeight: 500 }}
                />
                <Radar
                  name={slotA.result?.candidate_name ?? "Candidate A"}
                  dataKey="A"
                  stroke="#60a5fa"
                  fill="#60a5fa"
                  fillOpacity={0.18}
                  strokeWidth={2}
                  dot={{ fill: "#60a5fa", r: 3 }}
                />
                <Radar
                  name={slotB.result?.candidate_name ?? "Candidate B"}
                  dataKey="B"
                  stroke="#a78bfa"
                  fill="#a78bfa"
                  fillOpacity={0.18}
                  strokeWidth={2}
                  dot={{ fill: "#a78bfa", r: 3 }}
                />
                <Legend
                  wrapperStyle={{ fontSize: 12, paddingTop: 16 }}
                  formatter={(value) => <span style={{ color: "#e2e8f0" }}>{value}</span>}
                />
                <Tooltip
                  contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8 }}
                  labelStyle={{ color: "#94a3b8", fontWeight: 600, marginBottom: 4 }}
                  itemStyle={{ color: "#e2e8f0" }}
                  formatter={(val: number) => [`${val}%`]}
                />
              </RadarChart>
            </ResponsiveContainer>

            {/* Mini delta table */}
            <div className="mt-2 grid grid-cols-5 gap-2 text-center">
              {radarData.map(row => (
                <div key={row.axis} className="space-y-1">
                  <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">{row.axis}</div>
                  <div className="text-xs font-mono font-bold text-blue-400">{row.A}%</div>
                  <div className="flex items-center justify-center gap-0.5 text-[9px] text-muted-foreground">
                    <ArrowRight className="h-2.5 w-2.5" />
                  </div>
                  <div className="text-xs font-mono font-bold text-violet-400">{row.B}%</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Two columns */}
      <div className="grid lg:grid-cols-2 gap-6 items-start">
        <SlotCard
          slot={slotA}
          label="A"
          color="blue"
          compareResult={slotB.result}
          resumes={resumes}
          jobId={jobId}
          onResumeChange={id => setSlotA(s => ({ ...s, resumeId: id, result: null, error: null }))}
          onAnalyze={() => runAnalysis(slotA, setSlotA)}
        />
        <SlotCard
          slot={slotB}
          label="B"
          color="violet"
          compareResult={slotA.result}
          resumes={resumes}
          jobId={jobId}
          onResumeChange={id => setSlotB(s => ({ ...s, resumeId: id, result: null, error: null }))}
          onAnalyze={() => runAnalysis(slotB, setSlotB)}
        />
      </div>
    </div>
  );
}
