// Next.js client-side Link component for navigation without full page reloads
import Link from "next/link";
// Lucide icon set: dumbbell for venues/play, shopping bag for shop, search for search bar
import { Dumbbell, ShoppingBag, Search } from "lucide-react";
// Site header navigation bar component
import { Navbar } from "@/components/layout/Navbar";
// Site footer component with link columns and contact info
import { Footer } from "@/components/layout/Footer";

/**
 * Home page component — the marketing landing page for the Playmate app.
 * Composed of 3 main sections: Hero, Play+Shop feature grid, and Search CTA.
 * Wraps content between the Navbar (top) and Footer (bottom).
 */
export default function HomePage() {
  return (
    // Full-screen flex column container so footer sits at the bottom even with minimal content
    <div className="flex min-h-screen flex-col">
      {/* Sticky site header with logo, navigation links, and auth buttons */}
      <Navbar />
      {/* Main content area — grows to fill space between Navbar and Footer */}
      <main className="flex-1">
        {/* Section 1: HERO — large gradient banner with headline, subheadline, and dual CTA buttons */}
        <section className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-primary/10 py-20 md:py-28">
          <div className="container mx-auto px-4">
            {/* Centered content column (max-width 3xl) for hero messaging */}
            <div className="mx-auto max-w-3xl text-center">
              {/* Hero headline — "Play More." in default text, "Shop Smarter." uses the green --play accent color */}
              <h1 className="text-4xl font-bold tracking-tight md:text-6xl">
                Play More.{" "}
                <span className="text-play">Shop Smarter.</span>
              </h1>
              {/* Supporting subheadline summarizing the dual value prop of venue booking + equipment shopping */}
              <p className="mt-6 text-lg text-muted-foreground md:text-xl">
                Book sports venues instantly and discover the best sports
                equipment. Your complete sports companion.
              </p>
              {/* Dual CTA button row — stacks vertically on mobile, side-by-side on sm+ screens */}
              <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
                {/* Left CTA: green "Play" themed button — navigates to /venues for court booking */}
                <Link
                  href="/venues"
                  className="inline-flex items-center gap-2 rounded-lg bg-play px-8 py-3 font-semibold text-play-foreground shadow-lg transition-all hover:scale-105 hover:shadow-xl"
                >
                  <Dumbbell className="h-5 w-5" />
                  Find a Court
                </Link>
                {/* Right CTA: blue "Shop" themed button — navigates to /shop for equipment browsing */}
                <Link
                  href="/shop"
                  className="inline-flex items-center gap-2 rounded-lg bg-shop px-8 py-3 font-semibold text-shop-foreground shadow-lg transition-all hover:scale-105 hover:shadow-xl"
                >
                  <ShoppingBag className="h-5 w-5" />
                  Browse Shop
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Section 2: PLAY + SHOP FEATURE GRID — two side-by-side cards detailing each half of the platform */}
        <section className="container mx-auto px-4 py-16">
          {/* Centered section header with title and supporting description */}
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
              Everything Sports, One Platform
            </h2>
            <p className="mt-4 text-muted-foreground">
              From booking the perfect badminton court to finding your next pair
              of running shoes.
            </p>
          </div>

          {/* Two-column responsive grid — stacks on mobile, 2 columns from md breakpoint up */}
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-2">
            {/* LEFT CARD: Play (Venues) feature card — green accent, describes venue booking functionality */}
            <div className="group relative overflow-hidden rounded-2xl border bg-card p-8 shadow-sm transition-all hover:shadow-xl">
              {/* Icon badge: dumbbell icon inside a green-tinted background */}
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-play/10">
                <Dumbbell className="h-7 w-7 text-play" />
              </div>
              <h3 className="mt-6 text-2xl font-semibold">Play</h3>
              <p className="mt-3 text-muted-foreground">
                Discover venues near you, check real-time availability, and
                book courts in seconds. Badminton, football, basketball, and
                more.
              </p>
              {/* Bulleted list of 4 key Play features with green dot indicators */}
              <ul className="mt-6 space-y-2 text-sm">
                {[
                  "Real-time slot availability",
                  "Instant booking confirmation",
                  "Secure online payments",
                  "Verified venues & amenities",
                ].map((feature) => (
                  <li key={feature} className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-play" />
                    {feature}
                  </li>
                ))}
              </ul>
              {/* Text link to /venues with green accent color and hover underline */}
              <Link
                href="/venues"
                className="mt-8 inline-flex items-center gap-2 font-medium text-play hover:underline"
              >
                Explore venues
                <span aria-hidden="true">→</span>
              </Link>
            </div>

            {/* RIGHT CARD: Shop feature card — blue accent, describes sports equipment e-commerce functionality */}
            <div className="group relative overflow-hidden rounded-2xl border bg-card p-8 shadow-sm transition-all hover:shadow-xl">
              {/* Icon badge: shopping bag icon inside a blue-tinted background */}
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-shop/10">
                <ShoppingBag className="h-7 w-7 text-shop" />
              </div>
              <h3 className="mt-6 text-2xl font-semibold">Shop</h3>
              <p className="mt-3 text-muted-foreground">
                Quality sports equipment, apparel, and accessories from trusted
                brands. Rackets, shoes, jerseys, fitness gear, and more.
              </p>
              {/* Bulleted list of 4 key Shop features with blue dot indicators */}
              <ul className="mt-6 space-y-2 text-sm">
                {[
                  "Curated sports products",
                  "Trusted brands & sellers",
                  "Fast, reliable delivery",
                  "Easy returns & exchanges",
                ].map((feature) => (
                  <li key={feature} className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-shop" />
                    {feature}
                  </li>
                ))}
              </ul>
              {/* Text link to /shop with blue accent color and hover underline */}
              <Link
                href="/shop"
                className="mt-8 inline-flex items-center gap-2 font-medium text-shop hover:underline"
              >
                Browse shop
                <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
        </section>

        {/* Section 3: SEARCH CTA — muted background section with a prominent search bar for venues/products */}
        <section className="bg-muted/50 py-16">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-xl text-center">
              <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
                Start Your Search
              </h2>
              <p className="mt-4 text-muted-foreground">
                Find venues or products instantly.
              </p>
              {/* Search input container — rounded bordered card with icon, text input, and submit button */}
              <div className="mt-8 flex max-w-2xl items-center gap-2 rounded-xl border bg-card p-2 shadow-sm">
                {/* Search icon prefix inside the input field area */}
                <Search className="ml-2 h-5 w-5 text-muted-foreground" />
                {/* Controlled text input with placeholder suggesting typical searches (courts, rackets) */}
                <input
                  type="text"
                  placeholder="Search badminton courts, Yonex rackets..."
                  className="flex-1 bg-transparent px-2 py-2 outline-none placeholder:text-muted-foreground"
                />
                {/* Primary-themed search button on the right side of the bar */}
                <button className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground">
                  Search
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>
      {/* Site footer — 4-column link layout with brand, Play links, Shop links, and Contact info */}
      <Footer />
    </div>
  );
}
