import React, { useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { QRCode } from "qrcode.react"; // Changed to named import
import { Copy, Download } from "lucide-react";

interface RoomQrCodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  qrCodeUrl: string;
  roomName: string;
}

const RoomQrCodeDialog: React.FC<RoomQrCodeDialogProps> = ({ open, onOpenChange, qrCodeUrl, roomName }) => {
  const { toast } = useToast();
  const qrCodeRef = useRef<HTMLDivElement>(null);

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(qrCodeUrl);
    toast({
      title: "URL Copied!",
      description: "The QR code URL has been copied to your clipboard.",
    });
  };

  const handleDownloadQrCode = () => {
    if (qrCodeRef.current) {
      const canvas = qrCodeRef.current.querySelector("canvas");
      if (canvas) {
        const pngUrl = canvas.toDataURL("image/png");
        const downloadLink = document.createElement("a");
        downloadLink.href = pngUrl;
        downloadLink.download = `${roomName.replace(/\s/g, '_')}_QR_Code.png`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        toast({
          title: "QR Code Downloaded",
          description: "The QR code image has been downloaded.",
        });
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] text-center">
        <DialogHeader>
          <DialogTitle>QR Code for {roomName}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center justify-center p-4">
          {qrCodeUrl ? (
            <div ref={qrCodeRef} className="p-2 border border-gray-200 dark:border-gray-700 rounded-md">
              <QRCode value={qrCodeUrl} size={256} level="H" />
            </div>
          ) : (
            <p className="text-red-500">QR Code URL not available.</p>
          )}
          <p className="mt-4 text-sm text-gray-600 dark:text-gray-400 break-all">{qrCodeUrl}</p>
        </div>
        <DialogFooter className="flex flex-col sm:flex-row sm:justify-center sm:space-x-2 pt-4">
          <Button variant="outline" onClick={handleCopyUrl} className="w-full sm:w-auto mb-2 sm:mb-0">
            <Copy className="h-4 w-4 mr-2" /> Copy URL
          </Button>
          <Button onClick={handleDownloadQrCode} className="w-full sm:w-auto">
            <Download className="h-4 w-4 mr-2" /> Download QR
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RoomQrCodeDialog;