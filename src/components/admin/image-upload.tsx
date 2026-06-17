"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { ImagePlus, X, Loader2 } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface ImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  className?: string;
}

export default function ImageUpload({ value, onChange, className }: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = e.target.files?.[0];
      if (!file) return;

      setIsUploading(true);

      // Create a unique file name
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('service-images')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      // Get the public URL
      const { data } = supabase.storage
        .from('service-images')
        .getPublicUrl(filePath);

      onChange(data.publicUrl);
    } catch (error: any) {
      console.error('Error uploading image:', error);
      alert('Error uploading image: ' + error.message);
    } finally {
      setIsUploading(false);
      // Reset input so the same file can be selected again if needed
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemove = () => {
    onChange("");
  };

  return (
    <div className={cn("space-y-4 w-full", className)}>
      {value ? (
        <div className="relative w-full aspect-video rounded-md overflow-hidden border border-border group">
          <Image
            src={value}
            alt="Upload preview"
            fill
            className="object-cover"
          />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Button
              type="button"
              variant="destructive"
              size="icon"
              onClick={handleRemove}
              className="h-8 w-8 rounded-full"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : (
        <div 
          onClick={() => fileInputRef.current?.click()}
          className="w-full aspect-video rounded-md border-2 border-dashed border-muted-foreground/25 hover:border-muted-foreground/50 hover:bg-muted/50 transition-colors flex flex-col items-center justify-center gap-2 cursor-pointer text-muted-foreground"
        >
          {isUploading ? (
            <>
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="text-sm">Uploading...</span>
            </>
          ) : (
            <>
              <ImagePlus className="h-8 w-8" />
              <span className="text-sm font-medium">Click to upload image</span>
              <span className="text-xs">SVG, PNG, JPG or GIF (max. 5MB)</span>
            </>
          )}
        </div>
      )}
      
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleUpload}
        accept="image/*"
        className="hidden"
        disabled={isUploading}
      />
    </div>
  );
}
