import React from "react";
import { useGetAnalysisResult } from "@workspace/api-client-react";
import { useParams, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, CheckCircle2, XCircle, AlertCircle, Info, ThumbsUp, TrendingUp } from "lucide-react";
import { RadialBarChart, RadialBar, PolarAngleAxis, ResponsiveContainer } from "recharts";

export default function ResultDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: result, isLoading, error } = useGetAnalysisResult(parseInt(id!), {
    query: { enabled: !!id, queryKey: ['analysisResult', id] }
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-24 w-full" />
        <div className="grid md:grid-cols-3 gap-6">
          <Skeleton className="h-80 col-span-1" />
          <Skeleton className="h-80 col-span-2" />
        </div>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="p-12 text-center text-destructive">
        Failed to load analysis result.
      </div>
    );
  }

  const scoreData = [{ name: 'Score', value: result.ats_score, fill: 'hsl(var(--primary))' }];

  return (
    <div className="space-y-8 pb-12">
      <div>
        <Link href="/results" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Results
        </Link>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight mb-2">Analysis Report</h1>
            <div className="flex items-center gap-2 text-lg text-muted-foreground font-serif">
              <span className="text-foreground font-medium">{result.candidate_name}</span>
              <span>for</span>
              <span className="text-foreground font-medium">{result.job_title}</span>
            </div>
          </div>
          <div className="text-sm font-mono text-muted-foreground">
            Report ID: {result.id} | Generated: {new Date(result.created_at).toLocaleDateString()}
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* ATS Score Gauge */}
        <Card className="flex flex-col items-center justify-center text-center p-6 bg-card border-primary/20">
          <CardHeader className="p-0 mb-2">
            <CardTitle className="text-sm uppercase tracking-widest text-muted-foreground">Overall ATS Score</CardTitle>
          </CardHeader>
          <CardContent className="p-0 flex flex-col items-center w-full">
            <div className="h-[200px] w-full relative">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart 
                  cx="50%" cy="50%" 
                  innerRadius="70%" outerRadius="100%" 
                  barSize={20} data={scoreData} 
                  startAngle={180} endAngle={0}
                >
                  <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                  <RadialBar background={{ fill: 'hsl(var(--muted))' }} dataKey="value" cornerRadius={10} />
                </RadialBarChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center mt-8">
                <span className="text-6xl font-black tracking-tighter text-foreground">{result.ats_score}</span>
                <span className="text-sm text-muted-foreground font-bold">/ 100</span>
              </div>
            </div>
            <p className="mt-4 text-sm font-medium px-4">
              {result.explanation.overall}
            </p>
          </CardContent>
        </Card>

        {/* Score Breakdown */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Score Breakdown</CardTitle>
            <CardDescription>Detailed metric analysis by our matching engine</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <MetricBar label="Skill Match" value={result.score_breakdown.skill_match} description="Direct intersection of required vs possessed skills" />
            <MetricBar label="Keyword Coverage" value={result.score_breakdown.keyword_coverage} description="Density of domain-specific terminology" />
            <MetricBar label="Semantic Similarity" value={result.score_breakdown.semantic_similarity} description="Contextual meaning and intent match" />
            <MetricBar label="Experience Alignment" value={result.score_breakdown.experience_match} description="Years and relevance of past roles" />
            <MetricBar label="Education Match" value={result.score_breakdown.education_match} description="Degree requirements and field of study" />
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Strengths & Weaknesses */}
        <Card className="h-full">
          <CardHeader>
            <CardTitle>Evaluation Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h4 className="text-sm font-bold uppercase tracking-wider text-emerald-500 mb-3 flex items-center gap-2">
                <ThumbsUp className="h-4 w-4" /> Key Strengths
              </h4>
              <ul className="space-y-2">
                {result.explanation.strengths.map((str, i) => (
                  <li key={i} className="text-sm flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>{str}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-bold uppercase tracking-wider text-amber-500 mb-3 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" /> Potential Risks
              </h4>
              <ul className="space-y-2">
                {result.explanation.weaknesses.map((wk, i) => (
                  <li key={i} className="text-sm flex items-start gap-2">
                    <Info className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                    <span>{wk}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="pt-4 border-t border-border">
              <p className="text-sm text-muted-foreground italic leading-relaxed">
                "{result.explanation.score_reasoning}"
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Skill Gap Analysis */}
        <Card className="h-full">
          <CardHeader>
            <CardTitle>Skill Gap Analysis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <div className="text-xs font-semibold text-muted-foreground mb-2 flex justify-between">
                <span>MATCHED REQUIRED SKILLS</span>
                <span className="text-emerald-500">{result.skill_gap.matched_skills.length}</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {result.skill_gap.matched_skills.map((skill, i) => (
                  <Badge key={i} variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-mono text-xs">
                    {skill}
                  </Badge>
                ))}
                {result.skill_gap.matched_skills.length === 0 && <span className="text-sm text-muted-foreground italic">None found</span>}
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold text-muted-foreground mb-2 flex justify-between">
                <span>MISSING REQUIRED SKILLS</span>
                <span className="text-destructive">{result.skill_gap.missing_skills.length}</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {result.skill_gap.missing_skills.map((skill, i) => (
                  <Badge key={i} variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 font-mono text-xs">
                    {skill}
                  </Badge>
                ))}
                {result.skill_gap.missing_skills.length === 0 && <span className="text-sm text-muted-foreground italic">None missing</span>}
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold text-muted-foreground mb-2 flex justify-between">
                <span>ADDITIONAL SKILLS FOUND</span>
                <span>{result.skill_gap.extra_skills.length}</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {result.skill_gap.extra_skills.map((skill, i) => (
                  <Badge key={i} variant="secondary" className="font-mono text-xs text-muted-foreground">
                    {skill}
                  </Badge>
                ))}
                {result.skill_gap.extra_skills.length === 0 && <span className="text-sm text-muted-foreground italic">None found</span>}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" /> Actionable Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="divide-y divide-border">
            {result.recommendations.map((rec, i) => (
              <div key={i} className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant={rec.priority === 'High' ? 'destructive' : rec.priority === 'Medium' ? 'default' : 'secondary'} className="text-[10px] uppercase">
                      {rec.priority} Priority
                    </Badge>
                    <span className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{rec.category}</span>
                  </div>
                  <p className="text-sm">{rec.suggestion}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function MetricBar({ label, value, description }: { label: string, value: number, description: string }) {
  return (
    <div>
      <div className="flex justify-between items-end mb-1.5">
        <div>
          <div className="font-medium text-sm">{label}</div>
          <div className="text-xs text-muted-foreground">{description}</div>
        </div>
        <div className="font-mono text-sm font-bold">{value}%</div>
      </div>
      <Progress value={value} className="h-2" />
    </div>
  );
}
