// Validation helpers. Each returns { error } (a message string) or { value }.

const ALLOWED_ORDER_BY = ["id", "title", "author", "price"];

function validateBookBody(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { error: "Request body must be a JSON object" };
  }
  const { title, author, price } = body;

  if (typeof title !== "string" || title.trim() === "") {
    return { error: "title is required and must be a non-empty string" };
  }
  if (typeof author !== "string" || author.trim() === "") {
    return { error: "author is required and must be a non-empty string" };
  }
  if (price === undefined || price === null || price === "") {
    return { error: "price is required" };
  }
  // Reject strings like "abc", booleans, arrays; accept numbers and numeric strings
  const numericPrice = typeof price === "number" ? price : Number(price);
  if (typeof price === "boolean" || Array.isArray(price) || !Number.isFinite(numericPrice)) {
    return { error: "price must be a number" };
  }
  if (numericPrice < 0) {
    return { error: "price must not be negative" };
  }
  return { value: { title: title.trim(), author: author.trim(), price: numericPrice } };
}

function parseId(raw) {
  if (!/^\d+$/.test(String(raw)) || Number(raw) < 1) {
    return { error: "id must be a positive integer" };
  }
  return { value: Number(raw) };
}

function parseNonNegativeInt(raw, name, fallback, max) {
  if (raw === undefined) return { value: fallback };
  if (!/^\d+$/.test(String(raw))) {
    return { error: `${name} must be a non-negative integer` };
  }
  let n = Number(raw);
  if (max !== undefined && n > max) n = max;
  return { value: n };
}

function parsePrice(raw, name) {
  if (raw === undefined) return { value: undefined };
  const n = Number(raw);
  if (String(raw).trim() === "" || !Number.isFinite(n)) {
    return { error: `${name} must be a number` };
  }
  return { value: n };
}

// Validates and normalises all GET /books query parameters, applying defaults.
function parseListQuery(query) {
  const out = {};

  out.search_q = typeof query.search_q === "string" ? query.search_q.trim() : "";

  const orderBy = query.order_by === undefined ? "id" : String(query.order_by).toLowerCase();
  if (!ALLOWED_ORDER_BY.includes(orderBy)) {
    return { error: `order_by must be one of: ${ALLOWED_ORDER_BY.join(", ")}` };
  }
  out.order_by = orderBy;

  const order = query.order === undefined ? "ASC" : String(query.order).toUpperCase();
  if (order !== "ASC" && order !== "DESC") {
    return { error: "order must be ASC or DESC" };
  }
  out.order = order;

  const limit = parseNonNegativeInt(query.limit, "limit", 10, 100);
  if (limit.error) return limit;
  if (limit.value < 1) return { error: "limit must be at least 1" };
  out.limit = limit.value;

  const offset = parseNonNegativeInt(query.offset, "offset", 0);
  if (offset.error) return offset;
  out.offset = offset.value;

  const min = parsePrice(query.min_price, "min_price");
  if (min.error) return min;
  const max = parsePrice(query.max_price, "max_price");
  if (max.error) return max;
  if (min.value !== undefined && max.value !== undefined && min.value > max.value) {
    return { error: "min_price must not be greater than max_price" };
  }
  out.min_price = min.value;
  out.max_price = max.value;

  return { value: out };
}

module.exports = { validateBookBody, parseId, parseListQuery, ALLOWED_ORDER_BY };
