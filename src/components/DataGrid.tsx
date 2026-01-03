import { useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry, themeQuartz } from 'ag-grid-community';

// Register all Community features
ModuleRegistry.registerModules([AllCommunityModule]);

interface DataGridProps {
    rowData: any[];
    schema: { name: string; type: string }[];
    emptyMessage?: string;
    emptySubMessage?: string;
}

export function DataGrid({ rowData, schema, emptyMessage = "No data to display.", emptySubMessage }: DataGridProps) {
    const colDefs = useMemo(() => {
        if (!schema || schema.length === 0) return [];
        return schema.map((col) => {
            const isTimestamp = col.type.includes('TIMESTAMP') || col.name.endsWith('_time') || col.name.endsWith('Time') || col.name.endsWith('_date') || col.name === 'date';

            return {
                field: col.name,
                headerName: col.name,
                filter: true,
                sortable: true,
                flex: 1,
                minWidth: 150,
                valueFormatter: isTimestamp ? (params: any) => {
                    if (!params.value) return '';
                    // Handle microsecond timestamps (19 digits) vs millisecond (13 digits)
                    let val = Number(params.value);

                    // If reasonable year (e.g. > 1971) when treated as seconds, milliseconds, or microseconds
                    // Simple heuristic: if > 1e16 (microseconds for recent dates), divide by 1000
                    // If DuckDB returns bigints for micros:
                    if (val > 10000000000000) { // e.g. 1767155612954000 (micros)
                        val = val / 1000;
                    }

                    try {
                        return new Date(val).toLocaleString('en-US', { timeZone: 'America/New_York', hour12: false }) + ' ET';
                    } catch (e) {
                        return params.value;
                    }
                } : undefined
            };
        });
    }, [schema]);

    const defaultColDef = useMemo(() => ({
        resizable: true,
    }), []);

    if (!rowData || rowData.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-zinc-500 border border-zinc-800 rounded-lg bg-zinc-900/50 h-[400px]">
                <p className="text-lg font-medium text-zinc-400">{emptyMessage}</p>
                {emptySubMessage && (
                    <p className="mt-2 text-sm text-zinc-500 max-w-md text-center">{emptySubMessage}</p>
                )}
            </div>
        )
    }

    return (
        <div className="h-[600px] w-full bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden shadow-inner">
            <AgGridReact
                rowData={rowData}
                columnDefs={colDefs}
                defaultColDef={defaultColDef}
                theme={themeQuartz}
                className="h-full w-full"
            />
        </div>
    );
}
