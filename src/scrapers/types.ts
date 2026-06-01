import type { propertyType, transactionType } from "@/db/schema";

export type ScraperSourceId = string;
export type PropertyType = (typeof propertyType.enumValues)[number];
export type TransactionType = (typeof transactionType.enumValues)[number];

export type RawListing = {
  source: ScraperSourceId;
  externalId: string;
  externalUrl: string;
  title: string;
  description: string;
  rawPrice: string;
  rawType: string;
  rawTransaction: string;
  rawAddress: string;
  rawSurface: string | null;
  rawRooms: string | null;
  imageUrls: string[];
};

export type NormalizedListing = {
  source: ScraperSourceId;
  externalId: string;
  externalUrl: string;
  title: string;
  description: string;
  price: number;
  transactionType: TransactionType;
  propertyType: PropertyType;
  address: string;
  lng: number;
  lat: number;
  surfaceM2: number;
  rooms: number;
  imageUrls: string[];
  rawHash: string;
};

export interface Scraper {
  id: ScraperSourceId;
  isEnabled(): boolean;
  fetchListings(): AsyncIterable<RawListing>;
}
