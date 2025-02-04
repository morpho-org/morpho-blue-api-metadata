import { readFileSync } from "fs";
import { join } from "path";

export const loadJsonFile = (fileName: string) => {
  const filePath = join(__dirname, "../../data", fileName);
  const fileContent = readFileSync(filePath, "utf-8");
  return JSON.parse(fileContent);
};

export const validateRequiredFields = <T>(
  data: T,
  requiredFields: (keyof T)[]
): boolean => {
  return requiredFields.every((field) =>
    Object.prototype.hasOwnProperty.call(data, field)
  );
};
