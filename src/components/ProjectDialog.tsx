import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface ProjectData {
  title: string;
  description: string;
  url?: string;
  image?: string;
}

export function ProjectDialog({ project }: { project: ProjectData }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Card className="cursor-pointer overflow-hidden transition hover:shadow-md">
          {project.image ? (
            <img
              src={project.image}
              alt={project.title}
              className="aspect-square w-full object-cover"
            />
          ) : null}
          <CardHeader>
            <CardTitle className="text-base">{project.title}</CardTitle>
          </CardHeader>
        </Card>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{project.title}</DialogTitle>
        </DialogHeader>
        <p className="text-muted-foreground">{project.description}</p>
        {project.url ? (
          <a
            href={project.url}
            target="_blank"
            rel="noreferrer"
            className="text-primary underline-offset-4 hover:underline"
          >
            Visit website →
          </a>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
