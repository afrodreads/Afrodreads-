import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0b0b0c",
        }}
      >
        <div
          style={{
            fontSize: 120,
            fontWeight: 700,
            letterSpacing: -2,
            color: "#f4c60a",
            textTransform: "uppercase",
          }}
        >
          Afro Dreads
        </div>
        <div
          style={{
            marginTop: 24,
            fontSize: 36,
            color: "#ffffff",
          }}
        >
          Dreadlocks &amp; Microlocs · Pirituba, SP
        </div>
      </div>
    ),
    { ...size },
  );
}
