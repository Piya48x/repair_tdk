import React, { useMemo } from "react";
import Select, { components } from "react-select";
import { Check, ChevronDown } from "lucide-react";
import thFlag from "flag-icons/flags/4x3/th.svg";
import usFlag from "flag-icons/flags/4x3/us.svg";
import krFlag from "flag-icons/flags/4x3/kr.svg";
import { useI18n } from "../i18n/LanguageProvider";

const FLAG_ASSETS = {
  th: thFlag,
  en: usFlag,
  ko: krFlag,
};

const LANGUAGE_CODES = {
  th: "TH",
  en: "EN",
  ko: "KO",
};

function LanguageFlag({ languageId, variant = "default", isDarkTheme = false }) {
  const flagSrc = FLAG_ASSETS[languageId] || usFlag;
  const frameClass = variant === "compact"
    ? `inline-flex items-center justify-center rounded-xl border p-1 ${isDarkTheme ? "border-slate-700 bg-slate-800/90" : "border-slate-200 bg-white/95"}`
    : variant === "auth-option"
      ? "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50 shadow-[0_12px_30px_-20px_rgba(15,23,42,0.45)]"
      : variant === "auth-control"
        ? "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-white/80 bg-gradient-to-b from-white to-slate-50 shadow-[0_14px_24px_-22px_rgba(15,23,42,0.45)]"
      : `inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border ${isDarkTheme ? "border-slate-700 bg-slate-800/90" : "border-slate-200 bg-white/95"}`;
  const imageClass = variant === "compact"
    ? "h-[15px] w-[21px] rounded-[5px] object-cover shadow-sm"
    : variant === "auth-option" || variant === "auth-control"
      ? "h-[18px] w-[26px] rounded-[6px] object-cover shadow-sm"
      : "h-[16px] w-[22px] rounded-[5px] object-cover shadow-sm";

  return (
    <span className={frameClass}>
      <img
        alt=""
        aria-hidden="true"
        src={flagSrc}
        className={imageClass}
      />
    </span>
  );
}

function Option(props) {
  const { data, isSelected, selectProps } = props;
  const isDarkTheme = Boolean(selectProps.isDarkTheme);
  const isAuthMode = selectProps.mode === "auth";
  const flagVariant = isAuthMode ? "auth-option" : "default";

  return (
    <components.Option {...props}>
      <div className="flex items-center gap-3 px-1">
        <LanguageFlag languageId={data.value} variant={flagVariant} isDarkTheme={isDarkTheme} />
        <div className="min-w-0 flex-1">
          <span className={`block text-sm font-semibold ${isDarkTheme ? "text-slate-100" : "text-slate-700"}`}>
            {data.label}
          </span>
          {isAuthMode ? (
            <span className={`block text-[10px] font-bold uppercase tracking-[0.22em] ${isDarkTheme ? "text-slate-400" : "text-slate-400"}`}>
              {LANGUAGE_CODES[data.value] || String(data.value || "").toUpperCase()}
            </span>
          ) : null}
        </div>
        {isSelected ? <Check size={15} className={isDarkTheme ? "text-sky-300" : "text-[#244a95]"} /> : null}
      </div>
    </components.Option>
  );
}

function SingleValue(props) {
  const { data, selectProps } = props;
  const isCompact = Boolean(selectProps.isCompact);
  const isDarkTheme = Boolean(selectProps.isDarkTheme);
  const isAuthMode = selectProps.mode === "auth";

  return (
    <components.SingleValue {...props}>
      {isCompact ? (
        <div className="flex items-center justify-center">
          <LanguageFlag languageId={data.value} variant="compact" isDarkTheme={isDarkTheme} />
        </div>
      ) : isAuthMode ? (
        <div className="flex items-center justify-center pl-1">
          <LanguageFlag languageId={data.value} variant="auth-control" isDarkTheme={isDarkTheme} />
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <LanguageFlag languageId={data.value} variant="default" isDarkTheme={isDarkTheme} />
          <span className={`text-sm font-semibold ${isDarkTheme ? "text-slate-100" : "text-slate-700"}`}>{data.label}</span>
        </div>
      )}
    </components.SingleValue>
  );
}

function DropdownIndicator(props) {
  const { selectProps } = props;
  const isDarkTheme = Boolean(selectProps.isDarkTheme);

  return (
    <components.DropdownIndicator {...props}>
      <ChevronDown
        size={16}
        className={isDarkTheme ? "text-slate-300" : "text-slate-500"}
      />
    </components.DropdownIndicator>
  );
}

export default function LanguageSwitcher({ mode = "floating", isDarkTheme = false, className = "" }) {
  const { language, options, setLanguage, t } = useI18n();
  const isCompact = mode === "nav";
  const isAuthMode = mode === "auth";
  const menuPortalTarget = typeof document !== "undefined" ? document.body : undefined;

  const selectOptions = useMemo(
    () =>
      options.map((option) => ({
        value: option.id,
        label: option.label,
      })),
    [options],
  );

  const activeOption = useMemo(
    () =>
      selectOptions.find((option) => option.value === language) || selectOptions[0],
    [language, selectOptions],
  );

  const selectStyles = useMemo(
    () => ({
      control: (base, state) => ({
        ...base,
        minHeight: isCompact ? 42 : isAuthMode ? 58 : 46,
        borderRadius: isCompact ? 16 : 9999,
        borderColor: state.isFocused
          ? (isDarkTheme ? "#818cf8" : "#93c5fd")
          : isAuthMode
            ? "rgba(255,255,255,0.72)"
            : (isDarkTheme ? "#475569" : "#e2e8f0"),
        backgroundColor: isCompact
          ? (isDarkTheme ? "rgba(15, 23, 42, 0.92)" : "rgba(255, 255, 255, 0.94)")
          : isAuthMode
            ? "rgba(255, 255, 255, 0.76)"
            : "rgba(255, 255, 255, 0.92)",
        boxShadow: state.isFocused
          ? (isCompact
            ? "0 0 0 3px rgba(99, 102, 241, 0.16)"
            : isAuthMode
              ? "0 0 0 4px rgba(43, 89, 176, 0.12), 0 24px 48px -28px rgba(15, 23, 42, 0.48)"
              : "0 0 0 4px rgba(59, 130, 246, 0.14)")
          : (isCompact
            ? (isDarkTheme ? "0 10px 26px -22px rgba(15, 23, 42, 0.9)" : "0 12px 26px -22px rgba(37, 99, 235, 0.35)")
            : isAuthMode
              ? "0 24px 48px -28px rgba(15, 23, 42, 0.45)"
              : "0 16px 34px -24px rgba(15, 23, 42, 0.5)"),
        backdropFilter: isCompact ? "blur(12px)" : isAuthMode ? "blur(18px)" : "blur(18px)",
        paddingLeft: isCompact ? 4 : isAuthMode ? 5 : 4,
        paddingRight: isCompact ? 4 : isAuthMode ? 7 : 4,
        minWidth: isCompact ? 72 : isAuthMode ? 86 : undefined,
        width: isCompact ? 72 : isAuthMode ? 86 : undefined,
        transition: "all 160ms ease",
        cursor: "pointer",
        ":hover": {
          borderColor: state.isFocused
            ? (isDarkTheme ? "#818cf8" : "#93c5fd")
            : isAuthMode
              ? "rgba(255,255,255,0.96)"
              : (isDarkTheme ? "#64748b" : "#cbd5e1"),
        },
      }),
      valueContainer: (base) => ({
        ...base,
        paddingLeft: isCompact ? 10 : isAuthMode ? 0 : 8,
        paddingRight: isCompact ? 4 : isAuthMode ? 0 : 6,
        justifyContent: isAuthMode ? "center" : base.justifyContent,
      }),
      singleValue: (base) => ({
        ...base,
        margin: 0,
        maxWidth: "100%",
      }),
      input: (base) => ({
        ...base,
        margin: 0,
        padding: 0,
      }),
      indicatorSeparator: () => ({
        display: "none",
      }),
      dropdownIndicator: (base, state) => ({
        ...base,
        color: state.isFocused
          ? (isDarkTheme ? "#cbd5f5" : "#244a95")
          : isAuthMode
            ? "#2b59b0"
            : (isDarkTheme ? "#94a3b8" : "#64748b"),
        paddingLeft: isCompact ? 0 : isAuthMode ? 2 : 6,
        paddingRight: isCompact ? 8 : isAuthMode ? 10 : 8,
        ":hover": {
          color: isDarkTheme ? "#e2e8f0" : "#244a95",
        },
      }),
      menu: (base) => ({
        ...base,
        overflow: "hidden",
        borderRadius: isAuthMode ? 22 : 18,
        border: `1px solid ${isDarkTheme ? "#334155" : "#e2e8f0"}`,
        backgroundColor: isDarkTheme ? "#0f172a" : "#ffffff",
        boxShadow: isAuthMode
          ? "0 28px 48px -30px rgba(15, 23, 42, 0.45)"
          : "0 18px 40px -26px rgba(15, 23, 42, 0.5)",
        minWidth: isCompact ? 176 : isAuthMode ? 224 : undefined,
        width: isCompact ? 176 : isAuthMode ? 224 : undefined,
        marginTop: isCompact ? 8 : isAuthMode ? 10 : base.marginTop,
        right: isAuthMode ? 0 : base.right,
        left: isAuthMode ? "auto" : base.left,
        zIndex: 200,
      }),
      menuList: (base) => ({
        ...base,
        paddingTop: isAuthMode ? 8 : 6,
        paddingBottom: isAuthMode ? 8 : 6,
      }),
      option: (base, state) => ({
        ...base,
        padding: isAuthMode ? "12px 14px" : "10px 14px",
        backgroundColor: state.isSelected
          ? (isDarkTheme ? "#1e293b" : "#eef3ff")
          : state.isFocused
            ? (isDarkTheme ? "#172133" : "#f8fafc")
            : (isDarkTheme ? "#0f172a" : "#ffffff"),
        color: state.isSelected
          ? (isDarkTheme ? "#cbd5f5" : "#244a95")
          : (isDarkTheme ? "#e2e8f0" : "#334155"),
        cursor: "pointer",
      }),
      menuPortal: (base) => ({
        ...base,
        zIndex: 200,
      }),
    }),
    [isAuthMode, isCompact, isDarkTheme],
  );

  const outerClassName = mode === "floating" || isAuthMode
    ? "pointer-events-none fixed right-3 top-3 z-[140] sm:right-4 sm:top-4"
    : className;

  const innerClassName = mode === "floating"
    ? "pointer-events-auto w-[164px] sm:w-[180px]"
    : isAuthMode
      ? "pointer-events-auto w-[86px]"
    : "w-[72px] shrink-0";

  return (
    <div className={outerClassName}>
      <div className={innerClassName}>
        <Select
          aria-label={t("common.appLanguage")}
          className="text-left"
          components={{
            DropdownIndicator,
            Option,
            SingleValue,
          }}
          isSearchable={false}
          isCompact={isCompact}
          isDarkTheme={isDarkTheme}
          menuPlacement="auto"
          menuPortalTarget={isAuthMode ? undefined : menuPortalTarget}
          menuPosition={isAuthMode ? "absolute" : "fixed"}
          menuShouldScrollIntoView={false}
          mode={mode}
          options={selectOptions}
          styles={selectStyles}
          value={activeOption}
          onChange={(nextOption) => {
            if (nextOption) {
              setLanguage(nextOption.value);
            }
          }}
        />
      </div>
    </div>
  );
}
