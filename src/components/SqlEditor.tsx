import { useState } from 'react';
import { Play } from 'lucide-react';

interface SqlEditorProps {
    onRunQuery: (query: string) => void;
    isLoading: boolean;
}

export function SqlEditor({ onRunQuery, isLoading }: SqlEditorProps) {
    const [query, setQuery] = useState("SELECT * FROM parquet_file LIMIT 100");

    const handleRun = () => {
        onRunQuery(query);
    };

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-300">SQL Query</label>
                <button
                    onClick={handleRun}
                    disabled={isLoading}
                    className="flex items-center space-x-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    <Play className="w-3 h-3 fill-current" />
                    <span>{isLoading ? 'Running...' : 'Run Query'}</span>
                </button>
            </div>
            <textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full h-32 bg-zinc-950 border border-zinc-700 rounded-lg p-3 text-sm font-mono text-zinc-200 focus:outline-none focus:border-blue-500 transition-colors resize-y placeholder-zinc-600"
                spellCheck={false}
            />
            <p className="text-xs text-zinc-500">
                The table is available as <code className="text-blue-400">parquet_file</code>.
            </p>
        </div>
    );
}
