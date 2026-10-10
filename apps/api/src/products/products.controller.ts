import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiParam } from "@nestjs/swagger";
import { createZodDto } from "nestjs-zod";
import { ProductsService } from "./products.service";
import {
  productCreateSchema,
  productUpdateSchema,
  productSearchSchema,
  paginationSchema,
  variantCreateSchema,
  variantUpdateSchema,
} from "@playmate/validation";

export class CreateProductDto extends createZodDto(productCreateSchema) {}
export class UpdateProductDto extends createZodDto(productUpdateSchema) {}
export class CreateVariantDto extends createZodDto(variantCreateSchema) {}
export class UpdateVariantDto extends createZodDto(variantUpdateSchema) {}
export class ProductSearchQueryDto extends createZodDto(productSearchSchema.partial().and(paginationSchema)) {}

@ApiTags("Products")
@Controller("products")
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @ApiOperation({ summary: "Search products with filters and pagination" })
  async search(@Query() query: ProductSearchQueryDto) {
    const search = productSearchSchema.partial().parse(query);
    const page = paginationSchema.parse(query);
    const data = await this.productsService.search({ ...search, ...page } as any);
    return { success: true, data };
  }

  @Get("slug/:slug")
  @ApiOperation({ summary: "Get product by URL-safe slug" })
  @ApiParam({ name: "slug", description: "Product slug" })
  async findBySlug(@Param("slug") slug: string) {
    const data = await this.productsService.findBySlug(slug);
    return { success: true, data };
  }

  @Get(":id")
  @ApiOperation({ summary: "Get product by ID" })
  @ApiParam({ name: "id", description: "Product UUID" })
  async findOne(@Param("id") id: string) {
    const data = await this.productsService.findById(id);
    return { success: true, data };
  }

  @Get(":id/variants")
  @ApiOperation({ summary: "Get variants for a product" })
  @ApiParam({ name: "id", description: "Product UUID" })
  async getVariants(@Param("id") id: string) {
    const data = await this.productsService.getVariants(id);
    return { success: true, data };
  }

  @Post()
  @ApiOperation({ summary: "Create a new product" })
  async create(@Body() body: CreateProductDto) {
    const data = productCreateSchema.parse(body);
    const product = await this.productsService.create(data);
    return { success: true, data: product };
  }

  @Post("variants")
  @ApiOperation({ summary: "Create a product variant (e.g. size/color)" })
  async createVariant(@Body() body: CreateVariantDto) {
    const data = variantCreateSchema.parse(body);
    const variant = await this.productsService.createVariant(data);
    return { success: true, data: variant };
  }

  @Patch("variants/:id")
  @ApiOperation({ summary: "Update product variant details" })
  @ApiParam({ name: "id", description: "Variant UUID" })
  async updateVariant(@Param("id") id: string, @Body() body: UpdateVariantDto) {
    const data = variantUpdateSchema.parse(body);
    const variant = await this.productsService.updateVariant(id, data);
    return { success: true, data: variant };
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update product details" })
  @ApiParam({ name: "id", description: "Product UUID" })
  async update(@Param("id") id: string, @Body() body: UpdateProductDto) {
    const data = productUpdateSchema.parse(body);
    const product = await this.productsService.update(id, data);
    return { success: true, data: product };
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete a product" })
  @ApiParam({ name: "id", description: "Product UUID" })
  async remove(@Param("id") id: string) {
    await this.productsService.remove(id);
    return { success: true, message: "Product deleted" };
  }
}

