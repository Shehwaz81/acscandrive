import { describe, expect, it } from "vitest";
import {
  type AddressPart,
  checkCollectionStreet,
  HIGHWAY_MESSAGE,
  NOT_A_STREET_MESSAGE,
  NOT_IN_AREA_MESSAGE,
} from "./collection-area";

function c(longText: string, shortText: string, ...types: string[]): AddressPart {
  return { longText, shortText, types: [...types, "political"] };
}

function street(route: string, locality: string, county: string | null, province: string, country: string) {
  const parts = [
    { longText: route, shortText: route, types: ["route"] },
    c(locality, locality, "locality"),
    c(province, province, "administrative_area_level_1"),
    c(country, country, "country"),
  ];
  if (county) parts.push(c(county, county, "administrative_area_level_2"));
  return parts;
}

describe("checkCollectionStreet", () => {
  it("accepts a Windsor, Ontario street, with or without a county component", () => {
    expect(checkCollectionStreet(["route"], street("Huron Church Road", "Windsor", null, "ON", "CA"))).toEqual({
      ok: true,
      street: "Huron Church Road",
      municipality: "Windsor",
    });
    expect(checkCollectionStreet(["route"], street("Wyandotte Street West", "Windsor", "Essex County", "ON", "CA")).ok).toBe(
      true,
    );
  });

  it("accepts streets elsewhere in Essex County", () => {
    for (const town of ["Tecumseh", "LaSalle", "Amherstburg", "Lakeshore", "Leamington"]) {
      expect(checkCollectionStreet(["route"], street("Main Street", town, "Essex County", "ON", "CA"))).toEqual({
        ok: true,
        street: "Main Street",
        municipality: town,
      });
    }
  });

  it("rejects places outside Essex County, Ontario", () => {
    const outside = [
      street("Main Street", "Windsor", "Hants County", "NS", "CA"),
      street("Woodward Avenue", "Detroit", "Wayne County", "MI", "US"),
      street("Richmond Street", "London", "Middlesex County", "ON", "CA"),
      street("King Street West", "Chatham-Kent", "Chatham-Kent", "ON", "CA"),
      // An Essex County elsewhere (Essex, Ontario is a town inside ours).
      street("Main Street", "Essex", "Essex County", "MA", "US"),
    ];
    for (const parts of outside) {
      expect(checkCollectionStreet(["route"], parts)).toEqual({ ok: false, message: NOT_IN_AREA_MESSAGE });
    }
    expect(checkCollectionStreet(["route"], [])).toEqual({ ok: false, message: NOT_IN_AREA_MESSAGE });
  });

  it("rejects addresses and places that aren't a whole street", () => {
    const address = [
      { longText: "1100", shortText: "1100", types: ["street_number"] },
      ...street("Huron Church Road", "Windsor", null, "ON", "CA"),
    ];
    expect(checkCollectionStreet(["street_address"], address)).toEqual({ ok: false, message: NOT_A_STREET_MESSAGE });
    expect(checkCollectionStreet(["route"], street("", "Windsor", null, "ON", "CA"))).toEqual({
      ok: false,
      message: NOT_A_STREET_MESSAGE,
    });
  });

  it("rejects highways and expressways by name", () => {
    for (const name of ["E. C. Row Expressway", "E C Row Expy", "Highway 401", "Hwy 3", "Herb Gray Parkway"]) {
      expect(checkCollectionStreet(["route"], street(name, "Windsor", null, "ON", "CA"))).toEqual({
        ok: false,
        message: HIGHWAY_MESSAGE,
      });
    }
  });
});
