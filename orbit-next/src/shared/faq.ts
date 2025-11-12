export const FAQ_CATEGORIES = [
  "General",
  "Booking",
  "Facilities",
  "Policies",
  "Technical",
] as const;

export type FaqCategory = (typeof FAQ_CATEGORIES)[number];

export type FaqItem = {
  id: string;
  category: FaqCategory | string;
  question: string;
  answer: string;
  helpfulCount: number;
  notHelpfulCount: number;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};
