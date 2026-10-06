export type ID = string;

export type Timestamp = {
  createdAt: Date;
  updatedAt: Date;
};

export enum BookingStatus {
  PENDING = "PENDING",
  CONFIRMED = "CONFIRMED",
  EXPIRED = "EXPIRED",
  CANCELLED = "CANCELLED",
  REFUNDED = "REFUNDED",
}

export enum PaymentStatus {
  PENDING = "PENDING",
  PAID = "PAID",
  FAILED = "FAILED",
  REFUNDED = "REFUNDED",
}

export enum PaymentMethod {
  RAZORPAY = "RAZORPAY",
}

export enum OrderStatus {
  PENDING = "PENDING",
  CONFIRMED = "CONFIRMED",
  SHIPPED = "SHIPPED",
  DELIVERED = "DELIVERED",
  CANCELLED = "CANCELLED",
  REFUNDED = "REFUNDED",
}

export type User = {
  id: ID;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  avatarUrl?: string | null;
  role: UserRole;
} & Timestamp;

export enum UserRole {
  USER = "USER",
  ADMIN = "ADMIN",
  VENUE_OWNER = "VENUE_OWNER",
  SELLER = "SELLER",
}

export type Sport = {
  id: ID;
  name: string;
  slug: string;
  description?: string | null;
  iconUrl?: string | null;
  isActive: boolean;
} & Timestamp;

export type Venue = {
  id: ID;
  name: string;
  slug: string;
  description?: string | null;
  sportId: ID;
  address: string;
  city: string;
  state: string;
  pincode: string;
  latitude?: number | null;
  longitude?: number | null;
  phone?: string | null;
  email?: string | null;
  images: string[];
  amenities: string[];
  operatingHours: OperatingHours[];
  isActive: boolean;
  ownerId?: ID | null;
} & Timestamp;

export type OperatingHours = {
  day: number;
  openTime: string;
  closeTime: string;
  isClosed: boolean;
};

export type Court = {
  id: ID;
  venueId: ID;
  name: string;
  description?: string | null;
  type?: string | null;
  surface?: string | null;
  hourlyRate: number;
  images: string[];
  isActive: boolean;
} & Timestamp;

export type CourtSlot = {
  id: ID;
  courtId: ID;
  date: string;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  price: number;
} & Timestamp;

export type Booking = {
  id: ID;
  userId: ID;
  courtSlotId: ID;
  status: BookingStatus;
  totalAmount: number;
  expiresAt?: Date | null;
  paymentId?: ID | null;
} & Timestamp;

export type Category = {
  id: ID;
  name: string;
  slug: string;
  description?: string | null;
  parentId?: ID | null;
  imageUrl?: string | null;
  isActive: boolean;
  sortOrder: number;
} & Timestamp;

export type Product = {
  id: ID;
  name: string;
  slug: string;
  description: string;
  categoryId: ID;
  brand?: string | null;
  images: string[];
  isActive: boolean;
  averageRating?: number | null;
  reviewCount: number;
  sellerId?: ID | null;
} & Timestamp;

export type ProductVariant = {
  id: ID;
  productId: ID;
  sku: string;
  size?: string | null;
  color?: string | null;
  price: number;
  compareAtPrice?: number | null;
  images: string[];
} & Timestamp;

export type Inventory = {
  id: ID;
  variantId: ID;
  quantity: number;
  reservedQuantity: number;
  warehouse?: string | null;
} & Timestamp;

export type Cart = {
  id: ID;
  userId: ID;
} & Timestamp;

export type CartItem = {
  id: ID;
  cartId: ID;
  variantId: ID;
  quantity: number;
} & Timestamp;

export type Order = {
  id: ID;
  userId: ID;
  status: OrderStatus;
  subtotal: number;
  tax: number;
  shipping: number;
  discount: number;
  totalAmount: number;
  shippingAddress: Address;
  billingAddress?: Address | null;
  trackingNumber?: string | null;
  paymentId?: ID | null;
} & Timestamp;

export type Address = {
  firstName: string;
  lastName: string;
  phone: string;
  line1: string;
  line2?: string | null;
  city: string;
  state: string;
  pincode: string;
  country: string;
};

export type OrderItem = {
  id: ID;
  orderId: ID;
  variantId: ID;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
} & Timestamp;

export type Payment = {
  id: ID;
  userId: ID;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  transactionId?: string | null;
  gatewayResponse?: Record<string, unknown> | null;
  orderId?: ID | null;
  bookingId?: ID | null;
} & Timestamp;

export type Review = {
  id: ID;
  userId: ID;
  rating: number;
  comment?: string | null;
  venueId?: ID | null;
  productId?: ID | null;
  images: string[];
  isVerified: boolean;
} & Timestamp;

export type Notification = {
  id: ID;
  userId: ID;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, unknown> | null;
  readAt?: Date | null;
} & Timestamp;

export enum NotificationType {
  BOOKING_CONFIRMED = "BOOKING_CONFIRMED",
  BOOKING_REMINDER = "BOOKING_REMINDER",
  ORDER_CONFIRMED = "ORDER_CONFIRMED",
  ORDER_SHIPPED = "ORDER_SHIPPED",
  ORDER_DELIVERED = "ORDER_DELIVERED",
  PAYMENT_SUCCESS = "PAYMENT_SUCCESS",
  PAYMENT_FAILED = "PAYMENT_FAILED",
  GENERAL = "GENERAL",
}

export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: ApiError;
  message?: string;
};

export type ApiError = {
  code: string;
  message: string;
  details?: Record<string, unknown>;
};

export type PaginatedResponse<T> = {
  items: T[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
};

export type PaginationParams = {
  page?: number;
  perPage?: number;
};
