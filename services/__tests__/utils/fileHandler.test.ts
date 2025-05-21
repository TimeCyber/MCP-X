import { setupUtilsMocks } from "../__mocks__/utilsMocks.js";
setupUtilsMocks();

import fs from "fs/promises";
import { handleUploadFiles } from "../../utils/fileHandler.js";

jest.mock("fs/promises");

describe("FileHandler", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (fs.readFile as jest.Mock).mockResolvedValue(Buffer.from("test file content"));
  });

  describe("handleUploadFiles", () => {
    it("correctly handle image files", async () => {
      const mockFiles = [
        {
          path: "test.jpg",
          filename: "test.jpg",
          originalname: "test.jpg",
        },
      ] as Express.Multer.File[];

      (fs.readdir as jest.Mock).mockResolvedValue([]);
      (fs.rename as jest.Mock).mockResolvedValue(undefined);

      const result = await handleUploadFiles({
        files: mockFiles,
        filepaths: [],
      });

      expect(result.images).toHaveLength(1);
      expect(result.documents).toHaveLength(0);
    });

    it("correctly handle document files", async () => {
      const mockFiles = [
        {
          path: "test.pdf",
          filename: "test.pdf",
          originalname: "test.pdf",
        },
      ] as Express.Multer.File[];

      (fs.readdir as jest.Mock).mockResolvedValue([]);
      (fs.rename as jest.Mock).mockResolvedValue(undefined);

      const result = await handleUploadFiles({
        files: mockFiles,
        filepaths: [],
      });

      expect(result.documents).toHaveLength(1);
      expect(result.images).toHaveLength(0);
    });
  });
});
