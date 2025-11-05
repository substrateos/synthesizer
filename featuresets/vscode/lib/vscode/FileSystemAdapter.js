const VIRTUAL_FILES = new Map([
    ['/jsconfig.json', {
        content: `{
  "compilerOptions": {
    "module": "ESNext",
    "moduleResolution": "bundler",
    "target": "es2024",
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"]
    },
    "checkJs": true,
  },
  "include": ["**/*.js"],
  "exclude": ["node_modules"]
}`,
        unitType: 'json'
    }],
]);

/**
 * A helper to get the parent directory path from a full path.
 * e.g., "/foo/bar.txt" -> "/foo"
 * e.g., "/foo/bar/" -> "/foo"
 * e.g., "/foo" -> "/"
 */
function getParentPath(path) {
    const cleanPath = (path.endsWith('/') && path.length > 1) ? path.substring(0, path.length - 1) : path;
    const lastSlash = cleanPath.lastIndexOf('/');
    if (lastSlash <= 0) return '/'; // Root's parent is root
    return cleanPath.substring(0, lastSlash);
}

class VirtualFileProvider {
    #state = new Map(); // Map<path, stat>
    #content = new Map(); // Map<path, content>

    constructor(files) {
        const now = Date.now();
        this.#state.set('/', { type: 'directory', ctime: now, mtime: now, size: 0 });

        for (const [path, { content, unitType }] of files.entries()) {
            let parent = getParentPath(path);
            while (parent !== '/') {
                if (!this.#state.has(parent)) {
                    this.#state.set(parent, { type: 'directory', ctime: now, mtime: now, size: 0 });
                }
                parent = getParentPath(parent);
            }
            this.#state.set(path, {
                type: 'file',
                ctime: now,
                mtime: now,
                size: content.length,
                unitType: unitType || 'json'
            });
            this.#content.set(path, content);
        }
    }

    has(path) { return this.#state.has(path); }
    stat(path) { return this.#state.get(path); }
    readFile(path) { return this.#content.get(path); }
    getState() { return new Map(this.#state); }

    readDirectory(path) {
        const entries = new Map();
        const prefix = path === '/' ? '/' : `${path}/`;

        for (const fullPath of this.#state.keys()) {
            if (fullPath === '/' || !fullPath.startsWith(prefix)) {
                continue;
            }

            const relativePath = fullPath.substring(prefix.length);
            const firstPart = relativePath.split('/')[0];

            if (firstPart && !entries.has(firstPart)) {
                const entryPath = path === '/' ? `/${firstPart}` : `${path}/${firstPart}`;
                const stat = this.#state.get(entryPath);
                if (stat) {
                    entries.set(firstPart, stat.type);
                }
            }
        }
        return Array.from(entries.entries());
    }

    writeFile(path) { throw new Error(`Cannot modify read-only file: ${path}`); }
    createDirectory(path) { throw new Error(`Cannot modify read-only directory: ${path}`); }
    delete(path) { throw new Error(`Cannot delete read-only file/directory: ${path}`); }
    rename(oldPath) { throw new Error(`Cannot rename read-only file/directory: ${oldPath}`); }
}


const SynthProvider = {
    /**
     * Builds the complete hierarchical state from the synth store.
     */
    buildFullHierarchicalState(synth) {
        const state = new Map();
        const now = Date.now();
        state.set('/', { type: 'directory', ctime: now, mtime: now, size: 0 });

        for (const { name, unit } of synth.query()) {
            const path = `/${name}`;
            const isDirectoryMarker = name.endsWith('/');

            let parent = getParentPath(path);
            while (parent !== '/') {
                if (!state.has(parent)) {
                    state.set(parent, { type: 'directory', ctime: now, mtime: now, size: 0 });
                }
                parent = getParentPath(parent);
            }

            if (isDirectoryMarker) {
                const dirPath = path.substring(0, path.length - 1); // e.g., "/foo/bar/" -> "/foo/bar"
                if (!state.has(dirPath)) {
                    state.set(dirPath, { type: 'directory', ctime: unit.ctime || now, mtime: unit.mtime || now, size: 0 });
                }
            } else {
                state.set(path, {
                    type: 'file',
                    mtime: unit.mtime || now,
                    size: unit.source ? unit.source.length : 0,
                    ctime: unit.ctime || now,
                    unitType: unit.type || 'plaintext'
                });
            }
        }
        return state;
    },

    /**
     * Efficiently lists direct children of a path.
     */
    doReadDirectory(synth, path) {
        const prefix = path === '/' ? '' : path.substring(1) + '/';
        const dirPathLength = prefix.length;
        const entries = new Map();

        for (const { name } of synth.query({ filter: ({ name }) => name.startsWith(prefix) })) {
            const relativePath = name.substring(dirPathLength);
            if (!relativePath) continue;
            const firstPart = relativePath.split('/')[0];
            if (entries.has(firstPart)) continue;

            if (relativePath.includes('/') || relativePath.endsWith('/')) {
                entries.set(firstPart, 'directory');
            } else {
                entries.set(firstPart, 'file');
            }
        }
        return Array.from(entries.entries());
    },

    /**
     * Gets file content.
     */
    doReadFile(synth, path) {
        const name = path.substring(1);
        const unit = synth.read(name);
        return unit ? (unit.source || "") : "";
    },

    /**
     * Writes a file to the store.
     */
    async doWriteFile(synth, path, content, typeHint, options) {
        const name = path.substring(1);

        if (!options.overwrite && synth.has(name)) {
            throw new Error('File already exists.');
        }

        const units = {
            [name]: {
                source: content,
                type: typeHint || 'plaintext'
            }
        };
        await synth.write(units);
    },

    /**
     * Creates a directory marker in the store.
     */
    async doCreateDirectory(synth, path) {
        const markerName = path.substring(1) + '/';
        const units = {
            [markerName]: {
                source: '',
                type: 'directory-marker'
            }
        };
        await synth.write(units);
    },

    /**
     * Performs a recursive or non-recursive delete.
     */
    async doDelete(synth, path, options) {
        const units = {};
        const name = path.substring(1);
        const markerName = name + '/';
        const prefix = name + '/';

        const children = Array.from(synth.query({ filter: ({ name: n }) => n.startsWith(prefix) }));
        if (!options.recursive && children.length > 0) {
            throw new Error('Directory is not empty.');
        }
        for (const { name: childName } of children) {
            units[childName] = undefined;
        }

        if (synth.read(markerName)) {
            units[markerName] = undefined;
        }

        if (synth.read(name)) {
            units[name] = undefined;
        }

        if (Object.keys(units).length > 0) {
            await synth.write(units);
        }
    },

    /**
     * Performs a file or directory rename.
    */
    async doRename(synth, oldPath, newPath, options) {
        const units = {};
        const oldName = oldPath.substring(1);
        const newName = newPath.substring(1);
        const oldPrefix = oldName + '/';
        const newPrefix = newName + '/';
        const oldMarkerName = oldName + '/';
        const newMarkerName = newName + '/';

        if (!options.overwrite) {
            // Check for *any* existing unit at the new location
            const existingFile = synth.read(newName);
            const existingMarker = synth.read(newMarkerName);
            const existingChildren = synth.query({ filter: ({ name: n }) => n.startsWith(newPrefix) });
            if (existingFile || existingMarker || !existingChildren.next().done) {
                throw new Error('File or directory already exists at destination.');
            }
        }
        // Note: A true 'overwrite' would need to delete conflicting units first.
        // This implementation just handles the move.

        let found = false;

        // Handle file rename
        const fileUnit = synth.read(oldName);
        if (fileUnit) {
            units[oldName] = undefined;
            units[newName] = fileUnit;
            found = true;
        }

        // Handle directory children rename
        for (const { name, unit } of synth.query({ filter: ({ name: n }) => n.startsWith(oldPrefix) })) {
            const newChildName = name.replace(oldPrefix, newPrefix);
            units[name] = undefined;
            units[newChildName] = unit;
            found = true;
        }

        // Handle directory marker rename
        const markerUnit = synth.read(oldMarkerName);
        if (markerUnit) {
            units[oldMarkerName] = undefined;
            units[newMarkerName] = markerUnit;
            found = true;
        }

        if (!found) {
            // If we found neither a file nor a directory marker, the source doesn't exist.
            // Note: This isn't a perfect check, but it's better than failing silently.
            throw new Error('File not found.');
        }

        if (Object.keys(units).length > 0) {
            await synth.write(units);
        }
    },
};

/**
 * --- Fast path for create/update ---
 * Calculates a diff *only* for additive changes.
 */
function translateSetEvent(set) {
    const metadataSet = new Map();
    const now = Date.now();

    for (const name in set) {
        const unit = set[name];
        const path = `/${name}`;
        const isDirectoryMarker = name.endsWith('/');

        if (isDirectoryMarker) {
            const dirPath = path.substring(0, path.length - 1);
            metadataSet.set(dirPath, { type: 'directory', ctime: unit.ctime || now, mtime: unit.mtime || now, size: 0 });
        } else {
            metadataSet.set(path, {
                type: 'file',
                mtime: unit.mtime || now,
                size: unit.source ? unit.source.length : 0,
                ctime: unit.ctime || now,
                unitType: unit.type || 'plaintext'
            });
        }
    }
    return { type: 'write', data: { set: metadataSet, deleted: [] } };
}

/**
 * --- Correct path for deletes ---
 * Calculates a diff by comparing the event to the *new* full state.
 */
function translateDeleteEvent(event, synth) {
    const newState = SynthProvider.buildFullHierarchicalState(synth);

    const { set, deleted, previous } = event.detail;
    const metadataSet = new Map();
    const deletedPaths = [];

    if (deleted) {
        for (const name of deleted) {
            const path = `/${name}`;
            const isDirectoryMarker = name.endsWith('/');
            const dirPath = isDirectoryMarker ? path.substring(0, path.length - 1) : path;

            if (isDirectoryMarker) {
                if (!newState.has(dirPath)) {
                    deletedPaths.push(dirPath);
                }
            } else {
                deletedPaths.push(path);
            }

            let parent = getParentPath(path);
            while (parent !== '/') {
                if (previous.has(parent) && !newState.has(parent)) {
                    deletedPaths.push(parent);

                }
                parent = getParentPath(parent);
            }
        }
    }

    if (set) {
        for (const name in set) {
            const path = `/${name}`;
            const isDirectoryMarker = name.endsWith('/');
            const dirPath = isDirectoryMarker ? path.substring(0, path.length - 1) : path;
            const targetPath = isDirectoryMarker ? dirPath : path;

            if (newState.has(targetPath)) {
                metadataSet.set(targetPath, newState.get(targetPath));
            }

            let parent = getParentPath(path);
            while (parent !== '/') {
                if (newState.has(parent) && !metadataSet.has(parent)) {
                    metadataSet.set(parent, newState.get(parent));
                }
                parent = getParentPath(parent);
            }
        }
    }

    return { type: 'write', data: { set: metadataSet, deleted: deletedPaths } };
}


const virtualProvider = new VirtualFileProvider(VIRTUAL_FILES);

export default {
    /**
     * Gets the full file state, including inferred directories.
     * Virtual files overwrite synth files.
     */
    doGetState(synth) {
        const state = SynthProvider.buildFullHierarchicalState(synth);
        const virtualState = virtualProvider.getState();
        for (const [path, stat] of virtualState.entries()) {
            state.set(path, stat);
        }
        // console.log("doGetState", state)
        return state;
    },

    /**
     * Efficiently lists direct children of a path.
     * Merges virtual and synth entries.
     */
    doReadDirectory(synth, path) {
        const entries = new Map(SynthProvider.doReadDirectory(synth, path));
        const virtualEntries = virtualProvider.readDirectory(path);
        for (const [name, type] of virtualEntries) {
            entries.set(name, type);
        }
        const result = Array.from(entries.entries());
        // console.log("doReadDirectory", path, result)
        return result
    },

    /**
     * Gets file content.
     * Checks virtual provider first.
     */
    doReadFile(synth, path) {
        // console.log("doReadFile", path)
        const virtualContent = virtualProvider.readFile(path);
        if (virtualContent !== undefined) {
            return virtualContent;
        }
        return SynthProvider.doReadFile(synth, path);
    },

    /**
     * Writes a file to the store.
     * Checks virtual provider first (which will throw if read-only).
     */
    async doWriteFile(synth, path, content, typeHint, options) {
        if (virtualProvider.has(path)) {
            return virtualProvider.writeFile(path);
        }
        return SynthProvider.doWriteFile(synth, path, content, typeHint, options);
    },

    /**
     * Creates a directory marker in the store.
     * Checks virtual provider first.
     */
    async doCreateDirectory(synth, path) {
        if (virtualProvider.has(path)) {
            return virtualProvider.createDirectory(path);
        }
        return SynthProvider.doCreateDirectory(synth, path);
    },

    /**
     * Performs a recursive or non-recursive delete.
     * Checks virtual provider first.
     */
    async doDelete(synth, path, options) {
        if (virtualProvider.has(path)) {
            return virtualProvider.delete(path);
        }
        return SynthProvider.doDelete(synth, path, options);
    },

    /**
     * Performs a file or directory rename.
     * Checks virtual provider first.
    */
    async doRename(synth, oldPath, newPath, options) {
        if (virtualProvider.has(oldPath) || virtualProvider.has(newPath)) {
            return virtualProvider.rename(oldPath, newPath);
        }
        return SynthProvider.doRename(synth, oldPath, newPath, options);
    },

    /**
     * Smart, Hybrid Event Translator
     */
    translateEvent(event, synth) {
        if (event.type === 'restore') {
            return { type: 'restore' };
        }

        const { deleted } = event.detail;

        if (deleted && deleted.length > 0) {
            return translateDeleteEvent(event, synth);
        } else {
            return translateSetEvent(event.detail.set);
        }
    },
}