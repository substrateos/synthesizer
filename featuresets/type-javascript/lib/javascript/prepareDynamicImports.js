export const attributes = {
    do: {get: 'do/get/javascript'}
}

/**
 * Creates a dynamic module environment from source code strings.
 *
 * @returns {{
 * entryURL: string;
 * importMap: { imports: Record<string, string>, scopes: Record<string, Record<string, string>> };
 * cleanup: () => void;
 * }} An object containing the entry point blob URL, the generated import map,
 * and a function to revoke all created blob URLs.
 */
export default function prepareDynamicImports({createBlobURL, entryName, entrySource, entryURL, importSources={}, scopedImports={}, scopes={}}) {
  const importURLs = Object.fromEntries(
    Object.entries(importSources).map(([specifier, source]) => [
      specifier,
      createBlobURL(`import/${specifier}`, [source], 'text/javascript'),
    ])
  );

  const importMap = {
    scopes: {
      ...scopes,
    },
  };

  if (entrySource) {
    entryURL = createBlobURL('entry', [entrySource], 'text/javascript');

    importMap.scopes[entryURL] = {
      ...importURLs,
      ...scopedImports,
    }

    if (entryName) {
      importMap.imports = {
        [entryName]: entryURL,
      }
    }
  }

  return { entryURL, importMap };
}
