import type { IcoName } from "@/components/immo/Ico";

export type RejectReason = {
  id: string;
  label: string;
  hint: string;
  ico: IcoName;
};

/** Motifs de rejet proposés dans la vue Focus (ordre = raccourcis 1–7). */
export const REJECT_REASONS: RejectReason[] = [
  { id: "duplicate", label: "Doublon", hint: "Déjà présente / en double", ico: "layers" },
  { id: "photos", label: "Photos trompeuses", hint: "Images non conformes au bien", ico: "house" },
  { id: "price", label: "Prix erroné", hint: "Montant manifestement faux", ico: "scale" },
  { id: "outofzone", label: "Hors zone couverte", hint: "En dehors du périmètre", ico: "pin" },
  { id: "expired", label: "Annonce expirée", hint: "Bien déjà loué / vendu", ico: "clock" },
  { id: "incomplete", label: "Infos insuffisantes", hint: "Données manquantes critiques", ico: "minus" },
  { id: "spam", label: "Spam / non immobilier", hint: "Contenu hors sujet", ico: "shield" },
];
