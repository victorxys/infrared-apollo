import React, { useState, useCallback } from 'react';
import { UploadCloud, FileType } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface DropZoneProps {
    onFileSelect: (file: File) => void;
    className?: string;
}

export function DropZone({ onFileSelect, className }: DropZoneProps) {
    const [isDragging, setIsDragging] = useState(false);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        const files = Array.from(e.dataTransfer.files);
        const parquetFile = files.find(f => f.name.endsWith('.parquet') || f.name.endsWith('.parquet'));

        if (parquetFile) {
            onFileSelect(parquetFile);
        } else {
            alert("Please upload a .parquet file");
        }
    }, [onFileSelect]);

    const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files[0]) {
            if (files[0].name.endsWith('.parquet')) {
                onFileSelect(files[0]);
            } else {
                alert("Please upload a .parquet file");
            }
        }
    }, [onFileSelect]);

    return (
        <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={twMerge(
                clsx(
                    "relative border-2 border-dashed rounded-lg p-12 text-center transition-colors cursor-pointer bg-zinc-900/30",
                    isDragging ? "border-blue-500 bg-blue-500/10" : "border-zinc-700 hover:border-zinc-500",
                    className
                )
            )}
        >
            <input
                type="file"
                accept=".parquet"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                onChange={handleFileInput}
            />
            <div className="flex flex-col items-center justify-center space-y-4 pointer-events-none">
                <div className="bg-zinc-800 p-4 rounded-full border border-zinc-700">
                    <UploadCloud className="w-10 h-10 text-blue-400" />
                </div>
                <div>
                    <p className="text-lg font-medium text-zinc-100">
                        Drag & Drop your Parquet file here
                    </p>
                    <p className="text-sm text-zinc-500 mt-1">
                        or click to browse
                    </p>
                </div>
                <div className="flex items-center space-x-2 text-xs text-zinc-500 border border-zinc-700 rounded-full px-3 py-1 bg-zinc-900/50">
                    <FileType className="w-3 h-3" />
                    <span>Supports .parquet files</span>
                </div>
            </div>
        </div>
    );
}
