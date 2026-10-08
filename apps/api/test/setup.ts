jest.mock("@/common/supabase.service", () => ({
  SupabaseService: jest.fn().mockImplementation(() => ({
    admin: {
      auth: {
        getUser: jest.fn(),
      },
    },
  })),
}));

jest.mock("@/db/database.module", () => ({
  DRIZZLE: "DRIZZLE",
  DatabaseModule: {
    module: class {},
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
