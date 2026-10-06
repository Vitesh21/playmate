import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { VenuesService } from "./venues.service";
import {
  venueCreateSchema,
  venueUpdateSchema,
  venueSearchSchema,
  paginationSchema,
} from "@playmate/validation";

@Controller("venues")
export class VenuesController {
  constructor(private readonly venuesService: VenuesService) {}

  @Get()
  async search(@Query() query: Record<string, any>) {
    const search = venueSearchSchema.partial().parse(query);
    const page = paginationSchema.parse(query);
    const data = await this.venuesService.search({ ...search, ...page });
    return { success: true, data };
  }

  @Get("slug/:slug")
  async findBySlug(@Param("slug") slug: string) {
    const data = await this.venuesService.findBySlug(slug);
    return { success: true, data };
  }

  @Get(":id")
  async findOne(@Param("id") id: string) {
    const data = await this.venuesService.findById(id);
    return { success: true, data };
  }

  @Get(":id/courts")
  async getCourts(@Param("id") id: string) {
    const data = await this.venuesService.getCourts(id);
    return { success: true, data };
  }

  @Post()
  async create(@Body() body: unknown) {
    const data = venueCreateSchema.parse(body);
    const venue = await this.venuesService.create(data);
    return { success: true, data: venue };
  }

  @Patch(":id")
  async update(@Param("id") id: string, @Body() body: unknown) {
    const data = venueUpdateSchema.parse(body);
    const venue = await this.venuesService.update(id, data);
    return { success: true, data: venue };
  }

  @Delete(":id")
  async remove(@Param("id") id: string) {
    await this.venuesService.remove(id);
    return { success: true, message: "Venue deleted" };
  }
}
