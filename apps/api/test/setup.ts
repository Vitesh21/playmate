jest.mock("@/common/supabase.service", () => ({
  SupabaseService: jest.fn().mockImplementation(() => ({
    admin: {
      auth: {
        getUser: jest.fn(),
      },
    },
  })),
}));

const DRIZZLE_DB = Symbol("DRIZZLE_DB");
const mockDb = {
  select: jest.fn().mockReturnThis(),
  from: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  offset: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  values: jest.fn().mockReturnThis(),
  returning: jest.fn().mockResolvedValue([]),
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
