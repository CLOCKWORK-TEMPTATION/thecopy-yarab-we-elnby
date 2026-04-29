export function renderRoundNotesSnapshot(note: string): string {
  return `# سجل الحالة التنفيذية الحالية

> هذا الملف يرصد الوضع الحالي فقط، ولا يحتفظ بتاريخ الجولات السابقة.

${note.trim()}
`;
}
