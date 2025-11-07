"use client";
import {
  type ApiError
} from "@/app/_services/membershipService";
import Alert from "@/components/alert/Alert";
import { Modal } from "@/components/modal/Modal";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface CancelMembershipButtonProps {
  email: string;
  membershipType?: string;
  onSuccess?: () => void;
  onError?: (error: ApiError) => void;
  className?: string;
  variant?: "destructive" | "outline" | "secondary";
}

export function CancelMembershipButton({
  email,
  membershipType = "membresía",
  onSuccess,
  onError,
  className = "",
  variant = "destructive",
}: CancelMembershipButtonProps) {
  const [loading, setLoading] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <>
      <Button
        onClick={() => setShowConfirmModal(true)}
        variant={variant}
        className={className}
        disabled={loading}
      >
        Cancelar {membershipType}
      </Button>

      {showConfirmModal && (
        <Modal onClose={() => setShowConfirmModal(false)}>
          <div className="bg-white rounded-lg p-6 max-w-md mx-auto">
            <h2 className="text-lg font-semibold mb-4">
              Confirmar cancelación
            </h2>

            <div className="space-y-4">
              <p className="text-gray-700">
                ¿Estás seguro de que quieres cancelar esta {membershipType}?
                Esta acción no se puede deshacer.
              </p>

              {error && <Alert variant="error" description={error} />}

              <div className="flex justify-end space-x-3">
                <Button
                  onClick={() => setShowConfirmModal(false)}
                  variant="outline"
                  disabled={loading}
                >
                  Cancelar
                </Button>
                <Button
                  variant="destructive"
                  disabled={loading}
                >
                  {loading ? "Cancelando..." : "Confirmar cancelación"}
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
