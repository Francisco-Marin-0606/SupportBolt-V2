import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

// Deshabilitar completamente ESLint
const eslintConfig = [
  {
    ignores: ["**/*"],  // Ignorar todos los archivos
  }
];

export default eslintConfig;
