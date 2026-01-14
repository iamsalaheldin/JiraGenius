/**
 * Atlassian Document Format (ADF) to Plain Text Converter
 * Handles various ADF node types and converts them to readable plain text
 */

interface ADFNode {
  type: string;
  content?: ADFNode[];
  text?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- ADF attrs can contain arbitrary values
  attrs?: Record<string, any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- ADF mark attrs can contain arbitrary values
  marks?: Array<{ type: string; attrs?: Record<string, any> }>;
}

interface ADFDocument {
  type?: string;
  content?: ADFNode[];
}

/**
 * Convert ADF document to plain text
 */
export function adfToPlainText(doc: string | ADFDocument | null | undefined): string {
  if (!doc) {
    return "";
  }

  // Handle string input (might already be plain text)
  if (typeof doc === "string") {
    return doc;
  }

  // Handle ADF document
  if (doc.type === "doc" && Array.isArray(doc.content)) {
    return processNodes(doc.content);
  }

  // Handle content array directly
  if (Array.isArray(doc.content)) {
    return processNodes(doc.content);
  }

  return "";
}

/**
 * Process an array of ADF nodes
 */
function processNodes(nodes: ADFNode[]): string {
  return nodes
    .map((node) => processNode(node))
    .filter((text) => text.length > 0)
    .join("\n\n");
}

/**
 * Process a single ADF node
 */
function processNode(node: ADFNode): string {
  if (!node || !node.type) {
    return "";
  }

  switch (node.type) {
    case "paragraph":
      return processParagraph(node);
    
    case "heading":
      return processHeading(node);
    
    case "bulletList":
      return processBulletList(node);
    
    case "orderedList":
      return processOrderedList(node);
    
    case "listItem":
      return processListItem(node);
    
    case "codeBlock":
      return processCodeBlock(node);
    
    case "blockquote":
      return processBlockquote(node);
    
    case "panel":
      return processPanel(node);
    
    case "table":
      return processTable(node);
    
    case "rule":
      return "---";
    
    case "text":
      return node.text || "";
    
    case "hardBreak":
      return "\n";
    
    case "mention":
      return processMention(node);
    
    case "emoji":
      return processEmoji(node);
    
    case "inlineCard":
    case "blockCard":
      return processCard(node);
    
    case "mediaGroup":
    case "mediaSingle":
      return "[Media]";
    
    case "expand":
      return processExpand(node);
    
    default:
      // For unknown types, try to process children
      if (node.content && Array.isArray(node.content)) {
        return processInlineNodes(node.content);
      }
      return "";
  }
}

/**
 * Process inline nodes (for paragraphs, headings, etc.)
 */
function processInlineNodes(nodes: ADFNode[]): string {
  return nodes.map((node) => processNode(node)).join("");
}

/**
 * Process a paragraph node
 */
function processParagraph(node: ADFNode): string {
  if (!node.content) {
    return "";
  }
  return processInlineNodes(node.content);
}

/**
 * Process a heading node
 */
function processHeading(node: ADFNode): string {
  if (!node.content) {
    return "";
  }
  const level = (node.attrs?.level as number) || 1;
  const text = processInlineNodes(node.content);
  const prefix = "#".repeat(level);
  return `${prefix} ${text}`;
}

/**
 * Process a bullet list
 */
function processBulletList(node: ADFNode): string {
  if (!node.content) {
    return "";
  }
  return node.content
    .map((item) => {
      const text = processNode(item);
      return text.split("\n").map((line, i) => 
        i === 0 ? `• ${line}` : `  ${line}`
      ).join("\n");
    })
    .join("\n");
}

/**
 * Process an ordered list
 */
function processOrderedList(node: ADFNode): string {
  if (!node.content) {
    return "";
  }
  return node.content
    .map((item, index) => {
      const text = processNode(item);
      return text.split("\n").map((line, i) => 
        i === 0 ? `${index + 1}. ${line}` : `   ${line}`
      ).join("\n");
    })
    .join("\n");
}

/**
 * Process a list item
 */
function processListItem(node: ADFNode): string {
  if (!node.content) {
    return "";
  }
  return node.content
    .map((child) => {
      // If the child is a list, indent it
      if (child.type === "bulletList" || child.type === "orderedList") {
        return processNode(child)
          .split("\n")
          .map((line) => `  ${line}`)
          .join("\n");
      }
      return processNode(child);
    })
    .join("\n");
}

/**
 * Process a code block
 */
function processCodeBlock(node: ADFNode): string {
  if (!node.content) {
    return "";
  }
  const code = processInlineNodes(node.content);
  const language = node.attrs?.language || "";
  return `\`\`\`${language}\n${code}\n\`\`\``;
}

/**
 * Process a blockquote
 */
function processBlockquote(node: ADFNode): string {
  if (!node.content) {
    return "";
  }
  return node.content
    .map((child) => {
      const text = processNode(child);
      return text
        .split("\n")
        .map((line) => `> ${line}`)
        .join("\n");
    })
    .join("\n");
}

/**
 * Process a panel (info, note, warning, etc.)
 */
function processPanel(node: ADFNode): string {
  if (!node.content) {
    return "";
  }
  const panelType = (node.attrs?.panelType as string) || "info";
  const content = node.content.map((child) => processNode(child)).join("\n");
  return `[${panelType.toUpperCase()}]\n${content}`;
}

/**
 * Process a table
 */
function processTable(node: ADFNode): string {
  if (!node.content) {
    return "";
  }
  
  return node.content
    .map((row) => {
      if (row.type === "tableRow" && row.content) {
        return row.content
          .map((cell) => {
            if ((cell.type === "tableCell" || cell.type === "tableHeader") && cell.content) {
              return cell.content.map((p) => processNode(p)).join(" ");
            }
            return "";
          })
          .join(" | ");
      }
      return "";
    })
    .join("\n");
}

/**
 * Process a mention
 */
function processMention(node: ADFNode): string {
  const text = node.attrs?.text || node.attrs?.id || "";
  return `@${text}`;
}

/**
 * Process an emoji
 */
function processEmoji(node: ADFNode): string {
  return (node.attrs?.shortName as string) || (node.attrs?.text as string) || "";
}

/**
 * Process a card (inline or block)
 */
function processCard(node: ADFNode): string {
  const url = (node.attrs?.url as string) || "";
  const title = (node.attrs?.title as string) || url;
  return title ? `[${title}](${url})` : url;
}

/**
 * Process an expand (collapsible section)
 */
function processExpand(node: ADFNode): string {
  if (!node.content) {
    return "";
  }
  const title = node.attrs?.title || "Expand";
  const content = node.content.map((child) => processNode(child)).join("\n");
  return `▼ ${title}\n${content}`;
}

/**
 * Extract acceptance criteria from description
 * Looks for common patterns in Jira descriptions
 */
export function extractAcceptanceCriteria(description: string): string {
  if (!description) {
    return "";
  }

  const patterns = [
    /(?:acceptance criteria|ac):\s*([\s\S]+?)(?=\n\n|$)/i,
    /(?:^|\n)##?\s*acceptance criteria\s*([\s\S]+?)(?=\n##?|$)/i,
    /\[acceptance criteria\]\s*([\s\S]+?)(?=\[|$)/i,
  ];

  for (const pattern of patterns) {
    const match = description.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  return "";
}

