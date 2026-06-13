import React, { useState } from "react";
import { useListJobs, useDeleteJob, useCreateJob, getListJobsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Trash2, Plus, Briefcase } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

export default function JobsPage() {
  const { data: jobs, isLoading } = useListJobs();
  const deleteJob = useDeleteJob();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const handleDelete = (id: number) => {
    deleteJob.mutate({ jobId: id }, {
      onSuccess: () => {
        toast({ title: "Job deleted successfully." });
        queryClient.invalidateQueries({ queryKey: getListJobsQueryKey() });
      },
      onError: (err: any) => {
        toast({ title: "Failed to delete job.", description: err?.message || "Unknown error", variant: "destructive" });
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Jobs</h1>
          <p className="text-muted-foreground mt-1">Define requirements and required skills for candidate matching.</p>
        </div>
        <CreateJobDialog />
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="flex flex-col">
              <CardHeader>
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                <Skeleton className="h-20 w-full mb-4" />
                <div className="flex gap-2">
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-6 w-16" />
                </div>
              </CardContent>
            </Card>
          ))
        ) : jobs?.length === 0 ? (
          <div className="col-span-full p-12 text-center text-muted-foreground flex flex-col items-center bg-card border border-border border-dashed rounded-lg">
            <Briefcase className="h-12 w-12 mb-4 opacity-20" />
            <p className="text-lg">No jobs defined yet.</p>
            <p className="text-sm mt-1">Create a job description to start matching candidates.</p>
          </div>
        ) : (
          jobs?.map((job) => (
            <Card key={job.id} className="flex flex-col group relative overflow-hidden">
              <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity focus-within:opacity-100 z-10">
                <Button 
                  variant="destructive" 
                  size="icon" 
                  className="h-8 w-8"
                  onClick={() => handleDelete(job.id)}
                  disabled={deleteJob.isPending}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <CardHeader className="pb-3">
                <CardTitle className="text-xl pr-8 line-clamp-1">{job.title}</CardTitle>
                <CardDescription className="text-primary font-medium">{job.company || "Company not specified"}</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col pt-0">
                <p className="text-sm text-muted-foreground line-clamp-3 mb-4 flex-1">
                  {job.description}
                </p>
                <div>
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Required Skills</div>
                  <div className="flex flex-wrap gap-1.5">
                    {job.required_skills?.map((skill, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs font-mono bg-background">
                        {skill}
                      </Badge>
                    ))}
                    {(!job.required_skills || job.required_skills.length === 0) && (
                      <span className="text-xs text-muted-foreground italic">No required skills</span>
                    )}
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-border flex justify-between items-center text-xs text-muted-foreground">
                  <span>ID: {job.id}</span>
                  <span>{new Date(job.created_at).toLocaleDateString()}</span>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

function CreateJobDialog() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [description, setDescription] = useState("");
  const [skillsInput, setSkillsInput] = useState("");
  
  const createJob = useCreateJob();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleCreate = () => {
    if (!title || !description) return;

    const skills = skillsInput
      .split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    createJob.mutate({ 
      data: { 
        title, 
        company: company || undefined, 
        description, 
        required_skills: skills 
      } 
    }, {
      onSuccess: () => {
        toast({ title: "Job created successfully." });
        queryClient.invalidateQueries({ queryKey: getListJobsQueryKey() });
        setOpen(false);
        setTitle("");
        setCompany("");
        setDescription("");
        setSkillsInput("");
      },
      onError: (err: any) => {
        toast({ title: "Failed to create job.", description: err?.message || "Unknown error", variant: "destructive" });
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" /> Create Job
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create Job Profile</DialogTitle>
          <DialogDescription>
            Define a job role and required skills for the matching engine.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="title">Job Title <span className="text-destructive">*</span></Label>
            <Input 
              id="title" 
              placeholder="e.g. Senior Frontend Engineer" 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="company">Company</Label>
            <Input 
              id="company" 
              placeholder="e.g. Acme Corp" 
              value={company}
              onChange={(e) => setCompany(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="description">Job Description <span className="text-destructive">*</span></Label>
            <Textarea 
              id="description" 
              placeholder="Brief description of the role and responsibilities..." 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[100px] resize-none"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="skills">Required Skills (Comma separated)</Label>
            <Input 
              id="skills" 
              placeholder="e.g. React, TypeScript, GraphQL, CSS" 
              value={skillsInput}
              onChange={(e) => setSkillsInput(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleCreate} 
            disabled={!title || !description || createJob.isPending}
          >
            {createJob.isPending ? "Creating..." : "Create Job"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
