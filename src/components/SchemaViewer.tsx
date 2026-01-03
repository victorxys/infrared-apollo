import { Table } from 'lucide-react';

interface SchemaItem {
    name: string;
    type: string;
}

interface SchemaViewerProps {
    schema: SchemaItem[];
}

export function SchemaViewer({ schema }: SchemaViewerProps) {
    if (!schema.length) return null;

    return (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden flex flex-col h-[300px]">
            <div className="px-4 py-3 border-b border-zinc-800 bg-zinc-900/50 flex items-center space-x-2">
                <Table className="w-4 h-4 text-blue-400" />
                <h3 className="font-medium text-sm text-zinc-200">Schema</h3>
            </div>
            <div className="overflow-auto flex-1 custom-scrollbar">
                <table className="w-full text-left text-sm">
                    <thead className="bg-zinc-950 text-xs uppercase text-zinc-500 font-medium sticky top-0">
                        <tr>
                            <th className="px-4 py-2 bg-zinc-950">Column Name</th>
                            <th className="px-4 py-2 bg-zinc-950">Data Type</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800">
                        {schema.map((col) => (
                            <tr key={col.name} className="hover:bg-white/5 transition-colors">
                                <td className="px-4 py-2 font-mono text-blue-300 text-xs">{col.name}</td>
                                <td className="px-4 py-2 text-zinc-400 text-xs">{col.type}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
