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

function LanguageFlag({ languageId }) {
  const flagSrc = FLAG_ASSETS[languageId] || usFlag;

  return (
    <img
      alt=""
      aria-hidden="true"
      src={flagSrc}
      className="h-[15px] w-5 rounded-[3px] object-cover shadow-sm"
    />
  );
}

function Option(props) {
  const { data, isSelected } = props;

  return (
    <components.Option {...props}>
      <div className="flex items-center gap-3 px-1">
        <LanguageFlag languageId={data.value} />
        <span className="flex-1 text-sm font-medium text-slate-700">
          {data.label}
        </span>
        {isSelected ? <Check size={15} className="text-[#244a95]" /> : null}
      </div>
    </components.Option>
  );
}

function SingleValue(props) {
  const { data } = props;

  return (
    <components.SingleValue {...props}>
      <div className="flex items-center gap-2">
        <LanguageFlag languageId={data.value} />
        <span className="text-sm font-semibold text-slate-700">{data.label}</span>
      </div>
    </components.SingleValue>
  );
}

export default function LanguageSwitcher() {
  const { language, options, setLanguage, t } = useI18n();

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
        minHeight: 46,
        borderRadius: 9999,
        borderColor: state.isFocused ? "#93c5fd" : "#e2e8f0",
        backgroundColor: "rgba(255, 255, 255, 0.92)",
        boxShadow: state.isFocused
          ? "0 0 0 4px rgba(59, 130, 246, 0.14)"
          : "0 16px 34px -24px rgba(15, 23, 42, 0.5)",
        backdropFilter: "blur(18px)",
        paddingLeft: 4,
        paddingRight: 4,
        transition: "all 160ms ease",
        ":hover": {
          borderColor: state.isFocused ? "#93c5fd" : "#cbd5e1",
        },
      }),
      valueContainer: (base) => ({
        ...base,
        paddingLeft: 8,
        paddingRight: 6,
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
        color: state.isFocused ? "#244a95" : "#64748b",
        paddingLeft: 6,
        paddingRight: 8,
        ":hover": {
          color: "#244a95",
        },
      }),
      menu: (base) => ({
        ...base,
        overflow: "hidden",
        borderRadius: 18,
        border: "1px solid #e2e8f0",
        boxShadow: "0 18px 40px -26px rgba(15, 23, 42, 0.5)",
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
          ? "#eef3ff"
          : state.isFocused
            ? "#f8fafc"
            : "#ffffff",
        color: state.isSelected ? "#244a95" : "#334155",
        cursor: "pointer",
      }),
      menuPortal: (base) => ({
        ...base,
        zIndex: 160,
      }),
    }),
    [],
  );

  return (
    <div className="pointer-events-none fixed right-3 top-3 z-[140] sm:right-4 sm:top-4">
      <div className="pointer-events-auto w-[164px] sm:w-[180px]">
        <Select
          aria-label={t("common.appLanguage")}
          className="text-left"
          components={{
            Option,
            SingleValue,
          }}
          isSearchable={false}
          menuPlacement="auto"
          menuPortalTarget={typeof document !== "undefined" ? document.body : undefined}
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
