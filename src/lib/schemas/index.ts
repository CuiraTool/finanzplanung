import { z } from "zod";

export const FallartSchema = z.enum([
  "Einzelperson",
  "Ehepaar",
  "EingetragenePartnerschaft",
  "Konkubinat",
]);
export type Fallart = z.infer<typeof FallartSchema>;

export const PartnerKopfSchema = z.object({
  datum: z.coerce.date(),
  partnerFirma: z.string().min(1),
  partnerName: z.string().min(1),
  partnerEmail: z.string().email(),
  auftrag: z.enum(["PlanungUndBeratung", "NurPlanung"]),
  kundeNamePerson1: z.string().min(1),
  kundeNamePerson2: z.string().optional(),
  fallart: FallartSchema,
});
export type PartnerKopf = z.infer<typeof PartnerKopfSchema>;

export const ZivilstandSchema = z.enum([
  "Ledig",
  "Verheiratet",
  "EingetragenePartnerschaft",
  "Verwitwet",
  "Geschieden",
]);

export const PersonStammSchema = z.object({
  geburtsdatum: z.coerce.date(),
  zivilstand: ZivilstandSchema,
  zivilstandSeitJahr: z.number().int().min(1900).max(2100).optional(),
  hatKinder: z.boolean(),
  kinderAngaben: z.string().optional(),
  unterhaltspflichten: z.boolean(),
  unterhaltDetails: z.string().optional(),
});
export type PersonStamm = z.infer<typeof PersonStammSchema>;

export const PensionierungSchema = z.object({
  zeitpunkt: z.enum(["Frueh", "Ordentlich", "Aufgeschoben"]),
  zielalter: z.number().int().min(58).max(70).optional(),
  pensumsreduktion: z.boolean(),
  reduktionProzent: z.number().min(0).max(100).optional(),
  reduktionAbAlter: z.number().int().min(50).max(70).optional(),
});
export type Pensionierung = z.infer<typeof PensionierungSchema>;

export const PlanInputSchema = z.object({
  partnerKopf: PartnerKopfSchema,
  person1: PersonStammSchema,
  person2: PersonStammSchema.optional(),
  pensionierungPerson1: PensionierungSchema,
  pensionierungPerson2: PensionierungSchema.optional(),
});
export type PlanInput = z.infer<typeof PlanInputSchema>;
