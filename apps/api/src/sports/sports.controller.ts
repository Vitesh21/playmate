import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { SportsService } from "./sports.service";
import { sportCreateSchema, sportUpdateSchema, paginationSchema } from "@playmate/validation";

@Controller("sports")
export class SportsController {
  constructor(private readonly sportsService: SportsService) {}

  @Get()
  async findAll(@Query() query: Record<string, any>) {
    const params = paginationSchema.parse(query);
    const data = await this.sportsService.findAll({ ...params, search: query.search });
    return { success: true, data };
  }

  @Get("slug/:slug")
  async findBySlug(@Param("slug") slug: string) {
    const data = await this.sportsService.findBySlug(slug);
    return { success: true, data };
  }

  @Get(":id")
  async findOne(@Param("id") id: string) {
    const data = await this.sportsService.findById(id);
    return { success: true, data };
  }

  @Post()
  async create(@Body() body: unknown) {
    const data = sportCreateSchema.parse(body);
    const sport = await this.sportsService.create(data);
    return { success: true, data: sport };
  }

  @Patch(":id")
  async update(@Param("id") id: string, @Body() body: unknown) {
    const data = sportUpdateSchema.parse(body);
    const sport = await this.sportsService.update(id, data);
    return { success: true, data: sport };
  }

  @Delete(":id")
  async remove(@Param("id") id: string) {
    await this.sportsService.remove(id);
    return { success: true, message: "Sport deleted" };
  }
}
