export default function mount({target, source, relationship='child'}={}) {
    // For 'replace', the element to be replaced starts as the target itself.
    // For 'child', we'll track the appended child.
    let currentElement = relationship === 'replace' ? target : null;
    const strategy = {
        'child': {
            active: true,
            update(newElement/*: HTMLElement*/) {
                if (!this.active) return;
                target.innerHTML = '';
                target.appendChild(newElement);
                currentElement = newElement;
            },
            unmount() {
                if (!this.active) return;
                this.active = false;
                if (currentElement && currentElement.parentNode === target) {
                    target.removeChild(currentElement);
                }
            },
        },
        'replace': {
            active: true,
            update(newElement/*: HTMLElement*/) {
                if (!this.active) return;
                if (currentElement && currentElement.parentNode) {
                    currentElement.replaceWith(newElement);
                }
                currentElement = newElement;
            },
            unmount() {
                if (!this.active) return;
                this.active = false;
                if (currentElement && currentElement.parentNode) {
                    currentElement.replaceWith(target);
                }
            },
        }
    }[relationship];

    let hasMounted = false; // Tracks if at least one element has been mounted.

    async function run() {
        for await (const newElement of source) {
            strategy.update(newElement)
            hasMounted = true
        }
    }

    run();

    // Return the unmount function
    return () => {
        // Perform DOM cleanup first to ensure the UI is in a consistent state.
        // Only do this if the generator has actually mounted an element.
        if (hasMounted) {
            strategy.unmount()
        }
        try {
            source.return(undefined);
        } catch (e) {
            console.error("Error during generator cleanup:", e);
        }
    };
}
