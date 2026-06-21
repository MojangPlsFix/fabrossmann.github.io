import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const timeline = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/timeline" }),
  schema: z.object({
    category: z.enum(["education", "experience"]),
    org: z.string(),
    title: z.string(),
    url: z.string().url().optional(),
    startDate: z.string(),
    endDate: z.string().optional(),
  }),
});

const projects = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/projects" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    url: z.string().url().optional(),
    image: z.string().optional(),
    order: z.number(),
  }),
});

const qualifications = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/qualifications" }),
  schema: z.object({
    group: z.string(),
    items: z.array(z.string()),
    order: z.number(),
  }),
});

export const collections = { timeline, projects, qualifications };
