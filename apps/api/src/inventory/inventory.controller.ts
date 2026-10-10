import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiParam, ApiQuery } from "@nestjs/swagger";
import { createZodDto } from "nestjs-zod";
import { InventoryService } from "./inventory.service";
import { inventoryUpdateSchema } from "@playmate/validation";

export class UpsertInventoryDto extends createZodDto(inventoryUpdateSchema) {}

@ApiTags("Inventory")
@Controller("inventory")
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get("variant/:variantId")
  @ApiOperation({ summary: "Get inventory stock for a variant" })
  @ApiParam({ name: "variantId", description: "Product variant UUID" })
  @ApiQuery({ name: "warehouse", required: false, description: "Specific warehouse identifier" })
  async findByVariant(@Param("variantId") variantId: string, @Query("warehouse") warehouse?: string) {
    if (warehouse) {
      const data = await this.inventoryService.findByVariantAndWarehouse(variantId, warehouse);
      return { success: true, data };
    }
    const data = await this.inventoryService.findByVariant(variantId);
    return { success: true, data };
  }

  @Post()
  @ApiOperation({ summary: "Upsert inventory stock level" })
  async upsert(@Body() body: UpsertInventoryDto) {
    const data = inventoryUpdateSchema.parse(body);
    const inv = await this.inventoryService.upsert(data);
    return { success: true, data: inv };
  }
}

