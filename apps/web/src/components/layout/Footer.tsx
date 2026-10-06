import Link from "next/link";
import { Dumbbell, Mail, Phone, MapPin } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t bg-card">
      <div className="container mx-auto px-4 py-12">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
                <Dumbbell className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold tracking-tight">Playmate</span>
            </Link>
            <p className="mt-4 text-sm text-muted-foreground">
              Your complete sports companion. Book venues and shop equipment all
              in one place.
            </p>
          </div>

          <div>
            <h4 className="font-semibold">Play</h4>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              <li><Link href="/venues" className="hover:text-foreground">Find Venues</Link></li>
              <li><Link href="/venues/badminton" className="hover:text-foreground">Badminton</Link></li>
              <li><Link href="/venues/football" className="hover:text-foreground">Football Turf</Link></li>
              <li><Link href="/venues/basketball" className="hover:text-foreground">Basketball</Link></li>
              <li><Link href="/my-bookings" className="hover:text-foreground">My Bookings</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold">Shop</h4>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              <li><Link href="/shop" className="hover:text-foreground">All Products</Link></li>
              <li><Link href="/shop/rackets" className="hover:text-foreground">Rackets</Link></li>
              <li><Link href="/shop/shoes" className="hover:text-foreground">Sports Shoes</Link></li>
              <li><Link href="/shop/apparel" className="hover:text-foreground">Apparel</Link></li>
              <li><Link href="/cart" className="hover:text-foreground">My Cart</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold">Contact</h4>
            <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                <a href="mailto:hello@playmate.in" className="hover:text-foreground">hello@playmate.in</a>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                <a href="tel:+918000000000" className="hover:text-foreground">+91 80000 00000</a>
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                <span>Hyderabad, Telangana, India</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t pt-8 text-sm text-muted-foreground md:flex-row">
          <p>© {new Date().getFullYear()} Playmate. All rights reserved.</p>
          <div className="flex gap-6">
            <Link href="/privacy" className="hover:text-foreground">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-foreground">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
