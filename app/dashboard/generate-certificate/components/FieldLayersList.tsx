import { CertificateField, FIELD_TYPE_CONFIG } from '@/lib/types/certificate';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Trash2, Eye, EyeOff } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useState } from 'react';

interface FieldLayersListProps {
  fields: CertificateField[];
  selectedFieldId: string | null;
  hiddenFields: Set<string>;
  onFieldSelect: (fieldId: string) => void;
  onFieldDelete: (fieldId: string) => void;
  onToggleVisibility: (fieldId: string) => void;
}

export function FieldLayersList({
  fields,
  selectedFieldId,
  hiddenFields,
  onFieldSelect,
  onFieldDelete,
  onToggleVisibility,
}: FieldLayersListProps) {
  const [fieldToDelete, setFieldToDelete] = useState<string | null>(null);

  if (fields.length === 0) {
    return (
      <Card className="p-6 text-center border-dashed">
        <p className="text-sm text-muted-foreground">
          No fields added yet. Click the buttons above to add fields.
        </p>
      </Card>
    );
  }

  const handleDeleteClient = () => {
    if (fieldToDelete) {
      onFieldDelete(fieldToDelete);
      setFieldToDelete(null);
    }
  };

  return (
    <>
      <div className="space-y-2">
        {fields.map((field) => {
          const isSelected = field.id === selectedFieldId;
          const isHidden = hiddenFields.has(field.id);
          const config = FIELD_TYPE_CONFIG[field.type];

          return (
            <Card
              key={field.id}
              className={`
                p-3 cursor-pointer transition-all border
                ${isSelected ? 'ring-1 ring-primary bg-primary/5 border-primary' : 'hover:bg-muted/50 border-border'}
                ${isHidden ? 'opacity-50' : ''}
              `}
              onClick={() => onFieldSelect(field.id)}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="text-xs font-medium truncate">{field.label}</div>
                    <div className="text-[10px] text-muted-foreground px-1.5 py-0.5 bg-muted rounded">
                      {field.type}
                    </div>
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-1 truncate">
                    {field.fontSize}pt • {field.fontFamily}
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleVisibility(field.id);
                    }}
                  >
                    {isHidden ? (
                      <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
                    ) : (
                      <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-destructive/70 hover:text-destructive hover:bg-destructive/10"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFieldToDelete(field.id);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <Dialog open={!!fieldToDelete} onOpenChange={(open) => !open && setFieldToDelete(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Delete Field</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this field? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFieldToDelete(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteClient}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
