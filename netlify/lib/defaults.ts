import siteData from "../../data/site-data.json" with { type: "json" };

export const SECTION_KEYS = [
  "settings",
  "content",
  "projects",
  "services",
  "testimonials",
  "clientLogos",
  "awards",
  "navigation",
] as const;

export type SectionKey = (typeof SECTION_KEYS)[number];
export const COLLECTION_KEYS: SectionKey[] = ["projects", "services", "testimonials", "clientLogos", "awards", "navigation"];

const baseSettings = {
  whatsapp: "+923413614268",
  socials: { linkedin: "", instagram: "", facebook: "", tiktok: "" },
  seoTitle: "",
  seoDescription: "",
  contactEmail: "",
  location: "",
  heroVideo: "",
  heroPoster: "",
  heroBackground: "#f0ebe6",
  logoImage: "",
  futureImage: "",
  awardsVideo: "",
  awardsPoster: "",
  heroFloatImages: [],
  studioMedia: [],
};

// The content committed in data/site-data.json is the starting point until the admin saves changes.
export const defaults: Record<SectionKey, any> = {
  settings: {
    ...baseSettings,
    ...siteData.settings,
    socials: { ...baseSettings.socials, ...(siteData.settings?.socials || {}) },
  },
  content: { ...siteData.content },
  projects: siteData.projects,
  services: siteData.services,
  testimonials: siteData.testimonials,
  clientLogos: siteData.clientLogos,
  awards: siteData.awards,
  navigation: siteData.navigation,
};
