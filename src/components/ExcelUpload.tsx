import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell, TableCaption } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
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
  processedRows?: number;
  errors?: string[];
  warnings?: string[];
  summary?: { rows: number; processedRows: number; errors: number; warnings: number };
  logUrl?: string | null;
  logCsvUrl?: string | null;
  rowErrors?: { rowNumber: number; column: string; message: string }[];
  headerValidation?: { ok: boolean; missing: string[]; extra: string[]; orderMismatch?: { expectedIndex: number; expectedHeader: string; actualIndex: number }[] };
}

const ExcelUpload: React.FC = () => {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [profile, setProfile] = useState<string>('indonesia_active');
  const [onDuplicate, setOnDuplicate] = useState<string>('update');
  const [lastLogUrl, setLastLogUrl] = useState<string | null>(null);
  const [lastLogCsvUrl, setLastLogCsvUrl] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [showErrorDialog, setShowErrorDialog] = useState<boolean>(false);
  const [showWarningDialog, setShowWarningDialog] = useState<boolean>(false);
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

  const sendFile = (endpoint: string) => {
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadProgress(0);
    setUploadResult(null);
    setLastLogUrl(null);

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
          const normalized: UploadResult = {
            ...result,
            errors: Array.isArray(result.errors) ? result.errors : [],
            warnings: Array.isArray(result.warnings) ? result.warnings : [],
          };

          setUploadResult(normalized);
          setLastLogUrl(normalized.logUrl ?? null);
          setLastLogCsvUrl(normalized.logCsvUrl ?? null);

          if (result.success) {
            toast({
              title: 'Operation Successful',
              description: result.message,
            });
          } else {
            toast({
              title: 'Completed with Issues',
              description: result.message,
              variant: 'destructive',
            });
          }
        } catch (err) {
          toast({
            title: 'Response Error',
            description: 'Could not parse server response.',
            variant: 'destructive',
          });
        }
      } else {
        toast({
          title: 'Request Failed',
          description: `Server responded with status ${xhr.status}`,
          variant: 'destructive',
        });
      }
    };

    xhr.onerror = () => {
      setIsUploading(false);
      setUploadProgress(0);
      setUploadResult({
        success: false,
        message: 'Network error',
        errors: ['Network error']
      });
      toast({
        title: 'Network Error',
        description: 'Please try again.',
        variant: 'destructive',
      });
    };

    xhr.open('POST', `${endpoint}?profile=${encodeURIComponent(profile)}&onDuplicate=${encodeURIComponent(onDuplicate)}`);
    // Attach JWT token if available
    try {
      const token = localStorage.getItem('token');
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }
    } catch (_) {
      // ignore storage errors
    }
    xhr.send(formData);
  };

  const handleDryRun = () => sendFile('/api/employees/import/dry-run');
  const handleCommit = () => sendFile('/api/employees/import/commit');

  const downloadTemplate = () => {
    toast({
      title: 'Template Download',
      description: 'Downloading template for selected profile',
    });

    const link = document.createElement('a');
    link.href = `/api/employees/templates?profile=${encodeURIComponent(profile)}`;
    link.download = `employee_template_${profile}.xlsx`;
    link.click();
  };

  const handleDownloadLog = async (url: string | null) => {
    if (!url) {
      toast({
        title: 'No log available',
        description: 'There is no log URL to download.',
        variant: 'destructive',
      });
      return;
    }

    let token: string | null = null;
    try {
      token = localStorage.getItem('token');
    } catch (_) {
      token = null;
    }

    if (!token) {
      toast({
        title: 'Authorization required',
        description: 'Please log in to download the log file.',
        variant: 'destructive',
      });
      return;
    }

    setIsDownloading(true);
    try {
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const statusText = res.statusText || 'Download failed';
        toast({
          title: `Download error (${res.status})`,
          description: statusText,
          variant: 'destructive',
        });
        setIsDownloading(false);
        return;
      }

      const blob = await res.blob();
      const contentDisposition = res.headers.get('Content-Disposition') || res.headers.get('content-disposition');
      let filename = 'import-log';
      if (contentDisposition) {
        const match = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/i.exec(contentDisposition);
        if (match && match[1]) {
          filename = match[1].replace(/['"]/g, '');
        }
      } else {
        try {
          const parsed = new URL(url, window.location.origin);
          const parts = parsed.pathname.split('/');
          const last = parts[parts.length - 1];
          if (last) filename = decodeURIComponent(last);
        } catch (_) {
          // keep default filename
        }
      }

      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);

      toast({
        title: 'Log downloaded',
        description: filename,
      });
    } catch (err) {
      console.error('Log download error', err);
      toast({
        title: 'Download failed',
        description: 'Could not download the log file.',
        variant: 'destructive',
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const buildFlatLogRows = (res: UploadResult | null) => {
    if (!res) return [];
    const rows: Array<{ section: string; severity: string; row: string | number; column: string; message: string }> = [];
    const hv = res.headerValidation || { ok: true, missing: [], extra: [], orderMismatch: [] };
    if (hv.missing && hv.missing.length) {
      for (const h of hv.missing) rows.push({ section: 'HeaderValidation', severity: 'error', row: '', column: 'header', message: `Missing header: ${h}` });
    }
    if (hv.extra && hv.extra.length) {
      for (const h of hv.extra) rows.push({ section: 'HeaderValidation', severity: 'warning', row: '', column: 'header', message: `Unexpected extra header: ${h}` });
    }
    if (hv.orderMismatch && hv.orderMismatch.length) {
      // Treat header order mismatches as warnings to align with summary counts
      for (const m of hv.orderMismatch) rows.push({ section: 'HeaderValidation', severity: 'warning', row: '', column: 'header', message: `Order mismatch: expected index ${m.expectedIndex} for "${m.expectedHeader}", found index ${m.actualIndex}` });
    }
    const re = res.rowErrors || [];
    for (const r of re) rows.push({ section: 'RowError', severity: 'error', row: r.rowNumber, column: r.column, message: r.message });
    const warns = res.warnings || [];
    for (const w of warns) rows.push({ section: 'Processing', severity: 'warning', row: '', column: '', message: String(w) });
    const errs = res.errors || [];
    for (const e of errs) rows.push({ section: 'Processing', severity: 'error', row: '', column: '', message: String(e) });
    return rows;
  };

  const downloadFilteredCsv = (severity: 'error' | 'warning') => {
    if (!uploadResult) {
      toast({ title: 'No results', description: 'Run Dry Run first.', variant: 'destructive' });
      return;
    }
    const flat = buildFlatLogRows(uploadResult).filter(r => r.severity === severity);
    if (!flat.length) {
      toast({ title: `No ${severity}s to export`, description: 'Nothing to include in CSV.' });
      return;
    }
    const headers = ['Section', 'Severity', 'Row', 'Column', 'Message'];
    const escape = (val: unknown) => {
      const s = String(val ?? '');
      const needsQuotes = /[",\n]/.test(s);
      const escaped = s.replace(/"/g, '""');
      return needsQuotes ? `"${escaped}"` : escaped;
    };
    const lines = [headers.join(',')].concat(
      flat.map(r => [r.section, r.severity, String(r.row ?? ''), r.column ?? '', r.message ?? ''].map(escape).join(','))
    );
    const csv = lines.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const filename = `employee_import_${severity}s_${profile}_${onDuplicate}.csv`;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast({ title: 'CSV exported', description: filename });
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

          {/* Import Options */}
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-12 md:col-span-6">
              <label className="text-sm font-medium">Profile</label>
              <select
                className="mt-1 w-full border rounded-md p-2 bg-background"
                value={profile}
                onChange={(e) => setProfile(e.target.value)}
              >
                <option value="indonesia_active">Indonesia (Active)</option>
                <option value="indonesia_inactive">Indonesia (Inactive)</option>
                <option value="expatriate_active">Expatriate (Active)</option>
                <option value="expatriate_inactive">Expatriate (Inactive)</option>
              </select>
            </div>
            <div className="col-span-12 md:col-span-6">
              <label className="text-sm font-medium">Duplicate handling</label>
              <select
                className="mt-1 w-full border rounded-md p-2 bg-background"
                value={onDuplicate}
                onChange={(e) => setOnDuplicate(e.target.value)}
              >
                <option value="update">Update existing</option>
                <option value="skip">Skip duplicates</option>
                <option value="error">Error on duplicates</option>
              </select>
            </div>
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
                  <Button onClick={handleDryRun} disabled={isUploading}>
                    {isUploading ? 'Processing...' : 'Dry Run'}
                  </Button>
                  <Button onClick={handleCommit} disabled={isUploading}>
                    {isUploading ? 'Processing...' : 'Commit Import'}
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

                  {uploadResult.summary && (
                    <div className="flex items-center space-x-4">
                      <Badge variant="secondary">{uploadResult.summary.processedRows} rows processed</Badge>
                      <Badge
                        variant="outline"
                        className={`${(uploadResult.summary.errors ?? 0) > 0 ? 'cursor-pointer' : ''}`}
                        onClick={() => {
                          if ((uploadResult.summary.errors ?? 0) > 0) setShowErrorDialog(true);
                        }}
                        title={(uploadResult.summary.errors ?? 0) > 0 ? 'Click to view errors' : undefined}
                      >
                        {uploadResult.summary.errors} errors
                      </Badge>
                      <Badge
                        variant="outline"
                        className={`${(uploadResult.summary.warnings ?? 0) > 0 ? 'cursor-pointer' : ''}`}
                        onClick={() => {
                          if ((uploadResult.summary.warnings ?? 0) > 0) setShowWarningDialog(true);
                        }}
                        title={(uploadResult.summary.warnings ?? 0) > 0 ? 'Click to view warnings' : undefined}
                      >
                        {uploadResult.summary.warnings} warnings
                      </Badge>
                      {lastLogUrl && (
                        <Button
                          variant="link"
                          className="px-0"
                          onClick={() => handleDownloadLog(lastLogUrl)}
                          disabled={isDownloading}
                        >
                          {isDownloading ? 'Downloading…' : 'Download log'}
                        </Button>
                      )}
                      {lastLogCsvUrl && (
                        <Button
                          variant="link"
                          className="px-0"
                          onClick={() => handleDownloadLog(lastLogCsvUrl)}
                          disabled={isDownloading}
                        >
                          {isDownloading ? 'Downloading…' : 'Download CSV log'}
                        </Button>
                      )}
                    </div>
                  )}

                  {uploadResult.headerValidation && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Header validation</p>
                      {uploadResult.headerValidation.ok ? (
                        <p className="text-sm text-muted-foreground flex items-center">
                          <CheckCircle className="h-3 w-3 mr-1 text-success" />
                          Headers valid
                        </p>
                      ) : (
                        <div className="space-y-1">
                          {uploadResult.headerValidation.missing?.length > 0 && (
                            <div>
                              <p className="text-sm">Missing headers:</p>
                              <ul className="text-sm text-muted-foreground ml-4 list-disc">
                                {uploadResult.headerValidation.missing.map((h, i) => (
                                  <li key={`missing-${i}`}>{h}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {uploadResult.headerValidation.extra?.length > 0 && (
                            <div>
                              <p className="text-sm">Extra headers:</p>
                              <ul className="text-sm text-muted-foreground ml-4 list-disc">
                                {uploadResult.headerValidation.extra.map((h, i) => (
                                  <li key={`extra-${i}`}>{h}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {(uploadResult.errors?.length ?? 0) > 0 && (
                    <div className="space-y-1">
                      <p className="text-sm font-medium flex items-center">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Issues found:
                      </p>
                      <ul className="text-sm space-y-1">
                        {(uploadResult.errors ?? []).map((error, index) => (
                          <li key={index} className="text-muted-foreground">
                            • {error}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* CSV-like flat table for readability */}
                  {(() => {
                    const flat = buildFlatLogRows(uploadResult);
                    if (!flat.length) return null;
                    return (
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Details (CSV-style)</p>
                        <Table className="border rounded-md">
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-40">Section</TableHead>
                              <TableHead className="w-28">Severity</TableHead>
                              <TableHead className="w-20">Row</TableHead>
                              <TableHead className="w-44">Column</TableHead>
                              <TableHead>Message</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {flat.map((r, i) => (
                              <TableRow key={`flat-${i}`}>
                                <TableCell>{r.section}</TableCell>
                                <TableCell>{r.severity}</TableCell>
                                <TableCell>{String(r.row)}</TableCell>
                                <TableCell>{r.column}</TableCell>
                                <TableCell>{r.message}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    );
                  })()}

                  {(uploadResult.rowErrors?.length ?? 0) > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Row details</p>
                      <Table className="border rounded-md">
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-24">Row</TableHead>
                            <TableHead className="w-48">Column</TableHead>
                            <TableHead>Message</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(uploadResult.rowErrors ?? []).map((e, idx) => (
                            <TableRow key={`${e.rowNumber}-${e.column}-${idx}`}>
                              <TableCell className="text-foreground">{e.rowNumber}</TableCell>
                              <TableCell className="text-muted-foreground">{e.column}</TableCell>
                              <TableCell>{e.message}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                        <TableCaption>
                          Showing {uploadResult.rowErrors?.length ?? 0} issue{(uploadResult.rowErrors?.length ?? 0) === 1 ? '' : 's'}. Use Dry Run to revalidate after fixes.
                        </TableCaption>
                      </Table>
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
              <li>• Required columns vary by profile; always include Employee ID</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Error Modal */}
      <Dialog open={showErrorDialog} onOpenChange={setShowErrorDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {(() => {
                const count = (uploadResult ? buildFlatLogRows(uploadResult).filter(r => r.severity === 'error').length : 0);
                return `Errors (${count})`;
              })()}
            </DialogTitle>
            <DialogDescription>
              Detailed errors from header validation, row checks, and processing.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end mb-2">
            <Button variant="outline" size="sm" onClick={() => downloadFilteredCsv('error')}>
              <Download className="mr-2 h-4 w-4" />
              Download CSV (filtered)
            </Button>
          </div>
          {(() => {
            const flat = buildFlatLogRows(uploadResult).filter(r => r.severity === 'error');
            if (!flat.length) return <p className="text-sm text-muted-foreground">No errors</p>;
            return (
              <Table className="border rounded-md">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-40">Section</TableHead>
                    <TableHead className="w-20">Row</TableHead>
                    <TableHead className="w-44">Column</TableHead>
                    <TableHead>Message</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {flat.map((r, i) => (
                    <TableRow key={`err-${i}`}>
                      <TableCell>{r.section}</TableCell>
                      <TableCell>{String(r.row)}</TableCell>
                      <TableCell>{r.column}</TableCell>
                      <TableCell>{r.message}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Warning Modal */}
      <Dialog open={showWarningDialog} onOpenChange={setShowWarningDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {(() => {
                const count = (uploadResult ? buildFlatLogRows(uploadResult).filter(r => r.severity === 'warning').length : 0);
                return `Warnings (${count})`;
              })()}
            </DialogTitle>
            <DialogDescription>
              Non-blocking issues to review before committing the import.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end mb-2">
            <Button variant="outline" size="sm" onClick={() => downloadFilteredCsv('warning')}>
              <Download className="mr-2 h-4 w-4" />
              Download CSV (filtered)
            </Button>
          </div>
          {(() => {
            const flat = buildFlatLogRows(uploadResult).filter(r => r.severity === 'warning');
            if (!flat.length) return <p className="text-sm text-muted-foreground">No warnings</p>;
            return (
              <Table className="border rounded-md">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-40">Section</TableHead>
                    <TableHead className="w-20">Row</TableHead>
                    <TableHead className="w-44">Column</TableHead>
                    <TableHead>Message</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {flat.map((r, i) => (
                    <TableRow key={`warn-${i}`}>
                      <TableCell>{r.section}</TableCell>
                      <TableCell>{String(r.row)}</TableCell>
                      <TableCell>{r.column}</TableCell>
                      <TableCell>{r.message}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            );
          })()}
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default ExcelUpload;