// Mirrors diy-vault/public/style.css's :root custom properties exactly,
// so the native screens match the web app's look rather than reading as
// a generic React Native app.
export const colors = {
  orange: "#c8763a",
  orangeDark: "#a85f2c",
  black: "#1a1512",
  cream: "#f5f1ec",
  cream2: "#e8e1d8",
  line: "#ddd4c8",
  white: "#ffffff",
  gray: "#847a70",
  danger: "#a8442c",
};

export const radius = {
  md: 4,
  sm: 3,
};

export const fontSerif = "Georgia";

export const CATEGORY_DOT_COLORS: Record<string, string> = {
  woodworking: "#a3703a",
  outdoor: "#5c7a45",
  electrical: "#b3462c",
  plumbing: "#4a7a8c",
  painting: "#8a5a8c",
  furniture: "#b08a3e",
  wall: "#7a7259",
  storage: "#3e7a72",
  repair: "#8a5a3e",
};

export function categorySlug(category: string): string {
  return category.toLowerCase().split(" ")[0];
}

export function categoryDotColor(category: string): string {
  return CATEGORY_DOT_COLORS[categorySlug(category)] ?? colors.gray;
}

export const DIFFICULTY_COLORS: Record<string, string> = {
  beginner: "#5c7a45",
  intermediate: colors.orangeDark,
  advanced: colors.danger,
};

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

export const DIFFICULTIES = ["beginner", "intermediate", "advanced"] as const;
