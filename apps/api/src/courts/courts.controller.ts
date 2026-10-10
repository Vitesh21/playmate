import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiParam, ApiQuery } from "@nestjs/swagger";
import { createZodDto } from "nestjs-zod";
import { z } from "zod";
import { CourtsService } from "./courts.service";
import {
  courtCreateSchema,
  courtUpdateSchema,
  courtSlotCreateSchema,
} from "@playmate/validation";

export class CreateCourtDto extends createZodDto(courtCreateSchema) {}
export class UpdateCourtDto extends createZodDto(courtUpdateSchema) {}
export class CreateCourtSlotDto extends createZodDto(courtSlotCreateSchema) {}
export class BulkCreateCourtSlotsDto extends createZodDto(
  z.object({
    slots: z.array(courtSlotCreateSchema),
  }),
) {}

@ApiTags("Courts")
@Controller("courts")
export class CourtsController {
  constructor(private readonly courtsService: CourtsService) {}

  @Get(":id")
  @ApiOperation({ summary: "Get court details by ID" })
  @ApiParam({ name: "id", description: "Court UUID" })
  async findOne(@Param("id") id: string) {
    const data = await this.courtsService.findById(id);
    return { success: true, data };
  }

  @Get(":id/slots")
  @ApiOperation({ summary: "Get available booking slots for a court" })
  @ApiParam({ name: "id", description: "Court UUID" })
  @ApiQuery({ name: "date", required: false, description: "Filter by date (YYYY-MM-DD)" })
  async getSlots(@Param("id") id: string, @Query("date") date?: string) {
    const data = await this.courtsService.getSlots(id, date);
    return { success: true, data };
  }

  @Post()
  @ApiOperation({ summary: "Create a new court in a venue" })
  async create(@Body() body: CreateCourtDto) {
    const data = courtCreateSchema.parse(body);
    const court = await this.courtsService.create(data);
    return { success: true, data: court };
  }

  @Post(":id/slots")
  @ApiOperation({ summary: "Create a court booking slot" })
  @ApiParam({ name: "id", description: "Court UUID" })
  async createSlot(@Body() body: CreateCourtSlotDto) {
    const data = courtSlotCreateSchema.parse(body);
    const slot = await this.courtsService.createSlot(data);
    return { success: true, data: slot };
  }

  @Post(":id/slots/bulk")
  @ApiOperation({ summary: "Bulk create court booking slots" })
  @ApiParam({ name: "id", description: "Court UUID" })
  async bulkCreateSlots(@Param("id") courtId: string, @Body() body: BulkCreateCourtSlotsDto) {
    const slots = body.slots.map((s) => courtSlotCreateSchema.parse(s));
    const created = await this.courtsService.bulkCreateSlots(courtId, slots);
    return { success: true, data: created, count: created.length };
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update court details" })
  @ApiParam({ name: "id", description: "Court UUID" })
  async update(@Param("id") id: string, @Body() body: UpdateCourtDto) {
    const data = courtUpdateSchema.parse(body);
    const court = await this.courtsService.update(id, data);
    return { success: true, data: court };
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete a court" })
  @ApiParam({ name: "id", description: "Court UUID" })
  async remove(@Param("id") id: string) {
    await this.courtsService.remove(id);
    return { success: true, message: "Court deleted" };
  }
}

