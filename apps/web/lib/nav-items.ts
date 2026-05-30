import {
  AlertCircleIcon,
  BookOpenIcon,
  DatabaseIcon,
  FileTextIcon,
  HomeIcon,
  MapIcon,
} from "lucide-react";

export const NAV_ITEMS = [
  { slug: "today", href: "/today", label: "Today", icon: HomeIcon, mobileVisible: true },
  { slug: "map", href: "/map", label: "Map", icon: MapIcon, mobileVisible: true },
  {
    slug: "outbreaks",
    href: "/outbreaks",
    label: "Outbreaks",
    icon: AlertCircleIcon,
    mobileVisible: true,
  },
  { slug: "sitreps", href: "/sitreps", label: "Sitreps", icon: FileTextIcon, mobileVisible: true },
  { slug: "sources", href: "/sources", label: "Sources", icon: DatabaseIcon, mobileVisible: true },
  {
    slug: "methods",
    href: "/methods",
    label: "Methods",
    icon: BookOpenIcon,
    mobileVisible: false,
  },
] as const;

export type NavItem = (typeof NAV_ITEMS)[number];
