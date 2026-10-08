import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { eq, and, ilike, or, gte, lte, count, desc, asc, sql } from "drizzle-orm";
import { DRIZZLE_DB, type DrizzleDb } from "@/db/database.module";
import { products, type NewProduct } from "@/db/schema/products";
import { productVariants } from "@/db/schema/product-variants";
import { categories } from "@/db/schema/categories";
import type {
  ProductCreateInput,
  ProductUpdateInput,
  ProductSearchInput,
  PaginationInput,
  VariantCreateInput,
  VariantUpdateInput,
} from "@playmate/validation";
import type { NewProductVariant } from "@/db/schema/product-variants";
import type { PaginatedResponse } from "@playmate/types";

@Injectable()
export class ProductsService {
  constructor(@Inject(DRIZZLE_DB) private readonly db: DrizzleDb) {}

  async search(params: ProductSearchInput & PaginationInput): Promise<PaginatedResponse<any>> {
    const page = params.page ?? 1;
    const perPage = params.perPage ?? 12;
    const offset = (page - 1) * perPage;

    const filters: any[] = [eq(products.isActive, true)];

    if (params.categoryId) filters.push(eq(products.categoryId, params.categoryId));
    if (params.brand) filters.push(ilike(products.brand, `%${params.brand}%`));
    if (params.search) {
      filters.push(
        or(
          ilike(products.name, `%${params.search}%`),
          ilike(products.description, `%${params.search}%`),
          ilike(products.brand, `%${params.search}%`),
        ),
      );
    }

    let orderClause = desc(products.createdAt);
    switch (params.sortBy) {
      case "price-asc":
        orderClause = sql`min_price asc` as any;
        break;
      case "price-desc":
        orderClause = sql`max_price desc` as any;
        break;
      case "rating-desc":
        orderClause = desc(products.averageRating);
        break;
      default:
        orderClause = desc(products.createdAt);
    }

    const variantsSub = this.db
      .select({
        productId: productVariants.productId,
        minPrice: sql<number>`min(${productVariants.price})`.as("min_price"),
        maxPrice: sql<number>`max(${productVariants.price})`.as("max_price"),
      })
      .from(productVariants)
      .groupBy(productVariants.productId)
      .as("pv");

    if (params.categorySlug) {
      const [cat] = await this.db.select({ id: categories.id }).from(categories).where(eq(categories.slug, params.categorySlug)).limit(1);
      if (cat) filters.push(eq(products.categoryId, cat.id));
    }

    if (params.minPrice != null) filters.push(gte(variantsSub.minPrice, params.minPrice));
    if (params.maxPrice != null) filters.push(lte(variantsSub.maxPrice, params.maxPrice));

    const baseQuery = this.db
      .select({
        ...Object.fromEntries(Object.keys(products).map((k) => [k, (products as any)[k]])),
        minPrice: variantsSub.minPrice,
        maxPrice: variantsSub.maxPrice,
      })
      .from(products)
      .leftJoin(variantsSub, eq(variantsSub.productId, products.id))
      .where(and(...filters));

    const items = await (baseQuery as any).orderBy(orderClause).limit(perPage).offset(offset);

    const [totalObj] = await this.db
      .select({ value: count() })
      .from(products)
      .where(and(...filters));

    const total = Number(totalObj?.value ?? 0);
    return { items, total, page, perPage, totalPages: Math.ceil(total / perPage) };
  }

  async findById(id: string) {
    const [item] = await this.db.select().from(products).where(eq(products.id, id)).limit(1);
    if (!item) throw new NotFoundException("Product not found");
    return item;
  }

  async findBySlug(slug: string) {
    const [item] = await this.db.select().from(products).where(eq(products.slug, slug)).limit(1);
    if (!item) throw new NotFoundException("Product not found");
    return item;
  }

  async getVariants(productId: string) {
    await this.findById(productId);
    return this.db.select().from(productVariants).where(eq(productVariants.productId, productId));
  }

  async create(data: ProductCreateInput) {
    const [created] = await this.db.insert(products).values(data as unknown as NewProduct).returning();
    return created;
  }

  async update(id: string, data: ProductUpdateInput) {
    const [updated] = await this.db
      .update(products)
      .set({ ...(data as unknown as Partial<NewProduct>), updatedAt: new Date() })
      .where(eq(products.id, id))
      .returning();
    if (!updated) throw new NotFoundException("Product not found");
    return updated;
  }

  async remove(id: string) {
    const [deleted] = await this.db.delete(products).where(eq(products.id, id)).returning();
    if (!deleted) throw new NotFoundException("Product not found");
    return deleted;
  }

  async createVariant(data: VariantCreateInput) {
    const [created] = await this.db
      .insert(productVariants)
      .values(data as unknown as NewProductVariant)
      .returning();
    return created;
  }

  async updateVariant(id: string, data: VariantUpdateInput) {
    const [updated] = await this.db
      .update(productVariants)
      .set({ ...(data as unknown as Partial<NewProductVariant>), updatedAt: new Date() })
      .where(eq(productVariants.id, id))
      .returning();
    if (!updated) throw new NotFoundException("Variant not found");
    return updated;
  }
}
