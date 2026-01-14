import { describe, it, expect } from "vitest";
import { adfToPlainText, extractAcceptanceCriteria } from "../adf-converter";

describe("adfToPlainText", () => {
  it("should handle empty or null input", () => {
    expect(adfToPlainText(null)).toBe("");
    expect(adfToPlainText(undefined)).toBe("");
    expect(adfToPlainText({})).toBe("");
  });

  it("should handle plain text string input", () => {
    expect(adfToPlainText("Plain text")).toBe("Plain text");
  });

  it("should convert a simple paragraph", () => {
    const adf = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Hello world" }],
        },
      ],
    };
    expect(adfToPlainText(adf)).toBe("Hello world");
  });

  it("should convert multiple paragraphs", () => {
    const adf = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "First paragraph" }],
        },
        {
          type: "paragraph",
          content: [{ type: "text", text: "Second paragraph" }],
        },
      ],
    };
    expect(adfToPlainText(adf)).toBe("First paragraph\n\nSecond paragraph");
  });

  it("should convert headings with proper formatting", () => {
    const adf = {
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 1 },
          content: [{ type: "text", text: "Heading 1" }],
        },
        {
          type: "heading",
          attrs: { level: 2 },
          content: [{ type: "text", text: "Heading 2" }],
        },
      ],
    };
    expect(adfToPlainText(adf)).toBe("# Heading 1\n\n## Heading 2");
  });

  it("should convert bullet lists", () => {
    const adf = {
      type: "doc",
      content: [
        {
          type: "bulletList",
          content: [
            {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "First item" }],
                },
              ],
            },
            {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "Second item" }],
                },
              ],
            },
          ],
        },
      ],
    };
    expect(adfToPlainText(adf)).toBe("• First item\n• Second item");
  });

  it("should convert ordered lists", () => {
    const adf = {
      type: "doc",
      content: [
        {
          type: "orderedList",
          content: [
            {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "First item" }],
                },
              ],
            },
            {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "Second item" }],
                },
              ],
            },
          ],
        },
      ],
    };
    expect(adfToPlainText(adf)).toBe("1. First item\n2. Second item");
  });

  it("should convert code blocks", () => {
    const adf = {
      type: "doc",
      content: [
        {
          type: "codeBlock",
          attrs: { language: "javascript" },
          content: [
            { type: "text", text: "const x = 1;" },
          ],
        },
      ],
    };
    expect(adfToPlainText(adf)).toBe("```javascript\nconst x = 1;\n```");
  });

  it("should convert blockquotes", () => {
    const adf = {
      type: "doc",
      content: [
        {
          type: "blockquote",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "Quoted text" }],
            },
          ],
        },
      ],
    };
    expect(adfToPlainText(adf)).toBe("> Quoted text");
  });

  it("should convert panels", () => {
    const adf = {
      type: "doc",
      content: [
        {
          type: "panel",
          attrs: { panelType: "info" },
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "Important information" }],
            },
          ],
        },
      ],
    };
    expect(adfToPlainText(adf)).toBe("[INFO]\nImportant information");
  });

  it("should convert mentions", () => {
    const adf = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "mention", attrs: { text: "John Doe", id: "123" } },
          ],
        },
      ],
    };
    expect(adfToPlainText(adf)).toBe("@John Doe");
  });

  it("should handle nested lists", () => {
    const adf = {
      type: "doc",
      content: [
        {
          type: "bulletList",
          content: [
            {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "Parent item" }],
                },
                {
                  type: "bulletList",
                  content: [
                    {
                      type: "listItem",
                      content: [
                        {
                          type: "paragraph",
                          content: [{ type: "text", text: "Nested item" }],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };
    const result = adfToPlainText(adf);
    expect(result).toContain("Parent item");
    expect(result).toContain("Nested item");
  });

  it("should handle tables", () => {
    const adf = {
      type: "doc",
      content: [
        {
          type: "table",
          content: [
            {
              type: "tableRow",
              content: [
                {
                  type: "tableHeader",
                  content: [
                    {
                      type: "paragraph",
                      content: [{ type: "text", text: "Header 1" }],
                    },
                  ],
                },
                {
                  type: "tableHeader",
                  content: [
                    {
                      type: "paragraph",
                      content: [{ type: "text", text: "Header 2" }],
                    },
                  ],
                },
              ],
            },
            {
              type: "tableRow",
              content: [
                {
                  type: "tableCell",
                  content: [
                    {
                      type: "paragraph",
                      content: [{ type: "text", text: "Cell 1" }],
                    },
                  ],
                },
                {
                  type: "tableCell",
                  content: [
                    {
                      type: "paragraph",
                      content: [{ type: "text", text: "Cell 2" }],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };
    const result = adfToPlainText(adf);
    expect(result).toContain("Header 1 | Header 2");
    expect(result).toContain("Cell 1 | Cell 2");
  });
});

describe("extractAcceptanceCriteria", () => {
  it("should extract acceptance criteria with 'Acceptance Criteria:' pattern", () => {
    const text = "Description\n\nAcceptance Criteria:\n- User can login\n- User can logout";
    const result = extractAcceptanceCriteria(text);
    expect(result).toBe("- User can login\n- User can logout");
  });

  it("should extract acceptance criteria with 'AC:' pattern", () => {
    const text = "Description\n\nAC:\n- Requirement 1\n- Requirement 2";
    const result = extractAcceptanceCriteria(text);
    expect(result).toBe("- Requirement 1\n- Requirement 2");
  });

  it("should extract acceptance criteria with markdown heading", () => {
    const text = "Description\n\n## Acceptance Criteria\n- Item 1\n- Item 2";
    const result = extractAcceptanceCriteria(text);
    expect(result).toContain("- Item 1");
    expect(result).toContain("- Item 2");
  });

  it("should return empty string if no acceptance criteria found", () => {
    const text = "Just a description without acceptance criteria";
    const result = extractAcceptanceCriteria(text);
    expect(result).toBe("");
  });

  it("should handle empty or null input", () => {
    expect(extractAcceptanceCriteria("")).toBe("");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Testing edge case with null input
    expect(extractAcceptanceCriteria(null as any)).toBe("");
  });
});

