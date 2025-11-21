import { useState, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ImageIcon, Upload, RefreshCw, X, Copy, Download } from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { useSchema } from '@/context/SchemaContext';

export const ImageSchemaUploader = () => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [generatedSchema, setGeneratedSchema] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { setSchemaText } = useSchema();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      toast.error('Image size must be less than 10MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setSelectedImage(event.target?.result as string);
      setGeneratedSchema('');
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setSelectedImage(event.target?.result as string);
        setGeneratedSchema('');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleExtractSchema = async () => {
    if (!selectedImage) {
      toast.error('Please select an image first');
      return;
    }

    setIsProcessing(true);
    try {
      const result = await api.imageToSchema(selectedImage);
      setGeneratedSchema(result.schema);
      toast.success('Schema extracted successfully');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to extract schema');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApplySchema = () => {
    setSchemaText(generatedSchema);
    toast.success('Schema applied to builder');
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedSchema);
    toast.success('Schema copied to clipboard');
  };

  const handleDownload = () => {
    const blob = new Blob([generatedSchema], { type: 'text/sql' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'schema-from-image.sql';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Schema downloaded');
  };

  const handleClear = () => {
    setSelectedImage(null);
    setGeneratedSchema('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Card className="p-4">
      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
        <ImageIcon className="w-4 h-4" />
        Image to Schema
      </h3>

      <div className="space-y-3">
        {/* Upload Area */}
        {!selectedImage ? (
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
          >
            <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Drop ERD/diagram image here or click to upload
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              PNG, JPG up to 10MB
            </p>
          </div>
        ) : (
          <div className="relative">
            <img
              src={selectedImage}
              alt="Uploaded diagram"
              className="w-full h-40 object-contain rounded-lg bg-muted"
            />
            <Button
              variant="destructive"
              size="sm"
              className="absolute top-2 right-2 h-6 w-6 p-0"
              onClick={handleClear}
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />

        {selectedImage && (
          <Button
            onClick={handleExtractSchema}
            disabled={isProcessing}
            className="w-full"
          >
            {isProcessing ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <ImageIcon className="w-4 h-4 mr-2" />
            )}
            Extract Schema
          </Button>
        )}

        {/* Generated Schema */}
        {generatedSchema && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Extracted Schema</span>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={handleCopy}>
                  <Copy className="w-3 h-3" />
                </Button>
                <Button variant="ghost" size="sm" onClick={handleDownload}>
                  <Download className="w-3 h-3" />
                </Button>
                <Button variant="secondary" size="sm" onClick={handleApplySchema}>
                  Apply
                </Button>
              </div>
            </div>
            <div className="code-bg rounded-lg p-3 max-h-[200px] overflow-auto">
              <pre className="text-xs font-mono">
                {generatedSchema}
              </pre>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};
