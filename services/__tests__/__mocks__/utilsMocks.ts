export const setupUtilsMocks = () => {
  jest.mock("@/utils/logger.js", () => ({
    __esModule: true,
    default: {
      info: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn(),
    },
  }));

  jest.mock("sharp");
};
