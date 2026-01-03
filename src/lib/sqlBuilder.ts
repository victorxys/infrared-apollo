
export function buildSql(
    tableName: string,
    request: any
): { query: string; countQuery: string } {
    const { startRow, endRow, sortModel, filterModel } = request;

    let whereClauses: string[] = [];

    // 1. Handle Filters
    Object.keys(filterModel).forEach((key) => {
        const item = filterModel[key];
        // Handle simple text filter
        if (item.filterType === 'text') {
            const val = item.filter.replace(/'/g, "''"); // Escape single quotes
            const col = `"${key}"`; // Quote column name

            if (item.type === 'contains') {
                whereClauses.push(`${col} ILIKE '%${val}%'`);
            } else if (item.type === 'notContains') {
                whereClauses.push(`${col} NOT ILIKE '%${val}%'`);
            } else if (item.type === 'equals') {
                whereClauses.push(`${col} = '${val}'`);
            } else if (item.type === 'notEqual') {
                whereClauses.push(`${col} != '${val}'`);
            } else if (item.type === 'startsWith') {
                whereClauses.push(`${col} ILIKE '${val}%'`);
            } else if (item.type === 'endsWith') {
                whereClauses.push(`${col} ILIKE '%${val}'`);
            }
        }
        // Handle number filter
        else if (item.filterType === 'number') {
            const val = item.filter;
            const col = `"${key}"`;
            if (item.type === 'equals') {
                whereClauses.push(`${col} = ${val}`);
            } else if (item.type === 'notEqual') {
                whereClauses.push(`${col} != ${val}`);
            } else if (item.type === 'greaterThan') {
                whereClauses.push(`${col} > ${val}`);
            } else if (item.type === 'lessThan') {
                whereClauses.push(`${col} < ${val}`);
            } else if (item.type === 'greaterThanOrEqual') {
                whereClauses.push(`${col} >= ${val}`);
            } else if (item.type === 'lessThanOrEqual') {
                whereClauses.push(`${col} <= ${val}`);
            }
        }
        // Basic handling for other types can be added here
    });

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // 2. Handle Sorting
    let validSortModel = sortModel.filter((s: any) => s.sort === 'asc' || s.sort === 'desc');
    const orderBySql = validSortModel.length > 0
        ? `ORDER BY ${validSortModel.map((s: any) => `"${s.colId}" ${s.sort.toUpperCase()}`).join(', ')}`
        : '';

    // 3. Construct Final Queries
    const limit = endRow - startRow;
    const offset = startRow;

    const query = `SELECT * FROM ${tableName} ${whereSql} ${orderBySql} LIMIT ${limit} OFFSET ${offset}`;
    const countQuery = `SELECT COUNT(*) as total FROM ${tableName} ${whereSql}`;

    return { query, countQuery };
}
