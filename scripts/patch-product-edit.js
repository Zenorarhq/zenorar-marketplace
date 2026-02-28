const fs = require('fs');
const filePath = 'app/admin/products/[id]/edit/page.tsx';
let c = fs.readFileSync(filePath, 'utf8');

// Normalize line endings for matching
const hasCRLF = c.includes('\r\n');
if (hasCRLF) c = c.replace(/\r\n/g, '\n');

// 1. Add 'Protection' column header after 'Status' header
const headerAnchor = `<th className="py-2 pr-4 text-left text-xs font-medium text-slate-500">Status</th>`;
const headerReplace = headerAnchor + `\n                          <th className="py-2 pr-4 text-left text-xs font-medium text-slate-500">Protection</th>`;

if (!c.includes(headerAnchor)) {
  console.log('ERROR: Status header not found');
  process.exit(1);
}
c = c.replace(headerAnchor, headerReplace);

// 2. Add protection level badge cell after the Status cell
// Find the closing of the Status cell: the "—" span followed by </td>
const statusCellPattern = `: <span className="text-slate-600 text-xs">—</span>\n                          }\n                        </td>\n                        <td className="py-2">`;

if (!c.includes(statusCellPattern)) {
  console.log('ERROR: Status cell pattern not found');
  process.exit(1);
}

const protectionCell = `: <span className="text-slate-600 text-xs">—</span>
                          }
                        </td>
                        <td className="py-2 pr-4">
                          {file.obfuscation_level
                            ? <span className={\`px-2 py-0.5 rounded-full text-xs \${
                                file.obfuscation_level === 'HEAVY' ? 'bg-red-500/15 text-red-400' :
                                file.obfuscation_level === 'MEDIUM' ? 'bg-yellow-500/15 text-yellow-400' :
                                'bg-blue-500/15 text-blue-400'
                              }\`}>
                              {file.obfuscation_level}
                              {file.obfuscation_report ? \` (\${file.obfuscation_report.obfuscatedFiles}/\${file.obfuscation_report.totalFiles})\` : ''}
                            </span>
                            : <span className="text-slate-600 text-xs">—</span>
                          }
                        </td>
                        <td className="py-2">`;

c = c.replace(statusCellPattern, protectionCell);

// Restore line endings
if (hasCRLF) c = c.replace(/\n/g, '\r\n');
fs.writeFileSync(filePath, c);
console.log('Product edit page patched successfully');
console.log('- Added Protection column header');
console.log('- Added obfuscation level badge cell');