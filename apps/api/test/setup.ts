jest.mock("@/common/supabase.service", () => ({
  SupabaseService: jest.fn().mockImplementation(() => ({
    admin: {
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: { message: "Invalid token" } }),
        admin: { deleteUser: jest.fn().mockResolvedValue({ error: null }) },
      },
    },
  })),
}));

const DRIZZLE_DB = Symbol("DRIZZLE_DB");
const mockDb = {
  select: jest.fn().mockReturnThis(),
  from: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockResolvedValue([]),
  limit: jest.fn().mockResolvedValue([]),
  offset: jest.fn().mockResolvedValue([]),
  insert: jest.fn().mockReturnThis(),
  values: jest.fn().mockReturnThis(),
  returning: jest.fn().mockResolvedValue([]),
  onConflictDoNothing: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  set: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  execute: jest.fn().mockResolvedValue([]),
};

class MockDbModule {}

jest.mock("@/db/database.module", () => ({
  DRIZZLE_DB,
  DatabaseModule: {
    module: MockDbModule,
    providers: [{ provide: DRIZZLE_DB, useValue: mockDb }],
    exports: [DRIZZLE_DB],
    global: true,
  },
}));

jest.mock("@/common/razorpay.service", () => ({
  RazorpayService: jest.fn().mockImplementation(() => ({
    createOrder: jest.fn(),
    capturePayment: jest.fn(),
    verifyWebhook: jest.fn(),
  })),
}));

jest.mock("@/common/email.service", () => ({
  EmailService: jest.fn().mockImplementation(() => ({
    send: jest.fn().mockResolvedValue({ id: "mock-email-id" }),
  })),
}));
