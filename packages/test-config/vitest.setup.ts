// Shared Vitest setup: adds jest-dom's DOM matchers (toBeInTheDocument, etc.)
// to every project that imports this file from setupFiles. Kept in one place
// because both portal-web and dashboard-web need the exact same matchers.
import '@testing-library/jest-dom/vitest';
