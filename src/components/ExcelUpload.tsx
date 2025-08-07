import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Download
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface UploadResult {
  success: boolean;
  message: string;
  processedRows: number;
  errors: string[];
}

const ExcelUpload: React.FC = () => {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const { toast } = useToast();

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
    const excelFile = files.find(file => {
      const ext = file.name.split('.').pop()?.toLowerCase();
      const allowedExtensions = ['xlsx', 'xls'];
      const allowedMimeTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
      ];
      return (
        (file.type && allowedMimeTypes.includes(file.type)) ||
        (ext && allowedExtensions.includes(ext))
      );
    });
    if (excelFile) {
      if (excelFile.size > 10 * 1024 * 1024) { // 10MB limit
        toast({
          title: "File too large",
          description: "Maximum file size allowed is 10MB.",
          variant: "destructive",
        });
        return;
      }
      setSelectedFile(excelFile);
      setUploadResult(null);
    } else {
      toast({
        title: "Invalid File Type",
        description: "Please select a valid Excel file (.xlsx or .xls)",
        variant: "destructive",
      });
    }
  }, [toast]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setUploadResult(null);
    }
  };

  const handleUpload = () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadProgress(0);
    setUploadResult(null);

    const formData = new FormData();
    formData.append('file', selectedFile);

    const xhr = new XMLHttpRequest();

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percentComplete = Math.round((event.loaded / event.total) * 100);
        setUploadProgress(percentComplete);
      }
    };

    xhr.onload = () => {
      setIsUploading(false);
      setUploadProgress(0);

      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const result: UploadResult = JSON.parse(xhr.responseText);

          setUploadResult(result);

          if (result.success) {
            toast({
              title: "Upload Successful",
              description: `${result.processedRows} employees processed successfully`,
            });
          } else {
            toast({
              title: "Upload Completed with Warnings",
              description: result.message,
              variant: "destructive",
            });
          }
        } catch (err) {
          toast({
            title: "Upload Error",
            description: "Could not parse server response.",
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Upload Failed",
          description: `Server responded with status ${xhr.status}`,
          variant: "destructive",
        });
      }
    };

    xhr.onerror = () => {
      setIsUploading(false);
      setUploadProgress(0);
      setUploadResult({
        success: false,
        message: 'Upload failed due to network error.',
        processedRows: 0,
        errors: ['Network error']
      });
      toast({
        title: "Upload Error",
        description: "Network error occurred during upload. Please try again.",
        variant: "destructive",
      });
    };

    xhr.open('POST', '/api/employees/upload');
    xhr.send(formData);
  };

  const downloadTemplate = () => {
    toast({
      title: "Template Download",
      description: "Excel template download started",
    });

    const link = document.createElement('a');
    link.href = './template_data.xlsx';
    link.download = 'template_data.xlsx';
    link.click();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Upload className="h-5 w-5" />
            <span>Bulk Employee Upload</span>
          </CardTitle>
          <CardDescription>
            Upload an Excel file to add or update multiple employee records at once
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Template Download */}
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div>
              <h4 className="font-medium">Need a template?</h4>
              <p className="text-sm text-muted-foreground">
                Download our Excel template with the correct format and required columns
              </p>
            </div>
            <Button variant="outline" onClick={downloadTemplate}>
              <Download className="mr-2 h-4 w-4" />
              Download Template
            </Button>
          </div>

          {/* File Upload Area */}
          <div
            className={`
              border-2 border-dashed rounded-lg p-8 text-center transition-colors
              ${isDragging ? 'border-primary bg-primary/5' : 'border-border'}
              ${selectedFile ? 'border-success bg-success/5' : ''}
            `}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {selectedFile ? (
              <div className="space-y-4">
                <FileSpreadsheet className="mx-auto h-12 w-12 text-success" />
                <div>
                  <p className="font-medium">{selectedFile.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                <div className="flex justify-center space-x-2">
                  <Button onClick={handleUpload} disabled={isUploading}>
                    {isUploading ? 'Processing...' : 'Upload File'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setSelectedFile(null)}
                    disabled={isUploading}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
                <div>
                  <p className="text-lg font-medium">Drop your Excel file here</p>
                  <p className="text-muted-foreground">or click to browse</p>
                </div>
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload">
                  <Button variant="outline" asChild>
                    <span>Choose File</span>
                  </Button>
                </label>
              </div>
            )}
          </div>

          {/* Upload Progress */}
          {isUploading && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Processing file...</span>
                <span>{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} className="w-full" />
            </div>
          )}

          {/* Upload Results */}
          {uploadResult && (
            <Alert variant={uploadResult.success ? "default" : "destructive"}>
              <div className="flex items-start space-x-2">
                {uploadResult.success ? (
                  <CheckCircle className="h-4 w-4 text-success mt-0.5" />
                ) : (
                  <XCircle className="h-4 w-4 mt-0.5" />
                )}
                <div className="flex-1 space-y-2">
                  <AlertDescription className="font-medium">
                    {uploadResult.message}
                  </AlertDescription>

                  {uploadResult.success && (
                    <div className="flex items-center space-x-4">
                      <Badge variant="secondary">
                        {uploadResult.processedRows} rows processed
                      </Badge>
                      {uploadResult.errors.length > 0 && (
                        <Badge variant="outline" className="border-warning text-warning">
                          {uploadResult.errors.length} warnings
                        </Badge>
                      )}
                    </div>
                  )}

                  {uploadResult.errors.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-sm font-medium flex items-center">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Issues found:
                      </p>
                      <ul className="text-sm space-y-1">
                        {uploadResult.errors.map((error, index) => (
                          <li key={index} className="text-muted-foreground">
                            • {error}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </Alert>
          )}

          {/* Requirements */}
          <div className="text-sm text-muted-foreground space-y-2">
            <h4 className="font-medium text-foreground">File Requirements:</h4>
            <ul className="space-y-1 ml-4">
              <li>• Excel format (.xlsx or .xls)</li>
              <li>• Maximum file size: 10MB</li>
              <li>• First row must contain column headers</li>
              <li>• Required columns: Employee ID</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ExcelUpload;