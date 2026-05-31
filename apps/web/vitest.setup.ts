import "@testing-library/jest-dom/vitest";

// Required by env.ts schema — provide a stable test value so all tests can import env.ts without failing.
process.env.NEXT_PUBLIC_SITE_URL = "http://localhost:3000";
