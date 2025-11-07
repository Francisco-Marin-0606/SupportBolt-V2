"use client";
import { type Membership } from "@/app/_services/membershipService";
import Badge from "@/components/ui/badge/Badge";
import { Card } from "@/components/ui/card/Card";
import { useMembership } from "@/hooks/useMembership";
import { useEffect, useState } from "react";
import { CancelMembershipButton } from "./CancelMembershipButton";

interface MembershipHeaderProps {
  userId: string;
  userEmail: string;
  className?: string;
}

export function MembershipHeader({
  userId,
  userEmail,
  className = "",
}: MembershipHeaderProps) {
  const { getUserMemberships, loading } = useMembership();
  const [activeMembership, setActiveMembership] = useState<Membership | null>(
    null
  );

  useEffect(() => {
    const loadActiveMembership = async () => {
      try {
        const memberships = await getUserMemberships(userId);
        // Buscar membresía activa (la más reciente o con billing date futuro)
        const active = memberships.find(
          (m) =>
            new Date(m.billingDate || m.paymentDate) > new Date() &&
            m.membershipType !== "free"
        );
        setActiveMembership(active || null);
      } catch (error) {
        console.error("Error loading membership:", error);
      }
    };

    if (userId) {
      loadActiveMembership();
    }
  }, [userId, getUserMemberships]);

  const handleCancelSuccess = () => {
    setActiveMembership(null);
    // Opcional: mostrar notificación de éxito
    alert("Membresía cancelada exitosamente");
  };

  if (loading) {
    return (
      <div className={`flex items-center space-x-4 ${className}`}>
        <div className="animate-pulse bg-gray-200 h-8 w-32 rounded"></div>
      </div>
    );
  }

  if (!activeMembership) {
    return (
      <div className={className}>
        <Badge text="Sin membresía activa" variant="default" />
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      <Card>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Badge
              text={`Membresía ${activeMembership.membershipType}`}
              variant="success"
            />
            <span className="text-sm text-gray-600">
              Vence:{" "}
              {new Date(
                activeMembership.billingDate || activeMembership.paymentDate
              ).toLocaleDateString()}
            </span>
          </div>
          <CancelMembershipButton
            email={userEmail}
            membershipType={activeMembership.membershipType}
            onSuccess={handleCancelSuccess}
            className="ml-4"
          />
        </div>
      </Card>
    </div>
  );
}
