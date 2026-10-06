import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { CategoriesService } from "./categories.service";
import {
  categoryCreateSchema,
  categoryUpdateSchema,
  paginationSchema,
} from "@playmate/validation";

@Controller("categories")
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  async findAll(@Query() query: Record<string, any>) {
    const params = paginationSchema.parse(query);
    const data = await this.categoriesService.findAll(params);
    return { success: true, data };
  }

  @Get("tree")
  async findTree() {
    const data = await this.categoriesService.findTree();
    return { success: true, data };
  }

  @Get("slug/:slug")
  async findBySlug(@Param("slug") slug: string) {
    const data = await this.categoriesService.findBySlug(slug);
    return { success: true, data };
  }

  @Get(":id")
  async findOne(@Param("id") id: string) {
    const data = await this.categoriesService.findById(id);
    return { success: true, data };
  }

  @Post()
  async create(@Body() body: unknown) {
    const data = categoryCreateSchema.parse(body);
    const category = await this.categoriesService.create(data);
    return { success: true, data: category };
  }

  @Patch(":id")
  async update(@Param("id") id: string, @Body() body: unknown) {
    const data = categoryUpdateSchema.parse(body);
    const category = await this.categoriesService.update(id, data);
    return { success: true, data: category };
  }

  @Delete(":id")
  async remove(@Param("id") id: string) {
    await this.categoriesService.remove(id);
    return { success: true, message: "Category deleted" };
  }
}
