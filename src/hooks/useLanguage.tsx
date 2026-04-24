import { createContext, useContext, useState, ReactNode } from "react";
import type { Lang } from "@/lib/translations";
import { t as translate } from "@/lib/translations";

interface LangCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: Parameters<typeof translate>[1]) => string;
}

const Ctx = createContext<LangCtx>({
  lang: "en",
  setLang: () => {},
  t: (k) => k as string,
});

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [lang, setLang] = useState<Lang>(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem("cas-lang") : null;
    return (stored as Lang) || "en";
  });

  const update = (l: Lang) => {
    setLang(l);
    localStorage.setItem("cas-lang", l);
  };

  return (
    <Ctx.Provider value={{ lang, setLang: update, t: (k) => translate(lang, k) }}>
      {children}
    </Ctx.Provider>
  );
};

export const useLanguage = () => useContext(Ctx);
