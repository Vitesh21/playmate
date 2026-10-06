import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { InventoryService } from "./inventory.service";
import { inventoryUpdateSchema } from "@playmate/validation";

@Controller("inventory")
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get("variant/:variantId")
  async findByVariant(@Param("variantId") variantId: string, @Query("warehouse") warehouse?: string) {
    if (warehouse) {
      const data = await this.inventoryService.findByVariantAndWarehouse(variantId, warehouse);
      return { success: true, data };
    }
    const data = await this.inventoryService.findByVariant(variantId);
    return { success: true, data };
  }

  @Post()
  async upsert(@Body() body: unknown) {
    const data = inventoryUpdateSchema.parse(body);
    const inv = await this.inventoryService.upsert(data);
    return { success: true, data: inv };
  }
}
