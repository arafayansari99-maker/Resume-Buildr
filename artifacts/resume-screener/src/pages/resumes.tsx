import { useState } from "react";
import type { MouseEvent } from "react";
import {
  useListResumes,
  useDeleteResume,
  useUploadResume,
  useGetResume,
  getListResumesQueryKey,
  getGetResumeQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trash2, Upload, FileText, Eye, X, Loader2, ClipboardList } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useNotifications } from "@/hooks/use-notifications";

export default function ResumesPage() {
  const { data: resumes, isLoading } = useListResumes();
  const deleteResume = useDeleteResume();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { addNotification } = useNotifications();
  const [previewId, setPreviewId] = useState<number | null>(null);

  const handleDelete = (id: number, e: MouseEvent) => {
    e.stopPropagation();
    deleteResume.mutate(
      { resumeId: id },
      {
        onSuccess: () => {
          toast({ title: "Resume deleted." });
          addNotification({ type: "info", title: "Resume deleted", message: "The candidate resume was removed from the system." });
          queryClient.invalidateQueries({ queryKey: getListResumesQueryKey() });
          if (previewId === id) setPreviewId(null);
        },
        onError: (err: any) => {
          const msg = err?.message || "Unknown error";
          toast({ title: "Failed to delete resume.", description: msg, variant: "destructive" });
          addNotification({ type: "error", title: "Resume deletion failed", message: msg });
        },
      }
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Resumes</h1>
          <p className="text-muted-foreground mt-1">
            Manage candidate resumes. Click any row to preview extracted text and skills.
          </p>
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
                <div
                  key={resume.id}
                  data-testid={`row-resume-${resume.id}`}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => setPreviewId(resume.id)}
                >
                  <div className="flex items-start gap-4">
                    <div className="mt-1 bg-primary/10 text-primary p-2 rounded hidden sm:block shrink-0">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-lg">{resume.candidate_name}</h3>
                        <Badge variant="outline" className="font-mono text-xs">
                          {resume.analysis_count} {resume.analysis_count === 1 ? "analysis" : "analyses"}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground font-mono mt-1">{resume.filename}</p>
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {resume.skills_found?.slice(0, 8).map((skill, idx) => (
                          <Badge
                            key={idx}
                            variant="secondary"
                            className="text-xs bg-secondary/50 hover:bg-secondary"
                          >
                            {skill}
                          </Badge>
                        ))}
                        {resume.skills_found?.length > 8 && (
                          <Badge
                            variant="outline"
                            className="text-xs border-dashed text-muted-foreground"
                          >
                            +{resume.skills_found.length - 8} more
                          </Badge>
                        )}
                        {(!resume.skills_found || resume.skills_found.length === 0) && (
                          <span className="text-xs text-muted-foreground italic">
                            No skills extracted
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100"
                      onClick={(e) => { e.stopPropagation(); setPreviewId(resume.id); }}
                      data-testid={`button-preview-${resume.id}`}
                    >
                      <Eye className="h-4 w-4" />
                      Preview
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100"
                      onClick={(e) => handleDelete(resume.id, e)}
                      disabled={deleteResume.isPending}
                      data-testid={`button-delete-${resume.id}`}
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

      <ResumePreviewDrawer resumeId={previewId} onClose={() => setPreviewId(null)} />
    </div>
  );
}

function ResumePreviewDrawer({
  resumeId,
  onClose,
}: {
  resumeId: number | null;
  onClose: () => void;
}) {
  const { data: detail, isLoading } = useGetResume(resumeId!, {
    query: {
      enabled: resumeId !== null,
      queryKey: getGetResumeQueryKey(resumeId!),
    },
  });

  const wordCount = detail?.raw_text
    ? detail.raw_text.trim().split(/\s+/).filter(Boolean).length
    : 0;

  return (
    <Sheet open={resumeId !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-2xl flex flex-col p-0 gap-0"
        data-testid="drawer-resume-preview"
      >
        {/* Header */}
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-border shrink-0">
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
          ) : (
            <>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="bg-primary/10 text-primary p-2 rounded shrink-0">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <SheetTitle className="text-xl truncate">
                      {detail?.candidate_name}
                    </SheetTitle>
                    <SheetDescription className="font-mono text-xs mt-0.5 truncate">
                      {detail?.filename}
                    </SheetDescription>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0 mt-0.5"
                  onClick={onClose}
                  data-testid="button-close-preview"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <Badge variant="outline" className="font-mono text-xs">
                  {detail?.analysis_count} {detail?.analysis_count === 1 ? "analysis" : "analyses"}
                </Badge>
                <Badge variant="outline" className="font-mono text-xs">
                  {detail?.skills_found?.length ?? 0} skills detected
                </Badge>
                {wordCount > 0 && (
                  <Badge variant="outline" className="font-mono text-xs">
                    {wordCount.toLocaleString()} words
                  </Badge>
                )}
              </div>
            </>
          )}
        </SheetHeader>

        {/* Body */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-4 w-full" style={{ width: `${70 + Math.random() * 30}%` }} />
              ))}
            </div>
          ) : (
            <>
              {/* Skills section */}
              <div className="px-6 py-4 border-b border-border shrink-0">
                <div className="flex items-center gap-2 mb-3">
                  <ClipboardList className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    Extracted Skills
                  </span>
                </div>
                {detail?.skills_found && detail.skills_found.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {detail.skills_found.map((skill, idx) => (
                      <Badge
                        key={idx}
                        variant="secondary"
                        className="text-xs bg-primary/10 text-primary border-primary/20"
                        data-testid={`badge-skill-${idx}`}
                      >
                        {skill}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">No skills detected from this resume.</p>
                )}
              </div>

              {/* Raw text section */}
              <div className="flex-1 overflow-hidden flex flex-col px-6 py-4 min-h-0">
                <div className="flex items-center gap-2 mb-3 shrink-0">
                  <FileText className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    Extracted Text
                  </span>
                </div>
                {detail?.raw_text ? (
                  <ScrollArea className="flex-1 rounded-md border border-border bg-muted/20" data-testid="scroll-raw-text">
                    <pre className="p-4 text-xs font-mono leading-relaxed text-foreground/80 whitespace-pre-wrap break-words">
                      {detail.raw_text}
                    </pre>
                  </ScrollArea>
                ) : (
                  <div className="flex-1 flex items-center justify-center rounded-md border border-border bg-muted/20">
                    <p className="text-sm text-muted-foreground italic">No text could be extracted from this PDF.</p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function UploadDialog() {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [candidateName, setCandidateName] = useState("");
  const uploadResume = useUploadResume();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { addNotification } = useNotifications();

  const handleUpload = () => {
    if (!file || !candidateName) return;

    uploadResume.mutate(
      { data: { file, candidate_name: candidateName } },
      {
        onSuccess: (result) => {
          toast({
            title: "Resume uploaded.",
            description: `Found ${result.skills_found.length} skills in ${result.candidate_name}'s resume.`,
          });
          addNotification({
            type: "success",
            title: "Resume uploaded",
            message: `${result.candidate_name}'s resume parsed — ${result.skills_found.length} skill${result.skills_found.length !== 1 ? "s" : ""} detected.`,
          });
          queryClient.invalidateQueries({ queryKey: getListResumesQueryKey() });
          setOpen(false);
          setFile(null);
          setCandidateName("");
        },
        onError: (err: any) => {
          const msg = err?.message || "Unknown error";
          toast({ title: "Upload failed.", description: msg, variant: "destructive" });
          addNotification({ type: "error", title: "Resume upload failed", message: msg });
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2" data-testid="button-upload-resume">
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
              data-testid="input-candidate-name"
              placeholder="e.g. Jane Doe"
              value={candidateName}
              onChange={(e) => setCandidateName(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="resume-file">Resume PDF</Label>
            <Input
              id="resume-file"
              data-testid="input-resume-file"
              type="file"
              accept="application/pdf"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            data-testid="button-submit-upload"
            onClick={handleUpload}
            disabled={!file || !candidateName || uploadResume.isPending}
          >
            {uploadResume.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Parsing...
              </>
            ) : (
              "Upload & Parse"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
