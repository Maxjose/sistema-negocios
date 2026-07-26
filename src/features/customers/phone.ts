export const phoneCountries = [
  { code: "+58", flag: "🇻🇪", name: "Venezuela" },
  { code: "+1", flag: "🇺🇸", name: "EE. UU./Canadá" },
  { code: "+54", flag: "🇦🇷", name: "Argentina" },
  { code: "+591", flag: "🇧🇴", name: "Bolivia" },
  { code: "+55", flag: "🇧🇷", name: "Brasil" },
  { code: "+56", flag: "🇨🇱", name: "Chile" },
  { code: "+57", flag: "🇨🇴", name: "Colombia" },
  { code: "+506", flag: "🇨🇷", name: "Costa Rica" },
  { code: "+53", flag: "🇨🇺", name: "Cuba" },
  { code: "+593", flag: "🇪🇨", name: "Ecuador" },
  { code: "+503", flag: "🇸🇻", name: "El Salvador" },
  { code: "+34", flag: "🇪🇸", name: "España" },
  { code: "+502", flag: "🇬🇹", name: "Guatemala" },
  { code: "+504", flag: "🇭🇳", name: "Honduras" },
  { code: "+52", flag: "🇲🇽", name: "México" },
  { code: "+505", flag: "🇳🇮", name: "Nicaragua" },
  { code: "+507", flag: "🇵🇦", name: "Panamá" },
  { code: "+595", flag: "🇵🇾", name: "Paraguay" },
  { code: "+51", flag: "🇵🇪", name: "Perú" },
  { code: "+1", flag: "🇩🇴", name: "Rep. Dominicana" },
  { code: "+598", flag: "🇺🇾", name: "Uruguay" },
] as const;

export function splitPhone(phone: string | null | undefined) {
  const normalized = phone?.trim() ?? "";
  const country = [...phoneCountries]
    .sort((a, b) => b.code.length - a.code.length)
    .find((item) => normalized.startsWith(item.code));
  if (!country) return { countryCode: "+58", number: normalized.replace(/\D/g, "") };
  return {
    countryCode: country.code,
    number: normalized.slice(country.code.length).replace(/\D/g, ""),
  };
}

export function joinPhone(countryCode: string, number: string) {
  const code = countryCode.replace(/[^\d+]/g, "");
  const localNumber = number.replace(/\D/g, "").replace(/^0+/, "");
  return localNumber ? `${code}${localNumber}` : null;
}
