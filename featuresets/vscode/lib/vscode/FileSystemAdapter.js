/**
 * A helper to get the parent directory path from a full path.
 * e.g., "/foo/bar.txt" -> "/foo"
 * e.g., "/foo/bar/" -> "/foo"
 * e.g., "/foo" -> "/"
 */
function getParentPath(path) {
    // Trim trailing slash if it's not the root
    const cleanPath = (path.endsWith('/') && path.length > 1) ? path.substring(0, path.length - 1) : path;
    const lastSlash = cleanPath.lastIndexOf('/');
    if (lastSlash <= 0) return '/'; // Root's parent is root
    return cleanPath.substring(0, lastSlash);
}

/**
 * Builds the complete hierarchical state (all files and inferred directories)
 * from the synth store.
 * (Used for `doGetState` and calculating delete-event diffs).
 * @returns {Map<string, object>} A Map of {path -> statObject}
 */
function buildFullHierarchicalState(synth) {
    const state = new Map();
    const now = Date.now();
    state.set('/', { type: 'directory', ctime: now, mtime: now, size: 0 });

    for (const { name, unit } of synth.query()) {
        const path = `/${name}`;
        const isDirectoryMarker = name.endsWith('/');

        // Add all parent directories for this path
        let parent = getParentPath(path);
        while (parent !== '/') {
            if (!state.has(parent)) {
                state.set(parent, { type: 'directory', ctime: now, mtime: now, size: 0 });
            }
            parent = getParentPath(parent);
        }

        // Add the file or marker *itself*
        if (isDirectoryMarker) {
            const dirPath = path.substring(0, path.length - 1); // e.g., "/foo/bar/" -> "/foo/bar"
            if (!state.has(dirPath)) {
                state.set(dirPath, { type: 'directory', ctime: unit.ctime || now, mtime: unit.mtime || now, size: 0 });
            }
        } else {
            // It's a file
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
}

/**
 * --- Fast path for create/update ---
 * Calculates a diff *only* for additive changes.
 * This is "dumb" and doesn't add parent directories, as
 * the client's `applyWrite` handles parent notifications.
 */
function translateSetEvent(set) {
    const metadataSet = new Map();
    const now = Date.now();

    for (const name in set) {
        const unit = set[name];
        const path = `/${name}`;
        const isDirectoryMarker = name.endsWith('/');

        // Add the file or directory marker itself
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
    // 1. Get the complete, correct state *after* the change.
    const newState = buildFullHierarchicalState(synth);

    const { set, deleted, previous } = event.detail;
    const metadataSet = new Map();
    const deletedPaths = [];

    // 2. Handle Deletions
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

            // Now, check its parents.
            let parent = getParentPath(path);
            while (parent !== '/') {
                // If the parent *was* in the previous state (implied)
                // but is *not* in the new state, it was pruned.
                if (previous.has(parent) && !newState.has(parent)) {
                    deletedPaths.push(parent);

                }
                parent = getParentPath(parent);
            }
        }
    }

    // 3. Handle Set (Creations/Updates that happened in the same write)
    if (set) {
        for (const name in set) {
            const path = `/${name}`;
            const isDirectoryMarker = name.endsWith('/');
            const dirPath = isDirectoryMarker ? path.substring(0, path.length - 1) : path;
            const targetPath = isDirectoryMarker ? dirPath : path;

            if (newState.has(targetPath)) {
                metadataSet.set(targetPath, newState.get(targetPath));
            }

            // Also add all parents that might have been created.
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


/**
* This adapter translates between the FileSystemProvider's API (paths, content)
* and the Synth emitter's API (units, names).
*/
export default {
    /**
     * Gets the full file state, including inferred directories.
     */
    doGetState(synth) {
        return buildFullHierarchicalState(synth);
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

        // 1. Respect options.overwrite
        if (!options.overwrite && synth.has(name)) {
            throw new Error('File already exists.');
        }

        // 2. Proceed with write
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

        // 1. Check for children
        const children = Array.from(synth.query({ filter: ({ name: n }) => n.startsWith(prefix) }));
        if (!options.recursive && children.length > 0) {
            throw new Error('Directory is not empty.');
        }
        for (const { name: childName } of children) {
            units[childName] = undefined;
        }

        // 2. Check for directory marker
        if (synth.read(markerName)) {
            units[markerName] = undefined;
        }

        // 3. Check for a file *at the same path*
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

    /**
     * Smart, Hybrid Event Translator
     */
    translateEvent(event, synth) {
        if (event.type === 'restore') {
            return { type: 'restore' };
        }

        const { deleted, set } = event.detail;

        if (deleted && deleted.length > 0) {
            // --- "Delete" Path (Slow, but 100% correct) ---
            // A deletion occurred. We *must* build the full state
            // to find pruned directories.
            return translateDeleteEvent(event, synth);
        } else {
            // --- "Set" Path (Fast, additive-only) ---
            // No deletions. This is just a create or update.
            return translateSetEvent(set);
        }
    },
}
