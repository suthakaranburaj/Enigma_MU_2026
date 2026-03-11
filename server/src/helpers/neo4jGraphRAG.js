/**
 * neo4jGraphRAG.js
 *
 * Graph RAG helper — always queries the RBI Neo4j knowledge graph and
 * returns structured context + raw source nodes for every request.
 *
 * Exported surface:
 *   searchKnowledgeGraph(query)  → { context, nodes, intent }
 *   closeNeo4jDriver()           → Promise<void>  (call on app shutdown)
 */

import neo4j from "neo4j-driver";

// ─── Connection ───────────────────────────────────────────────────────────────

const NEO4J_URI = process.env.NEO4J_URI || "bolt://localhost:7687";
const NEO4J_USER = process.env.NEO4J_USERNAME || process.env.NEO4J_USER || "neo4j";
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD || "password";
const NEO4J_DATABASE = process.env.NEO4J_DATABASE || "neo4j";

// Only create a driver when both URI and password are configured
const NEO4J_CONFIGURED =
    !!process.env.NEO4J_URI &&
    !!process.env.NEO4J_PASSWORD;

let _driver = null;

function getDriver() {
    if (!NEO4J_CONFIGURED) return null;
    if (!_driver) {
        _driver = neo4j.driver(
            NEO4J_URI,
            neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD),
            {
                maxConnectionLifetime: 3 * 60 * 60 * 1000, // 3 hrs
                maxConnectionPoolSize: 10,
                connectionAcquisitionTimeout: 30_000,
                disableLosslessIntegers: true, // JS numbers instead of neo4j.Integer
            }
        );
    }
    return _driver;
}

export async function closeNeo4jDriver() {
    if (_driver) {
        await _driver.close();
        _driver = null;
    }
}

// ─── Query helper ─────────────────────────────────────────────────────────────

async function runQuery(cypher, params = {}) {
    const driver = getDriver();
    if (!driver) return [];
    const session = driver.session({ database: NEO4J_DATABASE });
    try {
        const result = await session.run(cypher, params);
        return result.records;
    } finally {
        await session.close();
    }
}

/** Safely get a property from a Neo4j record; returns null if absent. */
function safe(record, key) {
    try { return record.get(key); } catch { return null; }
}

/** Escape special regex chars so the string is safe inside Cypher regex */
function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ─── Individual query functions (run in parallel) ─────────────────────────────

async function fetchCirculars(kw) {
    const records = await runQuery(`
    MATCH (c:Circular)
    WHERE c.title          =~ $kw
       OR c.topic          =~ $kw
       OR c.summary        =~ $kw
       OR c.circular_number =~ $kw
       OR c.id             =~ $kw
    RETURN c.id              AS id,
           c.title           AS title,
           c.circular_number AS num,
           c.date            AS date,
           c.topic           AS topic,
           c.summary         AS summary
    ORDER BY c.date DESC
    LIMIT 5
  `, { kw });

    return records.map(r => ({
        type: "Circular",
        id: safe(r, "id"),
        title: safe(r, "title"),
        num: safe(r, "num"),
        date: safe(r, "date"),
        topic: safe(r, "topic"),
        summary: safe(r, "summary"),
    }));
}

async function fetchObligations(kw) {
    const records = await runQuery(`
    MATCH (c:Circular)-[:HAS_OBLIGATION]->(o:Obligation)
    WHERE o.plain_english =~ $kw
       OR o.text          =~ $kw
       OR o.summary       =~ $kw
    RETURN c.id             AS circular,
           c.title          AS circularTitle,
           o.plain_english  AS obligation,
           o.frequency      AS frequency,
           o.deadline_days  AS deadline,
           o.applicable_to  AS appliesTo,
           o.source_clause  AS clause
    ORDER BY c.id
    LIMIT 8
  `, { kw });

    return records.map(r => ({
        type: "Obligation",
        circular: safe(r, "circular"),
        circularTitle: safe(r, "circularTitle"),
        obligation: safe(r, "obligation"),
        frequency: safe(r, "frequency"),
        deadline: safe(r, "deadline"),
        appliesTo: safe(r, "appliesTo"),
        clause: safe(r, "clause"),
    }));
}

async function fetchProhibitions(kw) {
    const records = await runQuery(`
    MATCH (c:Circular)-[:HAS_PROHIBITION]->(p:Prohibition)
    WHERE p.plain_english =~ $kw
       OR p.text          =~ $kw
    RETURN c.id             AS circular,
           c.title          AS circularTitle,
           p.plain_english  AS prohibition,
           p.source_clause  AS clause
    ORDER BY c.id
    LIMIT 8
  `, { kw });

    return records.map(r => ({
        type: "Prohibition",
        circular: safe(r, "circular"),
        circularTitle: safe(r, "circularTitle"),
        prohibition: safe(r, "prohibition"),
        clause: safe(r, "clause"),
    }));
}

async function fetchPenalties(kw) {
    const records = await runQuery(`
    MATCH (c:Circular)-[:HAS_PENALTY]->(p:Penalty)
    WHERE p.condition =~ $kw
       OR p.amount    =~ $kw
       OR p.text      =~ $kw
    RETURN c.id        AS circular,
           c.title     AS circularTitle,
           p.amount    AS amount,
           p.condition AS condition,
           p.section   AS section
    ORDER BY c.id
    LIMIT 8
  `, { kw });

    return records.map(r => ({
        type: "Penalty",
        circular: safe(r, "circular"),
        circularTitle: safe(r, "circularTitle"),
        amount: safe(r, "amount"),
        condition: safe(r, "condition"),
        section: safe(r, "section"),
    }));
}

async function fetchDefinitions(kw) {
    const records = await runQuery(`
    MATCH (c:Circular)-[:DEFINES]->(d:Definition)
    WHERE d.term          =~ $kw
       OR d.plain_english =~ $kw
       OR d.definition    =~ $kw
    RETURN c.id             AS circular,
           d.term           AS term,
           d.plain_english  AS definition
    ORDER BY d.term
    LIMIT 8
  `, { kw });

    return records.map(r => ({
        type: "Definition",
        circular: safe(r, "circular"),
        term: safe(r, "term"),
        definition: safe(r, "definition"),
    }));
}

async function fetchCrossRefs(kw) {
    const records = await runQuery(`
    MATCH (src:Circular)-[r:REFERENCES]->(tgt:Circular)
    WHERE src.id    =~ $kw
       OR tgt.id    =~ $kw
       OR src.title =~ $kw
       OR tgt.title =~ $kw
    RETURN src.id         AS from,
           r.relationship AS relationship,
           tgt.id         AS to,
           tgt.title      AS toTitle
    LIMIT 8
  `, { kw });

    return records.map(r => ({
        type: "CrossReference",
        from: safe(r, "from"),
        relationship: safe(r, "relationship"),
        to: safe(r, "to"),
        toTitle: safe(r, "toTitle"),
    }));
}

/**
 * Broadest fallback — full-text scan across every content-bearing node type.
 * Used when none of the targeted queries return results.
 */
async function fetchBroadKeyword(kw) {
    const records = await runQuery(`
    MATCH (n)
    WHERE any(label IN labels(n)
              WHERE label IN ['Obligation','Prohibition','Clause',
                              'Definition','Penalty','Circular'])
      AND ( n.text          =~ $kw
         OR n.plain_english =~ $kw
         OR n.definition    =~ $kw
         OR n.summary       =~ $kw
         OR n.title         =~ $kw
         OR n.topic         =~ $kw
         OR n.condition     =~ $kw )
    OPTIONAL MATCH (c:Circular)-[]->(n)
    RETURN labels(n)[0]  AS nodeType,
           coalesce(n.plain_english, n.summary, n.definition,
                    n.title, n.text, n.condition)   AS snippet,
           coalesce(c.id, n.id)                      AS source,
           coalesce(c.title, n.title)                AS sourceTitle
    LIMIT 12
  `, { kw });

    return records.map(r => ({
        type: safe(r, "nodeType"),
        snippet: safe(r, "snippet"),
        source: safe(r, "source"),
        sourceTitle: safe(r, "sourceTitle"),
    }));
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Always queries all relevant node types in the RBI knowledge graph in
 * parallel and returns a unified context block + raw node list.
 *
 * @param {string} query  The user's natural-language question
 * @returns {{ context: string, nodes: Object[], intent: string }}
 */
export async function searchKnowledgeGraph(query) {
    if (!query || typeof query !== "string" || query.trim().length === 0) {
        return { context: "", nodes: [], intent: "none" };
    }

    if (!NEO4J_CONFIGURED) {
        console.warn("[GraphRAG] Neo4j not configured — skipping graph search");
        return { context: "", nodes: [], intent: "unconfigured" };
    }

    const kw = `(?i).*${escapeRegex(query.trim())}.*`;
    console.log(`[GraphRAG] Running parallel graph queries (kw pattern: ${kw.slice(0, 60)}…)`);

    // Fan-out across all node types simultaneously
    const [circulars, obligations, prohibitions, penalties, definitions, crossRefs] =
        await Promise.all([
            fetchCirculars(kw).catch(e => { console.warn("[GraphRAG] circulars:", e.message); return []; }),
            fetchObligations(kw).catch(e => { console.warn("[GraphRAG] obligations:", e.message); return []; }),
            fetchProhibitions(kw).catch(e => { console.warn("[GraphRAG] prohibitions:", e.message); return []; }),
            fetchPenalties(kw).catch(e => { console.warn("[GraphRAG] penalties:", e.message); return []; }),
            fetchDefinitions(kw).catch(e => { console.warn("[GraphRAG] definitions:", e.message); return []; }),
            fetchCrossRefs(kw).catch(e => { console.warn("[GraphRAG] crossrefs:", e.message); return []; }),
        ]);

    let nodes = [...circulars, ...obligations, ...prohibitions, ...penalties, ...definitions, ...crossRefs];
    let intent = "parallel-all";

    // If nothing matched, fall back to broad full-text sweep
    if (nodes.length === 0) {
        console.log("[GraphRAG] No targeted results — running broad keyword sweep");
        nodes = await fetchBroadKeyword(kw).catch(e => {
            console.warn("[GraphRAG] broad keyword:", e.message);
            return [];
        });
        intent = "broad-keyword";
    }

    if (nodes.length === 0) {
        return { context: "", nodes: [], intent };
    }

    // ── Build the context block injected into Gemini's prompt ─────────────────
    const lines = [
        "=== RBI KNOWLEDGE GRAPH CONTEXT ===",
        `(${nodes.length} record(s) retrieved from the RBI Neo4j knowledge graph)\n`,
    ];

    for (const node of nodes) {
        switch (node.type) {

            case "Circular":
                lines.push(
                    `[CIRCULAR] ${node.id} — "${node.title}"`,
                    `  Circular No. : ${node.num ?? "—"}`,
                    `  Issued       : ${node.date ?? "—"}`,
                    `  Topic        : ${node.topic ?? "—"}`,
                    node.summary ? `  Summary      : ${node.summary}` : null,
                    ""
                );
                break;

            case "Obligation":
                lines.push(
                    `[OBLIGATION] Source: ${node.circular} — "${node.circularTitle ?? ""}" §${node.clause ?? "—"}`,
                    `  Applies to  : ${Array.isArray(node.appliesTo) ? node.appliesTo.join(", ") : (node.appliesTo ?? "all entities")}`,
                    `  Frequency   : ${node.frequency ?? "—"}`,
                    node.deadline ? `  Deadline    : within ${node.deadline} days` : null,
                    `  Requirement : ${node.obligation}`,
                    ""
                );
                break;

            case "Prohibition":
                lines.push(
                    `[PROHIBITION] Source: ${node.circular} — "${node.circularTitle ?? ""}" §${node.clause ?? "—"}`,
                    `  NOT ALLOWED : ${node.prohibition}`,
                    ""
                );
                break;

            case "Penalty":
                lines.push(
                    `[PENALTY] Source: ${node.circular} — "${node.circularTitle ?? ""}" §${node.section ?? "—"}`,
                    `  Amount    : ${node.amount}`,
                    `  Condition : ${node.condition}`,
                    ""
                );
                break;

            case "Definition":
                lines.push(
                    `[DEFINITION] Term: "${node.term}" — Source: ${node.circular}`,
                    `  Meaning : ${node.definition}`,
                    ""
                );
                break;

            case "CrossReference":
                lines.push(
                    `[CROSS-REFERENCE] ${node.from} —[${node.relationship ?? "references"}]→ ${node.to} "${node.toTitle ?? ""}"`,
                    ""
                );
                break;

            default:
                lines.push(
                    `[${node.type ?? "NODE"}] Source: ${node.source ?? node.sourceTitle ?? "—"}`,
                    `  ${node.snippet ?? ""}`,
                    ""
                );
        }
    }

    lines.push("=== END OF KNOWLEDGE GRAPH CONTEXT ===");
    const context = lines.filter(l => l != null).join("\n");

    console.log(`[GraphRAG] Context block ready: ${context.length} chars, ${nodes.length} nodes (intent: ${intent})`);
    return { context, nodes, intent };
}
