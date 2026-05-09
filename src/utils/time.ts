const GMT_PLUS_2_TIME_ZONE = "Africa/Johannesburg";

export function formatDateGmt2(value: string | Date, locale = "fr-FR") {
  return new Intl.DateTimeFormat(locale, {
    timeZone: GMT_PLUS_2_TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

export function formatDateTimeGmt2(value: string | Date, locale = "fr-FR") {
  return new Intl.DateTimeFormat(locale, {
    timeZone: GMT_PLUS_2_TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function formatTimeGmt2(value: string | Date, locale = "fr-FR") {
  return new Intl.DateTimeFormat(locale, {
    timeZone: GMT_PLUS_2_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(value));
}

export { GMT_PLUS_2_TIME_ZONE };
