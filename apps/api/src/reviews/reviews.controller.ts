import { Body, Controller, Delete, Get, Param, Post, Query, Req, UseGuards } from "@nestjs/common";
import { ReviewsService } from "./reviews.service";
import { reviewCreateSchema, paginationSchema } from "@playmate/validation";
import { AuthGuard } from "@/common/auth.guard";

@Controller("reviews")
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get("venue/:venueId")
  async findByVenue(@Param("venueId") venueId: string, @Query() query: Record<string, any>) {
    const params = paginationSchema.parse(query);
    const data = await this.reviewsService.findByVenue(venueId, params);
    return { success: true, data };
  }

  @Get("product/:productId")
  async findByProduct(@Param("productId") productId: string, @Query() query: Record<string, any>) {
    const params = paginationSchema.parse(query);
    const data = await this.reviewsService.findByProduct(productId, params);
    return { success: true, data };
  }

  @Get(":id")
  async findOne(@Param("id") id: string) {
    const data = await this.reviewsService.findById(id);
    return { success: true, data };
  }

  @Post()
  @UseGuards(AuthGuard)
  async create(@Req() req: any, @Body() body: unknown) {
    const data = reviewCreateSchema.parse(body);
    const review = await this.reviewsService.create(req.user.id, data);
    return { success: true, data: review };
  }

  @Delete(":id")
  @UseGuards(AuthGuard)
  async remove(@Req() req: any, @Param("id") id: string) {
    await this.reviewsService.remove(req.user.id, id);
    return { success: true, message: "Review deleted" };
  }
}
