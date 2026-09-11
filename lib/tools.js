export const CATEGORIES = [
  "Woodworking",
  "Electrical",
  "Plumbing",
  "Painting & Finishing",
  "Furniture",
  "Outdoor & Garden",
  "Wall & Flooring",
  "Storage & Organization",
  "Repair",
  "Other",
];

export const DIFFICULTIES = ["beginner", "intermediate", "advanced"];

export const RECORD_PROJECT_TOOL = {
  name: "record_diy_project",
  description:
    "Record one structured DIY/home-improvement project extracted from pasted video caption/description/transcript text.",
  strict: true,
  input_schema: {
    type: "object",
    properties: {
      title: { type: "string" },
      category: { type: "string", enum: CATEGORIES },
      difficulty: { type: "string", enum: DIFFICULTIES },
      estTime: { type: "string" },
      estCost: { type: "string" },
      tools: { type: "array", items: { type: "string" } },
      materials: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: { type: "string" },
            qty: { type: "string" },
            cost: { type: "string" },
          },
          required: ["name", "qty", "cost"],
          additionalProperties: false,
        },
      },
      steps: { type: "array", items: { type: "string" } },
      tags: { type: "array", items: { type: "string" } },
    },
    required: [
      "title",
      "category",
      "difficulty",
      "estTime",
      "estCost",
      "tools",
      "materials",
      "steps",
      "tags",
    ],
    additionalProperties: false,
  },
};
