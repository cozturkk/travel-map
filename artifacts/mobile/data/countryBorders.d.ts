export interface CountryBorder {
  n: string;
  b: [number, number, number, number];
  p: [number, number][][][];
}
declare const borders: CountryBorder[];
export = borders;
