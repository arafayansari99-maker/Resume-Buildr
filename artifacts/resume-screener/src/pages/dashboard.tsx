import React from "react";
import { useGetDashboardStats } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Users, Briefcase, Activity, Target } from "lucide-react";
import { Link } from "wouter";

export default function DashboardPage() {
  const { data: stats, isLoading } = useGetDashboardStats();

  if (isLoading || !stats) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Command Center</h1>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-32 w-full" />)}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-80 w-full" />
          <Skeleton className="h-80 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Command Center</h1>
        <p className="text-muted-foreground mt-2">Overview of recruitment intelligence and analysis volume.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Resumes" value={stats.total_resumes} icon={Users} />
        <StatCard title="Total Jobs" value={stats.total_jobs} icon={Briefcase} />
        <StatCard title="Total Analyses" value={stats.total_analyses} icon={Activity} />
        <StatCard title="Avg ATS Score" value={stats.average_ats_score.toFixed(1)} icon={Target} suffix=" / 100" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Score Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.score_distribution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="range" axisLine={false} tickLine={false} tick={{fill: "hsl(var(--muted-foreground))", fontSize: 12}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: "hsl(var(--muted-foreground))", fontSize: 12}} />
                  <RechartsTooltip cursor={{fill: "hsl(var(--accent))"}} contentStyle={{backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", color: "hsl(var(--card-foreground))"}} />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Top Missing Skills</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.top_missing_skills.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-4">{idx + 1}.</span>
                    <span className="font-mono text-sm font-medium">{item.skill}</span>
                  </div>
                  <Badge variant="secondary" className="font-mono text-xs">{item.count}</Badge>
                </div>
              ))}
              {stats.top_missing_skills.length === 0 && (
                <div className="text-sm text-muted-foreground">No data available</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Recent Analyses</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="divide-y divide-border">
            {stats.recent_analyses.map((analysis) => (
              <div key={analysis.id} className="py-3 flex items-center justify-between group">
                <div className="flex flex-col">
                  <Link href={`/results/${analysis.id}`} className="text-sm font-medium hover:text-primary transition-colors">
                    {analysis.candidate_name} <span className="text-muted-foreground">vs</span> {analysis.job_title}
                  </Link>
                  <span className="text-xs text-muted-foreground">{new Date(analysis.created_at).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-muted-foreground">Score</span>
                    <span className="font-mono text-sm font-bold text-primary">{analysis.ats_score}</span>
                  </div>
                </div>
              </div>
            ))}
            {stats.recent_analyses.length === 0 && (
              <div className="py-4 text-sm text-muted-foreground">No recent analyses found.</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, suffix = "" }: { title: string, value: string | number, icon: any, suffix?: string }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold font-mono">
          {value}
          {suffix && <span className="text-sm font-sans font-normal text-muted-foreground ml-1">{suffix}</span>}
        </div>
      </CardContent>
    </Card>
  );
}
