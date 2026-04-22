import { describe, expect, it } from "vitest";

import {
  generateCSPHeader,
  sanitizeHTML,
  sanitizeContentEditable,
  sanitizeFilename,
} from "./sanitizer";

describe("sanitizer CSP config", () => {
  it("does not allow inline scripts or eval", () => {
    const header = generateCSPHeader();

    expect(header).not.toContain("unsafe-inline");
    expect(header).not.toContain("unsafe-eval");
  });
});

describe("sanitizeHTML", () => {
  it("allows safe tags and attributes", () => {
    const dirty =
      '<p class="test" style="color: red" dir="rtl"><strong>Hello</strong> <em>World</em> <u>!</u> <br /> <span>test</span></p>';
    const clean = sanitizeHTML(dirty);
    expect(clean).toBe(
      '<p class="test" style="color: red" dir="rtl"><strong>Hello</strong> <em>World</em> <u>!</u> <br> <span>test</span></p>'
    );
  });

  it("removes unsafe tags but keeps content", () => {
    const dirty =
      '<div><h1>Title</h1><script>alert(1)</script><a href="#">Link</a></div>';
    const clean = sanitizeHTML(dirty);
    expect(clean).toBe("<div>TitleLink</div>");
  });

  it("removes unsafe attributes", () => {
    const dirty =
      '<div onclick="alert(1)" onmouseover="foo()" id="foo">test</div>';
    const clean = sanitizeHTML(dirty);
    expect(clean).toBe("<div>test</div>");
  });
});

describe("sanitizeContentEditable", () => {
  it("allows safe tags and attributes", () => {
    const dirty =
      '<div class="test" style="color: red" dir="rtl">test <br /> <span>span</span> <div>div</div></div>';
    const clean = sanitizeContentEditable(dirty);
    expect(clean).toBe(
      '<div class="test" style="color: red" dir="rtl">test <br> <span>span</span> <div>div</div></div>'
    );
  });

  it("removes forbidden tags", () => {
    const dirty =
      "<div><script>alert(1)</script><style>body{}</style><object></object><embed></embed><link /><meta />safe</div>";
    const clean = sanitizeContentEditable(dirty);
    expect(clean).toBe("<div>safe</div>");
  });

  it("removes forbidden attributes", () => {
    const dirty =
      '<div onclick="alert(1)" onload="foo()" onerror="bar()" onmouseover="baz()">test</div>';
    const clean = sanitizeContentEditable(dirty);
    expect(clean).toBe("<div>test</div>");
  });
});

describe("sanitizeFilename", () => {
  it("returns 'untitled' for empty or undefined input", () => {
    expect(sanitizeFilename("")).toBe("untitled");
    // @ts-expect-error testing invalid input
    expect(sanitizeFilename(undefined)).toBe("untitled");
    // @ts-expect-error testing invalid input
    expect(sanitizeFilename(null)).toBe("untitled");
  });

  it("returns the same string for a valid filename", () => {
    expect(sanitizeFilename("my-document.txt")).toBe("my-document.txt");
    expect(sanitizeFilename("image_123.png")).toBe("image_123.png");
    expect(sanitizeFilename("report 2023.pdf")).toBe("report 2023.pdf");
  });

  it("removes dangerous characters", () => {
    expect(sanitizeFilename("file<name>.txt")).toBe("filename.txt");
    expect(sanitizeFilename("file:name.txt")).toBe("filename.txt");
    expect(sanitizeFilename('file"name".txt')).toBe("filename.txt");
    expect(sanitizeFilename("file/name.txt")).toBe("filename.txt");
    expect(sanitizeFilename("file\\name.txt")).toBe("filename.txt");
    expect(sanitizeFilename("file|name.txt")).toBe("filename.txt");
    expect(sanitizeFilename("file?name.txt")).toBe("filename.txt");
    expect(sanitizeFilename("file*name.txt")).toBe("filename.txt");
    expect(sanitizeFilename("f\x00ile\x1fname.txt")).toBe("filename.txt");

    // Combined dangerous characters
    expect(sanitizeFilename('<>:"/\\|?*\x00\x1fbad-file.txt')).toBe(
      "bad-file.txt"
    );
  });

  it("removes leading dots", () => {
    expect(sanitizeFilename(".env")).toBe("env");
    expect(sanitizeFilename("...hidden.txt")).toBe("hidden.txt");
    expect(sanitizeFilename("../dir/file.txt")).toBe("dirfile.txt");
    // Should preserve trailing or middle dots
    expect(sanitizeFilename("file.name.with.dots.txt")).toBe(
      "file.name.with.dots.txt"
    );
  });

  it("truncates filenames longer than 255 characters", () => {
    const longName = "a".repeat(300) + ".txt";
    const result = sanitizeFilename(longName);
    expect(result.length).toBe(255);
    expect(result).toBe("a".repeat(255));
  });

  it("falls back to 'untitled' if sanitization strips all characters", () => {
    expect(sanitizeFilename("<>:/\\|?*")).toBe("untitled");
    expect(sanitizeFilename("...")).toBe("untitled");
    expect(sanitizeFilename("   ")).toBe("untitled");
    expect(sanitizeFilename(" . . ")).toBe(". ."); // spaces are trimmed, but middle dot remains
    expect(sanitizeFilename("\x00\x1f")).toBe("untitled");
  });
});
