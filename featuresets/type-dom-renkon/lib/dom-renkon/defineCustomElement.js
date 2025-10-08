function maybeDefineCustomElement(customElementName, customElementConstructor) {
    const existing = customElements.get(customElementName)
    if (!existing) {
        customElements.define(customElementName, customElementConstructor)
        return customElementName
    }

    if (customElementConstructor.toString() === existing.toString()) {
        return customElementName
    }
}


export default function defineCustomElement(baseCustomElementName, customElementConstructor) {
    // do not make more than 1000 attempts
    const maxAttempts = 1000
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const customElementName = `${baseCustomElementName}-${attempt}`
        if (maybeDefineCustomElement(customElementName, customElementConstructor)) {
            return customElementName
        }
    }

    throw new Error(`could not define customElement with base name ${baseCustomElementName} after ${maxAttempts} attempts`)
}