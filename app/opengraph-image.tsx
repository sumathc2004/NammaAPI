import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const alt = "NammaAPI — Payment infrastructure and APIs for modern businesses";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const logoData = await readFile(join(process.cwd(), "public/logo-white.png"), "base64");
const logoSrc = `data:image/png;base64,${logoData}`;

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          backgroundImage: "linear-gradient(135deg, #0a2647 0%, #0a3d66 45%, #0c7fb3 80%, #1aa6d9 100%)",
          color: "#ffffff",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- ImageResponse renders plain <img> */}
        <img src={logoSrc} alt="" width={448} height={120} />
        <div style={{ marginTop: 48, fontSize: 64, fontWeight: 700, lineHeight: 1.1, maxWidth: 960 }}>
          Power Your Business Payments With Secure APIs
        </div>
        <div style={{ marginTop: 24, fontSize: 30, color: "rgba(255,255,255,0.8)", maxWidth: 960 }}>
          Payouts · Payment Collection · Salary &amp; Bulk Payments · Automation
        </div>
      </div>
    ),
    size,
  );
}
