'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Image as ImageIcon, Stamp, PenTool, Upload, Plus, Trash2 } from 'lucide-react';
import { useDropzone } from 'react-dropzone';

interface Asset {
  id: string;
  name: string;
  url: string;
  type: 'logo' | 'signature' | 'stamp';
  createdAt: Date;
}

export function AssetLibrary() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [activeType, setActiveType] = useState<'logo' | 'signature' | 'stamp'>('logo');
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [assetName, setAssetName] = useState('');

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles) => {
      const file = acceptedFiles[0];
      if (file) {
        setUploadFile(file);
        setAssetName(file.name.replace(/\.(png|jpg|jpeg)$/i, ''));
      }
    },
    accept: {
      'image/png': ['.png'],
      'image/jpeg': ['.jpg', '.jpeg'],
    },
    maxFiles: 1,
  });

  const handleUpload = () => {
    if (!uploadFile || !assetName) return;

    const newAsset: Asset = {
      id: Math.random().toString(36).substring(7),
      name: assetName,
      url: URL.createObjectURL(uploadFile),
      type: activeType,
      createdAt: new Date(),
    };

    setAssets((prev) => [...prev, newAsset]);
    setShowUploadDialog(false);
    setUploadFile(null);
    setAssetName('');
  };

  const handleDelete = (id: string) => {
    if (confirm('Delete this asset?')) {
      setAssets((prev) => prev.filter((asset) => asset.id !== id));
    }
  };

  const filteredAssets = assets.filter((asset) => asset.type === activeType);

  const assetTypes = [
    { id: 'logo', label: 'Logos', icon: ImageIcon },
    { id: 'signature', label: 'Signatures', icon: PenTool },
    { id: 'stamp', label: 'Stamps', icon: Stamp },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Asset Library</h3>
        <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              Add Asset
            </Button>
          </DialogTrigger>

          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upload {activeType.charAt(0).toUpperCase() + activeType.slice(1)}</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div
                {...getRootProps()}
                className={`
                  border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all
                  ${isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary'}
                `}
              >
                <input {...getInputProps()} />
                <div className="flex flex-col items-center gap-2">
                  {uploadFile ? (
                    <>
                      <img
                        src={URL.createObjectURL(uploadFile)}
                        alt="Preview"
                        className="max-w-full max-h-32 object-contain"
                      />
                      <p className="text-sm font-medium">{uploadFile.name}</p>
                    </>
                  ) : (
                    <>
                      <Upload className="w-8 h-8 text-muted-foreground" />
                      <p className="text-sm font-medium">Upload Image</p>
                      <p className="text-xs text-muted-foreground">PNG or JPEG</p>
                    </>
                  )}
                </div>
              </div>

              {uploadFile && (
                <div className="space-y-2">
                  <Label htmlFor="assetName">Asset Name</Label>
                  <Input
                    id="assetName"
                    value={assetName}
                    onChange={(e) => setAssetName(e.target.value)}
                    placeholder="e.g., Company Logo"
                  />
                </div>
              )}

              <Button
                onClick={handleUpload}
                disabled={!uploadFile || !assetName}
                className="w-full"
              >
                Upload
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={activeType} onValueChange={(v) => setActiveType(v as any)}>
        <TabsList className="grid w-full grid-cols-3">
          {assetTypes.map((type) => (
            <TabsTrigger key={type.id} value={type.id} className="flex items-center gap-1.5">
              <type.icon className="w-3.5 h-3.5" />
              <span className="text-xs">{type.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {assetTypes.map((type) => (
          <TabsContent key={type.id} value={type.id} className="mt-4">
            {filteredAssets.length === 0 ? (
              <Card className="p-8 text-center">
                <type.icon className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  No {type.label.toLowerCase()} yet
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Upload your first {type.id}
                </p>
              </Card>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {filteredAssets.map((asset) => (
                  <Card key={asset.id} className="group relative overflow-hidden">
                    <div className="aspect-square bg-muted p-4 flex items-center justify-center">
                      <img
                        src={asset.url}
                        alt={asset.name}
                        className="max-w-full max-h-full object-contain cursor-move hover:scale-110 transition-transform"
                        draggable
                      />
                    </div>
                    <div className="p-2">
                      <p className="text-xs font-medium truncate">{asset.name}</p>
                    </div>
                    <button
                      onClick={() => handleDelete(asset.id)}
                      className="absolute top-2 right-2 p-1.5 rounded-md bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      <div className="text-xs text-muted-foreground p-3 bg-muted/50 rounded-lg">
        <p className="font-medium mb-1">💡 Tip: Drag and drop assets onto your certificate</p>
        <p>You can upload multiple logos, signatures, or stamps and position them anywhere on your certificate.</p>
      </div>
    </div>
  );
}
