import { z } from "zod";

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(10),
});

export const idParamSchema = z.object({
  id: z.string().uuid({ message: "Invalid ID format" }),
});

export const slugParamSchema = z.object({
  slug: z.string().min(1, "Slug is required"),
});

export const userUpdateSchema = z.object({
  firstName: z.string().min(1, "First name is required").optional().nullable(),
  lastName: z.string().min(1, "Last name is required").optional().nullable(),
  phone: z.string().min(10, "Phone number must be at least 10 digits").optional().nullable(),
  avatarUrl: z.string().url("Invalid avatar URL").optional().nullable(),
});

export const sportCreateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  slug: z.string().min(1, "Slug is required"),
  description: z.string().optional().nullable(),
  iconUrl: z.string().url("Invalid icon URL").optional().nullable(),
  isActive: z.boolean().default(true),
});

export const sportUpdateSchema = sportCreateSchema.partial();

const operatingHoursSchema = z.object({
  day: z.number().int().min(0).max(6),
  openTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format"),
  closeTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format"),
  isClosed: z.boolean().default(false),
});

export const venueCreateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  slug: z.string().min(1, "Slug is required"),
  description: z.string().optional().nullable(),
  sportId: z.string().uuid("Invalid sport ID"),
  address: z.string().min(1, "Address is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  pincode: z.string().min(5, "Pincode must be at least 5 digits"),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email("Invalid email").optional().nullable(),
  images: z.array(z.string().url("Invalid image URL")).default([]),
  amenities: z.array(z.string()).default([]),
  operatingHours: z.array(operatingHoursSchema).default([]),
  isActive: z.boolean().default(true),
  ownerId: z.string().uuid("Invalid owner ID").optional().nullable(),
});

export const venueUpdateSchema = venueCreateSchema.partial();

export const venueSearchSchema = z.object({
  sportId: z.string().uuid().optional(),
  city: z.string().optional(),
  minPrice: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format").optional(),
  startTime: z
    .string()
    .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format")
    .optional(),
  endTime: z
    .string()
    .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format")
    .optional(),
  amenities: z.string().optional(),
  search: z.string().optional(),
});

export const courtCreateSchema = z.object({
  venueId: z.string().uuid("Invalid venue ID"),
  name: z.string().min(1, "Name is required"),
  description: z.string().optional().nullable(),
  type: z.string().optional().nullable(),
  surface: z.string().optional().nullable(),
  hourlyRate: z.number().min(0, "Hourly rate must be non-negative"),
  images: z.array(z.string().url("Invalid image URL")).default([]),
  isActive: z.boolean().default(true),
});

export const courtUpdateSchema = courtCreateSchema.partial();

export const courtSlotCreateSchema = z.object({
  courtId: z.string().uuid("Invalid court ID"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
  startTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format"),
  endTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format"),
  isAvailable: z.boolean().default(true),
  price: z.number().min(0, "Price must be non-negative"),
});

export const bookingCreateSchema = z.object({
  courtSlotId: z.string().uuid("Invalid slot ID"),
});

export const categoryCreateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  slug: z.string().min(1, "Slug is required"),
  description: z.string().optional().nullable(),
  parentId: z.string().uuid("Invalid parent ID").optional().nullable(),
  imageUrl: z.string().url("Invalid image URL").optional().nullable(),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
});

export const categoryUpdateSchema = categoryCreateSchema.partial();

export const productCreateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  slug: z.string().min(1, "Slug is required"),
  description: z.string().min(1, "Description is required"),
  categoryId: z.string().uuid("Invalid category ID"),
  brand: z.string().optional().nullable(),
  images: z.array(z.string().url("Invalid image URL")).default([]),
  isActive: z.boolean().default(true),
  sellerId: z.string().uuid("Invalid seller ID").optional().nullable(),
});

export const productUpdateSchema = productCreateSchema.partial();

export const productSearchSchema = z.object({
  categoryId: z.string().uuid().optional(),
  categorySlug: z.string().optional(),
  minPrice: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
  brand: z.string().optional(),
  search: z.string().optional(),
  sortBy: z.enum(["price-asc", "price-desc", "rating-desc", "newest"]).default("newest"),
});

export const variantCreateSchema = z.object({
  productId: z.string().uuid("Invalid product ID"),
  sku: z.string().min(1, "SKU is required"),
  size: z.string().optional().nullable(),
  color: z.string().optional().nullable(),
  price: z.number().min(0, "Price must be non-negative"),
  compareAtPrice: z.number().min(0, "Compare at price must be non-negative").optional().nullable(),
  images: z.array(z.string().url("Invalid image URL")).default([]),
});

export const variantUpdateSchema = variantCreateSchema.partial();

export const inventoryUpdateSchema = z.object({
  variantId: z.string().uuid("Invalid variant ID"),
  quantity: z.number().int().min(0, "Quantity must be non-negative"),
  reservedQuantity: z.number().int().min(0, "Reserved quantity must be non-negative").default(0),
  warehouse: z.string().optional().nullable(),
});

export const cartItemAddSchema = z.object({
  variantId: z.string().uuid("Invalid variant ID"),
  quantity: z.number().int().min(1, "Quantity must be at least 1"),
});

export const cartItemUpdateSchema = z.object({
  quantity: z.number().int().min(1, "Quantity must be at least 1"),
});

const addressSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  phone: z.string().min(10, "Phone must be at least 10 digits"),
  line1: z.string().min(1, "Address line 1 is required"),
  line2: z.string().optional().nullable(),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  pincode: z.string().min(5, "Pincode must be at least 5 digits"),
  country: z.string().min(1, "Country is required"),
});

export const checkoutSchema = z.object({
  shippingAddress: addressSchema,
  billingAddress: addressSchema.optional().nullable(),
});

export const reviewCreateSchema = z.object({
  rating: z.number().int().min(1, "Rating must be at least 1").max(5, "Rating must be at most 5"),
  comment: z.string().optional().nullable(),
  venueId: z.string().uuid().optional(),
  productId: z.string().uuid().optional(),
  images: z.array(z.string().url("Invalid image URL")).default([]),
});

export const razorpayWebhookSchema = z.object({
  event: z.string(),
  entity: z.string(),
  contains: z.array(z.string()).optional(),
  payload: z.record(z.unknown()),
});

/* =========================================================================
   VENUE ESSENTIALS + ON-DEMAND ORDERS — new schemas for the
   "forgot your racket? we'll bring it" flow.
   ========================================================================= */

export const essentialTypeSchema = z.enum(["RENT", "SALE", "ADDON"]);

export const essentialPricingModelSchema = z.enum(["PER_HOUR", "PER_BOOKING", "FIXED"]);

export const venueEssentialCreateSchema = z.object({
  venueId: z.string().uuid("Invalid venue ID"),
  sportId: z.string().uuid("Invalid sport ID"),
  name: z.string().min(1, "Name is required").max(120, "Name must be under 120 characters"),
  description: z.string().max(500, "Description must be under 500 characters").optional().nullable(),
  imageUrl: z.string().url("Invalid image URL").optional().nullable(),
  type: essentialTypeSchema,
  pricingModel: essentialPricingModelSchema,
  price: z.number().int().min(0, "Price must be non-negative (paise-free integers = INR)"),
  compareAtPrice: z.number().int().min(0, "Compare-at price must be non-negative").optional().nullable(),
  stockQuantity: z.number().int().min(0, "Stock cannot be negative").default(0),
  maxPerBooking: z.number().int().min(1, "Max per booking must be at least 1").default(4),
  tags: z.array(z.string().min(1)).default([]),
  categories: z.array(z.string().min(1)).default([]),
  isActive: z.boolean().default(true),
});

export const venueEssentialUpdateSchema = venueEssentialCreateSchema.partial();

export const venueEssentialSearchSchema = paginationSchema.extend({
  sportId: z.string().uuid().optional(),
  type: essentialTypeSchema.optional(),
  category: z.string().min(1).optional(),
  inStockOnly: z.coerce.boolean().optional().default(false),
});

const bookingEssentialItemInputSchema = z.object({
  essentialId: z.string().uuid("Invalid essential ID"),
  quantity: z.number().int().min(1, "Quantity must be >= 1").max(20, "Max 20 units per item"),
  durationHours: z
    .number()
    .int()
    .min(1, "Duration must be >= 1 hour")
    .max(24, "Max 24h rental")
    .optional()
    .nullable(),
});

export const attachEssentialsToBookingSchema = z.object({
  items: z
    .array(bookingEssentialItemInputSchema)
    .min(1, "At least one essential item is required")
    .max(10, "Maximum 10 line items per booking"),
});

export const onDemandOrderStatusSchema = z.enum([
  "REQUESTED",
  "PREPARING",
  "DELIVERED",
  "CANCELLED",
]);

const onDemandOrderItemInputSchema = z.object({
  essentialId: z.string().uuid("Invalid essential ID"),
  quantity: z.number().int().min(1, "Quantity must be >= 1").max(20, "Max 20 units per item"),
});

export const onDemandOrderCreateSchema = z.object({
  bookingId: z.string().uuid("Invalid booking ID"),
  deliveryNote: z
    .string()
    .max(240, "Delivery note must be under 240 characters")
    .optional()
    .nullable(),
  items: z
    .array(onDemandOrderItemInputSchema)
    .min(1, "At least one item is required")
    .max(10, "Maximum 10 line items per on-demand order"),
});

export const onDemandOrderUpdateStatusSchema = z.object({
  status: onDemandOrderStatusSchema,
});

export type PaginationInput = z.infer<typeof paginationSchema>;
export type IdParam = z.infer<typeof idParamSchema>;
export type SlugParam = z.infer<typeof slugParamSchema>;
export type UserUpdateInput = z.infer<typeof userUpdateSchema>;
export type SportCreateInput = z.infer<typeof sportCreateSchema>;
export type SportUpdateInput = z.infer<typeof sportUpdateSchema>;
export type VenueCreateInput = z.infer<typeof venueCreateSchema>;
export type VenueUpdateInput = z.infer<typeof venueUpdateSchema>;
export type VenueSearchInput = z.infer<typeof venueSearchSchema>;
export type CourtCreateInput = z.infer<typeof courtCreateSchema>;
export type CourtUpdateInput = z.infer<typeof courtUpdateSchema>;
export type CourtSlotCreateInput = z.infer<typeof courtSlotCreateSchema>;
export type BookingCreateInput = z.infer<typeof bookingCreateSchema>;
export type CategoryCreateInput = z.infer<typeof categoryCreateSchema>;
export type CategoryUpdateInput = z.infer<typeof categoryUpdateSchema>;
export type ProductCreateInput = z.infer<typeof productCreateSchema>;
export type ProductUpdateInput = z.infer<typeof productUpdateSchema>;
export type ProductSearchInput = z.infer<typeof productSearchSchema>;
export type VariantCreateInput = z.infer<typeof variantCreateSchema>;
export type VariantUpdateInput = z.infer<typeof variantUpdateSchema>;
export type InventoryUpdateInput = z.infer<typeof inventoryUpdateSchema>;
export type CartItemAddInput = z.infer<typeof cartItemAddSchema>;
export type CartItemUpdateInput = z.infer<typeof cartItemUpdateSchema>;
export type CheckoutInput = z.infer<typeof checkoutSchema>;
export type ReviewCreateInput = z.infer<typeof reviewCreateSchema>;
export type RazorpayWebhookInput = z.infer<typeof razorpayWebhookSchema>;
