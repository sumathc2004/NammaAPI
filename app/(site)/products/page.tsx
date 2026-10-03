import { buildMetadata } from "@/lib/metadata";
import { PageHero } from "@/components/sections/PageHero";
import { ProductCard } from "@/components/sections/ProductCard";
import { FinalCta } from "@/components/sections/FinalCta";
import { products } from "@/lib/data/products";

export const metadata = buildMetadata({
  title: "Products — Payout, Payment, Salary & Automation APIs",
  description:
    "Explore NammaAPI's payment infrastructure products: Payout API, Payment Gateway, Salary & Bulk Payments and Payment Automation.",
  path: "/products",
});

export default function ProductsPage() {
  return (
    <>
      <PageHero
        eyebrow="Products"
        title="Payment Infrastructure for Modern Businesses"
        description="Four connected products covering every way money moves in and out of your business — built on a single, consistent API."
      />

      <section className="bg-white py-20 sm:py-24">
        <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {products.map((product) => (
              <ProductCard key={product.slug} product={product} />
            ))}
          </div>
        </div>
      </section>

      <FinalCta />
    </>
  );
}
