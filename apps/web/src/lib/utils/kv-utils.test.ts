import { describe, expect, it } from "vitest";

import { flatten, unflatten, encodeRecord, decodeRecord } from "./kv-utils";

describe("kv-utils", () => {
  describe("flatten", () => {
    it("should flatten a simple object", () => {
      const input = { a: 1, b: "string", c: true, d: null };
      const expected = { a: "1", b: "string", c: "true", d: "null" };
      expect(flatten(input)).toEqual(expected);
    });

    it("should flatten a nested object", () => {
      const input = {
        user: {
          name: "John",
          address: {
            city: "New York",
            zip: 10001,
          },
        },
      };
      const expected = {
        "user.name": "John",
        "user.address.city": "New York",
        "user.address.zip": "10001",
      };
      expect(flatten(input)).toEqual(expected);
    });

    it("should handle arrays as primitives (stringified)", () => {
      const input = {
        tags: ["a", "b", "c"],
        nested: {
          items: [1, 2],
        },
      };
      const expected = {
        tags: "a,b,c",
        "nested.items": "1,2",
      };
      expect(flatten(input)).toEqual(expected);
    });

    it("should use a prefix when provided", () => {
      const input = { a: 1 };
      const expected = { "prefix.a": "1" };
      expect(flatten(input, "prefix")).toEqual(expected);
    });

    it("should handle deep nesting", () => {
      const input = { a: { b: { c: { d: "value" } } } };
      const expected = { "a.b.c.d": "value" };
      expect(flatten(input)).toEqual(expected);
    });
  });

  describe("unflatten", () => {
    it("should unflatten a simple flat object", () => {
      const input = { a: "1", b: "string" };
      const expected = { a: "1", b: "string" };
      expect(unflatten(input)).toEqual(expected);
    });

    it("should unflatten a dotted object", () => {
      const input = {
        "user.name": "John",
        "user.address.city": "New York",
      };
      const expected = {
        user: {
          name: "John",
          address: {
            city: "New York",
          },
        },
      };
      expect(unflatten(input)).toEqual(expected);
    });

    it("should prevent prototype pollution via __proto__", () => {
      const input = {
        "__proto__.polluted": "true",
        "user.__proto__.admin": "true",
      };
      const result = unflatten(input);
      expect(result).toEqual({});
      expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    });

    it("should prevent prototype pollution via constructor", () => {
      const input = {
        "constructor.prototype.polluted": "true",
      };
      const result = unflatten(input);
      expect(result).toEqual({});
      expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    });

    it("should prevent prototype pollution via prototype", () => {
      const input = {
        "prototype.polluted": "true",
      };
      const result = unflatten(input);
      expect(result).toEqual({});
      expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    });

    it("should safely handle regular keys that overlap with dangerous names but aren't exactly them", () => {
      const flat = {
        my__proto__: "safe",
        constructors: "safe",
        prototypes: "safe",
      };

      expect(unflatten(flat)).toEqual({
        my__proto__: "safe",
        constructors: "safe",
        prototypes: "safe",
      });
    });
  });

  describe("encodeRecord and decodeRecord", () => {
    it("should encode a record into a string", () => {
      const input = { a: "1", b: "2" };
      const result = encodeRecord(input);
      expect(result).toContain("a=1");
      expect(result).toContain("b=2");
    });

    it("should decode a string into a record", () => {
      const input = "a=1\nb=2";
      const expected = { a: "1", b: "2" };
      expect(decodeRecord(input)).toEqual(expected);
    });

    it("should handle round-trip encoding and decoding", () => {
      const input = {
        user: {
          name: "John Doe",
          meta: {
            id: 123,
          },
        },
      };
      const encoded = encodeRecord(input);
      const decoded = decodeRecord(encoded);
      expect(decoded).toEqual(flatten(input));
    });

    it("should escape special characters during encoding", () => {
      const input = {
        "key.with.dot": "value=with=equals\nand\nnewlines\\and\\backslashes",
      };
      const encoded = encodeRecord(input);
      expect(encoded).toContain(
        "key.with.dot=value\\=with\\=equals\\nand\\nnewlines\\\\and\\\\backslashes"
      );

      const decoded = decodeRecord(encoded);
      expect(decoded).toEqual({
        "key.with.dot": "value=with=equals\nand\nnewlines\\and\\backslashes",
      });
    });

    it("should handle carriage returns", () => {
      const input = { a: "line1\rline2" };
      const encoded = encodeRecord(input);
      expect(encoded).toContain("a=line1\\rline2");
      const decoded = decodeRecord(encoded);
      expect(decoded).toEqual({ a: "line1\rline2" });
    });
  });
});
