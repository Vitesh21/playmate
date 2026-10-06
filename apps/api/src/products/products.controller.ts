import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { ProductsService } from "./products.service";
import {
  productCreateSchema,
  productUpdateSchema,
  productSearchSchema,
  paginationSchema,
  variantCreateSchema,
  variantUpdateSchema,
} from "@playmate/validation";

@Controller("products")
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  async search(@Query() query: Record<string, any>) {
    const search = productSearchSchema.partial().parse(query);
    const page = paginationSchema.parse(query);
    const data = await this.productsService.search({ ...search, ...page });
    return { success: true, data };
  }

  @Get("slug/:slug")
  async findBySlug(@Param("slug") slug: string) {
    const data = await this.productsService.findBySlug(slug);
    return { success: true, data };
  }

  @Get(":id")
  async findOne(@Param("id") id: string) {
    const data = await this.productsService.findById(id);
    return { success: true, data };
  }

  @Get(":id/variants")
  async getVariants(@Param("id") id: string) {
    const data = await this.productsService.getVariants(id);
    return { success: true, data };
  }

  @Post()
  async create(@Body() body: unknown) {
    const data = productCreateSchema.parse(body);
    const product = await this.productsService.create(data);
    return { success: true, data: product };
  }

  @Post("variants")
  async createVariant(@Body() body: unknown) {
    const data = variantCreateSchema.parse(body);
    const variant = await this.productsService.createVariant(data);
    return { success: true, data: variant };
  }

  @Patch("variants/:id")
  async updateVariant(@Param("id") id: string, @Body() body: unknown) {
    const data = variantUpdateSchema.parse(body);
    const variant = await this.productsService.updateVariant(id, data);
    return { success: true, data: variant };
  }

  @Patch(":id")
  async update(@Param("id") id: string, @Body() body: unknown) {
    const data = productUpdateSchema.parse(body);
    const product = await this.productsService.update(id, data);
    return { success: true, data: product };
  }

  @Delete(":id")
  async remove(@Param("id") id: string) {
    await this.productsService.remove(id);
    return { success: true, message: "Product deleted" };
  }
}
