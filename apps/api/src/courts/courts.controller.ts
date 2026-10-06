import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { CourtsService } from "./courts.service";
import {
  courtCreateSchema,
  courtUpdateSchema,
  courtSlotCreateSchema,
} from "@playmate/validation";

@Controller("courts")
export class CourtsController {
  constructor(private readonly courtsService: CourtsService) {}

  @Get(":id")
  async findOne(@Param("id") id: string) {
    const data = await this.courtsService.findById(id);
    return { success: true, data };
  }

  @Get(":id/slots")
  async getSlots(@Param("id") id: string, @Query("date") date?: string) {
    const data = await this.courtsService.getSlots(id, date);
    return { success: true, data };
  }

  @Post()
  async create(@Body() body: unknown) {
    const data = courtCreateSchema.parse(body);
    const court = await this.courtsService.create(data);
    return { success: true, data: court };
  }

  @Post(":id/slots")
  async createSlot(@Body() body: unknown) {
    const data = courtSlotCreateSchema.parse(body);
    const slot = await this.courtsService.createSlot(data);
    return { success: true, data: slot };
  }

  @Post(":id/slots/bulk")
  async bulkCreateSlots(@Param("id") courtId: string, @Body() body: { slots: any[] }) {
    const slots = body.slots.map((s) => courtSlotCreateSchema.parse(s));
    const created = await this.courtsService.bulkCreateSlots(courtId, slots);
    return { success: true, data: created, count: created.length };
  }

  @Patch(":id")
  async update(@Param("id") id: string, @Body() body: unknown) {
    const data = courtUpdateSchema.parse(body);
    const court = await this.courtsService.update(id, data);
    return { success: true, data: court };
  }

  @Delete(":id")
  async remove(@Param("id") id: string) {
    await this.courtsService.remove(id);
    return { success: true, message: "Court deleted" };
  }
}
