import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  rootDir: "./",
  testMatch: ["**/*.test.ts"],
  transform: {
    "^.+\\.ts$": "ts-jest",
  },
  moduleFileExtensions: ["ts", "js", "json"],
  // This helps Jest find your JSON files in the parent directory
  moduleDirectories: ["node_modules", "../node_modules"],
  roots: ["."],
};

export default config;
