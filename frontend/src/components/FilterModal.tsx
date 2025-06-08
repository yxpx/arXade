"use client";

import { useRef, useEffect, ReactNode } from "react";
import { Card, Title, Button } from "@tremor/react";

interface FilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export default function FilterModal({ isOpen, onClose, title, children }: FilterModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  // Close modal when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Close on escape key
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscKey);
    }

    return () => {
      document.removeEventListener("keydown", handleEscKey);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
      <div ref={modalRef} className="w-full max-w-3xl max-h-[80vh] overflow-hidden">
        <Card className="bg-gray-900 border-none shadow-lg">
          <div className="flex justify-between items-center mb-4">
            <Title className="text-white">{title}</Title>
            <Button 
              onClick={onClose}
              color="gray"
              variant="light"
              size="xs"
            >
              Close
            </Button>
          </div>
          
          <div className="overflow-y-auto max-h-[60vh]">
            {children}
          </div>
        </Card>
      </div>
    </div>
  );
} 