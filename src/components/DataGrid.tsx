import { useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry, themeQuartz } from 'ag-grid-community';
import type { GridReadyEvent } from 'ag-grid-community';

// Register all Community features
ModuleRegistry.registerModules([AllCommunityModule]);

interface DataGridProps {
    schema: { name: string; type: string }[];
    onGridReady?: (params: GridReadyEvent) => void;
}

export function DataGrid({ schema, onGridReady }: DataGridProps) {
    const colDefs = useMemo(() => {
        if (!schema || schema.length === 0) return [];
        return schema.map((col) => {
            const isTimestamp = col.type.includes('TIMESTAMP') || col.name.endsWith('_time') || col.name.endsWith('Time') || col.name.endsWith('_date') || col.name === 'date';

            return {
                field: col.name,
                headerName: col.name,
                filter: 'agTextColumnFilter', // Enable text filter by default for all columns in infinite mode
                sortable: true,
                flex: 1,
                minWidth: 150,
                valueFormatter: isTimestamp ? (params: any) => {
                    if (!params.value) return '';
                    let val = Number(params.value);
                    if (val > 10000000000000) {
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
        filterParams: {
            buttons: ['apply', 'clear'],
        }
    }), []);

    return (
        <div className="h-[600px] w-full bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden shadow-inner flex flex-col">
            {/* Custom Overlay for empty state if needed, but AgGrid has its own. 
               For now relying on AgGrid's infinite loader visual. 
           */}
            <AgGridReact
                columnDefs={colDefs}
                defaultColDef={defaultColDef}
                theme={themeQuartz}
                className="h-full w-full"

                // Infinite Row Model Settings
                rowModelType="infinite"
                cacheBlockSize={100}
                maxBlocksInCache={20}
                infiniteInitialRowCount={100}

                onGridReady={onGridReady}
            />
        </div>
    );
}
