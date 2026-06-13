import React from "react";
import { useListAnalysisResults } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight, Calendar, User, Briefcase } from "lucide-react";

export default function ResultsPage() {
  const { data: results, isLoading } = useListAnalysisResults();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Analysis History</h1>
        <p className="text-muted-foreground mt-1">Review past evaluations and candidate matches.</p>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="p-4 md:p-6 flex flex-col md:flex-row gap-4 md:items-center justify-between">
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-6 w-1/3" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                  <Skeleton className="h-10 w-24" />
                </div>
              ))
            ) : results?.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">
                <p>No analysis results found.</p>
                <Link href="/analyze" className="text-primary hover:underline mt-2 inline-block">Run your first analysis</Link>
              </div>
            ) : (
              results?.map((result) => (
                <Link 
                  key={result.id} 
                  href={`/results/${result.id}`}
                  className="block p-4 md:p-6 hover:bg-muted/30 transition-colors group"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 font-semibold text-lg">
                          <User className="h-4 w-4 text-muted-foreground" />
                          {result.candidate_name}
                        </div>
                        <span className="text-muted-foreground text-sm flex items-center">
                          <ArrowRight className="h-3 w-3 mx-1" />
                        </span>
                        <div className="flex items-center gap-2 font-medium text-foreground/80">
                          <Briefcase className="h-4 w-4 text-muted-foreground" />
                          {result.job_title}
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground font-mono">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          {new Date(result.created_at).toLocaleString()}
                        </span>
                        <span>ID: {result.id}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-6 shrink-0">
                      <div className="text-right">
                        <div className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-1">ATS Score</div>
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-2xl font-black text-primary">{result.ats_score}</span>
                          <span className="text-sm text-muted-foreground">/ 100</span>
                        </div>
                      </div>
                      <div className="hidden md:flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                        <ArrowRight className="h-5 w-5" />
                      </div>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
