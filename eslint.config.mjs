import js from "@eslint/js";
import globals from "globals";

export default [
    js.configs.recommended,
    {
        files: ["**/*.{js,mjs,cjs}"],
        languageOptions: {
            globals: globals.browser
        },
        rules: {
            indent: ["error", 4],
            "no-unused-vars": "warn",
            "no-undef": "error"
        }
    }
];