import dbClient from "../config/dbClient.js";

const allowedStatuses = new Set(["new", "in_progress", "resolved", "dismissed"]);

function toArrayOfStrings(value) {
    if (!Array.isArray(value)) {
        return null;
    }
    return value.map((item) => String(item).trim()).filter((item) => item.length > 0) || null;
}

function ensureObject(value) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
        return value;
    }
    return {};
}

function validationError(message) {
    const error = new Error(message);
    error.statusCode = 400;
    return error;
}

function normalizeUuidOrNull(value) {
    if (!value) return null;
    return String(value).trim() || null;
}

export async function createFeedbackEntry(input) {
    const {
        title,
        message,
        url,
        sourceUrl,
        userId,
        conversationId,
        email,
        image
    } = input ?? {};

    if (!title?.trim()) {
        throw validationError("Title is required");
    }

    const cleanedMessage = typeof message === "string" && message.trim().length > 0 ? message.trim() : null;
    const rawUrl = typeof sourceUrl === "string" && sourceUrl.trim().length > 0
        ? sourceUrl
        : typeof url === "string" && url.trim().length > 0
            ? url
            : null;

    const userUuid = normalizeUuidOrNull(userId);
    const conversationUuid = normalizeUuidOrNull(conversationId);

    const payload = {
        title: title.trim(),
        message: cleanedMessage,
        source_url: rawUrl,
        email: email ?? null,
        image_url: image ?? null,
        ...(userUuid ? { user_id: userUuid } : {}),
        ...(conversationUuid ? { conversation_id: conversationUuid } : {}),
    };

    const { data, error } = await dbClient.from("feedback").insert(payload).select().single();
    if (error) {
        const dbError = new Error(error.message);
        dbError.statusCode = 500;
        throw dbError;
    }

    return data;
}

export async function listFeedbackEntries(filters = {}) {
    const {
        userId,
        sessionId,
        conversationId,
        limit
    } = filters ?? {};

   

    let query = dbClient.from("feedback").select("*").order("created_at", { ascending: false });

    if (userId) {
        query = query.eq("user_id", userId);
    }
    if (sessionId) {
        query = query.eq("session_id", sessionId);
    }
    if (conversationId) {
        query = query.eq("conversation_id", conversationId);
    }
    if (Number.isInteger(limit) && limit > 0) {
        query = query.limit(limit);
    }

    const { data, error } = await query;
    if (error) {
        const dbError = new Error(error.message);
        dbError.statusCode = 500;
        throw dbError;
    }
    console.log(data);
    return data ?? [];
}

export { allowedStatuses };
