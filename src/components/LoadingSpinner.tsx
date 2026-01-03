import { Loader2 } from 'lucide-react';

export function LoadingSpinner() {
    return (
        <div className="flex items-center justify-center space-x-2 text-blue-400">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm font-medium">Processing...</span>
        </div>
    );
}
