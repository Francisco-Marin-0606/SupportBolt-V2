"use client";
import {
  membershipService,
  type ApiError
} from "@/app/_services/membershipService";
import { useCallback, useState } from "react";

export function useMembership() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);


  const getUserMemberships = useCallback(async (userId: string) => {
    setLoading(true);
    setError(null);

    try {
      const memberships = await membershipService.getMembershipsByUserId(
        userId
      );
      return memberships;
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError);
      throw apiError;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    getUserMemberships,
    clearError: () => setError(null),
  };
}
