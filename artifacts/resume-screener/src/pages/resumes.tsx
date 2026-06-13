import React, { useState } from "react";
import { useListResumes, useDeleteResume, useUploadResume, getListResumesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Trash2, Upload, FileText } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

export default function ResumesPage() {
  const { data: resumes, isLoading } = useListResumes();
  const deleteResume = useDeleteResume();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const handleDelete = (id: number) => {
    deleteResume.mutate({ resumeId: id }, {
      onSuccess: () => {
        toast({ title: "Resume deleted successfully." });
        queryClient.invalidateQueries({ queryKey: getListResumesQueryKey() });
      },
      onError: (err: any) => {
        toast({ title: "Failed to delete resume.", description: err?.message || "Unknown error", variant: "destructive" });
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Resumes</h1>
          <p className="text-muted-foreground mt-1">Manage candidate resumes and view extracted skills.</p>
        </div>
        <UploadDialog />
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="p-4 flex gap-4 items-center">
                  <Skeleton className="h-10 w-10 rounded" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-1/3" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                </div>
              ))
            ) : resumes?.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground flex flex-col items-center">
                <FileText className="h-12 w-12 mb-4 opacity-20" />
                <p>No resumes uploaded yet.</p>
              </div>
            ) : (
              resumes?.map((resume) => (
                <div key={resume.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group">
                  <div className="flex items-start gap-4">
                    <div className="mt-1 bg-primary/10 text-primary p-2 rounded hidden sm:block">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-lg">{resume.candidate_name}</h3>
                        <Badge variant="outline" className="font-mono text-xs">
                          {resume.analysis_count} analyses
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground font-mono mt-1">{resume.filename}</p>
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {resume.skills_found?.slice(0, 8).map((skill, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs bg-secondary/50 hover:bg-secondary">
                            {skill}
                          </Badge>
                        ))}
                        {resume.skills_found?.length > 8 && (
                          <Badge variant="outline" className="text-xs border-dashed text-muted-foreground">
                            +{resume.skills_found.length - 8} more
                          </Badge>
                        )}
                        {(!resume.skills_found || resume.skills_found.length === 0) && (
                          <span className="text-xs text-muted-foreground italic">No skills extracted</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-destructive opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100"
                      onClick={() => handleDelete(resume.id)}
                      disabled={deleteResume.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function UploadDialog() {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [candidateName, setCandidateName] = useState("");
  const uploadResume = useUploadResume();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleUpload = () => {
    if (!file || !candidateName) return;

    uploadResume.mutate({ data: { file, candidate_name: candidateName } }, {
      onSuccess: () => {
        toast({ title: "Resume uploaded and parsed successfully." });
        queryClient.invalidateQueries({ queryKey: getListResumesQueryKey() });
        setOpen(false);
        setFile(null);
        setCandidateName("");
      },
      onError: (err: any) => {
        toast({ title: "Failed to upload resume.", description: err?.message || "Unknown error", variant: "destructive" });
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Upload className="h-4 w-4" /> Upload Resume
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload Candidate Resume</DialogTitle>
          <DialogDescription>
            Upload a PDF resume to extract skills and match against jobs.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="candidate-name">Candidate Name</Label>
            <Input 
              id="candidate-name" 
              placeholder="e.g. Jane Doe" 
              value={candidateName}
              onChange={(e) => setCandidateName(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="resume-file">Resume PDF</Label>
            <Input 
              id="resume-file" 
              type="file" 
              accept="application/pdf"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleUpload} 
            disabled={!file || !candidateName || uploadResume.isPending}
          >
            {uploadResume.isPending ? "Uploading & Parsing..." : "Upload & Parse"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
