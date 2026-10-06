import Link from "next/link";
import { Dumbbell, ShoppingBag, Search } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <section className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-primary/10 py-20 md:py-28">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-3xl text-center">
              <h1 className="text-4xl font-bold tracking-tight md:text-6xl">
                Play More.{" "}
                <span className="text-play">Shop Smarter.</span>
              </h1>
              <p className="mt-6 text-lg text-muted-foreground md:text-xl">
                Book sports venues instantly and discover the best sports
                equipment. Your complete sports companion.
              </p>
              <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
                <Link
                  href="/venues"
                  className="inline-flex items-center gap-2 rounded-lg bg-play px-8 py-3 font-semibold text-play-foreground shadow-lg transition-all hover:scale-105 hover:shadow-xl"
                >
                  <Dumbbell className="h-5 w-5" />
                  Find a Court
                </Link>
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

        <section className="container mx-auto px-4 py-16">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
              Everything Sports, One Platform
            </h2>
            <p className="mt-4 text-muted-foreground">
              From booking the perfect badminton court to finding your next pair
              of running shoes.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-2">
            <div className="group relative overflow-hidden rounded-2xl border bg-card p-8 shadow-sm transition-all hover:shadow-xl">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-play/10">
                <Dumbbell className="h-7 w-7 text-play" />
              </div>
              <h3 className="mt-6 text-2xl font-semibold">Play</h3>
              <p className="mt-3 text-muted-foreground">
                Discover venues near you, check real-time availability, and
                book courts in seconds. Badminton, football, basketball, and
                more.
              </p>
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
              <Link
                href="/venues"
                className="mt-8 inline-flex items-center gap-2 font-medium text-play hover:underline"
              >
                Explore venues
                <span aria-hidden="true">→</span>
              </Link>
            </div>

            <div className="group relative overflow-hidden rounded-2xl border bg-card p-8 shadow-sm transition-all hover:shadow-xl">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-shop/10">
                <ShoppingBag className="h-7 w-7 text-shop" />
              </div>
              <h3 className="mt-6 text-2xl font-semibold">Shop</h3>
              <p className="mt-3 text-muted-foreground">
                Quality sports equipment, apparel, and accessories from trusted
                brands. Rackets, shoes, jerseys, fitness gear, and more.
              </p>
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

        <section className="bg-muted/50 py-16">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-xl text-center">
              <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
                Start Your Search
              </h2>
              <p className="mt-4 text-muted-foreground">
                Find venues or products instantly.
              </p>
              <div className="mt-8 flex max-w-2xl items-center gap-2 rounded-xl border bg-card p-2 shadow-sm">
                <Search className="ml-2 h-5 w-5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search badminton courts, Yonex rackets..."
                  className="flex-1 bg-transparent px-2 py-2 outline-none placeholder:text-muted-foreground"
                />
                <button className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground">
                  Search
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
