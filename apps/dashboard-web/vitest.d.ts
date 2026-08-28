// Makes jest-dom's matchers (toBeInTheDocument, toHaveClass, ...) visible to
// the TypeScript program — the runtime augmentation happens via
// @repo/test-config/vitest-setup, but that side-effect import alone isn't
// enough for tsc/next build's type-checker to see the ambient types.
/// <reference types="@testing-library/jest-dom" />
