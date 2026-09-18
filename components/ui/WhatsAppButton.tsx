import { WHATSAPP_NUMBER, WHATSAPP_DEFAULT_MESSAGE } from "@/lib/data/contact";

export function WhatsAppButton() {
  const href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_DEFAULT_MESSAGE)}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with us on WhatsApp"
      className="fixed bottom-24 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg shadow-black/20 transition-transform duration-200 hover:scale-105 sm:right-6"
    >
      <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.71.45 3.38 1.3 4.85L2 22l5.36-1.4a9.9 9.9 0 0 0 4.68 1.19h.01c5.46 0 9.91-4.45 9.91-9.91C21.96 6.45 17.5 2 12.04 2Zm5.8 14.05c-.24.68-1.4 1.3-1.93 1.38-.5.08-1.13.11-1.82-.11-.42-.13-.96-.31-1.65-.6-2.9-1.25-4.79-4.16-4.94-4.35-.15-.2-1.18-1.57-1.18-3 0-1.42.75-2.12 1.02-2.41.27-.29.58-.36.78-.36.2 0 .39 0 .56.01.18.01.42-.07.66.5.24.58.82 2 .89 2.15.07.15.11.32.02.51-.09.2-.14.32-.27.49-.14.17-.29.38-.41.51-.14.15-.28.31-.12.6.16.29.71 1.17 1.53 1.89 1.05.94 1.94 1.23 2.23 1.37.29.14.46.12.63-.07.17-.2.71-.83.9-1.11.19-.29.38-.24.64-.15.26.1 1.67.79 1.96.93.29.14.47.22.55.34.07.13.07.72-.17 1.4Z" />
      </svg>
    </a>
  );
}
