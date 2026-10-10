import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam } from "@nestjs/swagger";
import { createZodDto } from "nestjs-zod";
import { ReviewsService } from "./reviews.service";
import { reviewCreateSchema, paginationSchema } from "@playmate/validation";
import { AuthGuard } from "@/common/auth.guard";

export class CreateReviewDto extends createZodDto(reviewCreateSchema) {}
export class ReviewPaginationQueryDto extends createZodDto(paginationSchema) {}

@ApiTags("Reviews")
@Controller("reviews")
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get("venue/:venueId")
  @ApiOperation({ summary: "Get reviews for a venue" })
  @ApiParam({ name: "venueId", description: "Venue UUID" })
  async findByVenue(@Param("venueId") venueId: string, @Query() query: ReviewPaginationQueryDto) {
    const params = paginationSchema.parse(query);
    const data = await this.reviewsService.findByVenue(venueId, params);
    return { success: true, data };
  }

  @Get("product/:productId")
  @ApiOperation({ summary: "Get reviews for a product" })
  @ApiParam({ name: "productId", description: "Product UUID" })
  async findByProduct(@Param("productId") productId: string, @Query() query: ReviewPaginationQueryDto) {
    const params = paginationSchema.parse(query);
    const data = await this.reviewsService.findByProduct(productId, params);
    return { success: true, data };
  }

  @Get(":id")
  @ApiOperation({ summary: "Get review by ID" })
  @ApiParam({ name: "id", description: "Review UUID" })
  async findOne(@Param("id") id: string) {
    const data = await this.reviewsService.findById(id);
    return { success: true, data };
  }

  @Post()
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Create a review for a venue or product" })
  async create(@Req() req: any, @Body() body: CreateReviewDto) {
    const data = reviewCreateSchema.parse(body);
    const review = await this.reviewsService.create(req.user.id, data);
    return { success: true, data: review };
  }

  @Delete(":id")
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Delete a review" })
  @ApiParam({ name: "id", description: "Review UUID" })
  async remove(@Req() req: any, @Param("id") id: string) {
    await this.reviewsService.remove(req.user.id, id);
    return { success: true, message: "Review deleted" };
  }
}

