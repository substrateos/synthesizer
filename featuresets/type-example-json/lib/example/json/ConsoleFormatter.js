import {baseFormatter} from "@/lib/example/json/jsondiffpatch@0.7.3/jsondiffpatch";

export default class ConsoleFormatter extends baseFormatter {
    constructor() {
        super();
        this.STYLES = {
            added: 'color: #28a745; font-weight: bold;',
            deleted: 'color: #dc3545; font-weight: bold;',
            modified: 'color: #007bff; font-weight: bold;',
            property: 'color: #6c757d;',
            text: 'font-style: italic;',
            moved: 'color: #ffc107; font-weight: bold;',
        };
    }

    // These hooks are called for the top-level diff object.
    rootBegin() {}
    rootEnd() {}
    nodeBegin() {}
    nodeEnd() {}

    format_unchanged(context, delta, left, key) {}
    format_movedestination(context, delta, left, key) {}

    // This method is called for any nested object or array that has changes.
    format_node(context, delta, left, key) {
        // Handle the root call where `key` is undefined.
        const header = key === undefined ? '(root)' : (delta._t === 'a' ? `[${key}]` : key);
        console.group(header);
        
        const parentInArray = context.in_array;
        context.in_array = delta._t === 'a';
        this.formatDeltaChildren(context, delta, left);
        context.in_array = parentInArray;

        console.groupEnd();
    }

    format_modified(context, delta, left, key) {
        if (key === undefined) {
            console.log(`%c~`, this.STYLES.modified, delta[0], '→', delta[1]);
            return;
        }
        const prefix = context.in_array && !key.startsWith('_') ? '~  ' : '~ ';
        console.log(
            `%c${prefix}%c${key}:`,
            this.STYLES.modified,
            this.STYLES.property,
            delta[0], // old value
            '→',
            delta[1]  // new value
        );
    }

    format_added(context, delta, left, key) {
        if (key === undefined) {
            console.log(`%c+`, this.STYLES.added, delta[0]);
            return;
        }
        const prefix = context.in_array && !key.startsWith('_') ? '+  ' : '+ ';
        console.log(
            `%c${prefix}%c${key}:`,
            this.STYLES.added,
            this.STYLES.property,
            delta[0] // new value
        );
    }

    format_deleted(context, delta, left, key) {
        if (key === undefined) {
            console.log(`%c-`, this.STYLES.deleted, delta[0]);
            return;
        }
        const prefix = context.in_array && !key.startsWith('_') ? '-  ' : '- ';
        console.log(
            `%c${prefix}%c${key}:`,
            this.STYLES.deleted,
            this.STYLES.property,
            delta[0] // old value
        );
    }
    
    format_moved(context, delta, left, key) {
        const from = key.substring(1); // The key for a move is like '_5'
        const to = delta[1];
        console.log(
            `%c⇄ %cItem from index ${from} moved to index ${to}`,
            this.STYLES.moved,
            this.STYLES.text
        );
    }

    format_text(context, delta, left, key) {
        if (key === undefined) {
            console.log(`%c~ %c(Text diff)`, this.STYLES.modified, this.STYLES.text);
            return;
        }
        console.log(
            `%c~ %c${key}: %c(Text diff)`,
            this.STYLES.modified,
            this.STYLES.property,
            this.STYLES.text
        );
    }
}
