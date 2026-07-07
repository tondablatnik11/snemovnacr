// Open Graph dynamic image — generuje PNG banner pro sociální náhledy detail stránek.
// Používá Next.js ImageResponse (vestavěný v Next.js 15+).

import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Sněmovna ČR — detail hlasování";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

interface OGImageProps {
  title: string;
  subtitle?: string;
  badge?: string;
  stats?: Array<{ label: string; value: string; color?: string }>;
}

export async function generateOGImage({
  title,
  subtitle,
  badge,
  stats = [],
}: OGImageProps): Promise<ImageResponse> {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
          padding: "60px",
          color: "white",
          fontFamily: "system-ui",
        }}
      >
        {badge && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "20px",
              color: "#94a3b8",
              marginBottom: "16px",
            }}
          >
            <div
              style={{
                width: "12px",
                height: "12px",
                borderRadius: "999px",
                background: "#3b82f6",
              }}
            />
            {badge}
          </div>
        )}
        <div
          style={{
            display: "flex",
            fontSize: "56px",
            fontWeight: 700,
            lineHeight: 1.2,
            marginBottom: subtitle ? "20px" : "auto",
            letterSpacing: "-0.02em",
          }}
        >
          {title}
        </div>
        {subtitle && (
          <div
            style={{
              display: "flex",
              fontSize: "28px",
              color: "#cbd5e1",
              marginBottom: "auto",
            }}
          >
            {subtitle}
          </div>
        )}
        {stats.length > 0 && (
          <div
            style={{
              display: "flex",
              gap: "32px",
              marginTop: "auto",
              paddingTop: "40px",
              borderTop: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            {stats.map((s) => (
              <div key={s.label} style={{ display: "flex", flexDirection: "column" }}>
                <div style={{ fontSize: "16px", color: "#94a3b8", marginBottom: "4px" }}>
                  {s.label}
                </div>
                <div
                  style={{
                    fontSize: "40px",
                    fontWeight: 700,
                    color: s.color ?? "white",
                  }}
                >
                  {s.value}
                </div>
              </div>
            ))}
          </div>
        )}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            position: "absolute",
            bottom: "40px",
            right: "60px",
            fontSize: "18px",
            color: "#64748b",
          }}
        >
          Sněmovna ČR · snemovna-cr.cz
        </div>
      </div>
    ),
    { ...size }
  );
}