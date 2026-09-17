import { Marquee, type MarqueeItem } from "@/components/ui/Marquee";
import { industries } from "@/lib/data/industries";

const icons: Record<string, MarqueeItem["icon"]> = {
  education: (
    <path d="M2 8L12 3L22 8L12 13L2 8Z M6 10.5V15C6 15 8.5 17 12 17C15.5 17 18 15 18 15V10.5 M22 8V14" strokeLinecap="round" strokeLinejoin="round" />
  ),
  travel: (
    <path
      d="M10.5 15.5L4 13.5L2.5 15L8 18.5M13.5 12.5L18 20L19.5 18.5L17.5 11M2.5 12L10 9.5L15 3.5C15.7 2.6 17 2.6 17.7 3.5C18.3 4.2 18.3 5.2 17.7 5.9L13 11L15 18.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  insurance: (
    <path
      d="M12 3L20 6V11C20 16 16.5 19.5 12 21C7.5 19.5 4 16 4 11V6L12 3Z M9 12L11 14L15.5 9.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  "ca-firms": (
    <path
      d="M6 3H18V21H6V3Z M9 7H15 M8.5 11H10M12 11H13.5M15 11H16.5M8.5 14H10M12 14H13.5M15 14H16.5M8.5 17H10M12 17H13.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  corporates: (
    <path
      d="M4 8H20V19H4V8Z M8 8V5C8 4.4 8.4 4 9 4H15C15.6 4 16 4.4 16 5V8 M4 13H20"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  startups: (
    <path
      d="M12 2C14 4.5 15 8 15 11C15 13 14.3 14.8 13.3 16.2L12 21L10.7 16.2C9.7 14.8 9 13 9 11C9 8 10 4.5 12 2Z M9.5 13.5L6 15.5L7 12M14.5 13.5L18 15.5L17 12"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  grocery: (
    <>
      <path
        d="M3 4H5L6.3 13.4C6.5 14.9 7.8 16 9.3 16H17.3C18.7 16 19.9 15 20.2 13.6L21.5 7.5H6.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="9.5" cy="20" r="1.3" />
      <circle cx="17" cy="20" r="1.3" />
    </>
  ),
};

export function IndustryMarquee({ dark = false, bare = false }: { dark?: boolean; bare?: boolean }) {
  const items: MarqueeItem[] = industries.map((industry) => ({
    id: industry.id,
    label: industry.name,
    tagline: industry.tagline,
    description: industry.description,
    tags: industry.useCases.slice(0, 3),
    href: `/solutions#${industry.id}`,
    icon: icons[industry.id],
  }));

  return <Marquee items={items} eyebrow="One API, connected across every industry we serve" dark={dark} bare={bare} />;
}
