import { describe, expect, it, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";

const navigateMock = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: null,
    role: null,
    loading: false,
    signOut: vi.fn(),
  }),
}));

vi.mock("@/hooks/useLanguage", () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    lang: "en",
    setLang: vi.fn(),
  }),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        order: vi.fn(),
      })),
    })),
  },
}));

vi.mock("@/components/AlertForm", () => ({
  AlertForm: () => <div>AlertForm</div>,
}));

vi.mock("@/components/AlertHistory", () => ({
  AlertHistory: () => <div>AlertHistory</div>,
}));

vi.mock("@/components/AlertMap", () => ({
  AlertMap: () => <div>AlertMap</div>,
}));

import Index from "@/pages/Index";

describe("Index auth guard", () => {
  beforeEach(() => {
    navigateMock.mockClear();
  });

  it("redirects unauthenticated users to auth page", () => {
    render(<Index />);

    expect(navigateMock).toHaveBeenCalledWith("/auth", { replace: true });
  });
});
