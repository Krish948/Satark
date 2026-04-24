import { useLanguage } from "@/hooks/useLanguage";
import { LANG_LABEL, type Lang } from "@/lib/translations";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Globe } from "lucide-react";

export const LanguageSwitcher = () => {
  const { lang, setLang } = useLanguage();
  return (
    <div className="flex items-center gap-2">
      <Globe className="h-4 w-4 text-muted-foreground" />
      <Select value={lang} onValueChange={(v) => setLang(v as Lang)}>
        <SelectTrigger className="w-[130px] h-9">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {(Object.keys(LANG_LABEL) as Lang[]).map((l) => (
            <SelectItem key={l} value={l}>{LANG_LABEL[l]}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
