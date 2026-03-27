import React, { useMemo } from "react";
import Select, { components } from "react-select";
import { Check } from "lucide-react";
import thFlag from "flag-icons/flags/4x3/th.svg";
import usFlag from "flag-icons/flags/4x3/us.svg";
import krFlag from "flag-icons/flags/4x3/kr.svg";
import { useI18n } from "../i18n/LanguageProvider";

const FLAG_ASSETS = {
  th: thFlag,
  en: usFlag,
  ko: krFlag,
};

function LanguageFlag({ languageId, compact = false }) {
  const flagSrc = FLAG_ASSETS[languageId] || usFlag;

  return (
    <img
      alt=""
      aria-hidden="true"
      src={flagSrc}
      className={compact ? "h-4 w-6 rounded-[4px] object-cover shadow-sm" : "h-[15px] w-5 rounded-[3px] object-cover shadow-sm"}
    />
  );
}

function Option(props) {
  const { data, isSelected, selectProps } = props;
  const isDarkTheme = Boolean(selectProps.isDarkTheme);

  return (
    <components.Option {...props}>
      <div className="flex items-center gap-3 px-1">
        <LanguageFlag languageId={data.value} />
        <span className={`flex-1 text-sm font-medium ${isDarkTheme ? "text-slate-100" : "text-slate-700"}`}>
          {data.label}
        </span>
        {isSelected ? <Check size={15} className={isDarkTheme ? "text-sky-300" : "text-[#244a95]"} /> : null}
      </div>
    </components.Option>
  );
}

function SingleValue(props) {
  const { data, selectProps } = props;
  const isCompact = Boolean(selectProps.isCompact);
  const isDarkTheme = Boolean(selectProps.isDarkTheme);

  return (
    <components.SingleValue {...props}>
      {isCompact ? (
        <div className="flex items-center justify-center">
          <LanguageFlag languageId={data.value} compact />
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <LanguageFlag languageId={data.value} />
          <span className={`text-sm font-semibold ${isDarkTheme ? "text-slate-100" : "text-slate-700"}`}>{data.label}</span>
        </div>
      )}
    </components.SingleValue>
  );
}

export default function LanguageSwitcher({ mode = "floating", isDarkTheme = false, className = "" }) {
  const { language, options, setLanguage, t } = useI18n();
  const isCompact = mode === "nav";
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
        minHeight: isCompact ? 42 : 46,
        borderRadius: isCompact ? 16 : 9999,
        borderColor: state.isFocused
          ? (isDarkTheme ? "#818cf8" : "#93c5fd")
          : (isDarkTheme ? "#475569" : "#e2e8f0"),
        backgroundColor: isCompact
          ? (isDarkTheme ? "rgba(15, 23, 42, 0.92)" : "rgba(255, 255, 255, 0.94)")
          : "rgba(255, 255, 255, 0.92)",
        boxShadow: state.isFocused
          ? (isCompact ? "0 0 0 3px rgba(99, 102, 241, 0.16)" : "0 0 0 4px rgba(59, 130, 246, 0.14)")
          : (isCompact
            ? (isDarkTheme ? "0 10px 26px -22px rgba(15, 23, 42, 0.9)" : "0 12px 26px -22px rgba(37, 99, 235, 0.35)")
            : "0 16px 34px -24px rgba(15, 23, 42, 0.5)"),
        backdropFilter: isCompact ? "blur(12px)" : "blur(18px)",
        paddingLeft: isCompact ? 4 : 4,
        paddingRight: isCompact ? 4 : 4,
        minWidth: isCompact ? 72 : undefined,
        width: isCompact ? 72 : undefined,
        transition: "all 160ms ease",
        ":hover": {
          borderColor: state.isFocused
            ? (isDarkTheme ? "#818cf8" : "#93c5fd")
            : (isDarkTheme ? "#64748b" : "#cbd5e1"),
        },
      }),
      valueContainer: (base) => ({
        ...base,
        paddingLeft: isCompact ? 10 : 8,
        paddingRight: isCompact ? 4 : 6,
      }),
      singleValue: (base) => ({
        ...base,
        margin: 0,
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
          : (isDarkTheme ? "#94a3b8" : "#64748b"),
        paddingLeft: isCompact ? 0 : 6,
        paddingRight: isCompact ? 8 : 8,
        ":hover": {
          color: isDarkTheme ? "#e2e8f0" : "#244a95",
        },
      }),
      menu: (base) => ({
        ...base,
        overflow: "hidden",
        borderRadius: 18,
        border: `1px solid ${isDarkTheme ? "#334155" : "#e2e8f0"}`,
        backgroundColor: isDarkTheme ? "#0f172a" : "#ffffff",
        boxShadow: "0 18px 40px -26px rgba(15, 23, 42, 0.5)",
        minWidth: isCompact ? 176 : undefined,
        width: isCompact ? 176 : undefined,
        marginTop: isCompact ? 8 : base.marginTop,
        zIndex: 200,
      }),
      menuList: (base) => ({
        ...base,
        paddingTop: 6,
        paddingBottom: 6,
      }),
      option: (base, state) => ({
        ...base,
        padding: "10px 14px",
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
    [isCompact, isDarkTheme],
  );

  const outerClassName = mode === "floating"
    ? "pointer-events-none fixed right-3 top-3 z-[140] sm:right-4 sm:top-4"
    : className;

  const innerClassName = mode === "floating"
    ? "pointer-events-auto w-[164px] sm:w-[180px]"
    : "w-[72px] shrink-0";

  return (
    <div className={outerClassName}>
      <div className={innerClassName}>
        <Select
          aria-label={t("common.appLanguage")}
          className="text-left"
          components={{
            Option,
            SingleValue,
          }}
          isSearchable={false}
          isCompact={isCompact}
          isDarkTheme={isDarkTheme}
          menuPlacement="auto"
          menuPortalTarget={menuPortalTarget}
          menuPosition="fixed"
          menuShouldScrollIntoView={false}
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
