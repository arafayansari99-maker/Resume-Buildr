import React, { useState } from "react";
import { useListJobs, useListResumes, useAnalyzeResume } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { PlaySquare, Loader2, FileText, Briefcase } from "lucide-react";

export default function AnalyzePage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const { data: resumes, isLoading: isLoadingResumes } = useListResumes();
  const { data: jobs, isLoading: isLoadingJobs } = useListJobs();
  
  const [selectedResumeId, setSelectedResumeId] = useState<string>("");
  const [selectedJobId, setSelectedJobId] = useState<string>("");
  
  const analyzeResume = useAnalyzeResume();

  const handleAnalyze = () => {
    if (!selectedResumeId || !selectedJobId) return;
    
    analyzeResume.mutate({
      data: {
        resume_id: parseInt(selectedResumeId),
        job_id: parseInt(selectedJobId)
      }
    }, {
      onSuccess: (result) => {
        toast({ title: "Analysis complete", description: "Navigating to results..." });
        setLocation(`/results/${result.id}`);
      },
      onError: (err: any) => {
        toast({ 
          title: "Analysis failed", 
          description: err?.message || "Something went wrong during analysis", 
          variant: "destructive" 
        });
      }
    });
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Run Analysis</h1>
        <p className="text-muted-foreground mt-1">Match a specific resume against a job description to generate a detailed report.</p>
      </div>

      <Card className="border-primary/20">
        <CardHeader className="bg-primary/5 border-b border-border pb-6">
          <CardTitle className="text-xl flex items-center gap-2">
            <PlaySquare className="h-5 w-5 text-primary" /> New Analysis Request
          </CardTitle>
          <CardDescription>
            Our engine will evaluate semantic similarity, keyword coverage, and experience alignment.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          <div className="grid gap-3">
            <Label className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" /> Select Candidate Resume
            </Label>
            <Select value={selectedResumeId} onValueChange={setSelectedResumeId} disabled={isLoadingResumes || analyzeResume.isPending}>
              <SelectTrigger className="h-12">
                <SelectValue placeholder={isLoadingResumes ? "Loading resumes..." : "Choose a resume..."} />
              </SelectTrigger>
              <SelectContent>
                {resumes?.map(resume => (
                  <SelectItem key={resume.id} value={resume.id.toString()}>
                    <div className="flex flex-col text-left">
                      <span className="font-medium">{resume.candidate_name}</span>
                      <span className="text-xs text-muted-foreground font-mono">{resume.filename}</span>
                    </div>
                  </SelectItem>
                ))}
                {resumes?.length === 0 && (
                  <div className="p-4 text-center text-sm text-muted-foreground">No resumes available</div>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-dashed border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground font-semibold">Matched Against</span>
            </div>
          </div>

          <div className="grid gap-3">
            <Label className="text-base flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-muted-foreground" /> Select Job Description
            </Label>
            <Select value={selectedJobId} onValueChange={setSelectedJobId} disabled={isLoadingJobs || analyzeResume.isPending}>
              <SelectTrigger className="h-12">
                <SelectValue placeholder={isLoadingJobs ? "Loading jobs..." : "Choose a job profile..."} />
              </SelectTrigger>
              <SelectContent>
                {jobs?.map(job => (
                  <SelectItem key={job.id} value={job.id.toString()}>
                    <div className="flex flex-col text-left">
                      <span className="font-medium">{job.title}</span>
                      {job.company && <span className="text-xs text-muted-foreground">{job.company}</span>}
                    </div>
                  </SelectItem>
                ))}
                {jobs?.length === 0 && (
                  <div className="p-4 text-center text-sm text-muted-foreground">No jobs available</div>
                )}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
        <CardFooter className="bg-muted/30 border-t border-border pt-6">
          <Button 
            className="w-full h-12 text-base font-semibold" 
            size="lg"
            onClick={handleAnalyze}
            disabled={!selectedResumeId || !selectedJobId || analyzeResume.isPending}
          >
            {analyzeResume.isPending ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Running Analysis...
              </>
            ) : (
              "Generate Match Report"
            )}
          </Button>
        </CardFooter>
      </Card>
      
      {analyzeResume.isPending && (
        <div className="text-center p-8 space-y-4 animate-in fade-in slide-in-from-bottom-4">
          <div className="inline-flex items-center justify-center p-4 bg-primary/10 rounded-full text-primary mb-2">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
          <h3 className="text-lg font-serif font-semibold">Extracting & Comparing Signals</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            The AI is reading the resume, identifying core skills, evaluating semantic alignment with the job description, and calculating scores. This takes just a moment.
          </p>
        </div>
      )}
    </div>
  );
}
