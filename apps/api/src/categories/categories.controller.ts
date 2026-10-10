import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiParam } from "@nestjs/swagger";
import { createZodDto } from "nestjs-zod";
import { CategoriesService } from "./categories.service";
import {
  categoryCreateSchema,
  categoryUpdateSchema,
  paginationSchema,
} from "@playmate/validation";

export class CreateCategoryDto extends createZodDto(categoryCreateSchema) {}
export class UpdateCategoryDto extends createZodDto(categoryUpdateSchema) {}
export class CategoryPaginationQueryDto extends createZodDto(paginationSchema) {}

@ApiTags("Categories")
@Controller("categories")
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @ApiOperation({ summary: "List categories with pagination" })
  async findAll(@Query() query: CategoryPaginationQueryDto) {
    const params = paginationSchema.parse(query);
    const data = await this.categoriesService.findAll(params);
    return { success: true, data };
  }

  @Get("tree")
  @ApiOperation({ summary: "Get hierarchical category tree" })
  async findTree() {
    const data = await this.categoriesService.findTree();
    return { success: true, data };
  }

  @Get("slug/:slug")
  @ApiOperation({ summary: "Get category by URL-safe slug" })
  @ApiParam({ name: "slug", description: "Category slug" })
  async findBySlug(@Param("slug") slug: string) {
    const data = await this.categoriesService.findBySlug(slug);
    return { success: true, data };
  }

  @Get(":id")
  @ApiOperation({ summary: "Get category by ID" })
  @ApiParam({ name: "id", description: "Category UUID" })
  async findOne(@Param("id") id: string) {
    const data = await this.categoriesService.findById(id);
    return { success: true, data };
  }

  @Post()
  @ApiOperation({ summary: "Create a new category" })
  async create(@Body() body: CreateCategoryDto) {
    const data = categoryCreateSchema.parse(body);
    const category = await this.categoriesService.create(data);
    return { success: true, data: category };
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update category details" })
  @ApiParam({ name: "id", description: "Category UUID" })
  async update(@Param("id") id: string, @Body() body: UpdateCategoryDto) {
    const data = categoryUpdateSchema.parse(body);
    const category = await this.categoriesService.update(id, data);
    return { success: true, data: category };
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete a category" })
  @ApiParam({ name: "id", description: "Category UUID" })
  async remove(@Param("id") id: string) {
    await this.categoriesService.remove(id);
    return { success: true, message: "Category deleted" };
  }
}

