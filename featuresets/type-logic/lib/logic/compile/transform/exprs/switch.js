import blockExpr from "@/lib/logic/compile/transform/exprs/block.js";

export default (switchValueExpr, caseExprEntries) =>
    blockExpr(
        e => e.emit(`switch (${e.child(switchValueExpr)})`),
        ...Array.from(caseExprEntries, ([label, ...caseExprs]) => {
            const caseLabel = (typeof label === 'string' && label !== 'undefined') ? `'${label}'` : label;
            return blockExpr(e => e.emit(`case ${caseLabel}:`), ...caseExprs);
        }),
    );
