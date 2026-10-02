import { defineCollection, reference } from "astro:content";
import { file, glob } from "astro/loaders";
import { z } from "astro/zod";
import { normalize, validate, type Groove } from "./lib/groove";

const row = z.string().optional();

// Grooves are validated at build time: a typo in a pattern fails the build with a clear message.
const groove = z
  .object({
    sub: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
    bpm: z.number().int().min(20).max(300),
    bar: z.number().int().positive().optional(),
    groups: z.array(z.number().int().positive()).optional(),
    swing: z.boolean().optional(),
    stick: row,
    cr: row,
    rd: row,
    hh: row,
    sn: row,
    rs: row,
    t1: row,
    t2: row,
    ft: row,
    kk: row,
    hf: row,
  })
  .transform((g) => normalize(g as Groove))
  .superRefine((g, ctx) => {
    for (const message of validate(g)) ctx.addIssue({ code: "custom", message });
  });

const lessons = defineCollection({
  loader: glob({ pattern: "*.yaml", base: "./src/content/lessons" }),
  schema: z.object({
    part: z.enum(["Beginner", "Intermediate", "Advanced"]),
    title: z.string(),
    intro: z.string(),
    tasks: z.array(
      z.object({
        id: z.string().regex(/^[a-z0-9-]+$/),
        title: z.string(),
        text: z.string(),
        goal: z.string(),
        notationKey: z.boolean().optional(),
        groove: groove.optional(),
        image: reference("images").optional(),
        video: reference("videos").optional(),
      }),
    ),
  }),
});

const genres = defineCollection({
  loader: glob({ pattern: "*.md", base: "./src/content/genres" }),
  schema: z.object({
    name: z.string(),
    order: z.number(),
    image: reference("images").optional(),
    tempo: z.string(),
    feel: z.string(),
    listen: z.array(z.string()),
    grooves: z.array(z.object({ title: z.string(), groove })),
    videos: z.array(reference("videos")),
  }),
});

// Photos from Wikimedia Commons. Only public domain, CC0, CC BY and CC BY-SA.
const images = defineCollection({
  loader: file("src/data/images.json"),
  schema: z.object({
    src: z.url(),
    page: z.url(),
    author: z.string(),
    license: z.string().regex(/^(Public domain|CC0|CC BY(-SA)? \d\.\d)$/),
    caption: z.string(),
  }),
});

// YouTube lessons. Every one is checked to exist and allow embedding before it is added.
const videos = defineCollection({
  loader: file("src/data/videos.json"),
  schema: z.object({
    youtubeId: z.string().regex(/^[\w-]{11}$/),
    title: z.string(),
    channel: z.string(),
  }),
});

export const collections = { lessons, genres, images, videos };
