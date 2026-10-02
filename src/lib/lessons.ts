import { getCollection, type CollectionEntry } from "astro:content";

export type Lesson = CollectionEntry<"lessons"> & { number: number; slug: string };

export const PARTS = { Beginner: "Part I", Intermediate: "Part II", Advanced: "Part III" } as const;

/**
 * All lessons in order. File names set the order and the URL:
 * "03-first-groove.yaml" becomes lesson 3 at /lessons/first-groove/.
 */
export async function getLessons(): Promise<Lesson[]> {
  const entries = (await getCollection("lessons")).sort((a, b) => a.id.localeCompare(b.id));

  // Exercise ids are the keys for saved progress, so they must be unique across the roadmap.
  const seen = new Set<string>();
  for (const entry of entries) {
    for (const task of entry.data.tasks) {
      if (seen.has(task.id))
        throw new Error(`Exercise id "${task.id}" is used twice (in ${entry.id})`);
      seen.add(task.id);
    }
  }

  return entries.map((entry, i) => ({
    ...entry,
    number: i + 1,
    slug: entry.id.replace(/^\d+-/, ""),
  }));
}

/** Exercise ids per lesson, as the client-side progress code expects them. */
export const roadmapIds = (lessons: Lesson[]) => lessons.map((l) => l.data.tasks.map((t) => t.id));

export const lessonUrl = (lesson: Lesson) => `${import.meta.env.BASE_URL}lessons/${lesson.slug}/`;
