import type { Metadata } from "next";
import { Big_Shoulders, Instrument_Sans, Permanent_Marker } from "next/font/google";
import "./globals.css";

// Google merged "Big Shoulders Display" into the variable "Big Shoulders"
// family; its optical-size axis gives the display cut at headline sizes.
const bigShoulders = Big_Shoulders({
  variable: "--font-big-shoulders",
  subsets: ["latin"],
  axes: ["opsz"],
});

const instrumentSans = Instrument_Sans({
  variable: "--font-instrument-sans",
  subsets: ["latin"],
});

const permanentMarker = Permanent_Marker({
  variable: "--font-permanent-marker",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "Can Drive · Assumption College",
  description:
    "Assumption College Catholic Secondary School Can Drive: school progress, homeroom standings, rewards, and street collection zones.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en-CA"
      className={`${bigShoulders.variable} ${instrumentSans.variable} ${permanentMarker.variable}`}
    >
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
