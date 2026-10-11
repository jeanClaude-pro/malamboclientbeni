import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import {
  isValidYMD,
  parseYMD,
  periodLabel,
  shiftAnchor,
  todayYMD,
  type PeriodKind,
  type PeriodValue,
} from "../../utils/businessDate";

const OPTIONS: Array<{ id: PeriodKind; label: string }> = [
  { id: "day", label: "Jour" },
  { id: "week", label: "Semaine" },
  { id: "month", label: "Mois" },
  { id: "year", label: "Année" },
  { id: "custom", label: "Personnalisée" },
];

interface PeriodSelectorProps {
  value: PeriodValue;
  onChange: (value: PeriodValue) => void;
  /** Restricts the selector to today's date (e.g. non-admin expense history). */
  lockedToToday?: boolean;
  periods?: PeriodKind[];
  disabled?: boolean;
  className?: string;
}

/**
 * Calendar period picker shared by the reports and history pages:
 * Jour / Semaine (lundi-dimanche) / Mois / Année / Personnalisée, with real
 * calendar inputs and previous/next navigation. All dates are GMT+2
 * business days (utils/businessDate.ts).
 */
export default function PeriodSelector({
  value,
  onChange,
  lockedToToday = false,
  periods,
  disabled = false,
  className = "",
}: PeriodSelectorProps) {
  const today = todayYMD();
  const options = OPTIONS.filter((option) => !periods || periods.includes(option.id));
  const isLocked = lockedToToday || disabled;

  const setPeriod = (period: PeriodKind) => {
    if (period === "custom" && value.period !== "custom") {
      const anchor = value.anchor || today;
      onChange({ ...value, period, from: anchor, to: anchor });
      return;
    }
    onChange({ ...value, period });
  };

  const setAnchor = (anchor: string) => {
    if (isValidYMD(anchor)) onChange({ ...value, anchor });
  };

  const year = parseYMD(isValidYMD(value.anchor) ? value.anchor : today).year;
  const yearOptions = Array.from({ length: 8 }, (_, index) => parseYMD(today).year - 6 + index);
  if (!yearOptions.includes(year)) yearOptions.unshift(year);

  return (
    <div className={`period-selector rounded-xl border border-slate-200 bg-white p-3 shadow-sm ${className}`}>
      <div className="period-selector-primary flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-700">
          <CalendarDays className="h-4 w-4" aria-hidden="true" /> Période
        </span>
        <div className="period-selector-options flex gap-1" role="radiogroup" aria-label="Type de période">
          {options.map((option) => (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={value.period === option.id}
              disabled={isLocked && option.id !== "day"}
              onClick={() => setPeriod(option.id)}
              className={`min-h-9 shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                value.period === option.id ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange({ ...value, period: value.period === "custom" ? "day" : value.period, anchor: today })}
          className="min-h-9 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
        >
          Aujourd'hui
        </button>
      </div>

      {!lockedToToday && (
        <div className="period-selector-calendar mt-3 flex flex-wrap items-center gap-2">
          {value.period !== "custom" && (
            <button
              type="button"
              aria-label="Période précédente"
              disabled={disabled}
              onClick={() => setAnchor(shiftAnchor(value.period, value.anchor, -1))}
              className="rounded-lg border border-slate-300 p-2 text-slate-700 hover:bg-slate-50 disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}

          {(value.period === "day" || value.period === "week") && (
            <input
              type="date"
              aria-label={value.period === "week" ? "Un jour de la semaine" : "Jour"}
              value={value.anchor}
              disabled={disabled}
              onChange={(event) => setAnchor(event.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
            />
          )}
          {value.period === "month" && (
            <input
              type="month"
              aria-label="Mois"
              value={value.anchor.slice(0, 7)}
              disabled={disabled}
              onChange={(event) => event.target.value && setAnchor(`${event.target.value}-01`)}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
            />
          )}
          {value.period === "year" && (
            <select
              aria-label="Année"
              value={year}
              disabled={disabled}
              onChange={(event) => setAnchor(`${event.target.value}-01-01`)}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
            >
              {yearOptions.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          )}
          {value.period === "custom" && (
            <>
              <label className="flex items-center gap-1.5 text-sm text-slate-600">
                Du
                <input
                  type="date"
                  value={value.from}
                  max={value.to || undefined}
                  disabled={disabled}
                  onChange={(event) => isValidYMD(event.target.value) && onChange({ ...value, from: event.target.value })}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
                />
              </label>
              <label className="flex items-center gap-1.5 text-sm text-slate-600">
                au
                <input
                  type="date"
                  value={value.to}
                  min={value.from || undefined}
                  disabled={disabled}
                  onChange={(event) => isValidYMD(event.target.value) && onChange({ ...value, to: event.target.value })}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
                />
              </label>
            </>
          )}

          {value.period !== "custom" && (
            <button
              type="button"
              aria-label="Période suivante"
              disabled={disabled}
              onClick={() => setAnchor(shiftAnchor(value.period, value.anchor, 1))}
              className="rounded-lg border border-slate-300 p-2 text-slate-700 hover:bg-slate-50 disabled:opacity-40"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          )}
        </div>
      )}

      <p className="mt-2 text-xs font-medium text-slate-500" aria-live="polite">
        {lockedToToday ? `Aujourd'hui uniquement — ${periodLabel({ ...value, period: "day", anchor: today }, today)}` : periodLabel(value, today)}
        {" "}· heure de Butembo/Beni (GMT+2)
      </p>
    </div>
  );
}
