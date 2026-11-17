function cells(line) {
  return line.trim().replace(/^\|/, "").replace(/\|$/, "").split(/(?<!\\)\|/);
}

function isSeparator(line) {
  return cells(line).length > 1 && cells(line).every((cell) => /^\s*:?-+:?\s*$/.test(cell));
}

export function normalizeMarkdownTables(markdown) {
  const lines = markdown.replace(/\r\n?/g, "\n").split("\n");
  let fence = null;

  for (let i = 0; i < lines.length; i += 1) {
    const marker = /^ {0,3}(`{3,}|~{3,})/.exec(lines[i]);
    if (marker) {
      if (!fence) fence = marker[1];
      else if (marker[1][0] === fence[0] && marker[1].length >= fence.length) fence = null;
      continue;
    }
    if (fence || i + 1 >= lines.length || lines[i].trimStart().startsWith("|")) continue;
    if (cells(lines[i]).length < 2 || !isSeparator(lines[i + 1])) continue;

    while (i < lines.length && cells(lines[i]).length > 1 && lines[i].trim()) {
      lines[i] = `| ${lines[i].trim().replace(/^\|/, "").replace(/\|$/, "").trim()} |`;
      i += 1;
    }
  }

  return lines.join("\n");
}
