import { defineCollection, z } from "astro:content";

const pages = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    draft: z.boolean().default(false),
  }),
});

export const collections = {
  pages,
};
