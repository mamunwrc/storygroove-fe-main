const fs = require('fs');
const path = require('path');

const projectRoot = path.join(__dirname, 'src');
const extensions = ['.js', '.jsx', '.ts', '.tsx', '.css', '.scss', '.json'];

function getAllFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      getAllFiles(filePath, fileList);
    } else {
      fileList.push(filePath);
    }
  });
  return fileList;
}

function resolveImport(importPath, currentFile) {
  if (!importPath.startsWith('.')) {
    // Check if it is an alias or node_module. 
    // Assuming no aliases for now based on standard CRA, but checking tsconfig/jsconfig would be better.
    // However, for this task, if it's not relative, we treat it as external (node_modules) unless we know otherwise.
    return null;
  }

  const currentDir = path.dirname(currentFile);
  const absPath = path.resolve(currentDir, importPath);

  // Check exact file
  if (fs.existsSync(absPath) && !fs.statSync(absPath).isDirectory()) {
      return absPath;
  }

  // Check extensions
  for (const ext of extensions) {
    if (fs.existsSync(absPath + ext)) {
      return absPath + ext;
    }
  }

  // Check directory index
  if (fs.existsSync(absPath) && fs.statSync(absPath).isDirectory()) {
    for (const ext of extensions) {
      const indexPath = path.join(absPath, 'index' + ext);
      if (fs.existsSync(indexPath)) {
        return indexPath;
      }
    }
  }

  return null;
}

function getImports(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const imports = [];
  
  // Regex for imports
  // import ... from "..."
  const importRegex = /import\s+(?:[\w\s{},*]+from\s+)?["']([^"']+)["']/g;
  let match;
  while ((match = importRegex.exec(content)) !== null) {
      imports.push(match[1]);
  }

  // Regex for require
  const requireRegex = /require\s*\(\s*["']([^"']+)["']\s*\)/g;
  while ((match = requireRegex.exec(content)) !== null) {
      imports.push(match[1]);
  }
  
  // Regex for CSS imports @import '...'
  const cssImportRegex = /@import\s+["']([^"']+)["']/g;
   while ((match = cssImportRegex.exec(content)) !== null) {
      imports.push(match[1]);
  }

  // Regex for lazy loading import('...')
  const dynamicImportRegex = /import\s*\(\s*["']([^"']+)["']\s*\)/g;
  while ((match = dynamicImportRegex.exec(content)) !== null) {
      imports.push(match[1]);
  }

  return imports;
}

// Entry points - based on App.js analysis and standard CRA
const entryPoints = [
  path.join(projectRoot, 'index.js'),
  path.join(projectRoot, 'App.js'), 
  path.join(projectRoot, 'reportWebVitals.js'),
  path.join(projectRoot, 'setupTests.js') // standard
];

// Add manual mapping for App.js usage if we want to be strict about skipping unused Page exports
// But for now, let's start with standard entry point traversal.
// If App.js imports "./Pages", and "./Pages/index.js" imports everything, we might over-include.
// But we want to see what is reachable first.

const usedFiles = new Set();
const queue = [...entryPoints];
queue.forEach(f => usedFiles.add(f));

const visited = new Set();

while (queue.length > 0) {
  const currentFile = queue.shift();
  if (visited.has(currentFile)) continue;
  visited.add(currentFile);

  try {
      const content = fs.readFileSync(currentFile, 'utf-8');
      
      // Determine imports
      const rawImports = getImports(currentFile);
      
      for (const imp of rawImports) {
          const resolved = resolveImport(imp, currentFile);
          if (resolved) {
              usedFiles.add(resolved);
              if (!visited.has(resolved)) {
                  queue.push(resolved);
              }
          }
      }

  } catch (err) {
      console.error(`Error processing ${currentFile}:`, err.message);
  }
}

const allFiles = getAllFiles(projectRoot);
const unusedFiles = allFiles.filter(f => !usedFiles.has(f));

console.log("Total files:", allFiles.length);
console.log("Used files:", usedFiles.size);
console.log("Unused files:", unusedFiles.length);

console.log("\n--- UNUSED FILES ---");
unusedFiles.forEach(f => {
    console.log(path.relative(projectRoot, f));
});
