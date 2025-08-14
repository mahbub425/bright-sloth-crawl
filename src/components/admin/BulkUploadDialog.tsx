import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { UploadCloud, FileText } from "lucide-react"; // Removed XCircle, CheckCircle2
import { supabase } from "@/integrations/supabase/auth";
import { useToast } from "@/components/ui/use-toast";
import { parse } from 'csv-parse/browser/esm/sync'; // Corrected import path for browser ESM synchronous parser

interface BulkUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploadSuccess: () => void;
}

const BulkUploadDialog: React.FC<BulkUploadDialogProps> = ({ open, onOpenChange, onUploadSuccess }) => {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadLogs, setUploadLogs] = useState<string[]>([]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setFile(event.target.files[0]);
      setUploadLogs([]); // Clear previous logs
    } else {
      setFile(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast({ title: "No file selected", description: "Please select a CSV file to upload.", variant: "destructive" });
      return;
    }

    setIsUploading(true);
    setUploadLogs([]);
    const logs: string[] = [];
    let successfulUploads = 0;
    let failedUploads = 0;

    try {
      const text = await file.text();
      const records: any[] = parse(text, { // Explicitly type records as any[]
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });

      if (!records || records.length === 0) {
        logs.push("No records found in the CSV file.");
        toast({ title: "Upload Failed", description: "No valid records found in the CSV file.", variant: "destructive" });
        return;
      }

      logs.push(`Processing ${records.length} records...`);

      for (const [index, record] of records.entries()) {
        const rowNum = index + 2; // +1 for 0-indexed, +1 for header row
        try {
          // Basic validation for required fields
          if (!record.name || !record.pin || !record.email || !record.phone || !record.password) {
            logs.push(`Row ${rowNum}: Skipped due to missing required fields (Name, PIN, Email, Phone, Password).`);
            failedUploads++;
            continue;
          }

          // Validate PIN and Email uniqueness before attempting Supabase auth.signUp
          const { data: existingProfiles, error: profileCheckError } = await supabase
            .from('profiles')
            .select('id, pin, email')
            .or(`pin.eq.${record.pin},email.eq.${record.email}`);

          if (profileCheckError) throw profileCheckError;

          if (existingProfiles && existingProfiles.length > 0) {
            if (existingProfiles.some(p => p.pin === record.pin)) {
              logs.push(`Row ${rowNum}: Skipped. PIN '${record.pin}' already exists.`);
              failedUploads++;
              continue;
            }
            if (existingProfiles.some(p => p.email === record.email)) {
              logs.push(`Row ${rowNum}: Skipped. Email '${record.email}' already exists.`);
              failedUploads++;
              continue;
            }
          }

          // Attempt to create user via Supabase Auth
          const { data, error: signUpError } = await supabase.auth.signUp({
            email: record.email,
            password: record.password,
            options: {
              data: {
                name: record.name,
                pin: record.pin,
                phone: "+880" + record.phone, // Prepend +880
                department: record.department || null,
                designation: record.designation || null,
                role: 'user', // Default role for bulk uploaded users
                status: 'active', // Default status
              },
            },
          });

          if (signUpError) {
            logs.push(`Row ${rowNum}: Failed to add user '${record.email}'. Error: ${signUpError.message}`);
            failedUploads++;
          } else if (data.user) {
            logs.push(`Row ${rowNum}: Successfully added user '${record.email}'.`);
            successfulUploads++;
          } else {
            logs.push(`Row ${rowNum}: User '${record.email}' processed, but no user object returned. (Might require email confirmation)`);
            successfulUploads++; // Consider it successful if no error, even if user object is null
          }
        } catch (rowError: any) {
          logs.push(`Row ${rowNum}: Unexpected error processing record. Error: ${rowError.message}`);
          failedUploads++;
        }
      }

      // Log overall summary
      logs.push(`--- Upload Summary ---`);
      logs.push(`Successful: ${successfulUploads}`);
      logs.push(`Failed: ${failedUploads}`);

      if (failedUploads > 0) {
        toast({
          title: "Bulk Upload Completed with Errors",
          description: `${successfulUploads} users added, ${failedUploads} failed. Check logs for details.`,
          variant: "destructive",
          duration: 5000,
        });
      } else {
        toast({
          title: "Bulk Upload Successful",
          description: `${successfulUploads} users added successfully.`,
          duration: 3000,
        });
      }
      onUploadSuccess(); // Trigger refresh of user list
    } catch (error: any) {
      logs.push(`Overall upload failed: ${error.message}`);
      toast({
        title: "Bulk Upload Failed",
        description: error.message || "An unexpected error occurred during bulk upload.",
        variant: "destructive",
      });
    } finally {
      setUploadLogs(logs);
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Upload Bulk Users (CSV)</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Upload a CSV file containing user data. The CSV must have the following columns:
            <code className="block bg-gray-100 dark:bg-gray-700 p-2 rounded mt-2">
              name,pin,email,phone,department,designation,password
            </code>
            <br />
            Example: <code>John Doe,12345,john.doe@example.com,1712345678,Software Development,Engineer,securepassword123</code>
          </p>
          <div>
            <Label htmlFor="csv-file" className="flex items-center mb-1">
              <FileText className="inline-block mr-2 h-4 w-4" />
              Select CSV File
            </Label>
            <Input id="csv-file" type="file" accept=".csv" onChange={handleFileChange} disabled={isUploading} />
          </div>

          {uploadLogs.length > 0 && (
            <div className="mt-4">
              <h3 className="text-md font-semibold mb-2">Upload Logs:</h3>
              <Textarea
                readOnly
                value={uploadLogs.join("\n")}
                className="h-48 font-mono text-xs bg-gray-50 dark:bg-gray-700"
              />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isUploading}>
            Cancel
          </Button>
          <Button onClick={handleUpload} disabled={isUploading || !file}>
            {isUploading ? (
              <>
                <UploadCloud className="h-4 w-4 mr-2 animate-pulse" /> Uploading...
              </>
            ) : (
              <>
                <UploadCloud className="h-4 w-4 mr-2" /> Upload
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BulkUploadDialog;