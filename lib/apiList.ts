/**
 * Parses the json-server style list query params that @refinedev/simple-rest
 * sends (`_start`, `_end`, `_sort`, `_order`) into Prisma-friendly
 * skip/take/orderBy options.
 */
export function parseListQuery(searchParams: URLSearchParams) {
  const startParam = searchParams.get("_start");
  const endParam = searchParams.get("_end");
  const start = startParam !== null ? Number(startParam) : undefined;
  const end = endParam !== null ? Number(endParam) : undefined;

  const sortFields = (searchParams.get("_sort") ?? "").split(",").filter(Boolean);
  const orderDirs = (searchParams.get("_order") ?? "").split(",").filter(Boolean);

  const orderBy = sortFields.map((field, index) => ({
    [field]: (orderDirs[index] ?? "asc").toLowerCase() === "desc" ? "desc" : "asc",
  }));

  return {
    skip: start,
    take: start !== undefined && end !== undefined ? end - start : undefined,
    orderBy: orderBy.length > 0 ? orderBy : undefined,
  };
}

/** Builds a NextResponse-ready init object with the X-Total-Count header. */
export function listHeaders(total: number): HeadersInit {
  return {
    "X-Total-Count": String(total),
    "Access-Control-Expose-Headers": "X-Total-Count",
  };
}
